// Workflow: OptionBook — Fill an existing maker order
/**
 * Fill Order Example
 *
 * This example demonstrates the full OptionBook flow: fetch available orders,
 * filter for an active one, preview the fill (dry-run), approve collateral,
 * and execute.
 *
 * Use OptionBook when you want to trade vanilla options against existing
 * market-maker orders. For custom strikes, expiries, or multi-leg structures,
 * use the OptionFactory / RFQ flow instead (see docs/examples/create-rfq.ts).
 */

import { ethers } from 'ethers';
import {
  ThetanutsClient,
  OrderExpiredError,
  InsufficientAllowanceError,
  ContractRevertError,
  ThetanutsError,
} from '@thetanuts-finance/thetanuts-client';

// =============================================================================
// Configuration
// =============================================================================

const RPC_URL = 'https://mainnet.base.org';
const PRIVATE_KEY = process.env.PRIVATE_KEY!; // Never hardcode in production
const REFERRER = '0x0000000000000000000000000000000000000000'; // Your referrer address for fee sharing

// Premium budget per fill, in USDC (6 decimals)
const PREMIUM_BUDGET = 10_000000n; // 10 USDC

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
    referrer: REFERRER, // client-level default; can be overridden per call
  });

  return client;
}

// =============================================================================
// Step 1: Find an active order
// =============================================================================

/**
 * Fetch all orders from the indexer and return the first one that hasn't expired.
 * In production you'd likely filter by underlying, option type, strike range,
 * expiry window, etc. — see client.api.filterOrders() for a helper.
 */
async function findActiveOrder(client: ThetanutsClient) {
  const orders = await client.api.fetchOrders();
  const now = BigInt(Math.floor(Date.now() / 1000));

  const active = orders.find((o) => o.order.expiry > now);
  if (!active) {
    throw new Error('No active orders available');
  }

  console.log(`Found order: maker=${active.order.maker}, expiry=${active.order.expiry}`);
  return active;
}

// =============================================================================
// Step 2: Preview the fill (dry-run)
// =============================================================================

/**
 * Preview what the fill will actually do before spending any gas. This runs
 * the same collateral formula the on-chain contract uses, so the contract
 * counts you see here are what you'll get in practice.
 *
 * This is especially important for PUT and SPREAD orders where the premium
 * does NOT equal the contract count (a $10k premium at a $95k strike gives
 * you ~0.105 contracts, not 10,000).
 */
function previewFill(client: ThetanutsClient, order: Awaited<ReturnType<typeof findActiveOrder>>) {
  const preview = client.optionBook.previewFillOrder(order, PREMIUM_BUDGET);

  console.log('--- FILL PREVIEW ---');
  console.log(`Contracts:        ${preview.numContracts}`);
  console.log(`Max available:    ${preview.maxContracts}`);
  console.log(`Collateral token: ${preview.collateralToken}`);
  console.log(`Price per contract: ${preview.pricePerContract}`);
  console.log(`Total cost:       ${preview.totalCollateral}`);
  console.log(`Referrer:         ${preview.referrer}`);
  console.log(`Is call:          ${preview.isCall}`);
  console.log(`Strikes:          ${preview.strikes.join(', ')}`);

  if (preview.numContracts === 0n) {
    throw new Error('Preview returned 0 contracts — order may be fully filled');
  }

  return preview;
}

// =============================================================================
// Step 3: Approve collateral
// =============================================================================

/**
 * Approve the OptionBook contract to spend the taker's collateral token.
 * `ensureAllowance` is a no-op if the current allowance already covers the
 * requested amount, so it's safe to call on every fill.
 */
async function approveCollateral(
  client: ThetanutsClient,
  collateralToken: string,
  amount: bigint,
) {
  const optionBookAddress = client.chainConfig.contracts.optionBook;

  console.log(`Approving ${amount} of ${collateralToken} for ${optionBookAddress}...`);

  await client.erc20.ensureAllowance(collateralToken, optionBookAddress, amount);

  console.log('Approval confirmed.');
}

// =============================================================================
// Step 4: Execute the fill
// =============================================================================

async function executeFill(
  client: ThetanutsClient,
  order: Awaited<ReturnType<typeof findActiveOrder>>,
) {
  console.log('Submitting fillOrder...');

  const receipt = await client.optionBook.fillOrder(order, PREMIUM_BUDGET);

  console.log('--- FILL RESULT ---');
  console.log(`Transaction:      ${receipt.hash}`);
  console.log(`Block:            ${receipt.blockNumber}`);
  console.log(`Gas used:         ${receipt.gasUsed}`);

  return receipt;
}

// =============================================================================
// Main: Full fill flow with typed error handling
// =============================================================================

async function fillOrderExample() {
  const client = await initClient();

  try {
    // 1. Find an order
    const order = await findActiveOrder(client);

    // 2. Preview it (no transaction)
    const preview = previewFill(client, order);

    // 3. Approve the collateral token up to the amount we'll actually spend
    await approveCollateral(client, preview.collateralToken, preview.totalCollateral);

    // 4. Execute the fill
    const receipt = await executeFill(client, order);

    console.log('Fill completed successfully.');
    return receipt;
  } catch (error) {
    // Typed error handling — branch on the specific failure mode
    if (error instanceof OrderExpiredError) {
      console.error('Order expired between fetch and fill. Retry with a fresh order.');
    } else if (error instanceof InsufficientAllowanceError) {
      console.error('Collateral approval missing. Check ensureAllowance().');
    } else if (error instanceof ContractRevertError) {
      console.error('Contract reverted:', error.message);
      console.error('Cause:', error.cause);
    } else if (error instanceof ThetanutsError) {
      console.error(`SDK error [${error.code}]: ${error.message}`);
    } else {
      console.error('Unexpected error:', error);
    }
    throw error;
  }
}

// =============================================================================
// Encoded variant: for viem / wagmi / AA wallets
// =============================================================================

/**
 * If you're using viem, wagmi, a Smart Wallet (Coinbase, Safe), or any other
 * non-ethers signing flow, use encodeFillOrder() and send the transaction
 * yourself.
 */
async function fillOrderEncodedExample() {
  const client = await initClient();
  const order = await findActiveOrder(client);
  const preview = previewFill(client, order);

  await approveCollateral(client, preview.collateralToken, preview.totalCollateral);

  // Build the calldata — no transaction is sent here.
  const { to, data } = client.optionBook.encodeFillOrder(order, PREMIUM_BUDGET);

  console.log('Encoded fillOrder:');
  console.log(`  to:   ${to}`);
  console.log(`  data: ${data.slice(0, 66)}... (${data.length} chars)`);

  // Example: send via ethers signer (swap for viem/wagmi/AA as needed)
  const tx = await client.signer!.sendTransaction({ to, data });
  console.log(`Encoded fill submitted: ${tx.hash}`);

  return tx;
}

// =============================================================================
// Run
// =============================================================================

if (require.main === module) {
  fillOrderExample()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

export { fillOrderExample, fillOrderEncodedExample };
