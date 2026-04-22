# Position Management

Query and manage option positions using the `client.option` module.

## Methods

| Method | Description | Signer |
|--------|-------------|--------|
| `getOptionInfo(address)` | Get basic option details | No |
| `getFullOptionInfo(address)` | Get all info in a single call | No |
| `calculatePayout(address, price)` | Calculate payout at settlement price | No |
| `calculateRequiredCollateral(address, strikes, contracts)` | Get collateral needed | No |
| `getStrikes(address)` | Get strike prices | No |
| `getExpiry(address)` | Get expiry timestamp | No |
| `isExpired(address)` | Check if expired | No |
| `isSettled(address)` | Check if settled | No |
| `getBuyer(address)` | Get buyer address | No |
| `getSeller(address)` | Get seller address | No |
| `getNumContracts(address)` | Get contract count | No |
| `getCollateralAmount(address)` | Get collateral amount | No |
| `close(address)` | Close position | Yes |
| `transfer(address, isBuyer, target)` | Transfer buyer or seller role | Yes |
| `split(address, amount)` | Split position into two | Yes |
| `payout(address)` | Execute payout after expiry | Yes |

## Usage

### Get Full Option Info

`getFullOptionInfo()` batches all state into a single RPC call. Use it when you need more than one field.

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const info = await client.option.getFullOptionInfo(optionAddress);

console.log(info.info);             // { optionType, strikes, expiryTimestamp, collateralToken, priceFeed, implementation }
console.log(info.buyer);            // '0x...'
console.log(info.seller);           // '0x...'
console.log(info.isExpired);        // false
console.log(info.isSettled);        // false
console.log(info.numContracts);     // bigint
console.log(info.collateralAmount); // bigint
```

> `getFullOptionInfo()` returns nullable fields (`| null`) for proxy contracts with incompatible ABI versions so it returns partial data instead of throwing.

### Individual State Reads

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const info      = await client.option.getOptionInfo(optionAddress);
const buyer     = await client.option.getBuyer(optionAddress);
const seller    = await client.option.getSeller(optionAddress);
const expired   = await client.option.isExpired(optionAddress);
const settled   = await client.option.isSettled(optionAddress);
const contracts = await client.option.getNumContracts(optionAddress);
const collateral = await client.option.getCollateralAmount(optionAddress);
```

### Calculate Payout

`calculatePayout()` accepts the settlement price in 8-decimal format (`$2000 = 200000000000n`).

```typescript
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const client = new ThetanutsClient({ chainId: 8453, provider });

const payout = await client.option.calculatePayout(
  optionAddress,
  200000000000n  // $2000 in 8 decimals
);
```

For off-chain payoff diagram data, use `client.utils.calculatePayout()` instead, which runs locally without RPC calls:

```typescript
const payout = client.utils.calculatePayout({
  type: 'put',
  strikes: [200000000000n],       // 8 decimals
  settlementPrice: 190000000000n,
  numContracts: 1000000000000000000n, // 18 decimals
});
```

### Close a Position

Both buyer and seller can close a position before expiry if both agree (bilateral close). Requires a signer.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const result = await client.option.close(optionAddress);
console.log('Close tx:', result.hash);
```

### Execute Payout

After expiry, either party can call `payout()` to settle the option and distribute proceeds.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const expired = await client.option.isExpired(optionAddress);
if (expired) {
  const result = await client.option.payout(optionAddress);
  console.log('Payout tx:', result.hash);
}
```

### Transfer a Position

Transfer the buyer or seller role to a new address.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

// Transfer buyer role to new address
const result = await client.option.transfer(
  optionAddress,
  true,           // true = transfer buyer role, false = seller role
  '0xNewOwner'
);
```

### Split a Position

Split one option contract into two separate contracts. Useful for partial exits.

```typescript
import { ethers } from 'ethers';
import { ThetanutsClient } from '@thetanuts-finance/thetanuts-client';

const provider = new ethers.JsonRpcProvider('https://mainnet.base.org');
const signer = new ethers.Wallet(privateKey, provider);
const client = new ThetanutsClient({ chainId: 8453, provider, signer });

const splitCollateralAmount = 500_000000n; // 500 USDC
const result = await client.option.split(optionAddress, splitCollateralAmount);
```

## Return Types

### FullOptionInfo

```typescript
interface FullOptionInfo {
  info: OptionInfo;
  buyer: string;
  seller: string;
  isExpired: boolean;
  isSettled: boolean;
  numContracts: bigint;
  collateralAmount: bigint;
}

interface OptionInfo {
  optionType: bigint;
  strikes: bigint[];
  expiryTimestamp: bigint;
  collateralToken: string;
  priceFeed: string;
  implementation: string;
}
```

## See Also

- [Token Operations](./token-operations.md) — approve collateral before close or payout
- [Events](./events.md) — query `getPositionClosedEvents` for settlement history
- [Error Handling](./error-handling.md) — `NotExpired`, `AlreadySettled`, `NotBuyer` revert reasons
