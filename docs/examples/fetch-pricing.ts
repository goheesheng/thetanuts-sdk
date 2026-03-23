/**
 * MM Pricing Example
 *
 * This example demonstrates how to fetch and filter market maker
 * pricing data using the Thetanuts SDK.
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';
import type { MMVanillaPricing } from '@thetanuts-finance/thetanuts-client';

// =============================================================================
// Configuration
// =============================================================================

const RPC_URL = 'https://mainnet.base.org';

// =============================================================================
// Initialize Client (Read-Only)
// =============================================================================

function initClient(): ThetanutsClient {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  // No signer needed for read-only operations
  const client = new ThetanutsClient({
    chainId: 8453,
    provider,
  });

  return client;
}

// =============================================================================
// Example 1: Fetch All Pricing
// =============================================================================

/**
 * Fetch all option pricing for an underlying asset.
 */
async function fetchAllPricing(client: ThetanutsClient): Promise<void> {
  console.log('Fetching all ETH option pricing...\n');

  // Get all pricing as a Record<ticker, MMVanillaPricing>
  const allPricing = await client.mmPricing.getAllPricing('ETH');

  // Convert to array for easier processing
  const pricingArray = Object.values(allPricing);

  console.log(`Total options: ${pricingArray.length}`);

  // Show first 3 options
  for (const option of pricingArray.slice(0, 3)) {
    console.log(`\n${option.ticker}:`);
    console.log(`  Strike: $${option.strike}`);
    console.log(`  Expiry: ${new Date(option.expiry * 1000).toISOString()}`);
    console.log(`  Type: ${option.isCall ? 'CALL' : 'PUT'}`);
    console.log(`  Bid: ${option.feeAdjustedBid.toFixed(4)}`);
    console.log(`  Ask: ${option.feeAdjustedAsk.toFixed(4)}`);
  }
}

// =============================================================================
// Example 2: Filter and Sort Pricing
// =============================================================================

/**
 * Use built-in filter utilities to narrow down options.
 */
async function filterPricing(client: ThetanutsClient): Promise<void> {
  console.log('Filtering ETH options...\n');

  const allPricing = await client.mmPricing.getAllPricing('ETH');
  const values = Object.values(allPricing);

  // Filter out expired options
  const active = client.mmPricing.filterExpired(values);
  console.log(`Active (non-expired): ${active.length}`);

  // Sort by expiry then strike
  const sorted = client.mmPricing.sortByExpiryAndStrike(active);

  // Get unique expiry dates
  const expiries = client.mmPricing.getUniqueExpiries(active);
  console.log(`Unique expiries: ${expiries.join(', ')}`);

  // Filter by option type
  const puts = client.mmPricing.filterByType(active, false);
  const calls = client.mmPricing.filterByType(active, true);
  console.log(`PUTs: ${puts.length}, CALLs: ${calls.length}`);

  // Filter by specific expiry
  if (expiries.length > 0) {
    const firstExpiry = expiries[0];
    const expiryFiltered = client.mmPricing.filterByExpiry(active, firstExpiry);
    console.log(`Options expiring ${firstExpiry}: ${expiryFiltered.length}`);
  }

  // Filter by strike range (near-the-money)
  const currentPrice = 2000; // Assume current ETH price
  const nearATM = client.mmPricing.filterByStrikeRange(
    active,
    currentPrice * 0.9,  // 10% below
    currentPrice * 1.1   // 10% above
  );
  console.log(`Near ATM (1800-2200): ${nearATM.length}`);

  // Show sorted results
  console.log('\nFirst 5 sorted options:');
  for (const option of sorted.slice(0, 5)) {
    console.log(`  ${option.ticker} - Bid: ${option.feeAdjustedBid.toFixed(4)}, Ask: ${option.feeAdjustedAsk.toFixed(4)}`);
  }
}

// =============================================================================
// Example 3: Get Position Pricing (With Collateral Cost)
// =============================================================================

/**
 * Get pricing for a specific position including collateral cost.
 * This is what you'd actually pay/receive for a trade.
 */
async function getPositionPricing(client: ThetanutsClient): Promise<void> {
  console.log('Getting position pricing...\n');

  // First, get available options to find a valid ticker
  const allPricing = await client.mmPricing.getAllPricing('ETH');
  const active = client.mmPricing.filterExpired(Object.values(allPricing));

  if (active.length === 0) {
    console.log('No active options available');
    return;
  }

  // Use the first active option
  const ticker = active[0].ticker;
  console.log(`Using ticker: ${ticker}`);

  // Get position pricing for BUYING 10 contracts
  const buyPricing = await client.mmPricing.getPositionPricing({
    ticker: ticker,
    isLong: true,           // BUY position
    numContracts: 10,       // 10 contracts
    collateralToken: 'USDC',
  });

  console.log('\nBUY 10 contracts:');
  console.log(`  Per-contract price: $${buyPricing.perContractPrice.toFixed(4)}`);
  console.log(`  Base premium: $${buyPricing.basePremium.toFixed(2)}`);
  console.log(`  Collateral cost: $${buyPricing.collateralCost.toFixed(2)}`);
  console.log(`  Total price: $${buyPricing.totalPrice.toFixed(2)}`);

  // Get position pricing for SELLING 10 contracts
  const sellPricing = await client.mmPricing.getPositionPricing({
    ticker: ticker,
    isLong: false,          // SELL position
    numContracts: 10,
    collateralToken: 'USDC',
  });

  console.log('\nSELL 10 contracts:');
  console.log(`  Per-contract price: $${sellPricing.perContractPrice.toFixed(4)}`);
  console.log(`  Base premium: $${sellPricing.basePremium.toFixed(2)}`);
  console.log(`  Collateral cost: $${sellPricing.collateralCost.toFixed(2)}`);
  console.log(`  Total price: $${sellPricing.totalPrice.toFixed(2)}`);
}

// =============================================================================
// Example 4: Get Specific Ticker Pricing
// =============================================================================

/**
 * Get pricing for a specific option ticker.
 */
async function getTickerPricing(client: ThetanutsClient): Promise<void> {
  console.log('Getting specific ticker pricing...\n');

  // Ticker format: ASSET-DDMMMYY-STRIKE-C/P
  // Example: ETH-16FEB26-1800-P
  const ticker = 'ETH-16FEB26-1800-P';

  try {
    const pricing = await client.mmPricing.getTickerPricing(ticker);

    console.log(`${ticker}:`);
    console.log(`  Raw Bid: ${pricing.rawBidPrice.toFixed(4)}`);
    console.log(`  Raw Ask: ${pricing.rawAskPrice.toFixed(4)}`);
    console.log(`  Fee-Adjusted Bid: ${pricing.feeAdjustedBid.toFixed(4)}`);
    console.log(`  Fee-Adjusted Ask: ${pricing.feeAdjustedAsk.toFixed(4)}`);
    console.log(`  Bid IV: ${(pricing.bidIv * 100).toFixed(1)}%`);
    console.log(`  Ask IV: ${(pricing.askIv * 100).toFixed(1)}%`);

    // Pricing by collateral type
    console.log('\nBy Collateral:');
    for (const [collateral, colPricing] of Object.entries(pricing.byCollateral)) {
      console.log(`  ${collateral}:`);
      console.log(`    MM Bid: ${colPricing.mmBidPrice.toFixed(4)}`);
      console.log(`    MM Ask: ${colPricing.mmAskPrice.toFixed(4)}`);
    }
  } catch (error) {
    console.log(`Ticker ${ticker} not found or expired`);
  }
}

// =============================================================================
// Example 5: Convenience Method - getPricingArray
// =============================================================================

/**
 * Use the convenience method that returns sorted, non-expired options.
 */
async function getPricingArrayExample(client: ThetanutsClient): Promise<void> {
  console.log('Using getPricingArray convenience method...\n');

  // Returns sorted, non-expired array directly
  const pricing = await client.mmPricing.getPricingArray('ETH');

  console.log(`Active options: ${pricing.length}`);

  // Group by expiry for display
  const byExpiry = new Map<string, MMVanillaPricing[]>();
  for (const option of pricing) {
    const expiryDate = new Date(option.expiry * 1000).toISOString().split('T')[0];
    if (!byExpiry.has(expiryDate)) {
      byExpiry.set(expiryDate, []);
    }
    byExpiry.get(expiryDate)!.push(option);
  }

  console.log('\nOptions by expiry:');
  for (const [expiry, options] of byExpiry) {
    const puts = options.filter(o => !o.isCall);
    const calls = options.filter(o => o.isCall);
    console.log(`  ${expiry}: ${puts.length} PUTs, ${calls.length} CALLs`);
  }
}

// =============================================================================
// Example 6: Format for Display
// =============================================================================

/**
 * Format pricing data for UI display.
 */
function formatPricingForDisplay(pricing: MMVanillaPricing[]): void {
  console.log('Formatted pricing display:\n');

  // Table header
  console.log('Ticker                  | Strike  | Type | Bid      | Ask      | Mid      | Spread');
  console.log('-'.repeat(85));

  for (const option of pricing.slice(0, 10)) {
    const mid = (option.feeAdjustedBid + option.feeAdjustedAsk) / 2;
    const spread = option.feeAdjustedAsk - option.feeAdjustedBid;

    console.log(
      `${option.ticker.padEnd(23)} | ` +
      `$${option.strike.toString().padStart(5)} | ` +
      `${option.isCall ? 'CALL' : 'PUT '} | ` +
      `$${option.feeAdjustedBid.toFixed(4).padStart(7)} | ` +
      `$${option.feeAdjustedAsk.toFixed(4).padStart(7)} | ` +
      `$${mid.toFixed(4).padStart(7)} | ` +
      `$${spread.toFixed(4)}`
    );
  }
}

// =============================================================================
// Example 7: Spread Pricing
// =============================================================================

/**
 * Get pricing for spread strategies (2-leg).
 */
async function getSpreadPricing(client: ThetanutsClient): Promise<void> {
  console.log('Getting spread pricing...\n');

  // Get an active expiry first
  const pricing = await client.mmPricing.getPricingArray('ETH');
  if (pricing.length === 0) {
    console.log('No active options');
    return;
  }

  const expiry = pricing[0].expiry;

  // Call spread: buy lower strike, sell higher strike
  const spreadPricing = await client.mmPricing.getSpreadPricing({
    underlying: 'ETH',
    strike1: BigInt(180000000000),  // $1800 in 8 decimals
    strike2: BigInt(200000000000),  // $2000 in 8 decimals
    expiry: expiry,
    isCall: true,  // Call spread
  });

  console.log('Call Spread $1800/$2000:');
  console.log(`  Net Premium: $${spreadPricing.netPremium.toFixed(4)}`);
  console.log(`  Max Profit: $${spreadPricing.maxProfit.toFixed(2)}`);
  console.log(`  Max Loss: $${spreadPricing.maxLoss.toFixed(2)}`);
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('Thetanuts SDK - MM Pricing Example\n');
  console.log('='.repeat(50) + '\n');

  const client = initClient();

  // Run examples
  await fetchAllPricing(client);
  console.log('\n' + '='.repeat(50) + '\n');

  await filterPricing(client);
  console.log('\n' + '='.repeat(50) + '\n');

  await getPositionPricing(client);
  console.log('\n' + '='.repeat(50) + '\n');

  await getTickerPricing(client);
  console.log('\n' + '='.repeat(50) + '\n');

  await getPricingArrayExample(client);
  console.log('\n' + '='.repeat(50) + '\n');

  // Format example
  const pricing = await client.mmPricing.getPricingArray('ETH');
  formatPricingForDisplay(pricing);

  console.log('\nDone!');
}

main().catch(console.error);
