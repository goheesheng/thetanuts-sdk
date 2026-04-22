# MCP Server

A read-only MCP (Model Context Protocol) server that exposes Thetanuts SDK functionality to AI agents and LLM-powered tools.

**This server is READ-ONLY.** It does not execute transactions, handle private keys, or perform any state-changing operations. Encoding tools return calldata for wallet signing only.

For full details, see [mcp-server/README.md](../../mcp-server/README.md) and [mcp-server/SPEC.md](../../mcp-server/SPEC.md).

## Available Tools

### Indexer API (OptionBook data)

| Tool | Description |
|------|-------------|
| `get_stats` | Protocol statistics |
| `get_user_positions` | User's option positions |
| `get_user_history` | User's trade history |
| `get_referrer_stats` | Aggregated stats for a referrer address |

### State / RFQ API

| Tool | Description |
|------|-------------|
| `get_rfq` | Get specific RFQ by ID |
| `get_user_rfqs` | User's RFQ history |

### Market & Orders

| Tool | Description |
|------|-------------|
| `get_market_data` | Current prices for BTC, ETH, SOL, etc. |
| `get_market_prices` | All supported asset prices |
| `fetch_orders` | All orders from the order book |
| `filter_orders` | Filter orders by asset, type, or expiry |

### Token & Option Data

| Tool | Description |
|------|-------------|
| `get_token_balance` | Token balance for address |
| `get_token_allowance` | Token allowance for spender |
| `get_token_info` | Token decimals and symbol |
| `get_option_info` | Option contract details |
| `get_full_option_info` | All strikes, positions, and settlement status |
| `calculate_option_payout` | Calculate payout at settlement price |
| `preview_fill_order` | Dry-run order fill preview |

### MM Pricing

| Tool | Description |
|------|-------------|
| `get_mm_all_pricing` | All MM-adjusted pricing for an asset |
| `get_mm_ticker_pricing` | MM pricing for a specific ticker |
| `get_mm_position_pricing` | Position-aware MM pricing with collateral cost |
| `get_mm_spread_pricing` | MM pricing for a two-leg spread |
| `get_mm_condor_pricing` | MM pricing for a four-leg condor |
| `get_mm_butterfly_pricing` | MM pricing for a three-leg butterfly |

### RFQ Quotation Tools

| Tool | Description |
|------|-------------|
| `get_quotation` | Quotation info by ID including parameters and state |
| `get_quotation_count` | Total quotations created |
| `get_user_offers` | All RFQ offers made by a user |
| `get_user_options` | All options held by a user |
| `encode_settle_quotation` | Encode settlement transaction (returns tx data) |
| `encode_settle_quotation_early` | Encode early settlement before offer period ends |
| `encode_cancel_quotation` | Encode cancellation transaction |
| `encode_cancel_offer` | Encode offer cancellation |

### RFQ Builder Tools

| Tool | Description |
|------|-------------|
| `build_rfq_request` | Build RFQ for vanilla PUT or CALL |
| `build_spread_rfq` | Build two-leg spread RFQ |
| `build_butterfly_rfq` | Build three-leg butterfly RFQ |
| `build_condor_rfq` | Build four-leg condor RFQ |
| `build_iron_condor_rfq` | Build four-leg iron condor RFQ |
| `build_physical_option_rfq` | Build physically settled vanilla RFQ |
| `encode_request_for_quotation` | Encode RFQ creation transaction |

### Calculation Tools

| Tool | Description |
|------|-------------|
| `calculate_payout` | Calculate payoff for structures |
| `calculate_num_contracts` | Number of contracts from trade amount |
| `calculate_collateral_required` | Collateral required for a position in USDC |
| `calculate_premium_per_contract` | Premium per contract in USD from MM price |
| `calculate_reserve_price` | Total reserve price (minimum acceptable premium) |
| `calculate_delivery_amount` | Delivery amount for physical options |
| `calculate_protocol_fee` | Protocol fee for an RFQ trade |
| `convert_decimals` | Convert to/from chain decimals |

### Validation Tools

| Tool | Description |
|------|-------------|
| `validate_butterfly` | Validate butterfly strike configuration |
| `validate_condor` | Validate condor strike configuration |
| `validate_iron_condor` | Validate iron condor strike configuration |
| `validate_ranger` | Validate ranger option strike configuration |

### Chain Configuration Tools

| Tool | Description |
|------|-------------|
| `get_chain_config` | Chain contracts and tokens |
| `get_chain_config_by_id` | Full chain configuration by chain ID |
| `get_token_config_by_id` | Token configuration by chain ID and symbol |
| `get_option_implementation_info` | All implementation addresses and deployment status |

### Encoding Tools (Transaction Builders)

| Tool | Description |
|------|-------------|
| `encode_fill_order` | Encode fill order transaction (returns calldata) |
| `encode_approve` | Encode token approval transaction (returns calldata) |

### Event Query Tools

| Tool | Description |
|------|-------------|
| `get_order_fill_events` | Historical fill events |
| `get_option_created_events` | Historical option creation events |
| `get_quotation_requested_events` | Historical RFQ request events |
| `get_quotation_settled_events` | Historical RFQ settlement events |
| `get_position_closed_events` | Position close events for a specific option |

### Utility Tools

| Tool | Description |
|------|-------------|
| `parse_ticker` | Parse option ticker (e.g., "ETH-16FEB26-1800-P") into components |
| `build_ticker` | Build option ticker from components |
| `get_position_info` | Position information for buyer or seller |
| `generate_example_keypair` | Generate example ECDH keypair (demo only) |

## Setup

### Build

```bash
cd mcp-server
npm install
npm run build
```

### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json`:

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

### Other MCP Clients

Add to `.mcp.json` at your project root:

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

### Development (no build required)

```bash
cd mcp-server
npm run dev
```

## Environment Variables

| Variable | Default | Description |
|----------|---------|-------------|
| `THETANUTS_RPC_URL` | `https://mainnet.base.org` | RPC endpoint for on-chain reads |

## Example Calls

### Get market prices
```
Tool: get_market_data
Result: { prices: { BTC: 95000, ETH: 3200, ... } }
```

### Filter ETH call orders
```
Tool: filter_orders
Args: { asset: "ETH", type: "call" }
Result: { count: 5, orders: [...] }
```

### Get MM pricing for a specific ticker
```
Tool: get_mm_ticker_pricing
Args: { ticker: "ETH-28FEB26-2800-C" }
Result: { rawBidPrice: 0.0245, rawAskPrice: 0.0255, feeAdjustedBid: 0.0241, ... }
```

### Encode a fill (returns calldata, does not send)
```
Tool: encode_fill_order
Args: { orderId: "...", amount: "10000000" }
Result: { to: "0x...", data: "0x..." }
```

## See Also

- [mcp-server/README.md](../../mcp-server/README.md) — full setup instructions and examples
- [mcp-server/SPEC.md](../../mcp-server/SPEC.md) — tool parameter schemas
- [Error Handling](./error-handling.md) — error codes used by the underlying SDK
