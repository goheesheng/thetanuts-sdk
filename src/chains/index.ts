import type { SupportedChainId, SupportedNetwork } from '../types/client.js';

/**
 * Token configuration
 */
export interface TokenConfig {
  address: string;
  symbol: string;
  decimals: number;
}

/**
 * V4 Contract addresses
 */
export interface ContractAddresses {
  /** OptionBook contract address (null if not deployed on this chain) */
  optionBook: string | null;
  /** OptionFactory contract address (null if not deployed on this chain) */
  optionFactory: string | null;
}

/**
 * Option implementation addresses
 */
export interface ImplementationAddresses {
  /** Put option implementation */
  PUT: string;
  /** Inverse call option implementation */
  INVERSE_CALL: string;
  /** Linear call option implementation */
  LINEAR_CALL: string;
  /** Call spread implementation */
  CALL_SPREAD: string;
  /** Put spread implementation */
  PUT_SPREAD: string;
  /** Inverse call spread implementation */
  INVERSE_CALL_SPREAD: string;
  /** Call butterfly implementation */
  CALL_FLY: string;
  /** Put butterfly implementation */
  PUT_FLY: string;
  /** Call condor implementation */
  CALL_CONDOR: string;
  /** Put condor implementation */
  PUT_CONDOR: string;
  /** Iron condor implementation */
  IRON_CONDOR: string;
  /** Ranger (zone-bound) implementation */
  RANGER: string;
  /** Physically settled call loan handler implementation */
  CALL_LOAN: string;
  /** Physically settled call option implementation */
  PHYSICAL_CALL: string;
  /** Physically settled put option implementation */
  PHYSICAL_PUT: string;
  /** Physically settled call spread implementation */
  PHYSICAL_CALL_SPREAD: string;
  /** Physically settled put spread implementation */
  PHYSICAL_PUT_SPREAD: string;
  /** Physically settled call butterfly implementation */
  PHYSICAL_CALL_FLY: string;
  /** Physically settled put butterfly implementation */
  PHYSICAL_PUT_FLY: string;
  /** Physically settled call condor implementation */
  PHYSICAL_CALL_CONDOR: string;
  /** Physically settled put condor implementation */
  PHYSICAL_PUT_CONDOR: string;
  /** Physically settled iron condor implementation */
  PHYSICAL_IRON_CONDOR: string;
}

/**
 * Option implementation metadata
 */
export interface OptionImplementationInfo {
  /** Human-readable name (e.g. 'INVERSE_CALL', 'PUT_SPREAD') */
  name: string;
  /** Option structure type */
  type: 'VANILLA' | 'SPREAD' | 'BUTTERFLY' | 'CONDOR' | 'IRON_CONDOR' | 'RANGER' | 'LOAN_HANDLER';
  /** Number of strikes used */
  numStrikes: number;
}

/**
 * Chain configuration for a network
 */
export interface ChainConfig {
  /** Chain ID */
  chainId: SupportedChainId;
  /** Chain name */
  name: string;
  /** Native currency symbol */
  nativeCurrency: string;
  /** Block explorer URL */
  explorerUrl: string;
  /** V4 Contract addresses */
  contracts: ContractAddresses;
  /** Supported collateral tokens */
  tokens: Record<string, TokenConfig>;
  /** Price feed addresses */
  priceFeeds: Record<string, string>;
  /** Option implementation addresses */
  implementations: Partial<ImplementationAddresses>;
  /** Option implementation info keyed by lowercase address (reverse lookup) */
  optionImplementations: Record<string, OptionImplementationInfo>;
  /**
   * HistoricalPriceConsumerV3_TWAP address (Chainlink TWAP consumer used at
   * settlement). null if not deployed on this chain.
   */
  twapConsumer: string | null;
  /** Deployment block number */
  deploymentBlock: number;
  /** API base URL */
  apiBaseUrl: string;
  /** Indexer API base URL */
  indexerApiUrl: string;
  /** WebSocket base URL */
  wsBaseUrl: string;
  /** Pricing API URL */
  pricingApiUrl: string;
  /** State API URL (RFQ indexer) */
  stateApiUrl: string;
  /** Default RPC URLs */
  defaultRpcUrls: string[];

  /**
   * @deprecated Use contracts.optionBook instead
   */
  optionBook: string;
  /**
   * @deprecated Use tokens instead
   */
  collateralTokens: Record<string, TokenConfig>;
}

/**
 * Chain configurations indexed by chainId
 */
export const CHAIN_CONFIGS_BY_ID: Record<SupportedChainId, ChainConfig> = {
  8453: {
    chainId: 8453,
    name: 'Base',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://basescan.org',
    contracts: {
      // Base_r12 deployment (deployed 2026-05-05)
      optionBook: '0x1bDff855d6811728acaDC00989e79143a2bdfDed',
      optionFactory: '0x8118daD971dEbffB49B9280047659174128A8B94',
    },
    tokens: {
      USDC: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        decimals: 6,
      },
      WETH: {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        decimals: 18,
      },
      cbBTC: {
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        symbol: 'cbBTC',
        decimals: 8,
      },
      aBasWETH: {
        address: '0xD4a0e0b9149BCee3C920d2E00b5dE09138fd8bb7',
        symbol: 'aBasWETH',
        decimals: 18,
      },
      aBascbBTC: {
        address: '0xBdb9300b7CDE636d9cD4AFF00f6F009fFBBc8EE6',
        symbol: 'aBascbBTC',
        decimals: 8,
      },
      aBasUSDC: {
        address: '0x4e65fE4DbA92790696d040ac24Aa414708F5c0AB',
        symbol: 'aBasUSDC',
        decimals: 6,
      },
      cbDOGE: {
        address: '0x73c7A9C372F31c1b1C7f8E5A7D12B8735c817C79',
        symbol: 'cbDOGE',
        decimals: 8,
      },
      cbXRP: {
        address: '0x7B2Cd9EA5566c345C9cdbcF58f5E211a0dB47444',
        symbol: 'cbXRP',
        decimals: 6,
      },
    },
    priceFeeds: {
      ETH: '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
      BTC: '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F',
      SOL: '0x975043adBb80fc32276CbF9Bbcfd4A601a12462D',
      DOGE: '0x8422f3d3CAFf15Ca682939310d6A5e619AE08e57',
      XRP: '0x9f0C1dD78C4CBdF5b9cf923a549A201EdC676D34',
      BNB: '0x4b7836916781CAAfbb7Bd1E5FDd20ED544B453b1',
      PAXG: '0x5213eBB69743b85644dbB6E25cdF994aFBb8cF31',
      AVAX: '0xE70f2D34Fd04046aaEC26a198A35dD8F2dF5cd92',
      // Legacy Chainlink format (kept for compatibility)
      'ETH/USD': '0x71041dddad3595F9CEd3DcCFBe3D1F4b0a16Bb70',
      'BTC/USD': '0x64c911996D3c6aC71f9b455B1E8E7266BcbD848F',
    },
    implementations: {
      // Base_r12 implementations
      PUT: '0x7355EB92dfb0503DB558a70c10843618932ab290',
      INVERSE_CALL: '0xE6c5756b0289e3f0994CB12eb8aB71Cd903Ed0Ea',
      LINEAR_CALL: '0x051791df68223AE173Fade5217C48875e36eef61',
      CALL_SPREAD: '0xfaeD63f7040E65b79cF0Ae29706fDc423eE249A9',
      PUT_SPREAD: '0x02Fe0d9635e0139DBB3768a5d5Db404Fd84d9134',
      INVERSE_CALL_SPREAD: '0x7Be48100b1B0349528A96D64953295Cd0Bbe4B70',
      CALL_FLY: '0xa1d5f6b16A2e7f298F8d2cDF78F7779B4A20C4C2',
      PUT_FLY: '0x4fd2C6D271cC6FF3EbD2027da9815a0608d03AA3',
      CALL_CONDOR: '0x14476CF2ea9F7C448100F061670E390f17c78817',
      PUT_CONDOR: '0xC742E422c7BB43A7FDe1CEF47997bC9D5b543cDD',
      IRON_CONDOR: '0x9ebd7E23AfD52a48F557523019285EfEF2170D59',
      RANGER: '0x9980ec85bc6fE07340adb36c76FA093bb6D4FcBc',
      CALL_LOAN: '0x7c444A2375275DaB925b32493B64a407eE955DEd',
      PHYSICAL_CALL: '0x8c56100caE246f7daa4BC1EC4d1477d71178c563',
      PHYSICAL_PUT: '0x6aD53DD058bea004829cCf58a282C21a7Df02DcA',
      // Physical multi-leg implementations (placeholder - contracts not yet deployed)
      // The runtime guard at src/modules/optionFactory.ts:2241 throws a clear
      // error if a user attempts to route through any of these zero addresses.
      PHYSICAL_CALL_SPREAD: '0x0000000000000000000000000000000000000000',
      PHYSICAL_PUT_SPREAD: '0x0000000000000000000000000000000000000000',
      PHYSICAL_CALL_FLY: '0x0000000000000000000000000000000000000000',
      PHYSICAL_PUT_FLY: '0x0000000000000000000000000000000000000000',
      PHYSICAL_CALL_CONDOR: '0x0000000000000000000000000000000000000000',
      PHYSICAL_PUT_CONDOR: '0x0000000000000000000000000000000000000000',
      PHYSICAL_IRON_CONDOR: '0x0000000000000000000000000000000000000000',
    },
    optionImplementations: {
      // 8453_v6 implementations
      '0x3ceb524cba83d2d4579f5a9f8c0d1f5701dd16fe': { name: 'INVERSE_CALL', type: 'VANILLA', numStrikes: 1 },
      '0xf480f636301d50ed570d026254dc5728b746a90f': { name: 'PUT', type: 'VANILLA', numStrikes: 1 },
      '0x4d75654bc616f64f6010d512c3b277891fb52540': { name: 'CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xed0fae13331ab620504918469fa47cf6a499a55e': { name: 'INVERSE_CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xc9767f9a2f1eadc7fdcb7f0057e829d9d760e086': { name: 'PUT_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xd8ea785ab2a63a8a94c38f42932a54a3e45501c3': { name: 'CALL_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x1fe24872ab7c83bba26dc761ce2ea735c9b96175': { name: 'PUT_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x494cd61b866d076c45564e236d6cb9e011a72978': { name: 'IRON_CONDOR', type: 'IRON_CONDOR', numStrikes: 4 },
      '0xbb5d2eb2d354d930899dabad01e032c76cc3c28f': { name: 'CALL_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0xbdacc00dc3f6e1928d9380c17684344e947aa3ec': { name: 'PUT_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0x07032ffb1df85ec006be7c76249b9e6f39b60f32': { name: 'PHYSICAL_CALL', type: 'VANILLA', numStrikes: 1 },
      '0xac5eca7129909de8c12e1a41102414b5a5f340aa': { name: 'PHYSICAL_PUT', type: 'VANILLA', numStrikes: 1 },
      '0x6e0019bf9a44b60d57435a032cb86b716629c08e': { name: 'CALL_LOAN', type: 'LOAN_HANDLER', numStrikes: 1 },
      // Physical multi-leg implementations (placeholder addresses - contracts not yet deployed)
      // These will be populated once the smart contracts are deployed
      // '0x...': { name: 'PHYSICAL_CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      // '0x...': { name: 'PHYSICAL_PUT_SPREAD', type: 'SPREAD', numStrikes: 2 },
      // '0x...': { name: 'PHYSICAL_CALL_FLY', type: 'BUTTERFLY', numStrikes: 3 },
      // '0x...': { name: 'PHYSICAL_PUT_FLY', type: 'BUTTERFLY', numStrikes: 3 },
      // '0x...': { name: 'PHYSICAL_CALL_CONDOR', type: 'CONDOR', numStrikes: 4 },
      // '0x...': { name: 'PHYSICAL_PUT_CONDOR', type: 'CONDOR', numStrikes: 4 },
      // '0x...': { name: 'PHYSICAL_IRON_CONDOR', type: 'IRON_CONDOR', numStrikes: 4 },
      // 8453_v6 deprecated
      '0x72fc2920137e42473935d511b4ad29efa34164c8': { name: 'PHYSICAL_CALL', type: 'VANILLA', numStrikes: 1 },
      '0x9da79023af00d1f2054bb1eed0d49004fe41c5b5': { name: 'PHYSICAL_PUT', type: 'VANILLA', numStrikes: 1 },
      '0xf1e551ab55b1303dea76ed8d92b76f99eeec75d6': { name: 'PHYSICAL_CALL', type: 'VANILLA', numStrikes: 1 },
      '0xc305f561ef1de00f06b227f7593763c65c479f1b': { name: 'PHYSICAL_PUT', type: 'VANILLA', numStrikes: 1 },
      // Base_r10 implementations
      '0x1fdec69e5ac4fa9cb7092f381c2dd5688759d43c': { name: 'INVERSE_CALL', type: 'VANILLA', numStrikes: 1 },
      '0x64b4b21bf0845c79661f60ed48aa24d54bf74bb5': { name: 'PUT', type: 'VANILLA', numStrikes: 1 },
      '0x2db5afa04aee616157beb53b96612947b3d13ee3': { name: 'CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xb529ba9d8d877d2641c8e8efed91ff603f09646e': { name: 'INVERSE_CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0x571471b2f823cc6b5683fc99ac6781209bc85f55': { name: 'PUT_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xeeeb29c9454974c89c5fb1b3190fcb46b74f1ea1': { name: 'LINEAR_CALL', type: 'VANILLA', numStrikes: 1 },
      '0xb727690fdd4bb0ff74f2f0cc3e68297850a634c5': { name: 'CALL_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x78b02119007f9efc2297a9738b9a47a3bc3c2777': { name: 'PUT_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x7d3c622852d71b932d0903f973caff45bcdba4f1': { name: 'CALL_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0x5cc960b56049b6f850730facb4f3eb45417c7679': { name: 'PUT_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0xb200253b68fbf18f31d813aecef97be3a6246b79': { name: 'IRON_CONDOR', type: 'IRON_CONDOR', numStrikes: 4 },
      '0x025a8ef95f8939ffdba6a45973a28695846e9e45': { name: 'PHYSICAL_CALL', type: 'VANILLA', numStrikes: 1 },
      '0x2d283d7ade2896d98331496ee761f15ed1d6a699': { name: 'PHYSICAL_PUT', type: 'VANILLA', numStrikes: 1 },
      '0x6a1d5ce9e3bdef110a06d8d025c171189d926d72': { name: 'RANGER', type: 'RANGER', numStrikes: 2 },
      // Base_r12 implementations (deployed 2026-05-05, block 45601440)
      '0x7355eb92dfb0503db558a70c10843618932ab290': { name: 'PUT', type: 'VANILLA', numStrikes: 1 },
      '0xe6c5756b0289e3f0994cb12eb8ab71cd903ed0ea': { name: 'INVERSE_CALL', type: 'VANILLA', numStrikes: 1 },
      '0x051791df68223ae173fade5217c48875e36eef61': { name: 'LINEAR_CALL', type: 'VANILLA', numStrikes: 1 },
      '0xfaed63f7040e65b79cf0ae29706fdc423ee249a9': { name: 'CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0x02fe0d9635e0139dbb3768a5d5db404fd84d9134': { name: 'PUT_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0x7be48100b1b0349528a96d64953295cd0bbe4b70': { name: 'INVERSE_CALL_SPREAD', type: 'SPREAD', numStrikes: 2 },
      '0xa1d5f6b16a2e7f298f8d2cdf78f7779b4a20c4c2': { name: 'CALL_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x4fd2c6d271cc6ff3ebd2027da9815a0608d03aa3': { name: 'PUT_FLYS', type: 'BUTTERFLY', numStrikes: 3 },
      '0x14476cf2ea9f7c448100f061670e390f17c78817': { name: 'CALL_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0xc742e422c7bb43a7fde1cef47997bc9d5b543cdd': { name: 'PUT_CONDOR', type: 'CONDOR', numStrikes: 4 },
      '0x9ebd7e23afd52a48f557523019285efef2170d59': { name: 'IRON_CONDOR', type: 'IRON_CONDOR', numStrikes: 4 },
      '0x9980ec85bc6fe07340adb36c76fa093bb6d4fcbc': { name: 'RANGER', type: 'RANGER', numStrikes: 4 },
      '0x8c56100cae246f7daa4bc1ec4d1477d71178c563': { name: 'PHYSICAL_CALL', type: 'VANILLA', numStrikes: 1 },
      '0x6ad53dd058bea004829ccf58a282c21a7df02dca': { name: 'PHYSICAL_PUT', type: 'VANILLA', numStrikes: 1 },
      '0x7c444a2375275dab925b32493b64a407ee955ded': { name: 'CALL_LOAN', type: 'LOAN_HANDLER', numStrikes: 1 },
    },
    twapConsumer: '0xE909fb38767e0ac5F7a347DF9Dd4222217E10816',
    deploymentBlock: 45601440,
    apiBaseUrl: 'https://round-snowflake-9c31.devops-118.workers.dev',
    indexerApiUrl: 'https://indexer.thetanuts.finance/api/v1/book',
    wsBaseUrl: 'wss://ws.thetanuts.finance/v4',
    pricingApiUrl: 'https://pricing.thetanuts.finance',
    stateApiUrl: 'https://indexer.thetanuts.finance',
    defaultRpcUrls: [
      'https://mainnet.base.org',
      'https://base.llamarpc.com',
    ],
    // Deprecated fields for backwards compatibility
    optionBook: '0x1bDff855d6811728acaDC00989e79143a2bdfDed',
    collateralTokens: {
      USDC: {
        address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913',
        symbol: 'USDC',
        decimals: 6,
      },
      WETH: {
        address: '0x4200000000000000000000000000000000000006',
        symbol: 'WETH',
        decimals: 18,
      },
      cbBTC: {
        address: '0xcbB7C0000aB88B473b1f5aFd9ef808440eed33Bf',
        symbol: 'cbBTC',
        decimals: 8,
      },
    },
  },
  1: {
    chainId: 1,
    name: 'Ethereum',
    nativeCurrency: 'ETH',
    explorerUrl: 'https://etherscan.io',
    contracts: {
      optionBook: null,      // Not deployed on Ethereum
      optionFactory: null,   // Not deployed on Ethereum
    },
    tokens: {
      USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
      },
      WBTC: {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: 'WBTC',
        decimals: 8,
      },
      WETH: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        decimals: 18,
      },
    },
    priceFeeds: {
      ETH: '0x5f4eC3Df9cbd43714FE2740f5E3616155c5b8419',
      BTC: '0xF4030086522a5bEEa4988F8cA5B36dbC97BeE88c',
    },
    implementations: {},
    optionImplementations: {},
    twapConsumer: null,
    deploymentBlock: 0,
    apiBaseUrl: '',
    indexerApiUrl: '',
    wsBaseUrl: '',
    pricingApiUrl: '',
    stateApiUrl: '',
    defaultRpcUrls: [
      'https://ethereum-rpc.publicnode.com',
      'https://eth.llamarpc.com',
    ],
    // Deprecated fields for backwards compatibility
    optionBook: '',
    collateralTokens: {
      USDC: {
        address: '0xA0b86991c6218b36c1d19D4a2e9Eb0cE3606eB48',
        symbol: 'USDC',
        decimals: 6,
      },
      WBTC: {
        address: '0x2260FAC5E5542a773Aa44fBCfeDf7C193bc2C599',
        symbol: 'WBTC',
        decimals: 8,
      },
      WETH: {
        address: '0xC02aaA39b223FE8D0A0e5C4F27eAD9083C756Cc2',
        symbol: 'WETH',
        decimals: 18,
      },
    },
  },
};

/**
 * @deprecated Use CHAIN_CONFIGS_BY_ID instead
 * Chain configurations for all supported networks (legacy)
 */
export const CHAIN_CONFIGS: Record<SupportedNetwork, ChainConfig> = {
  base: CHAIN_CONFIGS_BY_ID[8453],
  ethereum: CHAIN_CONFIGS_BY_ID[1],
};

/**
 * Get chain configuration by chain ID
 */
export function getChainConfigById(chainId: number): ChainConfig {
  const config = CHAIN_CONFIGS_BY_ID[chainId as SupportedChainId];
  if (!config) {
    const supportedChains = Object.keys(CHAIN_CONFIGS_BY_ID).join(', ');
    throw new Error(`Unsupported chainId: ${chainId}. Supported chains: ${supportedChains}`);
  }
  return config;
}

/**
 * @deprecated Use getChainConfigById instead
 * Get chain configuration for a network
 */
export function getChainConfig(network: SupportedNetwork): ChainConfig {
  const config = CHAIN_CONFIGS[network];
  if (!config) {
    throw new Error(`Unsupported network: ${network}`);
  }
  return config;
}

/**
 * Get token configuration by chain ID
 */
export function getTokenConfigById(
  chainId: SupportedChainId,
  symbol: string
): TokenConfig | undefined {
  const chainConfig = getChainConfigById(chainId);
  return chainConfig.tokens[symbol];
}

/**
 * @deprecated Use getTokenConfigById instead
 * Get token configuration
 */
export function getTokenConfig(
  network: SupportedNetwork,
  symbol: string
): TokenConfig | undefined {
  const chainConfig = getChainConfig(network);
  return chainConfig.tokens[symbol];
}

/**
 * Get all supported tokens for a chain
 */
export function getSupportedTokensById(chainId: SupportedChainId): TokenConfig[] {
  const chainConfig = getChainConfigById(chainId);
  return Object.values(chainConfig.tokens);
}

/**
 * @deprecated Use getSupportedTokensById instead
 * Get all supported collateral tokens for a network
 */
export function getSupportedTokens(network: SupportedNetwork): TokenConfig[] {
  const chainConfig = getChainConfig(network);
  return Object.values(chainConfig.tokens);
}

/**
 * Get option implementation info by address (case-insensitive)
 */
export function getOptionImplementationInfo(
  chainId: SupportedChainId,
  address: string
): OptionImplementationInfo | null {
  const config = CHAIN_CONFIGS_BY_ID[chainId];
  if (!config) return null;
  return config.optionImplementations[address.toLowerCase()] ?? null;
}

/**
 * Build reverse price feed lookup: lowercase address -> symbol
 */
export function buildPriceFeedSymbolMap(chainId: SupportedChainId): Record<string, string> {
  const config = CHAIN_CONFIGS_BY_ID[chainId];
  if (!config) return {};
  const map: Record<string, string> = {};
  for (const [symbol, address] of Object.entries(config.priceFeeds)) {
    // Skip legacy slash-format keys like 'ETH/USD'
    if (symbol.includes('/')) continue;
    map[address.toLowerCase()] = symbol;
  }
  return map;
}

/**
 * Check if a chain ID is supported
 */
export function isChainIdSupported(chainId: number): chainId is SupportedChainId {
  return chainId in CHAIN_CONFIGS_BY_ID;
}

/**
 * @deprecated Use isChainIdSupported instead
 * Check if a network is supported
 */
export function isNetworkSupported(network: string): network is SupportedNetwork {
  return network in CHAIN_CONFIGS;
}
