#!/bin/bash
# MCP Server Test Script

cd "$(dirname "$0")"

echo "=== Testing Thetanuts MCP Server ==="
echo ""

# Test 1: List tools
echo "1. Listing tools..."
TOOLS=$(echo '{"jsonrpc":"2.0","id":1,"method":"tools/list"}' | node dist/index.js 2>/dev/null)
TOOL_COUNT=$(echo "$TOOLS" | grep -o '"name"' | wc -l)
echo "   Found $TOOL_COUNT tools ✓"
echo ""

# Test 2: Get chain config (checks MCP response format)
echo "2. Testing get_chain_config..."
RESULT=$(echo '{"jsonrpc":"2.0","id":2,"method":"tools/call","params":{"name":"get_chain_config","arguments":{}}}' | node dist/index.js 2>/dev/null)
if echo "$RESULT" | grep -q '"content"'; then
  echo "   Chain config returned (MCP format) ✓"
  # Extract and show
  echo "$RESULT" | grep -o '"chainId": [0-9]*' | head -1 | sed 's/^/   /'
else
  echo "   FAILED: Invalid response"
fi
echo ""

# Test 3: Convert decimals (pure function, no network)
echo "3. Testing convert_decimals (100 USDC -> chain)..."
RESULT=$(echo '{"jsonrpc":"2.0","id":3,"method":"tools/call","params":{"name":"convert_decimals","arguments":{"value":"100","decimals":6,"direction":"toChain"}}}' | node dist/index.js 2>/dev/null)
if echo "$RESULT" | grep -q '100000000'; then
  echo "   100 USDC = 100000000 (6 decimals) ✓"
else
  echo "   Result: $RESULT"
fi
echo ""

# Test 4: Calculate payout (pure function)
echo "4. Testing calculate_payout (ETH call, strike 3000, settlement 3500)..."
RESULT=$(echo '{"jsonrpc":"2.0","id":4,"method":"tools/call","params":{"name":"calculate_payout","arguments":{"type":"call","strikes":["300000000000"],"settlementPrice":"350000000000","numContracts":"1000000000000000000"}}}' | node dist/index.js 2>/dev/null)
if echo "$RESULT" | grep -q '"payout"'; then
  PAYOUT=$(echo "$RESULT" | grep -o '"payout": "[^"]*"' | head -1)
  echo "   $PAYOUT ✓"
else
  echo "   FAILED"
fi
echo ""

# Test 5: Verify MCP protocol compliance
echo "5. Checking MCP protocol compliance..."
# Check tools/list returns proper structure
if echo "$TOOLS" | grep -q '"tools":\['; then
  echo "   tools/list format correct ✓"
fi
# Check tools/call returns content array
if echo "$RESULT" | grep -q '"content":\[{"type":"text"'; then
  echo "   tools/call format correct ✓"
fi
echo ""

echo "=== Tests Complete ==="
echo ""
echo "For interactive testing, run:"
echo "  npx @modelcontextprotocol/inspector node dist/index.js"
