/**
 * WheelVault Configuration Constants
 *
 * Contract addresses, per-asset vault addresses, shared infrastructure,
 * and market constants for Gyro wheel strategy vaults on Ethereum mainnet.
 */

import type { WheelVaultAssetConfig } from '../types/wheelVault.js';

export const WHEEL_VAULT_CONFIG = {
  /** Chain this module operates on */
  chainId: 1 as const,
  chainName: 'Ethereum',

  /** Per-asset vault configuration */
  assets: {
    WBTC: {
      label: 'WBTC',
      icon: '\u20BF',
      vault: '0x77D5d8c86cC66f95Fa8cdacFa7105dF0BC4d9AA9',
      markets: '0x38E7ab2D8b6c3e6149B8085f34E8C832c5eFDAD1',
      marketsLens: '0x5C28f508529c097dc26c86f6b74D0249ae17eb6e',
      color: '#f7931a',
      colorGradient: 'linear-gradient(to right, #f7931a, #ffb347)',
    } satisfies WheelVaultAssetConfig,
    XAUT: {
      label: 'XAUt',
      icon: '\uD83E\uDD47',
      vault: '0x6C8753ACCbB9d370D63d684c03D607C91b8E1602',
      markets: '0x249a7f751382Fc39A50bd5Dc0CC17f4d54af78Bc',
      marketsLens: '0xbD42297982BA6A65aDA1D9B759fcF855395157C0',
      color: '#d4af37',
      colorGradient: 'linear-gradient(to right, #d4af37, #f0d060)',
    } satisfies WheelVaultAssetConfig,
    SPYON: {
      label: 'SPYon',
      icon: '\uD83D\uDCC8',
      vault: '0xAe3bae89890213c43FeEe4B98b7e34645652cFe1',
      markets: '0xe6656Fc4360023Af9a6d8917a74563B9ce2fe91F',
      marketsLens: '0x0709b125936FAf0022a23CB295Cb298faf4d137a',
      color: '#22c55e',
      colorGradient: 'linear-gradient(to right, #22c55e, #4ade80)',
    } satisfies WheelVaultAssetConfig,
  },

  /** Shared contract addresses (same for all assets) */
  contracts: {
    router: '0x53A14b15CaDBB02725B8ABf781a5e91bdB1bC1Ab',
    lens: '0xf5b1D7B8885B40676A9f27e979F8F6d8e7D4fcD1',
    usdc: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
    npm: '0xC36442b4a4522E871399CD717aBDD847Ab11FE88',
    multicall3: '0xcA11bde05977b3631167028862bE2a173976CA11',
  },

  /** Markets constants */
  ivMin: 2000,    // 20% in bps
  ivMax: 20000,   // 200% in bps
  ivTick: 500,    // 5% in bps
  exerciseWindow: 3600, // 1 hour in seconds

  /** Swap aggregator (KyberSwap on Ethereum) */
  swapAggregatorRouter: '0x6131B5fae19EA4f9D964eAc0408E4408b66337b5',
  swapApiBase: 'https://aggregator-api.kyberswap.com/ethereum/api/v1',
} as const;
