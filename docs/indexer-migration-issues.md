# Indexer Migration Issues & New Endpoints

> Tested 2026-04-07 against `indexer.thetanuts.finance` (new unified indexer)
> Compared with `optionbook-indexer.thetanuts.finance` (old indexer, to be decommissioned)

---

## Issues / Gaps

### Issue 1: Referrer `userDailyMetrics` not implemented

- **Endpoint**: `GET /api/v1/book/referrer/:addr/state`
- **Severity**: Medium
- **Description**: Old indexer returns per-user, per-day trading stats. New indexer returns `{}`.
- **Old response** (55 entries for `0x94D784...`):
  ```json
  {
    "0x54b9a63b...": {
      "2025-10-10": { "hasTraded": true, "netPnL": -1.52, "isWinning": false, "tradeCount": 1 },
      "2025-11-01": { "hasTraded": true, "netPnL": -39.22, "isWinning": false, "tradeCount": 5 }
    }
  }
  ```
- **New response**: `{}`
- **SDK impact**: `ReferrerStats.userDailyMetrics` in `src/types/api.ts:340` expects this data

---

### Issue 2: Referrer `topProfitableTrades` not implemented

- **Endpoint**: `GET /api/v1/book/referrer/:addr/state`
- **Severity**: Medium
- **Description**: Old indexer returns top 100 trades ranked by % return. New indexer returns `[]`.
- **Old response** (100 entries for `0x94D784...`):
  ```json
  {
    "userAddress": "0xd20a...",
    "tradeDescription": "0.877x-01Feb26-SOL-114-P",
    "absoluteReturn": 7.25,
    "percentageReturn": 1294.73,
    "premiumPaid": 0.559,
    "asset": "SOL",
    "optionAddress": "0xd846...",
    "referrer": "0x94d784...",
    "rank": 0
  }
  ```
- **New response**: `[]`
- **SDK impact**: `ReferrerStats.topProfitableTrades` in `src/types/api.ts:342` expects this data

---

### ~~Issue 3: SDK `ReferrerStats` type missing `summary` field~~ RESOLVED

- **Endpoint**: `GET /api/v1/book/referrer/:addr/state`
- **Severity**: ~~High~~ Resolved
- **Description**: ~~New indexer returns a rich `summary` object not present in the SDK type. Data is silently dropped.~~ Fixed — `ReferrerStats` now includes optional `summary?: ReferrerSummary`. `userDailyMetrics` and `topProfitableTrades` deprecated (clients can derive from rich position data).
- **New response** includes:
  ```json
  {
    "summary": {
      "totalPositions": 6772,
      "totalSettled": 6665,
      "totalActive": 107,
      "uniqueUsers": 56,
      "firstTradeTimestamp": 1760000653,
      "lastTradeTimestamp": 1775544999,
      "totalVolume": { "WETH": "134021.97...", "USDC": "2957373.97...", "cbBTC": "299147.47..." },
      "totalPremium": { "WETH": "0.35...", "USDC": "26593.60...", "cbBTC": "0.01..." },
      "totalFees": { "WETH": "0.02...", "USDC": "2153.34...", "cbBTC": "0.001..." },
      "totalVolumeUsd": "3390543.41",
      "totalPremiumUsd": "29733.60",
      "totalFeesUsd": "2372.34",
      "24h": { "positions": 75, "volume": {}, "premium": {}, "fees": {} },
      "7d": { "positions": 554, "...": "..." },
      "30d": { "positions": 2360, "...": "..." },
      "byImplementationType": {
        "INVERSE_CALL": { "count": 1997, "buyerWinRate": "18.13", "...": "..." },
        "PUT": { "count": 2051, "buyerWinRate": "23.86", "...": "..." },
        "PUT_SPREAD": { "count": 2724, "buyerWinRate": "49.02", "...": "..." }
      },
      "exerciseRate": "43.93",
      "avgPremiumRatio": "10.07"
    }
  }
  ```
- **SDK fix needed**: Add `summary` to `ReferrerStats` interface in `src/types/api.ts`

---

### Issue 4: Pagination not working on `/api/v1/factory/rfqs`

- **Endpoint**: `GET /api/v1/factory/rfqs?limit=2&offset=0`
- **Severity**: Low
- **Description**: Worker README documents `limit`, `offset` params with pagination metadata (`total`, `hasMore`, `limit`, `offset`). Actual response ignores pagination — returns all 934 RFQs regardless of params. No pagination metadata in response.
- **Expected response** (per README):
  ```json
  { "data": [...], "total": 934, "limit": 2, "offset": 0, "hasMore": true }
  ```
- **Actual response**:
  ```json
  { "data": [... all 934 RFQs ...] }
  ```
- **SDK impact**: None currently (SDK doesn't use pagination), but won't scale past ~5k RFQs

---

### ~~Issue 5: Daily stats endpoints return empty data~~ RESOLVED

- **Endpoints**:
  - `GET /api/v1/book/stats/daily`
  - `GET /api/v1/factory/stats/daily`
  - `GET /api/v1/stats/daily`
- **Severity**: ~~Medium~~ Resolved
- **Description**: ~~All three daily time series endpoints return empty data.~~ Fixed as of 2026-04-07 — book returns 180 entries, factory 103, combined 226. SDK methods added: `getBookDailyStats()`, `getFactoryDailyStats()`, `getDailyStats()`.

---

### Issue 6: Old indexer DNS records still active

- **Severity**: Low
- `optionbook-indexer.thetanuts.finance` still resolves and serves stale data
- `of-indexer.thetanuts.finance` / `dry-cake-8c44` still active
- Worker README says to remove once verified — pending cleanup

---

### ~~Issue 7: Factory referrals missing / empty~~ **RESOLVED (2026-04-08)**

- **Endpoint**: `GET /api/state`
- **Severity**: ~~High~~ Resolved
- **Description**: ~~The old indexer returned referral data under `referrals` in the state response, but the new indexer initially returned empty or missing referral entries.~~ The new indexer now returns referral data. The SDK `StateReferral` type was corrected to match the actual API response shape: `{ id, referrer, createdAt, createdTx, createdBlock, executed: ReferralExecution[] }`. The old incorrect type had `owner`, `feeRate`, `isActive`.

---

### ~~Issue 8: Active filter bug — cancelled RFQ appearing in active results~~ **RESOLVED (2026-04-08)**

- **Endpoint**: `GET /api/v1/factory/rfqs?status=active`
- **Severity**: ~~Medium~~ Resolved
- **Description**: ~~When filtering RFQs by `status=active`, the indexer could return cancelled RFQs whose `is_active` flag incorrectly remained `true`, causing them to slip through the server-side filter.~~ The SDK's `getFactoryRfqs()` now applies client-side re-filtering as a safety net, ensuring only RFQs matching the requested status are returned even if the indexer's `is_active` flag disagrees.

---

## New Endpoints (not yet in SDK)

### `GET /api/v1/book/stats/protocol`

Book protocol stats with time windows and breakdowns.

```
Status: WORKING
```

Response shape:
```json
{
  "chainId": 8453,
  "indexedBookAddresses": ["0xd58b..."],
  "stats": {
    "totalPositions": 7505,
    "totalSettled": 7390,
    "totalActive": 115,
    "uniqueUsers": 113,
    "totalVolume": { "WETH": "...", "USDC": "...", "cbBTC": "...", "aBasUSDC": "...", "aBasWETH": "..." },
    "totalPremium": { "...": "..." },
    "totalFees": { "...": "..." },
    "totalReferralFees": { "USDC": "15.025611" },
    "totalVolumeUsd": "3700315.97",
    "totalPremiumUsd": "31894.74",
    "totalFeesUsd": "2562.46",
    "24h": { "positions": 73, "settled": 0, "volume": {}, "premium": {}, "fees": {} },
    "7d": { "positions": 565, "..." : "..." },
    "30d": { "positions": 2373, "...": "..." },
    "byImplementationType": { "INVERSE_CALL": {}, "PUT": {}, "PUT_SPREAD": {} },
    "exerciseRate": "...",
    "avgPremiumRatio": "..."
  }
}
```

---

### `GET /api/v1/factory/stats/protocol`

Factory protocol stats with time windows + avgTimeToFill, avgOffersPerRfq.

```
Status: WORKING
```

Response shape:
```json
{
  "chainId": 8453,
  "indexedFactoryAddresses": ["0x1adc..."],
  "stats": {
    "totalPositions": 531,
    "uniqueUsers": 60,
    "totalVolume": { "USDC": "406292...", "WETH": "65632...", "cbBTC": "1276145..." },
    "totalPremium": { "...": "..." },
    "totalFees": { "...": "..." },
    "totalVolumeUsd": "1796934.54",
    "totalPremiumUsd": "291124.39",
    "totalFeesUsd": "716.65",
    "24h": { "positions": 1, "...": "..." },
    "7d": { "positions": 5, "...": "..." },
    "30d": { "positions": 43, "...": "..." }
  }
}
```

---

### `GET /api/v1/stats/protocol`

Combined book + factory protocol stats (merged totals + individual breakdowns).

```
Status: WORKING
```

Response shape:
```json
{
  "chainId": 8453,
  "stats": {
    "totalPositions": 8036,
    "totalSettled": 7390,
    "totalActive": 115,
    "uniqueUsers": 173,
    "totalVolumeUsd": "5497250.52",
    "totalPremiumUsd": "323019.13",
    "totalFeesUsd": "3279.12",
    "24h": { "positions": 74, "...": "..." },
    "7d": { "positions": 570, "...": "..." },
    "30d": { "positions": 2416, "...": "..." }
  }
}
```

---

### `GET /api/v1/book/stats/daily`

Book daily time series — trades, volume, premium, fees per day with USD.

```
Status: WORKING (180 entries as of 2026-04-07)
SDK method: client.api.getBookDailyStats()
```

---

### `GET /api/v1/factory/stats/daily`

Factory daily time series.

```
Status: WORKING (103 entries as of 2026-04-07)
SDK method: client.api.getFactoryDailyStats()
```

---

### `GET /api/v1/stats/daily`

Combined book + factory daily time series.

```
Status: WORKING (226 entries as of 2026-04-07)
SDK method: client.api.getDailyStats()
```

---

## Test Evidence

### Addresses tested

| Address | Book Positions | Book History | Referrer Positions (old) | Referrer Positions (new) | Factory Activity |
|---------|---------------|-------------|-------------------------|-------------------------|-----------------|
| `0x94D784e81A5c8cA6E19629C73217b61a256Ea1c7` | 0 | 0 | 6,770 | 6,770 | 0 |
| `0x92b8ac05b63472d1D84b32bDFBBf3e1887331567` | 63 | 63 | 220 | 220 | 0 |
| `0xdc7f6ebefe62a402e7c75dd0b6d20ed7c4cb326a` | 126 | 126 | 0 | 0 | 0 |

### Referrer comparison (`0x94D784...`)

| Field | Old Indexer | New Indexer |
|-------|-------------|-------------|
| positions | 6,770 | 6,770 |
| userDailyMetrics | 55 entries | `{}` (empty) |
| topProfitableTrades | 100 entries | `[]` (empty) |
| summary | N/A | Present (rich stats) |

### Endpoint status summary

| Endpoint | Status |
|----------|--------|
| `/api/v1/book/user/:addr/positions` | Working |
| `/api/v1/book/user/:addr/history` | Working |
| `/api/v1/book/stats` | Working |
| `/api/v1/book/referrer/:addr/state` | Partial (positions + summary, missing userDailyMetrics + topProfitableTrades) |
| `/api/v1/book/update` (POST) | Working (no-op) |
| `/api/v1/book/stats/protocol` | Working (new) |
| `/api/v1/book/stats/daily` | Working (180 entries) — SDK: `getBookDailyStats()` |
| `/api/v1/factory/rfqs` | Working (no pagination) |
| `/api/v1/factory/rfqs/:id` | Working |
| `/api/v1/factory/offers` | Working |
| `/api/v1/factory/options` | Working |
| `/api/v1/factory/stats` | Working |
| `/api/v1/factory/user/:addr/rfqs` | Working |
| `/api/v1/factory/user/:addr/offers` | Working |
| `/api/v1/factory/user/:addr/positions` | Working |
| `/api/v1/factory/option/:addr` | Working |
| `/api/v1/factory/stats/protocol` | Working (new) |
| `/api/v1/factory/stats/daily` | Working (103 entries) — SDK: `getFactoryDailyStats()` |
| `/api/v1/book/option/:addr` | Working |
| `/api/v1/book/state` | Working |
| `/api/v1/stats/protocol` | Working (new) |
| `/api/v1/stats/daily` | Working (226 entries) — SDK: `getDailyStats()` |
| `/api/state` | Working |
| `/health` | Working |
