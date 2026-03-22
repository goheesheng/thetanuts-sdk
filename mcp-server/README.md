# Thetanuts MCP Server

Read-only MCP (Model Context Protocol) server for the Thetanuts SDK.

## Features

**This server is READ-ONLY. It does NOT:**
- Execute transactions
- Handle private keys
- Perform any state-changing operations

### Available Tools

#### Indexer API Tools (OptionBook data)
| Tool | Description |
|------|-------------|
| `get_stats` | Protocol statistics (from Indexer API) |
| `get_user_positions` | User's option positions (from Indexer API) |
| `get_user_history` | User's trade history (from Indexer API) |
| `get_referrer_stats` | Aggregated stats for a referrer address (from Indexer API) |

#### State/RFQ API Tools
| Tool | Description |
|------|-------------|
| `get_rfq` | Get specific RFQ by ID (from State/RFQ API) |
| `get_user_rfqs` | User's RFQ history (from State/RFQ API) |

#### Market & Orders
| Tool | Description |
|------|-------------|
| `get_market_data` | Current prices for BTC, ETH, SOL, etc. |
| `get_market_prices` | All supported asset prices |
| `fetch_orders` | All orders from the orderbook |
| `filter_orders` | Filter orders by asset/type/expiry |

#### Token & Option Data
| Tool | Description |
|------|-------------|
| `get_token_balance` | Token balance for address |
| `get_token_allowance` | Token allowance for spender |
| `get_token_info` | Token decimals and symbol |
| `get_option_info` | Option contract details |
| `calculate_option_payout` | Calculate payout for an option at settlement price |
| `preview_fill_order` | Preview order fill (dry-run) |

#### Utilities
| Tool | Description |
|------|-------------|
| `calculate_payout` | Calculate payoff for structures |
| `convert_decimals` | Convert to/from chain decimals |
| `get_order_fill_events` | Historical fill events |
| `get_chain_config` | Chain contracts and tokens |

#### MM Pricing
| Tool | Description |
|------|-------------|
| `get_mm_all_pricing` | Get all MM-adjusted pricing for an asset |
| `get_mm_ticker_pricing` | Get MM pricing for a specific ticker |
| `get_mm_position_pricing` | Get position-aware MM pricing with collateral cost |
| `get_mm_spread_pricing` | Get MM pricing for a two-leg spread |
| `get_mm_condor_pricing` | Get MM pricing for a four-leg condor |
| `get_mm_butterfly_pricing` | Get MM pricing for a three-leg butterfly |

#### RFQ Quotation Tools
| Tool | Description |
|------|-------------|
| `get_quotation` | Get detailed quotation info by ID including parameters and current state |
| `encode_settle_quotation` | Encode settlement transaction for an RFQ after reveal phase (returns tx data) |
| `encode_settle_quotation_early` | Encode early settlement to accept a specific offer before offer period ends |
| `encode_cancel_quotation` | Encode cancellation transaction for an RFQ (requester only) |
| `encode_cancel_offer` | Encode offer cancellation transaction (offeror only) |

**Note:** Encoding tools return transaction data for wallet signing - they do NOT execute transactions.

## Installation

```bash
cd mcp-server
npm install
npm run build
```

## Usage

### With Claude Desktop

Add to your Claude Desktop config (`~/Library/Application Support/Claude/claude_desktop_config.json`):

```json
{
  "mcpServers": {
    "thetanuts": {
      "command": "node",
      "args": ["/path/to/thetanuts-sdk/mcp-server/dist/index.js"],
      "env": {
        "THETANUTS_RPC_URL": "https://mainnet.base.org"
      }
    }
  }
}
```

### With Clawdbot

Add to your `.mcp.json`:

```json
{
  "mcpServers": {
    "thetanuts": {
      "command": "node",
      "args": ["./mcp-server/dist/index.js"]
    }
  }
}
```

### Development

```bash
npm run dev  # Run with tsx (no build needed)
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `THETANUTS_RPC_URL` | `https://mainnet.base.org` | RPC endpoint |

## Examples

### Get Market Data
```
Tool: get_market_data
Result: { prices: { BTC: 95000, ETH: 3200, ... } }
```

### Filter ETH Calls
```
Tool: filter_orders
Args: { asset: "ETH", type: "call" }
Result: { count: 5, orders: [...] }
```

### Get MM Pricing
```
Tool: get_mm_ticker_pricing
Args: { ticker: "ETH-28FEB26-2800-C" }
Result: {
  ticker: "ETH-28FEB26-2800-C",
  rawBidPrice: 0.0245,
  rawAskPrice: 0.0255,
  feeAdjustedBid: 0.0241,
  feeAdjustedAsk: 0.0259,
  strike: 2800,
  expiry: 1740700800,
  isCall: true,
  byCollateral: { ... }
}
```

### Get RFQ Quotation
```
Tool: get_quotation
Args: { quotationId: "744" }
Result: {
  quotationId: "744",
  requester: "0x...",
  status: "SETTLED",
  parameters: { ... },
  offers: [ ... ]
}
```

### Encode Settlement Transaction
```
Tool: encode_settle_quotation
Args: { quotationId: "744" }
Result: {
  to: "0x...",           // OptionFactory address
  data: "0x...",         // Encoded calldata
  description: "Settle quotation 744"
}
```

**Note:** Use the returned `to` and `data` with your wallet to sign and send the transaction.

## License

MIT
