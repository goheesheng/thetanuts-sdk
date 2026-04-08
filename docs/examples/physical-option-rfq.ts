// Workflow: RFQ (Factory) — Physical settlement options
/**
 * Physical Option RFQ Example
 *
 * This example demonstrates how to create physically settled option RFQs.
 *
 * PHYSICALLY SETTLED OPTIONS:
 * Unlike cash-settled options (which pay out the difference in USDC),
 * physically settled options involve actual delivery of the underlying asset.
 *
 * IMPORTANT: Physical options are VANILLA ONLY (single strike).
 * Multi-leg structures (spreads, butterflies, condors) are cash-settled only.
 *
 * PHYSICAL_CALL:
 * - Collateral: BASE token (WETH for ETH, cbBTC for BTC)
 * - Delivery: USDC (buyer pays strike price)
 * - At expiry ITM: Buyer receives underlying, pays strike in USDC
 *
 * PHYSICAL_PUT:
 * - Collateral: QUOTE token (USDC)
 * - Delivery: Underlying (WETH for ETH, cbBTC for BTC)
 * - At expiry ITM: Buyer delivers underlying, receives strike in USDC
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

// =============================================================================
// Configuration
// =============================================================================

const RPC_URL = 'https://mainnet.base.org';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY'; // Replace with your key

// =============================================================================
// Initialize Client
// =============================================================================

async function initClient(): Promise<ThetanutsClient> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  const client = new ThetanutsClient({
    chainId: 8453, // Base mainnet
    provider,
    signer,
  });

  return client;
}

// =============================================================================
// Example 1: Create PHYSICAL PUT (SELL) - "I want to buy ETH at strike price"
// =============================================================================

/**
 * SELL a Physical PUT option.
 *
 * Use case: "I want to buy ETH at $2500. If price drops below, I receive ETH."
 *
 * At ITM expiry:
 * - You receive WETH from the buyer
 * - You pay the strike price ($2500) in USDC
 *
 * Collateral: USDC (strike × numContracts)
 * Delivery Token: WETH (encoded in extraOptionData)
 */
async function createPhysicalPutSell(client: ThetanutsClient): Promise<string> {
  const userAddress = await client.signer!.getAddress();

  // Generate ECDH keypair for encrypted offers
  const keyPair = await client.rfqKeys.getOrCreateKeyPair();
  console.log('ECDH Public Key:', keyPair.compressedPublicKey.slice(0, 20) + '...');

  // Calculate Deribit-compatible expiry (Friday 8:00 UTC)
  const now = new Date();
  const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
  const nextFriday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilFriday, 8, 0, 0)
  );
  if (nextFriday.getTime() - now.getTime() < 2 * 86400 * 1000) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }
  const expiry = Math.floor(nextFriday.getTime() / 1000);

  console.log('Expiry:', nextFriday.toISOString());

  // Define option parameters
  const strike = 2500;
  const numContracts = 0.1;

  // Build Physical PUT RFQ
  // - Collateral: USDC (auto-inferred for PUT)
  // - Delivery Token: WETH (buyer delivers this if ITM)
  const physicalPutRFQ = client.optionFactory.buildPhysicalOptionRFQ({
    requester: userAddress as `0x${string}`,
    underlying: 'ETH',
    optionType: 'PUT',
    strike,
    expiry,
    numContracts,
    isLong: false, // SELL - receive premium, provide collateral
    deliveryToken: client.chainConfig.tokens.WETH.address as `0x${string}`,
    // collateralToken: 'USDC', // Auto-inferred for PUT
    offerDeadlineMinutes: 6,
    reservePrice: 0.0001, // Minimum acceptable price per contract
    requesterPublicKey: keyPair.compressedPublicKey,
  });

  // Verify implementation
  console.log('\nPhysical PUT RFQ:');
  console.log('  Implementation:', physicalPutRFQ.params.implementation);
  console.log('  Expected:', client.chainConfig.implementations.PHYSICAL_PUT);
  console.log('  extraOptionData:', physicalPutRFQ.params.extraOptionData);

  if (physicalPutRFQ.params.implementation !== client.chainConfig.implementations.PHYSICAL_PUT) {
    throw new Error('Wrong implementation! Expected PHYSICAL_PUT');
  }

  if (physicalPutRFQ.params.extraOptionData === '0x') {
    throw new Error('extraOptionData is empty! Physical options require encoded delivery token');
  }

  console.log('\n✓ Verified: Using PHYSICAL_PUT implementation');
  console.log('✓ Verified: extraOptionData contains encoded delivery token');

  // Approve USDC collateral
  const usdcAddress = client.chainConfig.tokens.USDC.address;
  const collateralNeeded = BigInt(Math.round(strike * numContracts * 1.1 * 1e6)); // With buffer
  await client.erc20.ensureAllowance(usdcAddress, client.optionFactory.contractAddress, collateralNeeded);
  console.log('\nUSDC approved for collateral');

  // Submit RFQ
  const receipt = await client.optionFactory.requestForQuotation(physicalPutRFQ);
  console.log('TX Hash:', receipt.hash);
  console.log('Block:', receipt.blockNumber);

  return receipt.hash;
}

// =============================================================================
// Example 2: Create PHYSICAL CALL (SELL) - "I want to sell ETH at strike price"
// =============================================================================

/**
 * SELL a Physical CALL option.
 *
 * Use case: "I'm holding ETH and want to sell at $3000."
 *
 * At ITM expiry:
 * - You deliver WETH to the buyer
 * - You receive the strike price ($3000) in USDC
 *
 * Collateral: WETH (numContracts worth)
 * Delivery Token: USDC (encoded in extraOptionData)
 */
async function createPhysicalCallSell(client: ThetanutsClient): Promise<string> {
  const userAddress = await client.signer!.getAddress();

  const keyPair = await client.rfqKeys.getOrCreateKeyPair();

  // Calculate expiry
  const now = new Date();
  const daysUntilFriday = (5 - now.getUTCDay() + 7) % 7 || 7;
  const nextFriday = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilFriday, 8, 0, 0)
  );
  if (nextFriday.getTime() - now.getTime() < 2 * 86400 * 1000) {
    nextFriday.setDate(nextFriday.getDate() + 7);
  }
  const expiry = Math.floor(nextFriday.getTime() / 1000);

  const strike = 3000;
  const numContracts = 0.1;

  // Build Physical CALL RFQ
  // - Collateral: WETH (auto-inferred for CALL)
  // - Delivery Token: USDC (buyer pays this at settlement)
  const physicalCallRFQ = client.optionFactory.buildPhysicalOptionRFQ({
    requester: userAddress as `0x${string}`,
    underlying: 'ETH',
    optionType: 'CALL',
    strike,
    expiry,
    numContracts,
    isLong: false, // SELL
    deliveryToken: client.chainConfig.tokens.USDC.address as `0x${string}`,
    collateralToken: 'WETH', // Required for CALL
    offerDeadlineMinutes: 6,
    reservePrice: 0.0001,
    requesterPublicKey: keyPair.compressedPublicKey,
  });

  // Verify implementation
  console.log('\nPhysical CALL RFQ:');
  console.log('  Implementation:', physicalCallRFQ.params.implementation);
  console.log('  Expected:', client.chainConfig.implementations.PHYSICAL_CALL);

  if (physicalCallRFQ.params.implementation !== client.chainConfig.implementations.PHYSICAL_CALL) {
    throw new Error('Wrong implementation! Expected PHYSICAL_CALL');
  }

  // Approve WETH collateral
  const wethAddress = client.chainConfig.tokens.WETH.address;
  const collateralNeeded = BigInt(Math.round(numContracts * 1.1 * 1e18)); // With buffer
  await client.erc20.ensureAllowance(wethAddress, client.optionFactory.contractAddress, collateralNeeded);
  console.log('WETH approved for collateral');

  // Submit RFQ
  const receipt = await client.optionFactory.requestForQuotation(physicalCallRFQ);
  console.log('TX Hash:', receipt.hash);

  return receipt.hash;
}

// =============================================================================
// Physical vs Cash-Settled Comparison
// =============================================================================

/**
 * KEY DIFFERENCES:
 *
 * | Aspect          | Cash-Settled     | Physically Settled        |
 * |-----------------|------------------|---------------------------|
 * | Settlement      | USDC difference  | Actual asset delivery     |
 * | extraOptionData | '0x' (empty)     | ABI-encoded delivery addr |
 * | Multi-leg       | Yes              | No (vanilla only)         |
 *
 * COLLATERAL RULES:
 * | Option Type   | Collateral  | Delivery Token |
 * |---------------|-------------|----------------|
 * | PHYSICAL_PUT  | USDC        | WETH/cbBTC     |
 * | PHYSICAL_CALL | WETH/cbBTC  | USDC           |
 *
 * BUY vs SELL:
 * | Direction | Physical PUT           | Physical CALL          |
 * |-----------|------------------------|------------------------|
 * | BUY       | Deliver WETH → get $   | Pay $ → receive WETH   |
 * | SELL      | Get WETH → pay $       | Get $ → deliver WETH   |
 */

// =============================================================================
// Run Example
// =============================================================================

async function main() {
  console.log('='.repeat(60));
  console.log('Physical Option RFQ Examples');
  console.log('='.repeat(60));

  const client = await initClient();

  // Uncomment the example you want to run:

  // Example 1: SELL Physical PUT
  // await createPhysicalPutSell(client);

  // Example 2: SELL Physical CALL
  // await createPhysicalCallSell(client);

  console.log('\n✓ Example complete');
}

main().catch(console.error);
