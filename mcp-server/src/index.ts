#!/usr/bin/env node
/**
 * Thetanuts MCP Server
 * 
 * Read-only MCP server for querying Thetanuts SDK data.
 * NO transaction execution, NO private key handling.
 */

import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
  Tool,
} from '@modelcontextprotocol/sdk/types.js';
import { ethers } from 'ethers';
import {
  ThetanutsClient,
  // Calculation functions
  calculateNumContracts,
  calculateCollateralRequired,
  calculateDeliveryAmount,
  premiumPerContract,
  calculateReservePrice,
  isPhysicalProduct,
  // Validation functions
  validateButterfly,
  validateCondor,
  validateIronCondor,
  validateRanger,
  // Chain configuration
  getChainConfigById,
  getTokenConfigById,
  // MM Pricing utilities
  parseTicker,
  buildTicker,
  // Types
  type ProductName,
} from '@thetanuts-finance/thetanuts-client';

// ============ Configuration ============
const RPC_URL = process.env.THETANUTS_RPC_URL || 'https://mainnet.base.org';
const CHAIN_ID = 8453; // Base mainnet

// ============ Initialize Client (read-only, no signer) ============
let client: ThetanutsClient | null = null;

function getClient(): ThetanutsClient {
  if (!client) {
    const provider = new ethers.JsonRpcProvider(RPC_URL);
    client = new ThetanutsClient({
      chainId: CHAIN_ID,
      provider,
    });
  }
  return client;
}

// ============ Tool Definitions ============
const tools: Tool[] = [
  // === Market Data ===
  {
    name: 'get_market_data',
    description: 'Get current market data including prices for BTC, ETH, SOL, and other supported assets',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'get_market_prices',
    description: 'Get current market prices for all supported assets',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === Orders ===
  {
    name: 'fetch_orders',
    description: 'Fetch all available orders from the Thetanuts orderbook',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'filter_orders',
    description: 'Filter orders by option type (call/put) or expiry',
    inputSchema: {
      type: 'object',
      properties: {
        isCall: {
          type: 'boolean',
          description: 'Filter by call (true) or put (false)',
        },
        minExpiry: {
          type: 'number',
          description: 'Minimum expiry timestamp (unix seconds)',
        },
      },
      required: [],
    },
  },

  // === Protocol Stats (Indexer API) ===
  {
    name: 'get_stats',
    description: 'Get protocol statistics from Indexer API (unique users, open positions, total options tracked)',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === User Data (Indexer API) ===
  {
    name: 'get_user_positions',
    description: 'Get all option positions for a user address (from Indexer API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'User wallet address',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_user_history',
    description: 'Get trade history for a user address (from Indexer API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'User wallet address',
        },
      },
      required: ['address'],
    },
  },

  // === Token Data ===
  {
    name: 'get_token_balance',
    description: 'Get token balance for an address',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'Token contract address',
        },
        ownerAddress: {
          type: 'string',
          description: 'Wallet address to check balance for',
        },
      },
      required: ['tokenAddress', 'ownerAddress'],
    },
  },
  {
    name: 'get_token_allowance',
    description: 'Get token allowance for a spender',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'Token contract address',
        },
        owner: {
          type: 'string',
          description: 'Token owner address',
        },
        spender: {
          type: 'string',
          description: 'Spender address',
        },
      },
      required: ['tokenAddress', 'owner', 'spender'],
    },
  },
  {
    name: 'get_token_info',
    description: 'Get token decimals and symbol',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'Token contract address',
        },
      },
      required: ['tokenAddress'],
    },
  },

  // === Option Info ===
  {
    name: 'get_option_info',
    description: 'Get detailed information about an option contract',
    inputSchema: {
      type: 'object',
      properties: {
        optionAddress: {
          type: 'string',
          description: 'Option contract address',
        },
      },
      required: ['optionAddress'],
    },
  },
  {
    name: 'calculate_option_payout',
    description: 'Calculate the payout for an option at a given settlement price',
    inputSchema: {
      type: 'object',
      properties: {
        optionAddress: {
          type: 'string',
          description: 'Option contract address',
        },
        settlementPrice: {
          type: 'string',
          description: 'Settlement price (in 8 decimals)',
        },
      },
      required: ['optionAddress', 'settlementPrice'],
    },
  },

  // === Order Preview ===
  {
    name: 'preview_fill_order',
    description: 'Preview a fill order without executing (dry-run)',
    inputSchema: {
      type: 'object',
      properties: {
        orderIndex: {
          type: 'number',
          description: 'Index of the order from fetch_orders result',
        },
        usdcAmount: {
          type: 'string',
          description: 'Amount of USDC to spend (in 6 decimals)',
        },
      },
      required: ['orderIndex'],
    },
  },

  // === Utils ===
  {
    name: 'calculate_payout',
    description: 'Calculate option payoff at a given settlement price for various structures',
    inputSchema: {
      type: 'object',
      properties: {
        type: {
          type: 'string',
          enum: ['call', 'put', 'call_spread', 'put_spread'],
          description: 'Option type',
        },
        strikes: {
          type: 'array',
          items: { type: 'string' },
          description: 'Strike prices (in 8 decimals)',
        },
        settlementPrice: {
          type: 'string',
          description: 'Settlement price (in 8 decimals)',
        },
        numContracts: {
          type: 'string',
          description: 'Number of contracts (in 18 decimals)',
        },
      },
      required: ['type', 'strikes', 'settlementPrice', 'numContracts'],
    },
  },
  {
    name: 'convert_decimals',
    description: 'Convert between human-readable values and on-chain decimals',
    inputSchema: {
      type: 'object',
      properties: {
        value: {
          type: 'string',
          description: 'Value to convert',
        },
        decimals: {
          type: 'number',
          description: 'Number of decimals (6 for USDC, 8 for prices, 18 for size)',
        },
        direction: {
          type: 'string',
          enum: ['toChain', 'fromChain'],
          description: 'Direction of conversion',
        },
      },
      required: ['value', 'decimals', 'direction'],
    },
  },

  // === Events ===
  {
    name: 'get_order_fill_events',
    description: 'Get historical order fill events',
    inputSchema: {
      type: 'object',
      properties: {
        fromBlock: {
          type: 'number',
          description: 'Starting block (negative for relative to current)',
        },
        maker: {
          type: 'string',
          description: 'Filter by maker address',
        },
        taker: {
          type: 'string',
          description: 'Filter by taker address',
        },
      },
      required: [],
    },
  },

  // === RFQ State (State/RFQ API) ===
  {
    name: 'get_rfq',
    description: 'Get a specific RFQ by ID (from State/RFQ API)',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID',
        },
      },
      required: ['quotationId'],
    },
  },
  {
    name: 'get_user_rfqs',
    description: 'Get all RFQs for a user (from State/RFQ API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'User wallet address',
        },
      },
      required: ['address'],
    },
  },

  // === Chain Config ===
  {
    name: 'get_chain_config',
    description: 'Get chain configuration including contract addresses and supported tokens',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === Referrer Stats (Indexer API) ===
  {
    name: 'get_referrer_stats',
    description: 'Get aggregated stats for a referrer address (from Indexer API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Referrer wallet address',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_factory_referrer_stats',
    description: 'Get referrer statistics scoped to the factory/RFQ side. Returns RFQs credited to this referrer, referral IDs, and factory-wide protocol stats.',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Referrer wallet address',
        },
      },
      required: ['address'],
    },
  },

  // === OptionBook Fee Queries ===
  {
    name: 'get_fees',
    description: 'Get accumulated referrer fees for a specific token on the OptionBook. Returns the claimable amount in the token\'s native decimals.',
    inputSchema: {
      type: 'object',
      properties: {
        token: {
          type: 'string',
          description: 'Token contract address (e.g., USDC, WETH, cbBTC)',
        },
        referrer: {
          type: 'string',
          description: 'Referrer wallet address',
        },
      },
      required: ['token', 'referrer'],
    },
  },
  {
    name: 'get_all_claimable_fees',
    description: 'Check all claimable referrer fees across every configured collateral token (USDC, WETH, cbBTC, etc.) in one call. Returns only tokens with non-zero balances.',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'Referrer wallet address',
        },
      },
      required: ['address'],
    },
  },

  // === MM Pricing ===
  {
    name: 'get_mm_all_pricing',
    description: 'Get all MM-adjusted option pricing for an underlying asset. MM pricing includes fee adjustments and is typically 10-20% worse than exchange prices.',
    inputSchema: {
      type: 'object',
      properties: {
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
      },
      required: ['underlying'],
    },
  },
  {
    name: 'get_mm_ticker_pricing',
    description: 'Get MM-adjusted pricing for a specific option ticker (e.g., "ETH-16FEB26-1800-P")',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Option ticker (e.g., "ETH-16FEB26-1800-P")',
        },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'get_mm_position_pricing',
    description: 'Get position-aware MM pricing with collateral cost for RFQ',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Option ticker (e.g., "ETH-16FEB26-1800-P")',
        },
        isLong: {
          type: 'boolean',
          description: 'Whether user is requesting long position',
        },
        numContracts: {
          type: 'number',
          description: 'Number of contracts (raw count, e.g., 6 for 6 contracts)',
        },
        collateralToken: {
          type: 'string',
          enum: ['USDC', 'WETH', 'cbBTC'],
          description: 'Collateral token',
        },
      },
      required: ['ticker', 'isLong', 'numContracts', 'collateralToken'],
    },
  },
  {
    name: 'get_mm_spread_pricing',
    description: 'Get MM pricing for a two-leg spread. Uses spread-level collateral cost (width-based, not sum of per-leg CCs). Returns netSpreadPrice, spreadCollateralCost, widthUsd, netMmAskPrice, netMmBidPrice.',
    inputSchema: {
      type: 'object',
      properties: {
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
        strike1: {
          type: 'string',
          description: 'First strike price (in 8 decimals)',
        },
        strike2: {
          type: 'string',
          description: 'Second strike price (in 8 decimals)',
        },
        expiry: {
          type: 'number',
          description: 'Expiry timestamp (unix seconds)',
        },
        isCall: {
          type: 'boolean',
          description: 'True for call spread, false for put spread',
        },
      },
      required: ['underlying', 'strike1', 'strike2', 'expiry', 'isCall'],
    },
  },
  {
    name: 'get_mm_condor_pricing',
    description: 'Get MM pricing for a four-leg condor. Uses spread-level collateral cost based on first spread width. Returns netCondorPrice, spreadCollateralCost, netMmAskPrice, netMmBidPrice.',
    inputSchema: {
      type: 'object',
      properties: {
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
        strike1: {
          type: 'string',
          description: 'First strike price (in 8 decimals)',
        },
        strike2: {
          type: 'string',
          description: 'Second strike price (in 8 decimals)',
        },
        strike3: {
          type: 'string',
          description: 'Third strike price (in 8 decimals)',
        },
        strike4: {
          type: 'string',
          description: 'Fourth strike price (in 8 decimals)',
        },
        expiry: {
          type: 'number',
          description: 'Expiry timestamp (unix seconds)',
        },
        type: {
          type: 'string',
          enum: ['call', 'put', 'iron'],
          description: 'Condor type',
        },
      },
      required: ['underlying', 'strike1', 'strike2', 'strike3', 'strike4', 'expiry', 'type'],
    },
  },
  {
    name: 'get_mm_butterfly_pricing',
    description: 'Get MM pricing for a three-leg butterfly. Uses spread-level collateral cost based on wing width. Returns netButterflyPrice, spreadCollateralCost, netMmAskPrice, netMmBidPrice.',
    inputSchema: {
      type: 'object',
      properties: {
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
        strike1: {
          type: 'string',
          description: 'Lower strike price (in 8 decimals)',
        },
        strike2: {
          type: 'string',
          description: 'Middle strike price (in 8 decimals)',
        },
        strike3: {
          type: 'string',
          description: 'Upper strike price (in 8 decimals)',
        },
        expiry: {
          type: 'number',
          description: 'Expiry timestamp (unix seconds)',
        },
        isCall: {
          type: 'boolean',
          description: 'True for call butterfly, false for put butterfly',
        },
      },
      required: ['underlying', 'strike1', 'strike2', 'strike3', 'expiry', 'isCall'],
    },
  },

  // === Position Sizing Calculations ===
  {
    name: 'calculate_num_contracts',
    description: 'Calculate number of contracts from trade amount. Returns fractional contracts for multi-leg options.',
    inputSchema: {
      type: 'object',
      properties: {
        tradeAmount: {
          type: 'number',
          description: 'Trade amount in USD (e.g., 1000 for $1000)',
        },
        product: {
          type: 'string',
          enum: [
            'PUT', 'CALL', 'PUT_SPREAD', 'CALL_SPREAD', 'BUTTERFLY', 'CONDOR', 'IRON_CONDOR', 'RANGER',
            'PHYSICAL_CALL', 'PHYSICAL_PUT'
          ],
          description: 'Option product type',
        },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Strike prices (human-readable, e.g., [1800] for PUT, [1700,1800,1900,2000] for IRON_CONDOR)',
        },
        isBuy: {
          type: 'boolean',
          description: 'True for buy position, false for sell position',
        },
      },
      required: ['tradeAmount', 'product', 'strikes', 'isBuy'],
    },
  },
  {
    name: 'calculate_collateral_required',
    description: 'Calculate collateral required for a position in USDC',
    inputSchema: {
      type: 'object',
      properties: {
        numContracts: {
          type: 'number',
          description: 'Number of contracts (can be fractional)',
        },
        product: {
          type: 'string',
          enum: [
            'PUT', 'CALL', 'PUT_SPREAD', 'CALL_SPREAD', 'BUTTERFLY', 'CONDOR', 'IRON_CONDOR', 'RANGER',
            'PHYSICAL_CALL', 'PHYSICAL_PUT'
          ],
          description: 'Option product type',
        },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Strike prices (human-readable)',
        },
      },
      required: ['numContracts', 'product', 'strikes'],
    },
  },
  {
    name: 'calculate_premium_per_contract',
    description: 'Calculate premium per contract in USD from MM price',
    inputSchema: {
      type: 'object',
      properties: {
        mmPrice: {
          type: 'number',
          description: 'MM price in ETH terms (e.g., 0.01 for 0.01 ETH)',
        },
        spot: {
          type: 'number',
          description: 'Current spot price (e.g., 2200 for $2200)',
        },
        product: {
          type: 'string',
          enum: ['PUT', 'CALL', 'PUT_SPREAD', 'CALL_SPREAD', 'BUTTERFLY', 'CONDOR', 'IRON_CONDOR', 'RANGER'],
          description: 'Option product type',
        },
      },
      required: ['mmPrice', 'spot', 'product'],
    },
  },
  {
    name: 'calculate_reserve_price',
    description: 'Calculate total reserve price (minimum acceptable premium) for a position in USD',
    inputSchema: {
      type: 'object',
      properties: {
        numContracts: {
          type: 'number',
          description: 'Number of contracts',
        },
        mmPrice: {
          type: 'number',
          description: 'MM price in ETH terms',
        },
        spot: {
          type: 'number',
          description: 'Current spot price',
        },
        product: {
          type: 'string',
          enum: ['PUT', 'CALL', 'PUT_SPREAD', 'CALL_SPREAD', 'BUTTERFLY', 'CONDOR', 'IRON_CONDOR', 'RANGER'],
          description: 'Option product type',
        },
      },
      required: ['numContracts', 'mmPrice', 'spot', 'product'],
    },
  },
  {
    name: 'calculate_delivery_amount',
    description: 'Calculate delivery amount for physical options (what buyer delivers at exercise)',
    inputSchema: {
      type: 'object',
      properties: {
        numContracts: {
          type: 'number',
          description: 'Number of contracts',
        },
        product: {
          type: 'string',
          enum: [
            'PHYSICAL_CALL', 'PHYSICAL_PUT'
          ],
          description: 'Physical option product type',
        },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Strike prices (human-readable)',
        },
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset (default: ETH)',
        },
      },
      required: ['numContracts', 'product', 'strikes'],
    },
  },

  // === Multi-leg Validation ===
  {
    name: 'validate_butterfly',
    description: 'Validate butterfly option strike configuration. Requires 3 strikes with equal wing widths.',
    inputSchema: {
      type: 'object',
      properties: {
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Three strikes [lower, middle, upper] (e.g., [1700, 1800, 1900])',
        },
      },
      required: ['strikes'],
    },
  },
  {
    name: 'validate_condor',
    description: 'Validate condor option strike configuration. Requires 4 strikes with equal spread widths.',
    inputSchema: {
      type: 'object',
      properties: {
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Four strikes [k1, k2, k3, k4] ascending (e.g., [1600, 1700, 1800, 1900])',
        },
      },
      required: ['strikes'],
    },
  },
  {
    name: 'validate_iron_condor',
    description: 'Validate iron condor strike configuration. Requires 4 strikes: put spread below, call spread above.',
    inputSchema: {
      type: 'object',
      properties: {
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Four strikes [putLower, putUpper, callLower, callUpper] (e.g., [1700, 1800, 2000, 2100])',
        },
      },
      required: ['strikes'],
    },
  },
  {
    name: 'validate_ranger',
    description: 'Validate ranger (range) option strike configuration. Requires 2 strikes.',
    inputSchema: {
      type: 'object',
      properties: {
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Two strikes [lower, upper] (e.g., [1800, 2000])',
        },
      },
      required: ['strikes'],
    },
  },

  // === RFQ Builder Tools ===
  {
    name: 'build_rfq_request',
    description: 'Build RFQ request parameters for vanilla PUT or CALL option. Returns parameters ready for encodeRequestForQuotation.',
    inputSchema: {
      type: 'object',
      properties: {
        requester: {
          type: 'string',
          description: 'Requester wallet address (0x...)',
        },
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
        optionType: {
          type: 'string',
          enum: ['PUT', 'CALL'],
          description: 'Option type',
        },
        strike: {
          type: 'number',
          description: 'Strike price (human-readable, e.g., 1850)',
        },
        expiry: {
          type: 'number',
          description: 'Expiry timestamp (unix seconds)',
        },
        numContracts: {
          type: 'number',
          description: 'Number of contracts',
        },
        isLong: {
          type: 'boolean',
          description: 'True for buy, false for sell',
        },
        collateralToken: {
          type: 'string',
          enum: ['USDC', 'WETH', 'cbBTC'],
          description: 'Collateral token',
        },
        requesterPublicKey: {
          type: 'string',
          description: 'ECDH compressed public key (hex string starting with 02 or 03)',
        },
        offerDeadlineMinutes: {
          type: 'number',
          description: 'Offer deadline in minutes (default: 60)',
        },
        reservePrice: {
          type: 'number',
          description: 'Optional: minimum premium per contract in ETH terms',
        },
        referrer: {
          type: 'string',
          description: 'Optional: referrer address',
        },
      },
      required: ['requester', 'underlying', 'optionType', 'strike', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },
  {
    name: 'build_spread_rfq',
    description: 'Build RFQ request for a two-leg spread (put spread or call spread)',
    inputSchema: {
      type: 'object',
      properties: {
        requester: { type: 'string', description: 'Requester wallet address' },
        underlying: { type: 'string', enum: ['ETH', 'BTC'] },
        optionType: { type: 'string', enum: ['PUT', 'CALL'] },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Two strikes [lower, upper] (e.g., [1700, 1800])',
        },
        expiry: { type: 'number', description: 'Expiry timestamp (unix seconds)' },
        numContracts: { type: 'number' },
        isLong: { type: 'boolean' },
        collateralToken: { type: 'string', enum: ['USDC', 'WETH', 'cbBTC'] },
        requesterPublicKey: { type: 'string' },
        offerDeadlineMinutes: { type: 'number' },
        reservePrice: { type: 'number' },
      },
      required: ['requester', 'underlying', 'optionType', 'strikes', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },
  {
    name: 'build_butterfly_rfq',
    description: 'Build RFQ request for a three-leg butterfly',
    inputSchema: {
      type: 'object',
      properties: {
        requester: { type: 'string', description: 'Requester wallet address' },
        underlying: { type: 'string', enum: ['ETH', 'BTC'] },
        optionType: { type: 'string', enum: ['PUT', 'CALL'] },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Three strikes [lower, middle, upper] with equal wing widths',
        },
        expiry: { type: 'number' },
        numContracts: { type: 'number' },
        isLong: { type: 'boolean' },
        collateralToken: { type: 'string', enum: ['USDC', 'WETH', 'cbBTC'] },
        requesterPublicKey: { type: 'string' },
        offerDeadlineMinutes: { type: 'number' },
        reservePrice: { type: 'number' },
      },
      required: ['requester', 'underlying', 'optionType', 'strikes', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },
  {
    name: 'build_condor_rfq',
    description: 'Build RFQ request for a four-leg condor (all calls or all puts)',
    inputSchema: {
      type: 'object',
      properties: {
        requester: { type: 'string' },
        underlying: { type: 'string', enum: ['ETH', 'BTC'] },
        optionType: { type: 'string', enum: ['PUT', 'CALL'] },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Four strikes [k1, k2, k3, k4] ascending',
        },
        expiry: { type: 'number' },
        numContracts: { type: 'number' },
        isLong: { type: 'boolean' },
        collateralToken: { type: 'string', enum: ['USDC', 'WETH', 'cbBTC'] },
        requesterPublicKey: { type: 'string' },
        offerDeadlineMinutes: { type: 'number' },
        reservePrice: { type: 'number' },
      },
      required: ['requester', 'underlying', 'optionType', 'strikes', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },
  {
    name: 'build_iron_condor_rfq',
    description: 'Build RFQ request for a four-leg iron condor (put spread + call spread)',
    inputSchema: {
      type: 'object',
      properties: {
        requester: { type: 'string' },
        underlying: { type: 'string', enum: ['ETH', 'BTC'] },
        strikes: {
          type: 'array',
          items: { type: 'number' },
          description: 'Four strikes [putLower, putUpper, callLower, callUpper]',
        },
        expiry: { type: 'number' },
        numContracts: { type: 'number' },
        isLong: { type: 'boolean' },
        collateralToken: { type: 'string', enum: ['USDC', 'WETH', 'cbBTC'] },
        requesterPublicKey: { type: 'string' },
        offerDeadlineMinutes: { type: 'number' },
        reservePrice: { type: 'number' },
      },
      required: ['requester', 'underlying', 'strikes', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },
  {
    name: 'build_physical_option_rfq',
    description: 'Build RFQ request for physical-settled vanilla PUT or CALL (delivers actual underlying)',
    inputSchema: {
      type: 'object',
      properties: {
        requester: { type: 'string' },
        underlying: { type: 'string', enum: ['ETH', 'BTC'] },
        optionType: { type: 'string', enum: ['PUT', 'CALL'] },
        strike: { type: 'number' },
        expiry: { type: 'number' },
        numContracts: { type: 'number' },
        isLong: { type: 'boolean' },
        collateralToken: { type: 'string', enum: ['USDC', 'WETH', 'cbBTC'] },
        requesterPublicKey: { type: 'string' },
        offerDeadlineMinutes: { type: 'number' },
        reservePrice: { type: 'number' },
      },
      required: ['requester', 'underlying', 'optionType', 'strike', 'expiry', 'numContracts', 'isLong', 'collateralToken', 'requesterPublicKey'],
    },
  },

  // === RFQ Transaction Encoding ===
  {
    name: 'encode_request_for_quotation',
    description: 'Encode RFQ creation transaction from built request parameters. Returns {to, data} for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        rfqParams: {
          type: 'object',
          description: 'RFQ parameters from build_rfq_request or other builder tool',
        },
      },
      required: ['rfqParams'],
    },
  },

  // === Chain Configuration ===
  {
    name: 'get_chain_config_by_id',
    description: 'Get full chain configuration by chain ID',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: {
          type: 'number',
          description: 'Chain ID (e.g., 8453 for Base)',
        },
      },
      required: ['chainId'],
    },
  },
  {
    name: 'get_token_config_by_id',
    description: 'Get token configuration (address, decimals) by chain ID and symbol',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'number' },
        symbol: {
          type: 'string',
          description: 'Token symbol (e.g., USDC, WETH, cbBTC)',
        },
      },
      required: ['chainId', 'symbol'],
    },
  },
  {
    name: 'get_option_implementation_info',
    description: 'Get all option implementation addresses and deployment status. Shows which option types are deployed on chain.',
    inputSchema: {
      type: 'object',
      properties: {
        chainId: { type: 'number' },
      },
      required: ['chainId'],
    },
  },

  // === Example Keypair Generation ===
  {
    name: 'generate_example_keypair',
    description: 'Generate an example ECDH keypair to show format. WARNING: For demonstration only - generate real keys locally via SDK.',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },

  // === RFQ Settlement & Cancellation ===
  {
    name: 'encode_settle_quotation',
    description: 'Encode a settlement transaction for an RFQ after reveal phase. Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID to settle',
        },
      },
      required: ['quotationId'],
    },
  },
  {
    name: 'encode_settle_quotation_early',
    description: 'Encode an early settlement transaction to accept a specific offer before offer period ends. Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID to settle',
        },
        offerAmount: {
          type: 'string',
          description: 'Offer amount (in collateral token decimals)',
        },
        nonce: {
          type: 'string',
          description: 'Nonce from decrypted offer',
        },
        offeror: {
          type: 'string',
          description: 'Address of the offeror/market maker',
        },
      },
      required: ['quotationId', 'offerAmount', 'nonce', 'offeror'],
    },
  },
  {
    name: 'encode_cancel_quotation',
    description: 'Encode a cancellation transaction for an RFQ (requester only). Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID to cancel',
        },
      },
      required: ['quotationId'],
    },
  },
  {
    name: 'encode_cancel_offer',
    description: 'Encode a transaction to cancel your offer for an RFQ (offeror only). Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID to cancel offer for',
        },
      },
      required: ['quotationId'],
    },
  },
  {
    name: 'get_quotation',
    description: 'Get detailed quotation info by ID including parameters and current state',
    inputSchema: {
      type: 'object',
      properties: {
        quotationId: {
          type: 'string',
          description: 'Quotation ID to query',
        },
      },
      required: ['quotationId'],
    },
  },

  // === Order Book Encoding ===
  {
    name: 'encode_fill_order',
    description: 'Encode a transaction to fill an order from the orderbook. Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        orderIndex: {
          type: 'number',
          description: 'Index of the order from fetch_orders result',
        },
        usdcAmount: {
          type: 'string',
          description: 'Amount of USDC to spend (in 6 decimals). If not provided, fills max available.',
        },
        referrer: {
          type: 'string',
          description: 'Optional referrer address',
        },
      },
      required: ['orderIndex'],
    },
  },

  // === ERC20 Encoding ===
  {
    name: 'encode_approve',
    description: 'Encode a token approval transaction. Returns transaction data for wallet signing.',
    inputSchema: {
      type: 'object',
      properties: {
        tokenAddress: {
          type: 'string',
          description: 'Token contract address to approve',
        },
        spenderAddress: {
          type: 'string',
          description: 'Address to approve as spender (e.g., OptionBook or OptionFactory)',
        },
        amount: {
          type: 'string',
          description: 'Amount to approve (in token decimals). Use "max" for unlimited approval.',
        },
      },
      required: ['tokenAddress', 'spenderAddress', 'amount'],
    },
  },

  // === Additional User Data ===
  {
    name: 'get_user_offers',
    description: 'Get all RFQ offers made by a user (from State/RFQ API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'User wallet address',
        },
      },
      required: ['address'],
    },
  },
  {
    name: 'get_user_options',
    description: 'Get all options held by a user (from State/RFQ API)',
    inputSchema: {
      type: 'object',
      properties: {
        address: {
          type: 'string',
          description: 'User wallet address',
        },
      },
      required: ['address'],
    },
  },

  // === Additional Events ===
  {
    name: 'get_option_created_events',
    description: 'Get historical option creation events',
    inputSchema: {
      type: 'object',
      properties: {
        fromBlock: {
          type: 'number',
          description: 'Starting block (negative for relative to current)',
        },
        optionAddress: {
          type: 'string',
          description: 'Filter by option address',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_quotation_requested_events',
    description: 'Get historical RFQ quotation requested events',
    inputSchema: {
      type: 'object',
      properties: {
        fromBlock: {
          type: 'number',
          description: 'Starting block (negative for relative to current)',
        },
        requester: {
          type: 'string',
          description: 'Filter by requester address',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_quotation_settled_events',
    description: 'Get historical RFQ quotation settled events',
    inputSchema: {
      type: 'object',
      properties: {
        fromBlock: {
          type: 'number',
          description: 'Starting block (negative for relative to current)',
        },
        quotationId: {
          type: 'string',
          description: 'Filter by quotation ID',
        },
      },
      required: [],
    },
  },
  {
    name: 'get_position_closed_events',
    description: 'Get historical position closed events for a specific option contract',
    inputSchema: {
      type: 'object',
      properties: {
        optionAddress: {
          type: 'string',
          description: 'Option contract address (required)',
        },
        fromBlock: {
          type: 'number',
          description: 'Starting block (negative for relative to current)',
        },
      },
      required: ['optionAddress'],
    },
  },

  // === Ticker Utilities ===
  {
    name: 'parse_ticker',
    description: 'Parse an option ticker string (e.g., "ETH-16FEB26-1800-P") into its components',
    inputSchema: {
      type: 'object',
      properties: {
        ticker: {
          type: 'string',
          description: 'Option ticker string (e.g., "ETH-16FEB26-1800-P")',
        },
      },
      required: ['ticker'],
    },
  },
  {
    name: 'build_ticker',
    description: 'Build an option ticker string from components',
    inputSchema: {
      type: 'object',
      properties: {
        underlying: {
          type: 'string',
          enum: ['ETH', 'BTC'],
          description: 'Underlying asset',
        },
        expiry: {
          type: 'number',
          description: 'Expiry timestamp (unix seconds)',
        },
        strike: {
          type: 'number',
          description: 'Strike price (human-readable, e.g., 1800)',
        },
        isCall: {
          type: 'boolean',
          description: 'True for call, false for put',
        },
      },
      required: ['underlying', 'expiry', 'strike', 'isCall'],
    },
  },

  // === Additional Option Info ===
  {
    name: 'get_full_option_info',
    description: 'Get comprehensive option information including all strikes, positions, and settlement status',
    inputSchema: {
      type: 'object',
      properties: {
        optionAddress: {
          type: 'string',
          description: 'Option contract address',
        },
      },
      required: ['optionAddress'],
    },
  },
  {
    name: 'get_position_info',
    description: 'Get position information for buyer or seller of an option',
    inputSchema: {
      type: 'object',
      properties: {
        optionAddress: {
          type: 'string',
          description: 'Option contract address',
        },
        isBuyer: {
          type: 'boolean',
          description: 'True for buyer position, false for seller position',
        },
      },
      required: ['optionAddress', 'isBuyer'],
    },
  },

  // === OptionFactory Additional Read ===
  {
    name: 'get_quotation_count',
    description: 'Get total number of quotations created on the OptionFactory',
    inputSchema: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'calculate_protocol_fee',
    description: 'Calculate protocol fee for an RFQ trade',
    inputSchema: {
      type: 'object',
      properties: {
        numContracts: {
          type: 'string',
          description: 'Number of contracts (in 18 decimals)',
        },
        premium: {
          type: 'string',
          description: 'Premium amount (in collateral token decimals)',
        },
        price: {
          type: 'string',
          description: 'Price per contract (in 8 decimals)',
        },
      },
      required: ['numContracts', 'premium', 'price'],
    },
  },
];

// ============ Tool Handlers ============
async function handleTool(name: string, args: Record<string, unknown>): Promise<string> {
  const c = getClient();

  try {
    switch (name) {
      // === Market Data ===
      case 'get_market_data': {
        const data = await c.api.getMarketData();
        return JSON.stringify(data, null, 2);
      }
      case 'get_market_prices': {
        const prices = await c.api.getMarketPrices();
        return JSON.stringify(prices, null, 2);
      }

      // === Orders ===
      case 'fetch_orders': {
        const orders = await c.api.fetchOrders();
        // Return summary to avoid huge output
        const summary = orders.map((o, i) => ({
          index: i,
          isCall: o.rawApiData?.isCall,
          isLong: o.rawApiData?.isLong,
          strikes: o.rawApiData?.strikes,
          collateral: o.rawApiData?.collateral,
          orderExpiry: o.rawApiData?.orderExpiryTimestamp,
          availableAmount: o.availableAmount?.toString(),
          maker: o.makerAddress,
        }));
        return JSON.stringify({ count: orders.length, orders: summary }, null, 2);
      }
      case 'filter_orders': {
        const orders = await c.api.fetchOrders();
        let filtered = orders;
        
        if (args.isCall !== undefined) {
          filtered = filtered.filter(o => o.rawApiData?.isCall === args.isCall);
        }
        if (args.minExpiry) {
          const minExp = args.minExpiry as number;
          filtered = filtered.filter(o => 
            o.rawApiData?.orderExpiryTimestamp && o.rawApiData.orderExpiryTimestamp > minExp
          );
        }
        
        const summary = filtered.map((o, i) => ({
          index: i,
          isCall: o.rawApiData?.isCall,
          isLong: o.rawApiData?.isLong,
          strikes: o.rawApiData?.strikes,
          orderExpiry: o.rawApiData?.orderExpiryTimestamp,
          availableAmount: o.availableAmount?.toString(),
        }));
        return JSON.stringify({ count: filtered.length, orders: summary }, null, 2);
      }

      // === Protocol Stats (Indexer API) ===
      case 'get_stats': {
        const stats = await c.api.getStatsFromIndexer();
        return JSON.stringify(stats, null, 2);
      }

      // === User Data (Indexer API) ===
      case 'get_user_positions': {
        const positions = await c.api.getUserPositionsFromIndexer(args.address as string);
        return JSON.stringify(positions, null, 2);
      }
      case 'get_user_history': {
        const history = await c.api.getUserHistoryFromIndexer(args.address as string);
        return JSON.stringify(history, null, 2);
      }

      // === Token Data ===
      case 'get_token_balance': {
        const balance = await c.erc20.getBalance(
          args.tokenAddress as string,
          args.ownerAddress as string
        );
        return JSON.stringify({ balance: balance.toString() }, null, 2);
      }
      case 'get_token_allowance': {
        const allowance = await c.erc20.getAllowance(
          args.tokenAddress as string,
          args.owner as string,
          args.spender as string
        );
        return JSON.stringify({ allowance: allowance.toString() }, null, 2);
      }
      case 'get_token_info': {
        const decimals = await c.erc20.getDecimals(args.tokenAddress as string);
        const symbol = await c.erc20.getSymbol(args.tokenAddress as string);
        return JSON.stringify({ decimals, symbol }, null, 2);
      }

      // === Option Info ===
      case 'get_option_info': {
        const optionAddr = args.optionAddress as string;
        const info = await c.option.getOptionInfo(optionAddr);
        
        // Get additional info via separate calls
        const [buyer, seller, isExpired, isSettled, numContracts, collateralAmount] = await Promise.all([
          c.option.getBuyer(optionAddr),
          c.option.getSeller(optionAddr),
          c.option.isExpired(optionAddr),
          c.option.isSettled(optionAddr),
          c.option.getNumContracts(optionAddr),
          c.option.getCollateralAmount(optionAddr),
        ]);
        
        return JSON.stringify({
          address: info.address,
          optionType: info.optionType,
          strikes: info.strikes?.map(s => s.toString()),
          expiry: info.expiry?.toString(),
          collateralToken: info.collateralToken,
          collateralAmount: collateralAmount.toString(),
          numContracts: numContracts.toString(),
          buyer,
          seller,
          isExpired,
          isSettled,
        }, null, 2);
      }
      case 'calculate_option_payout': {
        const payout = await c.option.calculatePayout(
          args.optionAddress as string,
          BigInt(args.settlementPrice as string)
        );
        return JSON.stringify({ payout: payout.toString() }, null, 2);
      }

      // === Order Preview ===
      case 'preview_fill_order': {
        const orders = await c.api.fetchOrders();
        const orderIndex = args.orderIndex as number;
        if (orderIndex < 0 || orderIndex >= orders.length) {
          throw new Error(`Invalid order index: ${orderIndex}. Available: 0-${orders.length - 1}`);
        }
        const order = orders[orderIndex];
        const usdcAmount = args.usdcAmount ? BigInt(args.usdcAmount as string) : undefined;
        const preview = c.optionBook.previewFillOrder(order, usdcAmount);
        return JSON.stringify({
          numContracts: preview.numContracts?.toString(),
          collateralToken: preview.collateralToken,
          totalCollateral: preview.totalCollateral?.toString(),
          pricePerContract: preview.pricePerContract?.toString(),
          maker: preview.maker,
          expiry: preview.expiry?.toString(),
          isCall: preview.isCall,
          strikes: preview.strikes?.map(s => s.toString()),
        }, null, 2);
      }

      // === Utils ===
      case 'calculate_payout': {
        const payout = c.utils.calculatePayout({
          type: args.type as 'call' | 'put' | 'call_spread' | 'put_spread',
          strikes: (args.strikes as string[]).map(s => BigInt(s)),
          settlementPrice: BigInt(args.settlementPrice as string),
          numContracts: BigInt(args.numContracts as string),
        });
        return JSON.stringify({ payout: payout.toString() }, null, 2);
      }
      case 'convert_decimals': {
        const value = args.value as string;
        const decimals = args.decimals as number;
        const direction = args.direction as string;
        
        let result: string;
        if (direction === 'toChain') {
          result = c.utils.toBigInt(value, decimals).toString();
        } else {
          result = c.utils.fromBigInt(BigInt(value), decimals);
        }
        return JSON.stringify({ result }, null, 2);
      }

      // === Events ===
      case 'get_order_fill_events': {
        const filters: Record<string, unknown> = {};
        if (args.fromBlock) filters.fromBlock = args.fromBlock;
        if (args.maker) filters.maker = args.maker;
        if (args.taker) filters.taker = args.taker;
        
        const events = await c.events.getOrderFillEvents(filters);
        const summary = events.map(e => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          maker: e.maker,
          taker: e.taker,
          option: e.option,
          numContracts: e.numContracts?.toString(),
          price: e.price?.toString(),
          referrer: e.referrer,
        }));
        return JSON.stringify({ count: events.length, events: summary }, null, 2);
      }

      // === RFQ State ===
      case 'get_rfq': {
        const rfq = await c.api.getRfq(args.quotationId as string);
        return JSON.stringify(rfq, null, 2);
      }
      case 'get_user_rfqs': {
        const rfqs = await c.api.getUserRfqs(args.address as string);
        return JSON.stringify(rfqs, null, 2);
      }

      // === Chain Config ===
      case 'get_chain_config': {
        const config = c.chainConfig;
        return JSON.stringify({
          chainId: config.chainId,
          name: config.name,
          contracts: config.contracts,
          tokens: Object.keys(config.tokens || {}),
        }, null, 2);
      }

      // === Referrer Stats (Indexer API) ===
      case 'get_referrer_stats': {
        const stats = await c.api.getReferrerStatsFromIndexer(args.address as string);
        return JSON.stringify({
          referrer: stats.referrer,
          positionsCount: Object.keys(stats.positions).length,
          lastUpdateTimestamp: stats.lastUpdateTimestamp,
        }, null, 2);
      }

      case 'get_factory_referrer_stats': {
        const stats = await c.api.getFactoryReferrerStats(args.address as string);
        return JSON.stringify({
          referrer: stats.referrer,
          referralIds: stats.referralIds,
          rfqCount: Object.keys(stats.rfqs).length,
          protocolStats: stats.protocolStats,
          lastUpdateTimestamp: stats.lastUpdateTimestamp,
        }, null, 2);
      }

      // === OptionBook Fee Queries ===
      case 'get_fees': {
        const amount = await c.optionBook.getFees(
          args.token as string,
          args.referrer as string
        );
        return JSON.stringify({ amount: amount.toString() }, null, 2);
      }

      case 'get_all_claimable_fees': {
        const claimable = await c.optionBook.getAllClaimableFees(args.address as string);
        return JSON.stringify(claimable.map(fee => ({
          token: fee.token,
          symbol: fee.symbol,
          decimals: fee.decimals,
          amount: fee.amount.toString(),
        })), null, 2);
      }

      // === MM Pricing ===
      case 'get_mm_all_pricing': {
        const underlying = args.underlying as 'ETH' | 'BTC';
        const pricing = await c.mmPricing.getAllPricing(underlying);
        // Return summary with byCollateral structure
        const summary = Object.entries(pricing).map(([ticker, p]) => {
          const nativeCollateral = p.byCollateral[underlying];
          const usdCollateral = p.byCollateral['USD'];
          return {
            ticker,
            rawBid: p.rawBidPrice,
            rawAsk: p.rawAskPrice,
            feeAdjustedBid: p.feeAdjustedBid,
            feeAdjustedAsk: p.feeAdjustedAsk,
            mark: p.markPrice,
            strike: p.strike,
            isCall: p.isCall,
            expiry: p.expiry,
            nativeCollateral: nativeCollateral ? {
              mmBid: nativeCollateral.mmBidPrice,
              mmAsk: nativeCollateral.mmAskPrice,
              mmBidBuffered: nativeCollateral.mmBidPriceBuffered,
              mmAskBuffered: nativeCollateral.mmAskPriceBuffered,
            } : null,
            usdCollateral: usdCollateral ? {
              mmBid: usdCollateral.mmBidPrice,
              mmAsk: usdCollateral.mmAskPrice,
              mmBidBuffered: usdCollateral.mmBidPriceBuffered,
              mmAskBuffered: usdCollateral.mmAskPriceBuffered,
            } : null,
          };
        });
        return JSON.stringify({
          underlying,
          count: summary.length,
          options: summary
        }, null, 2);
      }
      case 'get_mm_ticker_pricing': {
        const ticker = args.ticker as string;
        const pricing = await c.mmPricing.getTickerPricing(ticker);
        return JSON.stringify({
          ticker: pricing.ticker,
          rawBidPrice: pricing.rawBidPrice,
          rawAskPrice: pricing.rawAskPrice,
          feeAdjustedBid: pricing.feeAdjustedBid,
          feeAdjustedAsk: pricing.feeAdjustedAsk,
          markPrice: pricing.markPrice,
          underlyingPrice: pricing.underlyingPrice,
          strike: pricing.strike,
          expiry: pricing.expiry,
          isCall: pricing.isCall,
          underlying: pricing.underlying,
          passesToleranceCheck: pricing.passesToleranceCheck,
          timeToExpiryYears: pricing.timeToExpiryYears,
          feeMultiplier: pricing.feeMultiplier,
          byCollateral: Object.fromEntries(
            Object.entries(pricing.byCollateral).map(([asset, cp]) => [
              asset,
              {
                collateralAmount: cp.collateralAmount,
                collateralCostPerUnit: cp.collateralCostPerUnit,
                mmBidPrice: cp.mmBidPrice,
                mmAskPrice: cp.mmAskPrice,
                mmBidPriceBuffered: cp.mmBidPriceBuffered,
                mmAskPriceBuffered: cp.mmAskPriceBuffered,
                mmWlBidPrice: cp.mmWlBidPrice,
                mmWlAskPrice: cp.mmWlAskPrice,
                mmWlBidPriceBuffered: cp.mmWlBidPriceBuffered,
                mmWlAskPriceBuffered: cp.mmWlAskPriceBuffered,
              },
            ])
          ),
        }, null, 2);
      }
      case 'get_mm_position_pricing': {
        const pricing = await c.mmPricing.getPositionPricing({
          ticker: args.ticker as string,
          isLong: args.isLong as boolean,
          numContracts: Number(args.numContracts),
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
        });
        return JSON.stringify({
          ticker: pricing.ticker,
          isLong: pricing.isLong,
          rawBidPrice: pricing.rawBidPrice,
          rawAskPrice: pricing.rawAskPrice,
          feeAdjustedBid: pricing.feeAdjustedBid,
          feeAdjustedAsk: pricing.feeAdjustedAsk,
          strike: pricing.strike,
          expiry: pricing.expiry,
          isCall: pricing.isCall,
          numContracts: pricing.numContracts,
          collateralRequired: pricing.collateralRequired.toString(),
          collateralCost: pricing.collateralCost.toString(),
          basePremium: pricing.basePremium.toString(),
          totalPrice: pricing.totalPrice.toString(),
          timeToExpiryYears: pricing.timeToExpiryYears,
          collateralToken: pricing.collateralToken,
          byCollateral: Object.fromEntries(
            Object.entries(pricing.byCollateral).map(([asset, cp]) => [
              asset,
              {
                mmBidPrice: cp.mmBidPrice,
                mmAskPrice: cp.mmAskPrice,
                mmBidPriceBuffered: cp.mmBidPriceBuffered,
                mmAskPriceBuffered: cp.mmAskPriceBuffered,
              },
            ])
          ),
        }, null, 2);
      }
      case 'get_mm_spread_pricing': {
        const pricing = await c.mmPricing.getSpreadPricing({
          underlying: args.underlying as string,
          strikes: [BigInt(args.strike1 as string), BigInt(args.strike2 as string)],
          expiry: args.expiry as number,
          isCall: args.isCall as boolean,
        });
        const underlying = args.underlying as string;
        return JSON.stringify({
          type: pricing.type,
          nearLeg: {
            ticker: pricing.nearLeg.ticker,
            feeAdjustedBid: pricing.nearLeg.feeAdjustedBid,
            feeAdjustedAsk: pricing.nearLeg.feeAdjustedAsk,
            byCollateral: pricing.nearLeg.byCollateral[underlying] || pricing.nearLeg.byCollateral['USD'],
          },
          farLeg: {
            ticker: pricing.farLeg.ticker,
            feeAdjustedBid: pricing.farLeg.feeAdjustedBid,
            feeAdjustedAsk: pricing.farLeg.feeAdjustedAsk,
            byCollateral: pricing.farLeg.byCollateral[underlying] || pricing.farLeg.byCollateral['USD'],
          },
          // New breakdown fields from collateral cost fix
          netSpreadPrice: pricing.netSpreadPrice,
          spreadCollateralCost: pricing.spreadCollateralCost,
          widthUsd: pricing.widthUsd,
          netMmBidPrice: pricing.netMmBidPrice,
          netMmAskPrice: pricing.netMmAskPrice,
          maxLoss: pricing.maxLoss,
          collateral: pricing.collateral.toString(),
        }, null, 2);
      }
      case 'get_mm_condor_pricing': {
        const pricing = await c.mmPricing.getCondorPricing({
          underlying: args.underlying as string,
          strikes: [
            BigInt(args.strike1 as string),
            BigInt(args.strike2 as string),
            BigInt(args.strike3 as string),
            BigInt(args.strike4 as string),
          ],
          expiry: args.expiry as number,
          type: args.type as 'call' | 'put' | 'iron',
        });
        const underlying = args.underlying as string;
        return JSON.stringify({
          type: pricing.type,
          legs: pricing.legs.map(l => ({
            ticker: l.ticker,
            feeAdjustedBid: l.feeAdjustedBid,
            feeAdjustedAsk: l.feeAdjustedAsk,
            strike: l.strike,
            byCollateral: l.byCollateral[underlying] || l.byCollateral['USD'],
          })),
          // New breakdown fields from collateral cost fix
          netCondorPrice: pricing.netCondorPrice,
          spreadCollateralCost: pricing.spreadCollateralCost,
          netMmBidPrice: pricing.netMmBidPrice,
          netMmAskPrice: pricing.netMmAskPrice,
          spreadWidth: pricing.spreadWidth,
          collateral: pricing.collateral.toString(),
        }, null, 2);
      }
      case 'get_mm_butterfly_pricing': {
        const pricing = await c.mmPricing.getButterflyPricing({
          underlying: args.underlying as string,
          strikes: [
            BigInt(args.strike1 as string),
            BigInt(args.strike2 as string),
            BigInt(args.strike3 as string),
          ],
          expiry: args.expiry as number,
          isCall: args.isCall as boolean,
        });
        const underlying = args.underlying as string;
        return JSON.stringify({
          type: pricing.type,
          legs: pricing.legs.map(l => ({
            ticker: l.ticker,
            feeAdjustedBid: l.feeAdjustedBid,
            feeAdjustedAsk: l.feeAdjustedAsk,
            strike: l.strike,
            byCollateral: l.byCollateral[underlying] || l.byCollateral['USD'],
          })),
          // New breakdown fields from collateral cost fix
          netButterflyPrice: pricing.netButterflyPrice,
          spreadCollateralCost: pricing.spreadCollateralCost,
          netMmBidPrice: pricing.netMmBidPrice,
          netMmAskPrice: pricing.netMmAskPrice,
          width: pricing.width,
          collateral: pricing.collateral.toString(),
        }, null, 2);
      }

      // === Position Sizing Calculations ===
      case 'calculate_num_contracts': {
        const result = calculateNumContracts({
          tradeAmount: args.tradeAmount as number,
          product: args.product as ProductName,
          strikes: args.strikes as number[],
          isBuy: args.isBuy as boolean,
        });
        return JSON.stringify({
          numContracts: result,
          inputs: {
            tradeAmount: args.tradeAmount,
            product: args.product,
            strikes: args.strikes,
            isBuy: args.isBuy,
          },
        }, null, 2);
      }
      case 'calculate_collateral_required': {
        const result = calculateCollateralRequired(
          args.numContracts as number,
          args.product as ProductName,
          args.strikes as number[]
        );
        return JSON.stringify({
          collateralRequired: result,
          collateralToken: 'USDC',
          inputs: {
            numContracts: args.numContracts,
            product: args.product,
            strikes: args.strikes,
          },
        }, null, 2);
      }
      case 'calculate_premium_per_contract': {
        const result = premiumPerContract(
          args.mmPrice as number,
          args.spot as number,
          args.product as ProductName
        );
        return JSON.stringify({
          premiumPerContract: result,
          premiumCurrency: 'USD',
          inputs: {
            mmPrice: args.mmPrice,
            spot: args.spot,
            product: args.product,
          },
        }, null, 2);
      }
      case 'calculate_reserve_price': {
        const result = calculateReservePrice(
          args.numContracts as number,
          args.mmPrice as number,
          args.spot as number,
          args.product as ProductName
        );
        return JSON.stringify({
          totalReservePrice: result,
          currency: 'USD',
          inputs: {
            numContracts: args.numContracts,
            mmPrice: args.mmPrice,
            spot: args.spot,
            product: args.product,
          },
        }, null, 2);
      }

      case 'calculate_delivery_amount': {
        const product = args.product as ProductName;
        if (!isPhysicalProduct(product)) {
          return JSON.stringify({
            error: `Product ${product} is not a physical option. Use physical products (PHYSICAL_CALL, PHYSICAL_PUT, etc.)`,
          }, null, 2);
        }
        const result = calculateDeliveryAmount(
          args.numContracts as number,
          product,
          args.strikes as number[],
          (args.underlying as 'ETH' | 'BTC') || 'ETH'
        );
        return JSON.stringify({
          deliveryAmount: result.deliveryAmount,
          deliveryToken: result.deliveryToken,
          inputs: {
            numContracts: args.numContracts,
            product: args.product,
            strikes: args.strikes,
            underlying: args.underlying || 'ETH',
          },
        }, null, 2);
      }

      // === Multi-leg Validation ===
      case 'validate_butterfly': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 3) {
          return JSON.stringify({ valid: false, error: `Butterfly requires exactly 3 strikes, got ${strikes.length}` }, null, 2);
        }
        const result = validateButterfly(strikes);
        return JSON.stringify(result, null, 2);
      }
      case 'validate_condor': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 4) {
          return JSON.stringify({ valid: false, error: `Condor requires exactly 4 strikes, got ${strikes.length}` }, null, 2);
        }
        const result = validateCondor(strikes);
        return JSON.stringify(result, null, 2);
      }
      case 'validate_iron_condor': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 4) {
          return JSON.stringify({ valid: false, error: `Iron condor requires exactly 4 strikes, got ${strikes.length}` }, null, 2);
        }
        const result = validateIronCondor(strikes);
        return JSON.stringify(result, null, 2);
      }
      case 'validate_ranger': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 2) {
          return JSON.stringify({ valid: false, error: `Ranger requires exactly 2 strikes, got ${strikes.length}` }, null, 2);
        }
        const result = validateRanger(strikes);
        return JSON.stringify(result, null, 2);
      }

      // === RFQ Builder Tools ===
      case 'build_rfq_request': {
        const request = c.optionFactory.buildRFQRequest({
          requester: args.requester as `0x${string}`,
          underlying: args.underlying as 'ETH' | 'BTC',
          optionType: args.optionType as 'PUT' | 'CALL',
          strikes: args.strike as number,  // Single strike for vanilla options
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          note: 'Use encode_request_for_quotation to get transaction data',
        }, null, 2);
      }
      case 'build_spread_rfq': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 2) {
          return JSON.stringify({ error: `Spread requires exactly 2 strikes, got ${strikes.length}` }, null, 2);
        }
        const request = c.optionFactory.buildSpreadRFQ({
          requester: args.requester as `0x${string}`,
          underlying: args.underlying as 'ETH' | 'BTC',
          optionType: args.optionType as 'PUT' | 'CALL',
          lowerStrike: strikes[0],
          upperStrike: strikes[1],
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          note: 'Use encode_request_for_quotation to get transaction data',
        }, null, 2);
      }
      case 'build_butterfly_rfq': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 3) {
          return JSON.stringify({ error: `Butterfly requires exactly 3 strikes, got ${strikes.length}` }, null, 2);
        }
        // Validate first
        const validation = validateButterfly(strikes);
        if (!validation.valid) {
          return JSON.stringify({ error: validation.error, validation }, null, 2);
        }
        const request = c.optionFactory.buildButterflyRFQ({
          requester: args.requester as `0x${string}`,
          underlying: args.underlying as 'ETH' | 'BTC',
          optionType: args.optionType as 'PUT' | 'CALL',
          lowerStrike: strikes[0],
          middleStrike: strikes[1],
          upperStrike: strikes[2],
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          validation,
          note: 'Use encode_request_for_quotation to get transaction data',
        }, null, 2);
      }
      case 'build_condor_rfq': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 4) {
          return JSON.stringify({ error: `Condor requires exactly 4 strikes, got ${strikes.length}` }, null, 2);
        }
        const validation = validateCondor(strikes);
        if (!validation.valid) {
          return JSON.stringify({ error: validation.error, validation }, null, 2);
        }
        const request = c.optionFactory.buildCondorRFQ({
          requester: args.requester as `0x${string}`,
          underlying: args.underlying as 'ETH' | 'BTC',
          optionType: args.optionType as 'PUT' | 'CALL',
          strike1: strikes[0],
          strike2: strikes[1],
          strike3: strikes[2],
          strike4: strikes[3],
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          validation,
          note: 'Use encode_request_for_quotation to get transaction data',
        }, null, 2);
      }
      case 'build_iron_condor_rfq': {
        const strikes = args.strikes as number[];
        if (strikes.length !== 4) {
          return JSON.stringify({ error: `Iron condor requires exactly 4 strikes, got ${strikes.length}` }, null, 2);
        }
        const validation = validateIronCondor(strikes);
        if (!validation.valid) {
          return JSON.stringify({ error: validation.error, validation }, null, 2);
        }
        const request = c.optionFactory.buildIronCondorRFQ({
          requester: args.requester as `0x${string}`,
          underlying: args.underlying as 'ETH' | 'BTC',
          strike1: strikes[0],
          strike2: strikes[1],
          strike3: strikes[2],
          strike4: strikes[3],
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          validation,
          note: 'Use encode_request_for_quotation to get transaction data',
        }, null, 2);
      }
      case 'build_physical_option_rfq': {
        // Check if physical options are deployed using chain config
        const chainConfig = getChainConfigById(CHAIN_ID);
        const implType = args.optionType === 'PUT' ? 'PHYSICAL_PUT' : 'PHYSICAL_CALL';
        const implAddress = chainConfig.implementations[implType as keyof typeof chainConfig.implementations];
        if (!implAddress || implAddress === '0x0000000000000000000000000000000000000000') {
          const availablePhysical = Object.entries(chainConfig.implementations)
            .filter(([k, v]) => k.startsWith('PHYSICAL') && v !== '0x0000000000000000000000000000000000000000')
            .map(([k]) => k);
          return JSON.stringify({
            error: `${implType} not deployed on chain ${CHAIN_ID}`,
            availablePhysical,
          }, null, 2);
        }
        // Determine delivery token based on option type and underlying
        const underlying = args.underlying as 'ETH' | 'BTC';
        const optionType = args.optionType as 'PUT' | 'CALL';
        let deliveryToken: `0x${string}`;
        if (optionType === 'CALL') {
          // CALL: buyer pays strike in USDC
          deliveryToken = chainConfig.tokens.USDC.address as `0x${string}`;
        } else {
          // PUT: buyer delivers underlying (WETH for ETH, cbBTC for BTC)
          deliveryToken = (underlying === 'ETH'
            ? chainConfig.tokens.WETH.address
            : chainConfig.tokens.cbBTC.address) as `0x${string}`;
        }
        const request = c.optionFactory.buildPhysicalOptionRFQ({
          requester: args.requester as `0x${string}`,
          underlying,
          optionType,
          strike: args.strike as number,
          expiry: args.expiry as number,
          numContracts: args.numContracts as number,
          isLong: args.isLong as boolean,
          deliveryToken,
          collateralToken: args.collateralToken as 'USDC' | 'WETH' | 'cbBTC',
          requesterPublicKey: args.requesterPublicKey as string,
          offerDeadlineMinutes: (args.offerDeadlineMinutes as number) || 60,
          reservePrice: args.reservePrice as number | undefined,
        });
        return JSON.stringify({
          success: true,
          rfqParams: request,
          settlementType: 'physical',
          deliveryToken,
          note: 'Physical options deliver actual underlying on exercise',
        }, null, 2);
      }

      // === RFQ Transaction Encoding ===
      case 'encode_request_for_quotation': {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const rfqParams = args.rfqParams as any;
        const encoded = c.optionFactory.encodeRequestForQuotation(rfqParams);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: 'Send this transaction to create the RFQ',
          note: 'Ensure you have approved sufficient collateral before sending',
        }, null, 2);
      }

      // === Chain Configuration ===
      case 'get_chain_config_by_id': {
        const chainId = args.chainId as number;
        try {
          const config = getChainConfigById(chainId as 8453);
          return JSON.stringify({
            chainId: config.chainId,
            name: config.name,
            contracts: config.contracts,
            tokens: Object.entries(config.tokens || {}).map(([symbol, token]) => ({
              symbol,
              address: token.address,
              decimals: token.decimals,
            })),
          }, null, 2);
        } catch {
          return JSON.stringify({ error: `Chain ID ${chainId} not supported` }, null, 2);
        }
      }
      case 'get_token_config_by_id': {
        const chainId = args.chainId as number;
        const symbol = args.symbol as string;
        try {
          const token = getTokenConfigById(chainId as 8453, symbol);
          if (!token) {
            return JSON.stringify({ error: `Token ${symbol} not found on chain ${chainId}` }, null, 2);
          }
          return JSON.stringify({
            chainId,
            symbol,
            address: token.address,
            decimals: token.decimals,
          }, null, 2);
        } catch {
          return JSON.stringify({ error: `Token ${symbol} not found on chain ${chainId}` }, null, 2);
        }
      }
      case 'get_option_implementation_info': {
        const chainId = args.chainId as number;
        try {
          const config = getChainConfigById(chainId as 8453);
          const implementations = Object.entries(config.implementations).map(([type, address]) => ({
            type,
            address,
            deployed: address !== '0x0000000000000000000000000000000000000000',
          }));
          return JSON.stringify({
            chainId,
            implementations,
            summary: {
              deployed: implementations.filter(i => i.deployed).map(i => i.type),
              notDeployed: implementations.filter(i => !i.deployed).map(i => i.type),
            },
          }, null, 2);
        } catch {
          return JSON.stringify({ error: `Chain ID ${chainId} not supported` }, null, 2);
        }
      }

      // === Example Keypair Generation ===
      case 'generate_example_keypair': {
        const keyPair = c.rfqKeys.generateKeyPair();
        return JSON.stringify({
          warning: 'FOR DEMONSTRATION ONLY - Generate real keys locally via SDK',
          exampleFormat: {
            compressedPublicKey: keyPair.compressedPublicKey,
            publicKeyFormat: 'Compressed public key starts with 02 or 03 (33 bytes hex)',
            privateKeyFormat: '32 bytes hex (do NOT share or transmit)',
          },
          usage: {
            generate: 'const keyPair = client.rfqKeys.generateKeyPair()',
            persist: 'const keyPair = await client.rfqKeys.getOrCreateKeyPair()',
            decrypt: 'client.rfqKeys.decryptOffer(encryptedOffer, signingKey, keyPair)',
          },
        }, null, 2);
      }

      // === RFQ Settlement & Cancellation ===
      case 'encode_settle_quotation': {
        const quotationId = BigInt(args.quotationId as string);
        const encoded = c.optionFactory.encodeSettleQuotation(quotationId);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Settle quotation ${quotationId} (call after reveal phase ends)`,
          usage: 'Send this transaction to settle the RFQ with the winning offer',
        }, null, 2);
      }
      case 'encode_settle_quotation_early': {
        const quotationId = BigInt(args.quotationId as string);
        const offerAmount = BigInt(args.offerAmount as string);
        const nonce = BigInt(args.nonce as string);
        const offeror = args.offeror as string;
        const encoded = c.optionFactory.encodeSettleQuotationEarly(
          quotationId,
          offerAmount,
          nonce,
          offeror
        );
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Accept offer early for quotation ${quotationId}`,
          offeror,
          offerAmount: offerAmount.toString(),
          usage: 'Send this transaction to accept a specific offer before offer period ends',
        }, null, 2);
      }
      case 'encode_cancel_quotation': {
        const quotationId = BigInt(args.quotationId as string);
        const encoded = c.optionFactory.encodeCancelQuotation(quotationId);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Cancel quotation ${quotationId}`,
          usage: 'Send this transaction to cancel your RFQ (requester only)',
        }, null, 2);
      }
      case 'encode_cancel_offer': {
        const quotationId = BigInt(args.quotationId as string);
        const encoded = c.optionFactory.encodeCancelOfferForQuotation(quotationId);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Cancel offer for quotation ${quotationId}`,
          usage: 'Send this transaction to cancel your offer (offeror only)',
        }, null, 2);
      }
      case 'get_quotation': {
        const quotationId = BigInt(args.quotationId as string);
        const quotation = await c.optionFactory.getQuotation(quotationId);
        return JSON.stringify({
          quotationId: quotationId.toString(),
          params: {
            requester: quotation.params.requester,
            existingOptionAddress: quotation.params.existingOptionAddress,
            collateral: quotation.params.collateral,
            implementation: quotation.params.implementation,
            strikes: quotation.params.strikes.map(s => s.toString()),
            numContracts: quotation.params.numContracts.toString(),
            expiryTimestamp: quotation.params.expiryTimestamp.toString(),
            offerEndTimestamp: quotation.params.offerEndTimestamp.toString(),
            isRequestingLongPosition: quotation.params.isRequestingLongPosition,
          },
          state: {
            isActive: quotation.state.isActive,
            currentWinner: quotation.state.currentWinner,
            currentBestPriceOrReserve: quotation.state.currentBestPriceOrReserve.toString(),
            optionContract: quotation.state.optionContract,
          },
          timing: {
            offerPeriodEnds: new Date(Number(quotation.params.offerEndTimestamp) * 1000).toISOString(),
            optionExpiry: new Date(Number(quotation.params.expiryTimestamp) * 1000).toISOString(),
          },
        }, null, 2);
      }

      // === Order Book Encoding ===
      case 'encode_fill_order': {
        const orders = await c.api.fetchOrders();
        const orderIndex = args.orderIndex as number;
        if (orderIndex < 0 || orderIndex >= orders.length) {
          throw new Error(`Invalid order index: ${orderIndex}. Available: 0-${orders.length - 1}`);
        }
        const order = orders[orderIndex];
        const usdcAmount = args.usdcAmount ? BigInt(args.usdcAmount as string) : undefined;
        const referrer = args.referrer as string | undefined;
        const encoded = c.optionBook.encodeFillOrder(order, usdcAmount, referrer);
        const preview = c.optionBook.previewFillOrder(order, usdcAmount);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Fill order #${orderIndex}`,
          preview: {
            numContracts: preview.numContracts?.toString(),
            totalCollateral: preview.totalCollateral?.toString(),
            pricePerContract: preview.pricePerContract?.toString(),
            isCall: preview.isCall,
            strikes: preview.strikes?.map(s => s.toString()),
          },
          usage: 'Send this transaction to fill the order. Ensure you have approved USDC spending first.',
        }, null, 2);
      }

      // === ERC20 Encoding ===
      case 'encode_approve': {
        const tokenAddr = args.tokenAddress as string;
        const spender = args.spenderAddress as string;
        const amountStr = args.amount as string;
        const amount = amountStr.toLowerCase() === 'max'
          ? BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')
          : BigInt(amountStr);
        const encoded = c.erc20.encodeApprove(tokenAddr, spender, amount);
        return JSON.stringify({
          to: encoded.to,
          data: encoded.data,
          description: `Approve ${spender} to spend ${amountStr === 'max' ? 'unlimited' : amount.toString()} tokens`,
          tokenAddress: tokenAddr,
          spender,
          amount: amount.toString(),
          usage: 'Send this transaction to approve token spending',
        }, null, 2);
      }

      // === Additional User Data ===
      case 'get_user_offers': {
        const offers = await c.api.getUserOffersFromRfq(args.address as string);
        return JSON.stringify(offers, null, 2);
      }
      case 'get_user_options': {
        const options = await c.api.getUserOptionsFromRfq(args.address as string);
        return JSON.stringify(options, null, 2);
      }

      // === Additional Events ===
      case 'get_option_created_events': {
        const filters: { fromBlock?: number; optionAddress?: string } = {};
        if (args.fromBlock) filters.fromBlock = args.fromBlock as number;
        if (args.optionAddress) filters.optionAddress = args.optionAddress as string;
        const events = await c.events.getOptionCreatedEvents(filters);
        const summary = events.map(e => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          optionAddress: e.optionAddress,
          underlyingAsset: e.underlyingAsset,
          optionType: e.optionType,
          strikes: e.strikes?.map(s => s.toString()),
          expiry: e.expiry?.toString(),
        }));
        return JSON.stringify({ count: events.length, events: summary }, null, 2);
      }
      case 'get_quotation_requested_events': {
        const filters: { fromBlock?: number; requester?: string } = {};
        if (args.fromBlock) filters.fromBlock = args.fromBlock as number;
        if (args.requester) filters.requester = args.requester as string;
        const events = await c.events.getQuotationRequestedEvents(filters);
        const summary = events.map(e => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          quotationId: e.quotationId?.toString(),
          requester: e.requester,
        }));
        return JSON.stringify({ count: events.length, events: summary }, null, 2);
      }
      case 'get_quotation_settled_events': {
        const filters: { fromBlock?: number; quotationId?: bigint } = {};
        if (args.fromBlock) filters.fromBlock = args.fromBlock as number;
        if (args.quotationId) filters.quotationId = BigInt(args.quotationId as string);
        const events = await c.events.getQuotationSettledEvents(filters);
        const summary = events.map(e => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          quotationId: e.quotationId?.toString(),
          winningOfferor: e.winningOfferor,
          optionAddress: e.optionAddress,
        }));
        return JSON.stringify({ count: events.length, events: summary }, null, 2);
      }
      case 'get_position_closed_events': {
        const optionAddr = args.optionAddress as string;
        if (!optionAddr) {
          throw new Error('optionAddress is required for get_position_closed_events');
        }
        const filters: { fromBlock?: number } = {};
        if (args.fromBlock) filters.fromBlock = args.fromBlock as number;
        const events = await c.events.getPositionClosedEvents(optionAddr, filters);
        const summary = events.map(e => ({
          transactionHash: e.transactionHash,
          blockNumber: e.blockNumber,
          account: e.account,
          payout: e.payout?.toString(),
        }));
        return JSON.stringify({ count: events.length, events: summary }, null, 2);
      }

      // === Ticker Utilities ===
      case 'parse_ticker': {
        const ticker = args.ticker as string;
        const parsed = parseTicker(ticker);
        return JSON.stringify({
          ticker,
          underlying: parsed.underlying,
          expiry: parsed.expiry,
          expiryDate: new Date(parsed.expiry * 1000).toISOString(),
          strike: parsed.strike,
          isCall: parsed.isCall,
          optionType: parsed.isCall ? 'CALL' : 'PUT',
        }, null, 2);
      }
      case 'build_ticker': {
        const ticker = buildTicker(
          args.underlying as string,
          args.expiry as number,
          args.strike as number,
          args.isCall as boolean
        );
        return JSON.stringify({
          ticker,
          components: {
            underlying: args.underlying,
            expiry: args.expiry,
            expiryDate: new Date((args.expiry as number) * 1000).toISOString(),
            strike: args.strike,
            isCall: args.isCall,
            optionType: args.isCall ? 'CALL' : 'PUT',
          },
        }, null, 2);
      }

      // === Additional Option Info ===
      case 'get_full_option_info': {
        const optionAddr = args.optionAddress as string;
        // Use sequential mode to avoid RPC batch limits (max 10 calls)
        const fullInfo = await c.option.getFullOptionInfo(optionAddr, { sequential: true });
        return JSON.stringify({
          // From OptionInfo (nested in info)
          address: fullInfo.info.address,
          optionType: fullInfo.info.optionType,
          strikes: fullInfo.info.strikes?.map(s => s.toString()),
          expiry: fullInfo.info.expiry?.toString(),
          expiryDate: fullInfo.info.expiry ? new Date(Number(fullInfo.info.expiry) * 1000).toISOString() : null,
          collateralToken: fullInfo.info.collateralToken,
          underlyingToken: fullInfo.info.underlyingToken,
          // From FullOptionInfo
          buyer: fullInfo.buyer,
          seller: fullInfo.seller,
          isExpired: fullInfo.isExpired,
          isSettled: fullInfo.isSettled,
          numContracts: fullInfo.numContracts?.toString(),
          collateralAmount: fullInfo.collateralAmount?.toString(),
        }, null, 2);
      }
      case 'get_position_info': {
        const optionAddr = args.optionAddress as string;
        const isBuyer = args.isBuyer as boolean;
        // Get buyer/seller address and allowances from individual methods
        const holder = isBuyer
          ? await c.option.getBuyer(optionAddr)
          : await c.option.getSeller(optionAddr);
        const numContracts = await c.option.getNumContracts(optionAddr);
        const collateralAmount = await c.option.getCollateralAmount(optionAddr);
        return JSON.stringify({
          optionAddress: optionAddr,
          positionType: isBuyer ? 'buyer' : 'seller',
          holder,
          numContracts: numContracts.toString(),
          collateralAmount: collateralAmount.toString(),
        }, null, 2);
      }

      // === OptionFactory Additional Read ===
      case 'get_quotation_count': {
        const count = await c.optionFactory.getQuotationCount();
        return JSON.stringify({
          quotationCount: count.toString(),
          description: 'Total number of RFQ quotations created on the OptionFactory',
        }, null, 2);
      }
      case 'calculate_protocol_fee': {
        const numContracts = BigInt(args.numContracts as string);
        const premium = BigInt(args.premium as string);
        const price = BigInt(args.price as string);
        const fee = await c.optionFactory.calculateFee(numContracts, premium, price);
        return JSON.stringify({
          protocolFee: fee.toString(),
          inputs: {
            numContracts: numContracts.toString(),
            premium: premium.toString(),
            price: price.toString(),
          },
        }, null, 2);
      }

      default:
        throw new Error(`Unknown tool: ${name}`);
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    return JSON.stringify({ error: message }, null, 2);
  }
}

// ============ MCP Server Setup ============
const server = new Server(
  {
    name: 'thetanuts-mcp',
    version: '1.0.0',
  },
  {
    capabilities: {
      tools: {},
    },
  }
);

// List available tools
server.setRequestHandler(ListToolsRequestSchema, async () => {
  return { tools };
});

// Handle tool calls
server.setRequestHandler(CallToolRequestSchema, async (request) => {
  const { name, arguments: args } = request.params;
  const result = await handleTool(name, args || {});
  return {
    content: [{ type: 'text', text: result }],
  };
});

// Start server
async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Thetanuts MCP Server running on stdio');
}

main().catch(console.error);
