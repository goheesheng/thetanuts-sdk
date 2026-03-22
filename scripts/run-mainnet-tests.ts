#!/usr/bin/env npx ts-node
/**
 * Standalone Mainnet Integration Test Runner
 *
 * This script can be run directly with: npx ts-node scripts/run-mainnet-tests.ts
 * Or via npm: npm run test:mainnet:standalone
 *
 * Tests the SDK against live Base mainnet contracts with console output.
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '../src/client/ThetanutsClient.js';
import type { OrderWithSignature } from '../src/types/index.js';

// Configuration
const BASE_MAINNET_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453;

const ADDRESSES = {
  OPTION_BOOK: '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006',
  cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  SAMPLE_USER: '0xF977814e90dA44bFA03b6295A0616a897441aceC',
};

interface TestResult {
  name: string;
  passed: boolean;
  error?: string;
}

const results: TestResult[] = [];

// Delay helper to avoid public RPC rate limits
const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

function log(message: string) {
  console.log(message);
}

function pass(name: string) {
  results.push({ name, passed: true });
  log(`  [PASS] ${name}`);
}

function fail(name: string, error: Error) {
  results.push({ name, passed: false, error: error.message });
  log(`  [FAIL] ${name}: ${error.message}`);
}

async function runTests() {
  log('\n========================================');
  log('  Thetanuts SDK Mainnet Integration Tests');
  log('========================================\n');

  // Initialize client
  log('Initializing client...');
  const provider = new ethers.JsonRpcProvider(BASE_MAINNET_RPC);
  const client = new ThetanutsClient({
    chainId: BASE_CHAIN_ID,
    provider,
  });

  log(`[Client] Chain ID: ${client.chainId}`);
  log(`[Client] OptionBook: ${client.chainConfig.contracts.optionBook}`);
  log(`[Client] API URL: ${client.apiBaseUrl}`);
  log(`[Client] Indexer URL: ${client.indexerApiUrl}\n`);

  let orders: OrderWithSignature[] = [];

  // ========== Test Suite 1: Client Configuration ==========
  log('--- 1. Client Configuration ---');

  try {
    if (client.chainId !== BASE_CHAIN_ID) throw new Error('Wrong chain ID');
    if (client.chainConfig.contracts.optionBook !== ADDRESSES.OPTION_BOOK)
      throw new Error('Wrong OptionBook address');
    pass('Client initialized with correct config');
  } catch (e) {
    fail('Client initialization', e as Error);
  }

  try {
    const usdc = client.chainConfig.tokens['USDC'];
    if (usdc.decimals !== 6) throw new Error('USDC decimals incorrect');
    if (usdc.address !== ADDRESSES.USDC) throw new Error('USDC address incorrect');
    pass('Token configurations correct');
  } catch (e) {
    fail('Token configurations', e as Error);
  }

  try {
    const impl = client.chainConfig.implementations;
    if (!impl.CALL_SPREAD || !impl.PUT_SPREAD) throw new Error('Missing implementations');
    pass('Implementation addresses configured');
    log(`    CALL_SPREAD: ${impl.CALL_SPREAD}`);
    log(`    PUT_SPREAD: ${impl.PUT_SPREAD}`);
  } catch (e) {
    fail('Implementation addresses', e as Error);
  }

  // ========== Test Suite 2: ERC20 Module ==========
  log('\n--- 2. ERC20 Module ---');

  try {
    await delay(500);
    const decimals = await client.erc20.getDecimals(ADDRESSES.USDC);
    if (Number(decimals) !== 6) throw new Error(`Expected 6, got ${decimals}`);
    pass('USDC decimals = 6');
  } catch (e) {
    fail('USDC decimals', e as Error);
  }

  try {
    await delay(500);
    const decimals = await client.erc20.getDecimals(ADDRESSES.WETH);
    if (Number(decimals) !== 18) throw new Error(`Expected 18, got ${decimals}`);
    pass('WETH decimals = 18');
  } catch (e) {
    fail('WETH decimals', e as Error);
  }

  try {
    await delay(500);
    const decimals = await client.erc20.getDecimals(ADDRESSES.cbBTC);
    if (Number(decimals) !== 8) throw new Error(`Expected 8, got ${decimals}`);
    pass('cbBTC decimals = 8');
  } catch (e) {
    fail('cbBTC decimals', e as Error);
  }

  try {
    await delay(500);
    const balance = await client.erc20.getBalance(ADDRESSES.USDC, ADDRESSES.SAMPLE_USER);
    pass(`USDC balance read: ${ethers.formatUnits(balance, 6)} USDC`);
  } catch (e) {
    fail('USDC balance', e as Error);
  }

  try {
    await delay(500);
    const allowance = await client.erc20.getAllowance(
      ADDRESSES.USDC,
      ADDRESSES.SAMPLE_USER,
      ADDRESSES.OPTION_BOOK
    );
    pass(`USDC allowance read: ${ethers.formatUnits(allowance, 6)} USDC`);
  } catch (e) {
    fail('USDC allowance', e as Error);
  }

  // ========== Test Suite 3: API Module ==========
  log('\n--- 3. API Module ---');

  try {
    orders = await client.api.fetchOrders();
    pass(`Fetched ${orders.length} orders from API`);

    if (orders.length > 0) {
      const buyOrders = orders.filter((o) => o.order.isBuyer);
      const sellOrders = orders.filter((o) => !o.order.isBuyer);
      log(`    Buy orders: ${buyOrders.length}`);
      log(`    Sell orders: ${sellOrders.length}`);

      const uniqueOptions = new Set(orders.map((o) => o.order.option));
      log(`    Unique options: ${uniqueOptions.size}`);
    }
  } catch (e) {
    fail('Fetch orders', e as Error);
  }

  try {
    const stats = await client.api.getStatsFromIndexer();
    pass('Fetched protocol stats from indexer');
    log(`    Unique Users: ${stats.uniqueUsers}`);
    log(`    Total Options Tracked: ${stats.totalOptionsTracked}`);
    log(`    Open Positions: ${stats.openPositions}`);
    log(`    Settled Positions: ${stats.settledPositions}`);
    log(`    Last Block: ${stats.lastProcessedBlock}`);
  } catch (e) {
    fail('Protocol stats', e as Error);
  }

  // ========== Test Suite 4: Utils Module ==========
  log('\n--- 4. Utils Module ---');

  try {
    const strike = 100000;
    const result = client.utils.toStrikeDecimals(strike);
    if (result !== 10_000_000_000_000n) throw new Error('Conversion incorrect');
    pass(`toStrikeDecimals: ${strike} -> ${result.toString()}`);
  } catch (e) {
    fail('toStrikeDecimals', e as Error);
  }

  try {
    const strikeRaw = 10_000_000_000_000n;
    const result = client.utils.fromStrikeDecimals(strikeRaw);
    if (result !== '100000') throw new Error('Conversion incorrect');
    pass(`fromStrikeDecimals: ${strikeRaw.toString()} -> ${result}`);
  } catch (e) {
    fail('fromStrikeDecimals', e as Error);
  }

  try {
    const amount = 1000;
    const result = client.utils.toUsdcDecimals(amount);
    if (result !== 1_000_000_000n) throw new Error('Conversion incorrect');
    pass(`toUsdcDecimals: ${amount} -> ${result.toString()}`);
  } catch (e) {
    fail('toUsdcDecimals', e as Error);
  }

  try {
    const amountRaw = 1_000_000_000n;
    const result = client.utils.fromUsdcDecimals(amountRaw);
    if (result !== '1000') throw new Error('Conversion incorrect');
    pass(`fromUsdcDecimals: ${amountRaw.toString()} -> ${result}`);
  } catch (e) {
    fail('fromUsdcDecimals', e as Error);
  }

  try {
    const price = 0.05;
    const result = client.utils.toPriceDecimals(price);
    if (result !== 5_000_000n) throw new Error('Conversion incorrect');
    pass(`toPriceDecimals: ${price} -> ${result.toString()}`);
  } catch (e) {
    fail('toPriceDecimals', e as Error);
  }

  // ========== Test Suite 5: OptionBook Module ==========
  log('\n--- 5. OptionBook Module ---');

  try {
    await delay(2000);
    let nonce: bigint | null = null;
    for (const orderWithSig of orders.slice(0, 5)) {
      try {
        nonce = await client.optionBook.computeNonce(orderWithSig);
        break;
      } catch {
        await delay(500);
        continue;
      }
    }
    if (nonce === null) throw new Error('All sampled orders failed (may be expired or RPC limitation)');
    pass(`computeNonce: ${nonce.toString()}`);
  } catch (e) {
    fail('computeNonce', e as Error);
  }

  try {
    await delay(2000);
    const fees = await client.optionBook.getFees(ADDRESSES.USDC, '0x92b8ac05b63472d1D84b32bDFBBf3e1887331567');
    pass('getFees for USDC');
    log(`    USDC fees: ${fees.toString()}`);
  } catch (e) {
    fail('getFees', e as Error);
  }

  // ========== Test Suite 6: MM Pricing Module ==========
  log('\n--- 6. MM Pricing Module ---');

  try {
    if (client.pricingApiUrl !== 'https://pricing.thetanuts.finance')
      throw new Error('Wrong pricing URL');
    pass(`Pricing URL: ${client.pricingApiUrl}`);
  } catch (e) {
    fail('Pricing URL', e as Error);
  }

  try {
    if (
      typeof client.mmPricing.getAllPricing !== 'function' ||
      typeof client.mmPricing.getTickerPricing !== 'function' ||
      typeof client.mmPricing.getSpreadPricing !== 'function'
    ) {
      throw new Error('Missing mmPricing methods');
    }
    pass('MM Pricing module methods available');
  } catch (e) {
    fail('MM Pricing module', e as Error);
  }

  // ========== Summary ==========
  log('\n========================================');
  log('  Test Summary');
  log('========================================\n');

  const passed = results.filter((r) => r.passed).length;
  const failed = results.filter((r) => !r.passed).length;

  log(`Total: ${results.length} tests`);
  log(`Passed: ${passed}`);
  log(`Failed: ${failed}`);

  if (failed > 0) {
    log('\nFailed tests:');
    results
      .filter((r) => !r.passed)
      .forEach((r) => {
        log(`  - ${r.name}: ${r.error}`);
      });
  }

  log('\n========================================');
  log(failed === 0 ? '  ALL TESTS PASSED' : '  SOME TESTS FAILED');
  log('========================================\n');

  process.exit(failed > 0 ? 1 : 0);
}

// Run tests
runTests().catch((error) => {
  console.error('Fatal error:', error);
  process.exit(1);
});
