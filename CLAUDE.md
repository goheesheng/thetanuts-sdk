# CLAUDE.md — Thetanuts SDK

## What This Is

`@thetanuts-finance/thetanuts-client` — TypeScript SDK for Thetanuts Finance V4 options trading on Base (chain 8453). Modular design with 11 modules attached to a single `ThetanutsClient` class.

## Commands

```bash
npm run build        # tsup → dist/ (ESM + CJS + .d.ts)
npm run typecheck    # tsc --noEmit
npm run lint         # eslint src
npm run test         # npx tsx scripts/run-mainnet-tests.ts
npm run dev          # tsup --watch
```

## Architecture

```
ThetanutsClient (src/client/ThetanutsClient.ts)
├── client.erc20         → ERC20Module        (token approvals, balances)
├── client.optionBook    → OptionBookModule    (fill existing orders)
├── client.optionFactory → OptionFactoryModule (RFQ lifecycle, sealed-bid auctions)
├── client.option        → OptionModule        (position management, exercise)
├── client.api           → APIModule           (indexer queries, market data)
├── client.events        → EventsModule        (blockchain event queries)
├── client.ws            → WebSocketModule     (real-time subscriptions)
├── client.utils         → UtilsModule         (payout calculations)
├── client.rfqKeys       → RFQKeyManagerModule (ECDH keypairs, offer encryption)
├── client.mmPricing     → MMPricingModule     (market maker pricing)
└── client.zendfi        → ZendFiModule        (non-liquidatable lending) ← NEW
```

## Directory Structure

```
src/
├── index.ts                    # Main exports
├── client/
│   └── ThetanutsClient.ts      # Main client class (attach all modules here)
├── modules/
│   ├── erc20.ts                # Token operations
│   ├── optionBook.ts           # Order book trading
│   ├── optionFactory.ts        # RFQ factory operations
│   ├── option.ts               # Option position management
│   ├── api.ts                  # Indexer API queries
│   ├── events.ts               # Blockchain events
│   ├── websocket.ts            # WebSocket subscriptions
│   ├── utils.ts                # Payout calculations
│   ├── mmPricing.ts            # Market maker pricing
│   ├── rfqKeyManager.ts        # ECDH key management
│   └── zendfi.ts               # ZendFi lending module ← NEW
├── types/
│   ├── client.ts               # ThetanutsClientConfig
│   ├── errors.ts               # Error class hierarchy
│   ├── zendfi.ts               # ZendFi types ← NEW
│   └── ... (14 more type files)
├── abis/
│   ├── index.ts                # Re-exports all ABIs
│   ├── zendfi.ts               # ZendFi contract ABIs ← NEW
│   └── ... (4 existing ABI files)
├── chains/
│   ├── index.ts                # Chain configs (CHAIN_CONFIGS_BY_ID)
│   └── zendfi.ts               # ZendFi config constants ← NEW
└── utils/
    ├── errors.ts               # createError, mapContractError, mapHttpError
    ├── validation.ts           # validateAddress
    ├── decimals.ts             # toBigInt, fromBigInt, formatAmount
    └── ...
```

## Module Coding Pattern (MUST follow for all new modules)

```typescript
export class NewModule {
  constructor(private readonly client: ThetanutsClient) {}

  // Read contract (cached)
  private getReadContract(address: string) {
    return new Contract(address, ABI, this.client.provider);
  }

  // Write contract (requires signer)
  private getWriteContract(address: string) {
    const signer = this.client.requireSigner();
    return new Contract(address, ABI, signer);
  }

  // Write method pattern
  async writeMethod(params: InputType): Promise<TransactionReceipt> {
    const signer = this.client.requireSigner();
    const contract = this.getWriteContract(ADDRESS);

    try {
      const gasEstimate = await contract.functionName.estimateGas(...args);
      const gasLimit = (gasEstimate * 120n) / 100n; // 20% buffer
      const tx = await contract.functionName(...args, { gasLimit });
      const receipt = await tx.wait();
      if (!receipt) throw createError('TRANSACTION_FAILED', 'No receipt');

      this.client.logger.info('Operation succeeded', { txHash: receipt.hash });
      return receipt;
    } catch (error) {
      this.client.logger.error('Operation failed', { error });
      throw mapContractError(error);
    }
  }

  // Encode method (for viem/wagmi)
  encodeMethod(params: InputType): { to: string; data: string } {
    const iface = new Interface(ABI);
    const data = iface.encodeFunctionData('functionName', [...args]);
    return { to: ADDRESS, data };
  }
}
```

## Error Handling

```typescript
// Use existing error classes:
throw new SignerRequiredError();
throw new InsufficientBalanceError('message', cause);
throw createError('INVALID_PARAMS', 'message');

// Map external errors:
throw mapContractError(ethersError);
throw mapHttpError(axiosError);
```

## Key Conventions

- **TypeScript strict mode** — all types explicit, no `any` unless wrapping external
- **bigint for on-chain values** — never use `number` for token amounts, strikes, etc.
- **ethers v6** — `Contract`, `Interface`, `parseUnits`, `formatUnits` (NOT v5)
- **20% gas buffer** — `(gasEstimate * 120n) / 100n` for AA wallets
- **Lowercase addresses** for cache keys — `address.toLowerCase()`
- **JSDoc on all public methods** — `@param`, `@returns`, `@throws`, `@example`
- **No console.log** — use `this.client.logger.debug/info/error()`
- **Validate addresses** — `validateAddress(addr, 'fieldName')` before contract calls
- **Await receipts** — always `await tx.wait()`, check receipt is not null
- **Reuse SDK modules** — use `this.client.erc20`, `this.client.rfqKeys`, etc. Don't reimplement

## ZendFi Module — What It Does

Non-liquidatable lending via the LoanCoordinator contract. Borrowers deposit ETH/BTC, receive USDC, repay at expiry. Uses physically-settled call options via Thetanuts V4 RFQ.

### ZendFi Contract Addresses (Base)
- LoanCoordinator: `0x6278B8B09Df960599fb19EBa4b79aed0ED6B077b`
- LoanHandler: `0x6e0019bF9a44B60d57435a032Cb86b716629C08E`
- USDC: `0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913`
- WETH: `0x4200000000000000000000000000000000000006`
- cbBTC: `0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf`

### ZendFi Loan Cost Formula (BigInt arithmetic)
```
OWE = depositAmount * strike / 10^(decimals + 8 - 6)
optionCost = askPrice * underlyingPrice * depositAmount / 10^decimals
capitalCost = OWE * (apr/100) * durationInYears  (min 0.01 USDC)
protocolFee = OWE * 4 / 10000
finalLoanAmount = OWE - optionCost - capitalCost - protocolFee
effectiveAPR = (totalCosts / finalLoanAmount) * (365.25 days / duration) * 100
```

Promo: >90 days + <50% LTV → optionCost=0, apr=5.68%

### ZendFi Data Sources
- Pricing: `https://pricing.thetanuts.finance/all` (Deribit-style option data, 30s cache)
- Indexer: `https://zendfi-loan-indexer-v1.devops-118.workers.dev/api/state` (loan state)
- LoanCoordinator events: Listen on OptionFactory (LoanCoordinator does NOT emit events)

### Reference Implementation
Working Next.js app using this module: `/Users/eesheng_eth/Desktop/zendfi-with-sdk/`
- `src/services/thetanuts.ts` — ThetanutsService class (port to ZendFiModule)
- `src/services/pricing.ts` — pricing fetch, filtering, loan calculation
- `src/services/constants.ts` — addresses, promo config
- `src/services/abis.ts` — LoanCoordinator + PhysicalOption ABIs
- `src/types/index.ts` — all ZendFi types

### Implementation Plan
Full detailed plan at: `/Users/eesheng_eth/.claude/plans/rustling-chasing-candle.md`

## Do NOT
- Add "Co-Authored-By" lines to git commits
- Use `console.log` — use `this.client.logger`
- Create new error classes without extending `ThetanutsError`
- Duplicate functionality already in existing modules (use `this.client.erc20`, etc.)
- Use ethers v5 patterns (`BigNumber`, `utils.parseUnits`) — use v6 (`bigint`, `ethers.parseUnits`)
