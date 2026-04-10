// Workflow: OptionBook — Check and claim referrer fees
/**
 * Claim Fees Example
 *
 * This example demonstrates the full referrer fee claiming flow on the
 * OptionBook: check your referrer split, scan all collateral tokens for
 * claimable balances, claim everything, and handle partial failures.
 *
 * IMPORTANT: Only OptionBook fees are self-claimable by the referrer.
 * OptionFactory (RFQ) fees are admin-withdrawn — see the note at the bottom.
 */

import { ethers } from 'ethers';
import {
  ThetanutsClient,
  ThetanutsError,
} from '@thetanuts-finance/thetanuts-client';

// =============================================================================
// Configuration
// =============================================================================

const RPC_URL = 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // Never hardcode in production

// =============================================================================
// Initialize Client
// =============================================================================

async function initClient(): Promise<ThetanutsClient> {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  return new ThetanutsClient({
    chainId: 8453, // Base mainnet
    provider,
    signer,
  });
}

// =============================================================================
// Step 1: Check if you're a whitelisted referrer
// =============================================================================

/**
 * Verify that this address has a non-zero fee split configured by the admin.
 * If feeBps is 0, you're not whitelisted and won't earn any fees on fills.
 */
async function checkReferrerStatus(client: ThetanutsClient, address: string) {
  const feeBps = await client.optionBook.getReferrerFeeSplit(address);

  console.log(`Referrer: ${address}`);
  console.log(`Fee split: ${feeBps} bps (${Number(feeBps) / 100}%)`);

  if (feeBps === 0n) {
    console.log('WARNING: Not whitelisted as a referrer. Contact admin to set up fee split.');
    return false;
  }

  return true;
}

// =============================================================================
// Step 2: Check claimable fees across all tokens
// =============================================================================

/**
 * Scan every configured collateral token (USDC, WETH, cbBTC, etc.)
 * for claimable fee balances. This runs in parallel via Promise.allSettled
 * so it's fast even with many tokens.
 */
async function checkClaimableFees(client: ThetanutsClient, address: string) {
  const claimable = await client.optionBook.getAllClaimableFees(address);

  if (claimable.length === 0) {
    console.log('No claimable fees found across any token.');
    return claimable;
  }

  console.log(`\nClaimable fees (${claimable.length} token${claimable.length > 1 ? 's' : ''}):`);
  for (const fee of claimable) {
    const formatted = ethers.formatUnits(fee.amount, fee.decimals);
    console.log(`  ${fee.symbol}: ${formatted} (raw: ${fee.amount})`);
  }

  return claimable;
}

// =============================================================================
// Step 3: Claim all fees
// =============================================================================

/**
 * Claim all non-zero fee balances. Claims are sequential (each is a write
 * transaction). If one fails, the rest still proceed — you get a result
 * for each token showing success (receipt) or failure (error).
 */
async function claimAll(client: ThetanutsClient) {
  console.log('\nClaiming all fees...');

  const results = await client.optionBook.claimAllFees();

  if (results.length === 0) {
    console.log('Nothing to claim.');
    return;
  }

  let successes = 0;
  let failures = 0;

  for (const r of results) {
    if (r.receipt) {
      const formatted = ethers.formatUnits(r.amount, 6); // Approximate — use actual decimals in prod
      console.log(`  [OK] ${r.symbol}: claimed ${formatted} — tx ${r.receipt.hash}`);
      successes++;
    } else {
      console.log(`  [FAIL] ${r.symbol}: ${r.error?.message}`);
      failures++;
    }
  }

  console.log(`\nResults: ${successes} claimed, ${failures} failed.`);

  if (failures > 0) {
    console.log('Retry failed tokens individually with client.optionBook.claimFees(tokenAddress)');
  }
}

// =============================================================================
// Step 4: Verify — check balances are zero after claiming
// =============================================================================

async function verifyCleared(client: ThetanutsClient, address: string) {
  const remaining = await client.optionBook.getAllClaimableFees(address);

  if (remaining.length === 0) {
    console.log('\nAll fees claimed — zero balance remaining.');
  } else {
    console.log('\nWARNING: Some fees remain unclaimed:');
    for (const fee of remaining) {
      console.log(`  ${fee.symbol}: ${ethers.formatUnits(fee.amount, fee.decimals)}`);
    }
  }
}

// =============================================================================
// Main: Full claim flow
// =============================================================================

async function claimFeesExample() {
  const client = await initClient();
  const address = await client.signer!.getAddress();

  try {
    // 1. Verify you're whitelisted
    const isWhitelisted = await checkReferrerStatus(client, address);
    if (!isWhitelisted) return;

    // 2. Check what's claimable
    const claimable = await checkClaimableFees(client, address);
    if (claimable.length === 0) return;

    // 3. Claim everything
    await claimAll(client);

    // 4. Verify zero balance
    await verifyCleared(client, address);
  } catch (error) {
    if (error instanceof ThetanutsError) {
      console.error(`SDK error [${error.code}]: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// =============================================================================
// Alternative: Check fees for a specific token only
// =============================================================================

async function checkSingleTokenFees() {
  const client = await initClient();
  const address = await client.signer!.getAddress();
  const usdc = client.chainConfig.tokens.USDC.address;

  // Check USDC fees specifically
  const usdcFees = await client.optionBook.getFees(usdc, address);
  console.log(`USDC fees: ${ethers.formatUnits(usdcFees, 6)}`);

  // Claim just USDC
  if (usdcFees > 0n) {
    const receipt = await client.optionBook.claimFees(usdc);
    console.log(`Claimed USDC fees: ${receipt.hash}`);
  }
}

// =============================================================================
// NOTE: OptionFactory (RFQ) fees are different
// =============================================================================

/**
 * OptionFactory fees accrue via the `referralId` system, NOT the same
 * ledger as OptionBook. The key difference:
 *
 * - OptionBook: referrer calls claimFees() directly (self-service)
 * - OptionFactory: only the contract owner can call withdrawFees()
 *
 * As a referrer, you can CHECK your factory fee balance:
 *
 *   const rfqFees = await client.optionFactory.getReferralFees(myReferralId);
 *
 * But you CANNOT withdraw it yourself. The admin must call:
 *
 *   await client.optionFactory.withdrawFees(tokenAddress, [referralId1, referralId2]);
 *
 * Contact the protocol team to arrange factory fee withdrawals.
 */

// =============================================================================
// Run
// =============================================================================

if (require.main === module) {
  claimFeesExample()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { claimFeesExample, checkSingleTokenFees };
