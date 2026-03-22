# Thetanuts MCP Server Specification

## Overview

This MCP (Model Context Protocol) server provides **read-only** access to the Thetanuts SDK for querying options data on Base mainnet.

## MCP Protocol Compliance

This server implements the [Model Context Protocol](https://modelcontextprotocol.io/) specification:

### Transport
- **Type:** stdio (stdin/stdout)
- **Format:** JSON-RPC 2.0

### Required Methods
| Method | Description | Status |
|--------|-------------|--------|
| `tools/list` | List available tools | ✅ Implemented |
| `tools/call` | Execute a tool | ✅ Implemented |

### Response Format
All tool responses follow MCP standard:
```json
{
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{ ... JSON result ... }"
      }
    ]
  },
  "jsonrpc": "2.0",
  "id": 1
}
```

## Security Constraints

### ✅ ALLOWED (Read-Only)
- Fetch market data and prices
- Query orderbook
- Get user positions and history
- Check token balances/allowances
- Calculate option payouts
- Preview order fills (dry-run)
- Query blockchain events
- Get protocol statistics

### ❌ FORBIDDEN (Not Implemented)
- Execute transactions
- Fill/cancel orders
- Handle private keys
- Sign messages
- Approve token spending
- Any state-changing operations

## Tools Specification

### Market Data Tools

#### `get_market_data`
Returns current prices for all supported assets (BTC, ETH, SOL, XRP, BNB, AVAX).

**Input:** None
**Output:** `{ prices: { ETH: number, BTC: number, ... }, metadata: { lastUpdated, currentTime } }`

#### `get_market_prices`
Returns raw price data for all assets.

**Input:** None
**Output:** `Record<string, MarketPrice>`

---

### Order Tools

#### `fetch_orders`
Fetches all available orders from the Thetanuts orderbook.

**Input:** None
**Output:** `{ count: number, orders: OrderSummary[] }`

#### `filter_orders`
Filter orders by type or expiry.

**Input:**
- `isCall?: boolean` - Filter call/put
- `minExpiry?: number` - Minimum expiry timestamp

**Output:** `{ count: number, orders: OrderSummary[] }`

#### `preview_fill_order`
Preview what a fill would look like (dry-run, no execution).

**Input:**
- `orderIndex: number` - Index from fetch_orders
- `usdcAmount?: string` - Amount to spend (6 decimals)

**Output:** `{ numContracts, collateralToken, totalCollateral, ... }`

---

### User Data Tools

#### `get_user_positions`
Get all option positions for an address.

**Input:** `{ address: string }`
**Output:** Array of position objects

#### `get_user_history`
Get trade history for an address.

**Input:** `{ address: string }`
**Output:** Array of trade history entries

---

### Token Tools

#### `get_token_balance`
**Input:** `{ tokenAddress: string, ownerAddress: string }`
**Output:** `{ balance: string }`

#### `get_token_allowance`
**Input:** `{ tokenAddress: string, owner: string, spender: string }`
**Output:** `{ allowance: string }`

#### `get_token_info`
**Input:** `{ tokenAddress: string }`
**Output:** `{ decimals: number, symbol: string }`

---

### Option Tools

#### `get_option_info`
Get detailed info about an option contract.

**Input:** `{ optionAddress: string }`
**Output:** Full option details including strikes, expiry, buyer, seller, etc.

#### `calculate_option_payout`
Calculate payout for an existing option at a settlement price.

**Input:** `{ optionAddress: string, settlementPrice: string }`
**Output:** `{ payout: string }`

---

### Pricing Tools

#### `get_greeks`
Calculate option Greeks.

**Input:**
- `underlying: string` - "ETH" or "BTC"
- `optionType: "call" | "put"`
- `strike: string` - Strike in 8 decimals
- `expiry: number` - Unix timestamp
- `size?: string` - Position size (18 decimals)

**Output:** `{ delta, gamma, theta, vega, rho, impliedVolatility, ... }`

#### `get_iv_surface`
Get implied volatility surface.

**Input:** `{ underlying: string }`
**Output:** `{ underlying, points: [...], timestamp }`

---

### Utility Tools

#### `calculate_payout`
Pure calculation of option payoff.

**Input:**
- `type: "call" | "put" | "call_spread" | "put_spread"`
- `strikes: string[]` - Strike prices (8 decimals)
- `settlementPrice: string` - Settlement price (8 decimals)
- `numContracts: string` - Size (18 decimals)

**Output:** `{ payout: string }`

#### `convert_decimals`
Convert between human-readable and on-chain values.

**Input:**
- `value: string`
- `decimals: number` - 6 for USDC, 8 for prices, 18 for size
- `direction: "toChain" | "fromChain"`

**Output:** `{ result: string }`

---

### Event Tools

#### `get_order_fill_events`
Query historical fill events.

**Input:**
- `fromBlock?: number` - Starting block (negative = relative)
- `maker?: string` - Filter by maker
- `taker?: string` - Filter by taker

**Output:** `{ count: number, events: [...] }`

---

### RFQ Tools

#### `get_rfq`
Get a specific RFQ by ID.

**Input:** `{ quotationId: string }`
**Output:** RFQ details

#### `get_user_rfqs`
Get all RFQs for a user.

**Input:** `{ address: string }`
**Output:** Array of RFQs

---

### Config Tools

#### `get_chain_config`
Get chain configuration.

**Input:** None
**Output:** `{ chainId, name, contracts, tokens }`

---

## Testing

### Manual Testing
```bash
# List tools
echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js

# Call a tool
echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chain_config","arguments":{}}}' | node dist/index.js
```

### MCP Inspector
```bash
npx @modelcontextprotocol/inspector node dist/index.js
```

### Automated Tests
```bash
./test.sh
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `THETANUTS_RPC_URL` | `https://mainnet.base.org` | Base RPC endpoint |

## Decimal Reference

| Type | Decimals | Example |
|------|----------|---------|
| USDC amounts | 6 | 1000 USDC = `1000000000` |
| Prices (strike, settlement) | 8 | $3000 = `300000000000` |
| Contract size | 18 | 1 contract = `1000000000000000000` |
