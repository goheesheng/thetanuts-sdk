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
// Public Base RPC drops calls under burst load. Allow override with BASE_RPC_URL
// env var (e.g. an Alchemy/QuickNode/Infura endpoint) for reliable runs.
const BASE_MAINNET_RPC = process.env.BASE_RPC_URL ?? 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453;

// Base_r12 deployment (deployed 2026-05-05, block 45601440)
const ADDRESSES = {
  OPTION_BOOK: '0x1bDff855d6811728acaDC00989e79143a2bdfDed',
  OPTION_FACTORY: '0x8118daD971dEbffB49B9280047659174128A8B94',
  TWAP_CONSUMER: '0xE909fb38767e0ac5F7a347DF9Dd4222217E10816',
  RANGER_IMPL: '0x9980ec85bc6fE07340adb36c76FA093bb6D4FcBc',
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

// Public Base RPC (mainnet.base.org) intermittently returns CALL_EXCEPTION
// with no revert data when bursts of read calls hit at once. The contract
// itself is fine — every selector that fails this way succeeds on retry.
// Wrap the few reads we make in a small backoff loop to keep the test suite
// stable without hiding actual contract reverts.
async function withRetry<T>(fn: () => Promise<T>, label: string, attempts = 5): Promise<T> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i += 1) {
    try {
      return await fn();
    } catch (err) {
      lastErr = err;
      const msg = (err as Error).message ?? '';
      const isFlakeRpc = msg.includes('missing revert data') || msg.includes('CALL_EXCEPTION');
      if (!isFlakeRpc || i === attempts - 1) throw err;
      // Exponential-ish backoff: 500ms, 1s, 2s, 4s
      await delay(500 * 2 ** i);
    }
  }
  throw lastErr;
}

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

  // Wrap the provider's `call` to retry transient CALL_EXCEPTION errors that
  // public RPCs return when bursting reads. This catches both SDK-internal
  // calls and ad-hoc ethers.Contract reads inside individual tests.
  const originalCall = provider.call.bind(provider);
  provider.call = async (tx: Parameters<typeof originalCall>[0]) =>
    withRetry(() => originalCall(tx), 'provider.call');

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

  // ========== Test Suite 7: Base_r12 surface ==========
  log('\n--- 7. Base_r12 Additive Surface ---');

  try {
    if (client.chainConfig.twapConsumer !== ADDRESSES.TWAP_CONSUMER) {
      throw new Error(`Expected TWAP consumer ${ADDRESSES.TWAP_CONSUMER}, got ${client.chainConfig.twapConsumer}`);
    }
    pass(`twapConsumer registered: ${client.chainConfig.twapConsumer}`);
  } catch (e) {
    fail('twapConsumer registration', e as Error);
  }

  try {
    const ranger = client.chainConfig.implementations.RANGER;
    if (ranger?.toLowerCase() !== ADDRESSES.RANGER_IMPL.toLowerCase()) {
      throw new Error(`Expected ${ADDRESSES.RANGER_IMPL}, got ${ranger}`);
    }
    pass(`RANGER implementation registered: ${ranger}`);
  } catch (e) {
    fail('RANGER implementation address', e as Error);
  }

  try {
    const { getOptionImplementationInfo } = await import('../src/chains/index.js');
    const info = getOptionImplementationInfo(BASE_CHAIN_ID, ADDRESSES.RANGER_IMPL);
    if (!info || info.type !== 'RANGER' || info.numStrikes !== 4) {
      throw new Error(`Reverse-lookup mismatch: ${JSON.stringify(info)}`);
    }
    pass(`Ranger reverse-lookup resolves: ${info.name}/${info.type}`);
  } catch (e) {
    fail('Ranger reverse-lookup', e as Error);
  }

  try {
    await delay(500);
    const factory = new ethers.Contract(
      ADDRESSES.OPTION_FACTORY,
      ['function historicalTWAPConsumer() view returns (address)'],
      provider,
    );
    const onChain = (await factory.historicalTWAPConsumer()) as string;
    if (onChain.toLowerCase() !== ADDRESSES.TWAP_CONSUMER.toLowerCase()) {
      throw new Error(`On-chain TWAP consumer ${onChain} != expected ${ADDRESSES.TWAP_CONSUMER}`);
    }
    pass(`OptionFactory.historicalTWAPConsumer() == ${onChain}`);
  } catch (e) {
    fail('OptionFactory.historicalTWAPConsumer', e as Error);
  }

  try {
    await delay(500);
    const book = new ethers.Contract(
      ADDRESSES.OPTION_BOOK,
      [
        'function minNumContracts() view returns (uint256)',
        'function minPremiumAmount() view returns (uint256)',
      ],
      provider,
    );
    const [minN, minP] = await Promise.all([
      book.minNumContracts() as Promise<bigint>,
      book.minPremiumAmount() as Promise<bigint>,
    ]);
    pass(`OptionBook thresholds: minNumContracts=${minN.toString()}, minPremiumAmount=${minP.toString()}`);
  } catch (e) {
    fail('OptionBook minimum thresholds', e as Error);
  }

  try {
    await delay(500);
    const factory = new ethers.Contract(
      ADDRESSES.OPTION_FACTORY,
      [
        'function totalClaimableTransfers(address) view returns (uint256)',
        'function claimableTransfers(address,address) view returns (uint256)',
        'function baseSplitFee() view returns (uint256)',
      ],
      provider,
    );
    // Sequential reads — public RPC drops responses under simultaneous load.
    const total = await withRetry(
      () => factory.totalClaimableTransfers(ADDRESSES.SAMPLE_USER) as Promise<bigint>,
      'totalClaimableTransfers',
    );
    const perToken = await withRetry(
      () => factory.claimableTransfers(ADDRESSES.SAMPLE_USER, ADDRESSES.USDC) as Promise<bigint>,
      'claimableTransfers',
    );
    const baseSplit = await withRetry(
      () => factory.baseSplitFee() as Promise<bigint>,
      'baseSplitFee',
    );
    pass(
      `Escrow views: totalClaimable=${total.toString()}, USDC=${perToken.toString()}, baseSplitFee=${baseSplit.toString()}`,
    );
  } catch (e) {
    fail('OptionFactory escrow views', e as Error);
  }

  try {
    if (typeof client.ranger.getInfo !== 'function') throw new Error('client.ranger.getInfo missing');
    if (typeof client.ranger.getZone !== 'function') throw new Error('client.ranger.getZone missing');
    if (typeof client.ranger.getSpreadWidth !== 'function') throw new Error('client.ranger.getSpreadWidth missing');
    pass('client.ranger module surface available');
  } catch (e) {
    fail('client.ranger module surface', e as Error);
  }

  // ----- v0.2.1 codex-found fixes -----

  // Zero-address guard: encodeRequestForQuotation must reject the seven
  // PHYSICAL_*_SPREAD/FLY/CONDOR/IRON_CONDOR placeholders.
  try {
    const { CHAIN_CONFIGS_BY_ID } = await import('../src/chains/index.js');
    const impls = CHAIN_CONFIGS_BY_ID[BASE_CHAIN_ID].implementations;
    const zeroPlaceholders: Array<keyof typeof impls> = [
      'PHYSICAL_CALL_SPREAD',
      'PHYSICAL_PUT_SPREAD',
      'PHYSICAL_CALL_FLY',
      'PHYSICAL_PUT_FLY',
      'PHYSICAL_CALL_CONDOR',
      'PHYSICAL_PUT_CONDOR',
      'PHYSICAL_IRON_CONDOR',
    ];
    for (const key of zeroPlaceholders) {
      const impl = impls[key];
      if (!impl || impl !== '0x0000000000000000000000000000000000000000') {
        throw new Error(`Expected ${key} to be 0x0…0 placeholder, got ${impl}`);
      }
      try {
        client.optionFactory.encodeRequestForQuotation({
          params: {
            requester: ADDRESSES.SAMPLE_USER,
            existingOptionAddress: '0x0000000000000000000000000000000000000000',
            collateral: ADDRESSES.USDC,
            collateralPriceFeed: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
            implementation: impl,
            strikes: [1n],
            numContracts: 1n,
            requesterDeposit: 0n,
            collateralAmount: 0n,
            expiryTimestamp: Math.floor(Date.now() / 1000) + 3600,
            offerEndTimestamp: Math.floor(Date.now() / 1000) + 60,
            isRequestingLongPosition: true,
            convertToLimitOrder: false,
            extraOptionData: '0x',
          },
          tracking: { referralId: 0n, eventCode: 0n },
          reservePrice: 0n,
          requesterPublicKey: '',
        });
        throw new Error(`${key}: expected zero-address guard to throw`);
      } catch (err) {
        const msg = (err as Error).message;
        if (!msg.includes('not yet deployed')) throw err;
      }
    }
    pass('encodeRequestForQuotation rejects all 7 zero-address placeholders');
  } catch (e) {
    fail('encodeRequestForQuotation zero-address guard', e as Error);
  }

  // Ranger chain guard: on Ethereum (chainId 1) every method must throw
  // NETWORK_UNSUPPORTED, not a low-level eth_call failure.
  try {
    const ethProvider = new ethers.JsonRpcProvider('https://eth.llamarpc.com');
    const ethClient = new ThetanutsClient({ chainId: 1, provider: ethProvider });
    try {
      await ethClient.ranger.getInfo('0x0000000000000000000000000000000000000001');
      throw new Error('expected NETWORK_UNSUPPORTED, got success');
    } catch (err) {
      const msg = (err as Error).message ?? '';
      if (!msg.includes('RangerOption deployed')) {
        throw new Error(`expected NETWORK_UNSUPPORTED message, got: ${msg}`);
      }
    }
    pass('client.ranger throws NETWORK_UNSUPPORTED on chains without RANGER');
  } catch (e) {
    fail('Ranger chain guard on Ethereum', e as Error);
  }

  // getValidNumContracts must decode as a tuple, not a single uint.
  try {
    await delay(500);
    const { OPTION_BOOK_ABI } = await import('../src/abis/optionBook.js');
    const book = new ethers.Contract(ADDRESSES.OPTION_BOOK, OPTION_BOOK_ABI, provider);
    const result = await withRetry(
      () =>
        book.getValidNumContracts(
          client.chainConfig.implementations.PUT,
          [client.utils.toStrikeDecimals(2000)],
          client.utils.toUsdcDecimals(100),
        ),
      'getValidNumContracts',
    );
    // ethers v6 returns a Result with both indexed and named accessors when the
    // ABI declares named outputs.
    const validContracts = (result as { validContracts?: bigint }).validContracts ?? (result as bigint[])[0];
    const collateralRequired = (result as { collateralRequired?: bigint }).collateralRequired ?? (result as bigint[])[1];
    if (typeof validContracts !== 'bigint' || typeof collateralRequired !== 'bigint') {
      throw new Error(`Expected tuple result, got: ${JSON.stringify(result)}`);
    }
    pass(`getValidNumContracts decodes as tuple (validContracts=${validContracts}, collateralRequired=${collateralRequired})`);
  } catch (e) {
    fail('getValidNumContracts tuple shape', e as Error);
  }

  // Butterfly reverse-lookup name reconciled to CALL_FLY (was CALL_FLYS).
  try {
    const { getOptionImplementationInfo } = await import('../src/chains/index.js');
    const callFly = getOptionImplementationInfo(BASE_CHAIN_ID, '0xa1d5f6b16a2e7f298f8d2cdf78f7779b4a20c4c2');
    const putFly = getOptionImplementationInfo(BASE_CHAIN_ID, '0x4fd2c6d271cc6ff3ebd2027da9815a0608d03aa3');
    if (callFly?.name !== 'CALL_FLY' || putFly?.name !== 'PUT_FLY') {
      throw new Error(`Expected CALL_FLY/PUT_FLY, got ${callFly?.name}/${putFly?.name}`);
    }
    pass('Butterfly reverse-lookup names: CALL_FLY / PUT_FLY');
  } catch (e) {
    fail('Butterfly reverse-lookup naming', e as Error);
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
