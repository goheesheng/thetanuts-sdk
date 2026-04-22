# Scripts

This directory contains utility scripts for the Thetanuts SDK.

## Available Scripts

### run-mainnet-tests.ts

A standalone script that runs mainnet integration tests without the Vitest framework.

#### Purpose

- Quick verification of SDK functionality
- Simple pass/fail output
- Doesn't require test framework setup
- Useful for CI/CD pipelines

#### Usage

```bash
# Via npm
npm run test:mainnet:standalone

# Directly with tsx
npx tsx scripts/run-mainnet-tests.ts
```

#### Output

```
========================================
  Thetanuts SDK Mainnet Integration Tests
========================================

Initializing client...
[Client] Chain ID: 8453
[Client] OptionBook: 0xd58b814C7Ce700f251722b5555e25aE0fa8169A1
[Client] API URL: https://round-snowflake-9c31.devops-118.workers.dev
[Client] Indexer URL: https://optionbook-indexer.thetanuts.finance/api/v1

--- 1. Client Configuration ---
  [PASS] Client initialized with correct config
  [PASS] Token configurations correct
  [PASS] Implementation addresses configured

--- 2. ERC20 Module ---
  [PASS] USDC decimals = 6
  [PASS] WETH decimals = 18
  [PASS] cbBTC decimals = 8
  [PASS] USDC balance read: 15108.994814 USDC
  [PASS] USDC allowance read: 0.0 USDC

--- 3. API Module ---
  [PASS] Fetched 284 orders from API
  [PASS] Fetched protocol stats from indexer
    Unique Users: 87
    Total Options Tracked: 2582
    Open Positions: 36

--- 4. Utils Module ---
  [PASS] toStrikeDecimals: 100000 -> 10000000000000
  [PASS] fromStrikeDecimals: 10000000000000 -> 100000
  [PASS] toUsdcDecimals: 1000 -> 1000000000
  [PASS] fromUsdcDecimals: 1000000000 -> 1000
  [PASS] toPriceDecimals: 0.05 -> 5000000

--- 5. OptionBook Module ---
  [PASS] computeNonce: 99747721222730232110376224709836831380121251795636040855854444678578159737113
  [PASS] getFees for USDC
    USDC fees: 13930459

--- 6. Pricing Module ---
  [PASS] Pricing URL: https://pricing.thetanuts.finance
  [PASS] Pricing module methods available

========================================
  Test Summary
========================================

Total: 19 tests
Passed: 19
Failed: 0

========================================
  ALL TESTS PASSED
========================================
```

#### Exit Codes

| Code | Meaning |
|------|---------|
| 0 | All tests passed |
| 1 | One or more tests failed |

#### Configuration

The script uses these addresses (defined at top of file):

```typescript
const BASE_MAINNET_RPC = 'https://mainnet.base.org';
const BASE_CHAIN_ID = 8453;

const ADDRESSES = {
  OPTION_BOOK: '0xd58b814C7Ce700f251722b5555e25aE0fa8169A1',
  USDC: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
  WETH: '0x4200000000000000000000000000000000000006',
  cbBTC: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
  SAMPLE_USER: '0xF977814e90dA44bFA03b6295A0616a897441aceC',
};
```

#### Tests Performed

| Suite | Tests |
|-------|-------|
| Client Configuration | Chain ID, OptionBook address, tokens, implementations |
| ERC20 Module | Decimals for USDC/WETH/cbBTC, balance, allowance |
| API Module | Fetch orders, protocol stats |
| Utils Module | Decimal conversions (strike, USDC, price) |
| OptionBook Module | Compute nonce, get fees |
| Pricing Module | URL configuration, method availability |

## NPM Scripts Reference

These scripts are defined in `package.json`:

```json
{
  "scripts": {
    "build": "tsup",
    "dev": "tsup --watch",
    "test": "npx tsx scripts/run-mainnet-tests.ts",
    "test:benchmark": "npx tsx scripts/benchmark-indexer.ts",
    "lint": "eslint src --ext .ts",
    "lint:fix": "eslint src --ext .ts --fix",
    "typecheck": "tsc --noEmit",
    "clean": "rm -rf dist",
    "prepublishOnly": "npm run build"
  }
}
```

### Build Scripts

| Script | Description |
|--------|-------------|
| `npm run build` | Build for production (CJS + ESM + types) |
| `npm run dev` | Watch mode build for development |
| `npm run clean` | Remove dist/ directory |

### Test Scripts

| Script | Description |
|--------|-------------|
| `npm test` | Run mainnet integration tests |
| `npm run test:benchmark` | Run indexer performance benchmark |

### Code Quality Scripts

| Script | Description |
|--------|-------------|
| `npm run lint` | Check for linting errors |
| `npm run lint:fix` | Fix auto-fixable lint errors |
| `npm run typecheck` | Check TypeScript types |

## Creating New Scripts

When adding new scripts:

1. Create the script in `scripts/` directory
2. Use TypeScript with `.ts` extension
3. Add shebang for direct execution: `#!/usr/bin/env npx tsx`
4. Add npm script to `package.json`
5. Document in this README

### Example Script Template

```typescript
#!/usr/bin/env npx tsx
/**
 * Script Name
 *
 * Description of what this script does.
 *
 * Usage: npx tsx scripts/my-script.ts
 */

import { ethers } from 'ethers';
import { ThetanutsClient } from '../src/client/ThetanutsClient.js';

async function main() {
  const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
  const client = new ThetanutsClient({
    chainId: 8453,
    provider,
  });

  // Script logic here
  console.log('Script completed');
}

main().catch((error) => {
  console.error('Error:', error);
  process.exit(1);
});
```
