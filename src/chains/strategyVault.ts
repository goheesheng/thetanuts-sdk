/**
 * StrategyVault Configuration Constants
 *
 * Contract addresses and configuration for Kairos fixed-strike vaults
 * and CLVEX directional/condor strategy vaults on Base mainnet.
 */

import type { StrategyVaultEntry } from '../types/strategyVault.js';

export const STRATEGY_VAULT_CONFIG = {
  /** Chain this module operates on */
  chainId: 8453 as const,
  chainName: 'Base',

  /** Kairos fixed-strike vaults */
  kairos: {
    vaults: [
      { address: '0x5189180C5Bb1bB54f8479a6aeFdFFEd66Ea0951b', name: 'ETH-3000', strike: 3000 },
      { address: '0xf70088De12E325562dEbfd7740089d894d5b23ce', name: 'ETH-3500', strike: 3500 },
      { address: '0xf4BeE19920B7672A763e40FAD720714B7B1cb7aa', name: 'ETH-4000', strike: 4000 },
      { address: '0x05701eE7269b5Cd36660e9A62C9Fc6B7B67FfF12', name: 'ETH-4500', strike: 4500 },
      { address: '0xE0f808f7717157627139dA38F1226E7011582b67', name: 'ETH-5000', strike: 5000 },
    ] satisfies StrategyVaultEntry[],
    baseAsset: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7',  // aBasWETH (18 decimals)
    quoteAsset: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB', // aBasUSDC (6 decimals)
    oracle: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',     // Chainlink ETH/USD on Base
  },

  /** CLVEX directional/condor strategy vaults */
  clvex: {
    vaults: [
      { address: '0xeD4c7897D5f1BD8cD00297B3348Fe558D2ABF2Ff', name: 'CLVEX Bull', strategy: 'bull' },
      { address: '0x07E7a12D9CFc5bc18f578D7C400B26741fc699BE', name: 'CLVEX Bear', strategy: 'bear' },
      { address: '0xFB073625088014fe4826ae4Ab7Cde12B922Ba5F2', name: 'CLVEX Condor', strategy: 'condor' },
    ] satisfies StrategyVaultEntry[],
  },

  /** Aave V3 on Base (optional yield stacking) */
  aave: {
    pool: '0xA238Dd80C259a72e81d7e4664a9801593F98d1c5',
    dataProvider: '0x0F43731EB8d45A581f4a36DD74F5f358bc90C73A',
    oracle: '0x2Cc0Fc26eD4563A5ce5e8bdcfe1A2878676Ae156',
  },

  /** OptionFactory address on Base (used by vaults to create weekly options) */
  optionFactory: '0x1D1Fee494dDEAF32626dcd50e0Cd83890574730f',

  /** Deployment block for event scanning */
  deploymentBlock: 36596854,
} as const;
