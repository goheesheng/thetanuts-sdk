// ============ Client ============
export { ThetanutsClient } from './client/ThetanutsClient.js';

export type {
  ThetanutsClientConfig,
  SupportedChainId,
  SupportedNetwork,
  Environment,
} from './types/client.js';

// ============ Errors ============
export {
  ThetanutsError,
  APIError,
  BadRequestError,
  NotFoundError,
  RateLimitError,
  ContractRevertError,
  InsufficientAllowanceError,
  InsufficientBalanceError,
  OrderExpiredError,
  SlippageExceededError,
  SignerRequiredError,
  InvalidParamsError,
  NetworkUnsupportedError,
  WebSocketError,
  KeyNotFoundError,
  InvalidKeyError,
  EncryptionError,
  DecryptionError,
  isThetanutsError,
} from './types/errors.js';

export type { ThetanutsErrorCode } from './types/errors.js';

export {
  createError,
  wrapError,
  mapHttpError,
  mapContractError,
} from './utils/errors.js';

// ============ ABIs ============
export {
  ERC20_ABI,
  OPTION_BOOK_ABI,
  OPTION_FACTORY_ABI,
  OPTION_ABI,
  BASE_OPTION_ABI,
} from './abis/index.js';

// ============ Chain Configuration ============
export {
  CHAIN_CONFIGS_BY_ID,
  getChainConfigById,
  getTokenConfigById,
  getSupportedTokensById,
  isChainIdSupported,
  getOptionImplementationInfo,
  buildPriceFeedSymbolMap,
} from './chains/index.js';

export type { ChainConfig, TokenConfig, ContractAddresses, OptionImplementationInfo, ImplementationAddresses } from './chains/index.js';

// ============ Modules ============
export { ERC20Module } from './modules/erc20.js';
export { OptionBookModule } from './modules/optionBook.js';
export { APIModule } from './modules/api.js';
export { OptionFactoryModule } from './modules/optionFactory.js';
export { OptionModule } from './modules/option.js';
export { EventsModule } from './modules/events.js';
export { WebSocketModule } from './modules/websocket.js';
export { UtilsModule } from './modules/utils.js';
export { RFQKeyManagerModule } from './modules/rfqKeyManager.js';
export { MMPricingModule, parseTicker, buildTicker, applyFeeAdjustment, calculateCollateralCost } from './modules/mmPricing.js';

// ============ Types — Logger ============
export type { ThetanutsLogger } from './types/logger.js';

// ============ Types — ERC20 ============
export type {
  ApprovalResult,
  EnsureAllowanceResult,
  TokenBalance,
  TokenInfo,
} from './types/erc20.js';

// ============ Types — OptionBook ============
export type {
  ContractOrder,
  Order,
  SwapParams,
  FeeInfo,
  Quote,
  FillOrderResult,
  SwapAndFillOrderResult,
  CancelOrderResult,
  TransactionResult,
  EncodedTransaction,
  Eip712Domain,
} from './types/optionBook.js';

// ============ Types — API ============
export type {
  OrderWithSignature,
  OrderFilters,
  Position,
  PositionSettlement,
  TradeHistory,
  ProtocolStats as APIProtocolStats,
  MarketPrice,
  MarketPrices,
  MarketDataResponse,
  MarketDataPrices,
  MarketDataMetadata,
  ReferrerStats,
  IndexerHealth,
  FactoryStats,
  PositionPnL,
  FactoryOptionSettlement,
  FactoryOptionDetail,
  BookOptionDetail,
  OptionStatusType,
} from './types/api.js';

// ============ Types — OptionFactory ============
export {
  OptionTypeEnum,
  QuotationStatus,
} from './types/optionFactory.js';

export type {
  QuotationParameters,
  QuotationTracking,
  QuotationState,
  RFQRequest,
  Quotation,
  MakeOfferParams,
  RevealOfferParams,
  RequestQuotationResult,
  SettleQuotationResult,
  MakeOfferResult,
  RevealOfferResult,
  ReferralParameters,
  SwapAndCallParams,
  Eip712DomainResult,
  RFQBuilderParams,
  SpreadRFQParams,
  ButterflyRFQParams,
  CondorRFQParams,
  IronCondorRFQParams,
  PhysicalOptionRFQParams,
  PhysicalSpreadRFQParams,
  PhysicalButterflyRFQParams,
  PhysicalCondorRFQParams,
  PhysicalIronCondorRFQParams,
  RFQUnderlying,
  RFQOptionType,
  RFQCollateralToken,
} from './types/optionFactory.js';

// ============ Types — Option ============
export type {
  OptionInfo,
  FullOptionInfo,
  PositionInfo,
  ClosePositionResult,
  TransferPositionResult,
  SplitPositionResult,
  PayoutCalculation,
  PayoutResult,
  UnpackedOptionType,
  OptionParams,
} from './types/option.js';

// ============ Types — Events ============
export type {
  OrderFillEvent,
  OrderCancelledEvent,
  OptionCreatedEvent,
  QuotationRequestedEvent,
  OfferMadeEvent,
  OfferRevealedEvent,
  QuotationSettledEvent,
  PositionClosedEvent,
  PositionTransferredEvent,
  EventFilters,
  CollateralReturnedEvent,
  OptionClosedEvent,
  OptionExpiredEvent,
  OptionPayoutEvent,
  OptionSettlementFailedEvent,
  OptionSplitEvent,
  RoleTransferredEvent,
  TransferApprovalEvent,
  ERC20RescuedEvent,
} from './types/events.js';

// ============ Types — WebSocket ============
export type {
  WebSocketState,
  SubscriptionType,
  SubscriptionOptions,
  WebSocketMessage,
  WebSocketConfig,
  OrderUpdate,
  PriceUpdate,
  PositionUpdate,
  TradeUpdate,
  QuotationUpdate,
  WebSocketEventHandler,
} from './types/websocket.js';

// ============ Types — State API ============
export type {
  StateApiResponse,
  StateRfq,
  StateOffer,
  StateOption,
  StateProtocolStats,
  StateReferral,
} from './types/stateApi.js';

// ============ Types — Common ============
export type {
  OptionType,
  ProductType,
  OptionStructure,
  OrderSide,
  OrderStatus,
  PositionStatus,
  UnderlyingAsset,
  CollateralToken,
} from './types/common.js';

// ============ Types — Utils ============
export type {
  PayoutType,
  PayoutParams,
  CollateralParams,
} from './modules/utils.js';

// ============ Types — RFQ Key Manager ============
export type {
  RFQKeyPair,
  EncryptedOffer,
  DecryptedOffer,
  KeyStorageProvider,
} from './types/rfqKeyManager.js';

export {
  MemoryStorageProvider,
  LocalStorageProvider,
} from './types/rfqKeyManager.js';

// ============ Types — MM Pricing ============
export type {
  RawOptionPricing,
  MMAllPricingResponse,
  MMVanillaPricing,
  MMPositionPricing,
  MMSpreadPricing,
  MMCondorPricing,
  MMButterflyPricing,
  ParsedTicker,
  PositionPricingParams,
  SpreadPricingParams,
  CondorPricingParams,
  ButterflyPricingParams,
  CollateralAsset,
} from './types/mmPricing.js';

export { COLLATERAL_APR } from './types/mmPricing.js';

// ============ Types — Call Static ============
export type { CallStaticResult } from './types/callStatic.js';

// ============ Utilities ============
export { noopLogger, consoleLogger, Logger } from './utils/logger.js';

export {
  validateAddress,
  validateOrderExpiry,
  validateFillSize,
  validateBuySlippage,
  validateSellSlippage,
  calculateSlippagePrice,
} from './utils/validation.js';

export {
  DECIMALS,
  toBigInt,
  fromBigInt,
  scaleDecimals,
  formatAmount,
  parseAmount,
} from './utils/decimals.js';

export {
  isBaseCollateral,
  premiumPerContract,
  calculateNumContracts,
  calculateReservePrice,
  calculateCollateralRequired,
  calculateDeliveryAmount,
  isPhysicalProduct,
  validateButterfly,
  validateCondor,
  validateIronCondor,
  validateRanger,
} from './utils/rfqCalculations.js';

export type { ProductName, ValidationResult, DeliveryResult } from './utils/rfqCalculations.js';
