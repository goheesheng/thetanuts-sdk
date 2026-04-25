/**
 * Loan Contract ABIs
 *
 * ABIs for Loan's wrapper contracts that sit on top of Thetanuts V4.
 * The SDK already handles OptionFactory and OptionBook ABIs internally.
 */

/** LoanCoordinator — manages loan requests and collateral */
export const LOAN_COORDINATOR_ABI = [
  'function requestLoan(tuple(address collateralToken, address priceFeed, address settlementToken, uint256 collateralAmount, uint256 strike, uint256 expiryTimestamp, uint256 offerEndTimestamp, uint256 minSettlementAmount, bool convertToLimitOrder, string requesterPublicKey) params) returns (uint256 quotationId)',
  'function settleQuotationEarly(uint256 quotationId, uint256 offerAmount, uint64 nonce, address offeror)',
  'function cancelLoan(uint256 quotationId)',
  'function handleSettlement(uint256 quotationId, address settledOptionContract) returns (address requester, uint256 settlementAmount, address collateralToken, uint256 collateralAmount)',
  'function loanRequests(uint256) view returns (address requester, uint256 collateralAmount, uint256 strike, uint256 expiryTimestamp, address collateralToken, address settlementToken, bool isSettled, address settledOptionContract)',
  'function fee() view returns (uint256)',
  'function MAX_FEE() view returns (uint256)',
  'function optionFactory() view returns (address)',
  'function totalLockedCollateral(address) view returns (uint256)',
  'event LoanRequested(uint256 indexed quotationId, address indexed requester, address collateralToken, address settlementToken, uint256 collateralAmount, uint256 minSettlementAmount, uint256 strike, uint256 expiryTimestamp, uint256 offerEndTimestamp, bool convertToLimitOrder)',
  'event FeeCollected(uint256 indexed quotationId, uint256 feeAmount)',
];

/** PhysicallySettledCallOption — option exercise and queries */
export const LOAN_OPTION_ABI = [
  'function exercise()',
  'function doNotExercise()',
  'function swapAndExercise(address aggregator, bytes swapData)',
  'function close()',
  'function split(uint256 splitCollateralAmount) returns (address)',
  'function transfer(bool isBuyer, address target)',
  'function approveTransfer(bool isBuyer, address target, bool isApproved)',
  'function buyer() view returns (address)',
  'function seller() view returns (address)',
  'function collateralToken() view returns (address)',
  'function collateralAmount() view returns (uint256)',
  'function deliveryCollateral() view returns (address)',
  'function numContracts() view returns (uint256)',
  'function expiryTimestamp() view returns (uint256)',
  'function getStrikes() view returns (uint256[])',
  'function getTWAP() view returns (uint256)',
  'function isITM(uint256 price) view returns (bool)',
  'function optionSettled() view returns (bool)',
  'function calculateDeliveryAmount() view returns (uint256)',
  'function EXERCISE_WINDOW() view returns (uint256)',
  'function PRICE_DECIMALS() view returns (uint256)',
  'event OptionExercised(address indexed buyer, address indexed seller, address collateralToken, address deliveryCollateral, uint256 collateralAmount, uint256 deliveryAmount)',
  'event OptionNotExercised(address indexed buyer, address indexed seller, address collateralToken, uint256 collateralAmount, bool explicitDecision)',
  'event OptionExpired(address indexed optionAddress, uint256 settlementPrice)',
];

/** LoanHandler events (emitted by LoanHandler proxy instances) */
export const LOAN_HANDLER_ABI = [
  'event LoanSettled(address indexed coordinator, address indexed requester, address indexed finalOption, address collateralToken, address settlementToken, uint256 collateralAmount, uint256 settlementAmount, uint256 quotationId)',
];

/** WETH deposit/withdraw for ETH wrapping */
export const LOAN_WETH_ABI = [
  'function balanceOf(address account) view returns (uint256)',
  'function allowance(address owner, address spender) view returns (uint256)',
  'function approve(address spender, uint256 amount) returns (bool)',
  'function decimals() view returns (uint8)',
  'function symbol() view returns (string)',
  'function deposit() payable',
  'function withdraw(uint256 amount)',
];
