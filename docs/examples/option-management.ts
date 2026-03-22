/**
 * Option Management Example
 *
 * This example demonstrates how to query and manage option positions
 * using the Thetanuts SDK.
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts/thetanuts-client';

// =============================================================================
// Configuration
// =============================================================================

const RPC_URL = 'https://mainnet.base.org';
const PRIVATE_KEY = 'YOUR_PRIVATE_KEY'; // Replace for write operations

// Example option address (replace with actual)
const EXAMPLE_OPTION_ADDRESS = '0x...';

// =============================================================================
// Initialize Client
// =============================================================================

function initReadOnlyClient(): ThetanutsClient {
  const provider = new ethers.JsonRpcProvider(RPC_URL);

  return new ThetanutsClient({
    chainId: 8453,
    provider,
  });
}

function initWriteClient(): ThetanutsClient {
  const provider = new ethers.JsonRpcProvider(RPC_URL);
  const signer = new ethers.Wallet(PRIVATE_KEY, provider);

  return new ThetanutsClient({
    chainId: 8453,
    provider,
    signer,
  });
}

// =============================================================================
// Example 1: Get Full Option Info (Single Call)
// =============================================================================

/**
 * Use getFullOptionInfo to fetch all option data in one call.
 * This is more efficient than multiple individual calls.
 */
async function getFullOptionInfo(
  client: ThetanutsClient,
  optionAddress: string
): Promise<void> {
  console.log('Getting full option info...\n');

  const info = await client.option.getFullOptionInfo(optionAddress);

  console.log('Option:', optionAddress);
  console.log('\nBasic Info:');
  console.log(`  Option Type: ${info.info.optionType}`);
  console.log(`  Strikes: ${info.info.strikes.map(s => s.toString()).join(', ')}`);
  console.log(`  Expiry: ${new Date(Number(info.info.expiryTimestamp) * 1000).toISOString()}`);
  console.log(`  Collateral Token: ${info.info.collateralToken}`);
  console.log(`  Price Feed: ${info.info.priceFeed}`);
  console.log(`  Implementation: ${info.info.implementation}`);

  console.log('\nPosition:');
  console.log(`  Buyer: ${info.buyer}`);
  console.log(`  Seller: ${info.seller}`);
  console.log(`  Num Contracts: ${info.numContracts.toString()}`);
  console.log(`  Collateral Amount: ${info.collateralAmount.toString()}`);

  console.log('\nState:');
  console.log(`  Is Expired: ${info.isExpired}`);
  console.log(`  Is Settled: ${info.isSettled}`);
}

// =============================================================================
// Example 2: Individual Option Queries
// =============================================================================

/**
 * Query individual option properties.
 * Use this when you only need specific data.
 */
async function queryOptionProperties(
  client: ThetanutsClient,
  optionAddress: string
): Promise<void> {
  console.log('Querying individual properties...\n');

  // Basic info
  const optionInfo = await client.option.getOptionInfo(optionAddress);
  console.log('Option Info:', optionInfo);

  // Position holders
  const buyer = await client.option.getBuyer(optionAddress);
  const seller = await client.option.getSeller(optionAddress);
  console.log(`Buyer: ${buyer}`);
  console.log(`Seller: ${seller}`);

  // State
  const isExpired = await client.option.isExpired(optionAddress);
  const isSettled = await client.option.isSettled(optionAddress);
  console.log(`Expired: ${isExpired}, Settled: ${isSettled}`);

  // Position size
  const numContracts = await client.option.getNumContracts(optionAddress);
  const collateralAmount = await client.option.getCollateralAmount(optionAddress);
  console.log(`Contracts: ${numContracts}, Collateral: ${collateralAmount}`);

  // Strikes
  const strikes = await client.option.getStrikes(optionAddress);
  console.log(`Strikes: ${strikes.map(s => s.toString()).join(', ')}`);
}

// =============================================================================
// Example 3: Calculate Payout
// =============================================================================

/**
 * Calculate option payout at different settlement prices.
 */
async function calculatePayout(
  client: ThetanutsClient,
  optionAddress: string
): Promise<void> {
  console.log('Calculating payouts at different prices...\n');

  // Get option info first
  const info = await client.option.getFullOptionInfo(optionAddress);
  const strike = Number(info.info.strikes[0]) / 1e8; // Convert from 8 decimals

  console.log(`Strike: $${strike}`);
  console.log(`Contracts: ${info.numContracts}`);
  console.log();

  // Calculate payout at various settlement prices
  const testPrices = [
    strike * 0.8,  // 20% below strike
    strike * 0.9,  // 10% below strike
    strike,        // At strike
    strike * 1.1,  // 10% above strike
    strike * 1.2,  // 20% above strike
  ];

  console.log('Settlement Price | Payout');
  console.log('-'.repeat(35));

  for (const price of testPrices) {
    // Convert to 8 decimals
    const priceScaled = BigInt(Math.round(price * 1e8));

    const payout = await client.option.calculatePayout(optionAddress, priceScaled);

    console.log(`$${price.toFixed(0).padStart(14)} | ${payout.toString()}`);
  }
}

// =============================================================================
// Example 4: Simulate Payout (Without Option Contract)
// =============================================================================

/**
 * Simulate payout using the SDK utils (no contract needed).
 */
async function simulatePayout(client: ThetanutsClient): Promise<void> {
  console.log('Simulating payout calculations...\n');

  // PUT option parameters
  const strike = 1850;
  const numContracts = 10;
  const settlementPrices = [1700, 1800, 1850, 1900, 2000];

  console.log(`PUT Option: $${strike} strike, ${numContracts} contracts`);
  console.log();

  console.log('Settlement Price | Payout (USDC)');
  console.log('-'.repeat(35));

  for (const price of settlementPrices) {
    const payout = client.utils.calculatePayout({
      type: 'put',
      strikes: [BigInt(strike * 1e8)],
      settlementPrice: BigInt(price * 1e8),
      numContracts: BigInt(numContracts * 1e6), // USDC decimals
    });

    // Convert payout to display value
    const payoutDisplay = Number(payout) / 1e6;

    console.log(`$${price.toString().padStart(15)} | $${payoutDisplay.toFixed(2)}`);
  }

  // CALL option example
  console.log();
  console.log(`CALL Option: $${strike} strike, ${numContracts} contracts`);
  console.log();

  console.log('Settlement Price | Payout (USDC)');
  console.log('-'.repeat(35));

  for (const price of settlementPrices) {
    const payout = client.utils.calculatePayout({
      type: 'call',
      strikes: [BigInt(strike * 1e8)],
      settlementPrice: BigInt(price * 1e8),
      numContracts: BigInt(numContracts * 1e6),
    });

    const payoutDisplay = Number(payout) / 1e6;
    console.log(`$${price.toString().padStart(15)} | $${payoutDisplay.toFixed(2)}`);
  }
}

// =============================================================================
// Example 5: Close Position
// =============================================================================

/**
 * Close an option position (both buyer and seller must agree).
 */
async function closePosition(
  client: ThetanutsClient,
  optionAddress: string
): Promise<void> {
  console.log('Closing position...\n');

  // Check if position can be closed
  const info = await client.option.getFullOptionInfo(optionAddress);

  if (info.isSettled) {
    console.log('Position is already settled');
    return;
  }

  // Close the position
  const result = await client.option.close(optionAddress);

  console.log('Close transaction sent:', result.txHash);

  // Wait for confirmation
  const receipt = await result.wait();
  console.log('Position closed in block:', receipt?.blockNumber);
}

// =============================================================================
// Example 6: Execute Payout
// =============================================================================

/**
 * Execute payout after option expiry.
 */
async function executePayout(
  client: ThetanutsClient,
  optionAddress: string
): Promise<void> {
  console.log('Executing payout...\n');

  // Check if option is eligible for payout
  const info = await client.option.getFullOptionInfo(optionAddress);

  if (!info.isExpired) {
    console.log('Option has not expired yet');
    return;
  }

  if (info.isSettled) {
    console.log('Option is already settled');
    return;
  }

  // Execute payout
  const result = await client.option.payout(optionAddress);

  console.log('Payout transaction sent:', result.txHash);

  const receipt = await result.wait();
  console.log('Payout executed in block:', receipt?.blockNumber);
}

// =============================================================================
// Example 7: Transfer Position
// =============================================================================

/**
 * Transfer buyer or seller position to another address.
 */
async function transferPosition(
  client: ThetanutsClient,
  optionAddress: string,
  newOwner: string
): Promise<void> {
  console.log('Transferring position...\n');

  const signerAddress = await client.signer!.getAddress();
  const info = await client.option.getFullOptionInfo(optionAddress);

  // Determine if we're buyer or seller
  const isBuyer = info.buyer.toLowerCase() === signerAddress.toLowerCase();
  const isSeller = info.seller.toLowerCase() === signerAddress.toLowerCase();

  if (!isBuyer && !isSeller) {
    console.log('You are neither buyer nor seller of this option');
    return;
  }

  console.log(`Transferring ${isBuyer ? 'buyer' : 'seller'} position to ${newOwner}`);

  // Transfer
  const result = await client.option.transfer(optionAddress, isBuyer, newOwner);

  console.log('Transfer transaction sent:', result.txHash);

  const receipt = await result.wait();
  console.log('Transfer completed in block:', receipt?.blockNumber);
}

// =============================================================================
// Example 8: Approve Transfer
// =============================================================================

/**
 * Approve another address to transfer your position.
 */
async function approveTransfer(
  client: ThetanutsClient,
  optionAddress: string,
  approvedAddress: string
): Promise<void> {
  console.log('Approving transfer...\n');

  const signerAddress = await client.signer!.getAddress();
  const info = await client.option.getFullOptionInfo(optionAddress);

  const isBuyer = info.buyer.toLowerCase() === signerAddress.toLowerCase();

  // Approve transfer
  const result = await client.option.approveTransfer(
    optionAddress,
    isBuyer,
    approvedAddress,
    true // isApproved
  );

  console.log('Approval transaction sent:', result.txHash);

  const receipt = await result.wait();
  console.log('Approval completed in block:', receipt?.blockNumber);
}

// =============================================================================
// Example 9: Check Transfer Allowance
// =============================================================================

/**
 * Check if an address is approved to transfer a position.
 */
async function checkTransferAllowance(
  client: ThetanutsClient,
  optionAddress: string,
  owner: string,
  spender: string
): Promise<void> {
  console.log('Checking transfer allowance...\n');

  const buyerAllowed = await client.option.getBuyerAllowance(
    optionAddress,
    owner,
    spender
  );

  const sellerAllowed = await client.option.getSellerAllowance(
    optionAddress,
    owner,
    spender
  );

  console.log(`Buyer position transfer allowed: ${buyerAllowed}`);
  console.log(`Seller position transfer allowed: ${sellerAllowed}`);
}

// =============================================================================
// Example 10: Split Position
// =============================================================================

/**
 * Split an option position into two separate positions.
 */
async function splitPosition(
  client: ThetanutsClient,
  optionAddress: string,
  splitAmount: bigint
): Promise<void> {
  console.log('Splitting position...\n');

  const info = await client.option.getFullOptionInfo(optionAddress);
  console.log(`Current collateral: ${info.collateralAmount}`);
  console.log(`Split amount: ${splitAmount}`);

  if (splitAmount >= info.collateralAmount) {
    console.log('Split amount must be less than total collateral');
    return;
  }

  const result = await client.option.split(optionAddress, splitAmount);

  console.log('Split transaction sent:', result.txHash);

  const receipt = await result.wait();
  console.log('Split completed in block:', receipt?.blockNumber);
  console.log('New option address:', result.newOptionAddress);
}

// =============================================================================
// Example 11: Get User Positions from API
// =============================================================================

/**
 * Get all positions for a user address.
 */
async function getUserPositions(
  client: ThetanutsClient,
  userAddress: string
): Promise<void> {
  console.log(`Getting positions for ${userAddress}...\n`);

  const positions = await client.api.getUserPositionsFromIndexer(userAddress);

  console.log(`Found ${positions.length} positions:`);

  for (const position of positions) {
    console.log(`\n  Option: ${position.optionAddress}`);
    console.log(`  Role: ${position.isBuyer ? 'Buyer' : 'Seller'}`);
    console.log(`  Contracts: ${position.numContracts}`);
    console.log(`  Settled: ${position.isSettled}`);
  }
}

// =============================================================================
// Example 12: Get User Trade History
// =============================================================================

/**
 * Get trade history for a user.
 */
async function getUserHistory(
  client: ThetanutsClient,
  userAddress: string
): Promise<void> {
  console.log(`Getting trade history for ${userAddress}...\n`);

  const history = await client.api.getUserHistoryFromIndexer(userAddress);

  console.log(`Found ${history.length} trades:`);

  for (const trade of history.slice(0, 5)) {
    console.log(`\n  Tx: ${trade.txHash}`);
    console.log(`  Option: ${trade.optionAddress}`);
    console.log(`  Type: ${trade.tradeType}`);
    console.log(`  Time: ${new Date(trade.timestamp * 1000).toISOString()}`);
  }
}

// =============================================================================
// Main
// =============================================================================

async function main(): Promise<void> {
  console.log('Thetanuts SDK - Option Management Example\n');
  console.log('='.repeat(50) + '\n');

  // Read-only operations
  const readClient = initReadOnlyClient();

  // Simulate payout (no option needed)
  await simulatePayout(readClient);

  // For actual option queries, uncomment and use real address:
  // await getFullOptionInfo(readClient, EXAMPLE_OPTION_ADDRESS);
  // await queryOptionProperties(readClient, EXAMPLE_OPTION_ADDRESS);
  // await calculatePayout(readClient, EXAMPLE_OPTION_ADDRESS);

  // For write operations, use write client:
  // const writeClient = initWriteClient();
  // await closePosition(writeClient, EXAMPLE_OPTION_ADDRESS);
  // await executePayout(writeClient, EXAMPLE_OPTION_ADDRESS);

  console.log('\nDone!');
}

main().catch(console.error);
