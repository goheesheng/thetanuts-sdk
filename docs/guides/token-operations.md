# Token Operations

Read balances, check allowances, and approve token spending using the `client.erc20` module.

## Methods

| Method | Description | Signer |
|--------|-------------|--------|
| `getBalance(token, owner?)` | Get token balance | No |
| `getAllowance(token, owner, spender)` | Get spending allowance | No |
| `getDecimals(token)` | Get token decimals (cached) | No |
| `getSymbol(token)` | Get token symbol | No |
| `approve(token, spender, amount)` | Approve token spending | Yes |
| `ensureAllowance(token, spender, amount)` | Approve only if current allowance is insufficient | Yes |
| `transfer(token, to, amount)` | Transfer tokens to address | Yes |
| `encodeApprove(token, spender, amount)` | Encode approval for external wallet | No |

## Usage

### Read Balance and Allowance

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const client = new ThetanutsClient({ chainId: 8453, provider });

const usdcAddress = client.chainConfig.tokens.USDC.address;
const userAddress = '0xYourAddress';

// Get token balance
const balance = await client.erc20.getBalance(usdcAddress, userAddress);
console.log(`Balance: ${ethers.formatUnits(balance, 6)} USDC`);

// Get token decimals (cached after first call)
const decimals = await client.erc20.getDecimals(usdcAddress);
console.log(`Decimals: ${decimals}`); // 6

// Check allowance before a fill or RFQ
const spender = client.chainConfig.contracts.optionBook;
const allowance = await client.erc20.getAllowance(usdcAddress, userAddress, spender);
console.log(`Allowance: ${ethers.formatUnits(allowance, 6)} USDC`);
```

### Approve Spending

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const usdcAddress = client.chainConfig.tokens.USDC.address;
const spender = client.chainConfig.contracts.optionBook;

// Approve an exact amount
const receipt = await client.erc20.approve(
  usdcAddress,
  spender,
  1000_000000n  // 1000 USDC (6 decimals)
);
console.log('Approval tx:', receipt.hash);
```

### ensureAllowance (Recommended)

`ensureAllowance()` checks the current allowance first and only submits an approval transaction if needed. This is the preferred pattern before `fillOrder()` or `requestForQuotation()`.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const usdcAddress = client.chainConfig.tokens.USDC.address;
const spender = client.chainConfig.contracts.optionBook;
const requiredAmount = 10_000000n; // 10 USDC

const result = await client.erc20.ensureAllowance(
  usdcAddress,
  spender,
  requiredAmount
);

if (result.approved) {
  console.log('Approval tx:', result.txHash);
} else {
  console.log('Allowance was already sufficient — no transaction needed');
}

// Now safe to fill the order
const receipt = await client.optionBook.fillOrder(order, requiredAmount);
```

### Transfer Tokens

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const receipt = await client.erc20.transfer(
  client.chainConfig.tokens.USDC.address,
  '0xRecipientAddress',
  50_000000n  // 50 USDC
);
console.log('Transfer tx:', receipt.hash);
```

### Encode Approval for External Wallets

Use `encodeApprove()` when you need to submit the approval through viem, wagmi, a Safe multisig, or another external wallet rather than the built-in ethers signer.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const { to, data } = client.erc20.encodeApprove(
  client.chainConfig.tokens.USDC.address,
  client.chainConfig.contracts.optionBook,
  10_000000n  // 10 USDC
);

// Send with viem/wagmi
const hash = await walletClient.sendTransaction({ to, data });

// Or with ethers.js
const tx = await signer.sendTransaction({ to, data });
```

## Token Addresses (Base Mainnet)

All addresses are available from `client.chainConfig` — no hardcoding needed.

```typescript
const config = client.chainConfig;

config.tokens.USDC.address;   // 0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913
config.tokens.USDC.decimals;  // 6
config.tokens.WETH.address;   // 0x4200000000000000000000000000000000000006
config.tokens.WETH.decimals;  // 18
config.tokens.cbBTC.address;  // 0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf
config.tokens.cbBTC.decimals; // 8
```

## Decimal Reference

| Token | Decimals | Example |
|-------|----------|---------|
| USDC | 6 | `1_000000n` = 1 USDC |
| WETH | 18 | `1_000000000000000000n` = 1 WETH |
| cbBTC | 8 | `1_00000000n` = 1 cbBTC |

Use `client.utils` for safe conversions:

```typescript
const usdc = client.utils.toBigInt('100.5', 6);   // 100500000n
const weth = client.utils.toBigInt('1.5', 18);    // 1500000000000000000n
const display = client.utils.fromBigInt(100500000n, 6);  // '100.5'
```

## See Also

- [Position Management](./position-management.md) — approve collateral before closing positions
- [Error Handling](./error-handling.md) — `INSUFFICIENT_ALLOWANCE`, `INSUFFICIENT_BALANCE` error codes
- [Production Checklist](./production-checklist.md) — collateral approval flow best practices
