// Market Data Types
export type Timeframe =
  | '5s'
  | '15s'
  | '30s'
  | '1m'
  | '3m'
  | '5m'
  | '15m'
  | '30m'
  | '1h'
  | '2h'
  | '4h'
  | '6h'
  | '12h'
  | '1D'
  | '1W';

export interface Candle {
  timestamp: number; // Unix epoch in milliseconds
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
  symbol?: string;
  timeframe?: Timeframe;
}

export interface Ticker {
  symbol: string;
  price: number;
  change24h: number;
  changePercent24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  bid?: number;
  ask?: number;
  lastUpdated: number;
}

export interface SymbolInfo {
  symbol: string;
  baseAsset: string;
  quoteAsset: string;
  pricePrecision: number;
  quantityPrecision: number;
  minNotional: number;
  status: 'TRADING' | 'HALT' | 'BREAK';
}

// Technical Indicators Types
export type IndicatorType =
  | 'SMA'
  | 'EMA'
  | 'RSI'
  | 'MACD'
  | 'BOLLINGER_BANDS'
  | 'VWAP'
  | 'ATR'
  | 'VOLUME'
  | 'STOCH_RSI';

export interface IndicatorConfig {
  id: string;
  type: IndicatorType;
  name: string;
  visible: boolean;
  color?: string;
  params: Record<string, number | string>;
}

export interface IndicatorDataPoint {
  time: number;
  value?: number;
  values?: Record<string, number>;
}

// Drawing Tools Types
export type DrawingToolType =
  | 'horizontal_line'
  | 'vertical_line'
  | 'trendline'
  | 'rectangle'
  | 'price_range'
  | 'risk_reward'
  | 'support_resistance'
  | 'text';

export interface DrawingCoordinatePoint {
  time: number; // timestamp in ms or chart time
  price: number;
}

export interface DrawingStyle {
  color: string;
  lineWidth?: number;
  lineStyle?: 'solid' | 'dashed' | 'dotted';
  backgroundColor?: string;
  textColor?: string;
  fontSize?: number;
}

export interface ChartDrawing {
  id: string;
  symbol: string;
  timeframe: Timeframe;
  toolType: DrawingToolType;
  points: DrawingCoordinatePoint[];
  style: DrawingStyle;
  text?: string;
  isLocked?: boolean;
  visible?: boolean;
}

// Trade Planning & Calculation Types
export type TradeDirection = 'LONG' | 'SHORT';

export interface PositionSizeInput {
  accountBalance: number;
  riskPercentage: number; // e.g. 1.0 for 1%
  entryPrice: number;
  stopLossPrice: number;
  takeProfitPrice?: number;
  leverage?: number; // default 1
  feeRatePercentage?: number; // e.g. 0.05 for 0.05% taker fee
}

export interface PositionSizeResult {
  maxRiskAmount: number;
  positionSize: number; // units of asset
  notionalValue: number; // positionSize * entryPrice
  potentialLoss: number;
  potentialProfit: number;
  riskRewardRatio: number; // e.g. 3.0 for 1:3
  estimatedFees: number;
  estimatedNetProfit: number;
  estimatedNetLoss: number;
  priceRiskPerUnit: number;
  percentageMoveToStop: number;
  percentageMoveToTarget: number;
}

export interface ProfitLossInput {
  direction: TradeDirection;
  entryPrice: number;
  exitPrice: number;
  quantity: number;
  leverage?: number;
  feeRatePercentage?: number;
}

export interface ProfitLossResult {
  grossPnl: number;
  netPnl: number;
  returnPercentage: number;
  fees: number;
  notionalEntry: number;
  notionalExit: number;
}

export interface RMultipleInput {
  direction: TradeDirection;
  entryPrice: number;
  stopLossPrice: number;
  exitPrice: number;
}

// Trade & Journal Models
export type TradeStatus = 'OPEN' | 'CLOSED' | 'CANCELLED';
export type TradeSource = 'MANUAL' | 'PAPER' | 'REPLAY' | 'IMPORTED';

export interface Trade {
  id: string;
  userId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  exitPrice?: number;
  stopLoss: number;
  takeProfit: number;
  quantity: number;
  leverage: number;
  fees: number;
  pnl?: number;
  rMultiple?: number;
  status: TradeStatus;
  source: TradeSource;
  timeframe?: Timeframe;
  enteredAt: string; // ISO string
  exitedAt?: string; // ISO string
  createdAt: string;
  updatedAt: string;
  strategyId?: string;
  strategy?: Strategy;
  journal?: TradeJournal;
  screenshots?: TradeScreenshot[];
}

export interface TradeJournal {
  id: string;
  tradeId: string;
  strategyId?: string;
  strategyName?: string;
  setupType?: string;
  reasonForEntry?: string;
  marketCondition?: string;
  emotionBefore?: string;
  emotionDuring?: string;
  emotionAfter?: string;
  mistakes: string[];
  lessons?: string;
  notes?: string;
  chartSnapshot?: string; // base64 or url
  createdAt: string;
  updatedAt: string;
}

export interface TradeScreenshot {
  id: string;
  tradeId: string;
  type: 'BEFORE' | 'DURING' | 'AFTER' | 'SNAPSHOT';
  url: string;
  caption?: string;
  createdAt: string;
}

export interface Strategy {
  id: string;
  userId: string;
  name: string;
  description?: string;
  color?: string;
  tradeCount?: number;
  winRate?: number;
  profitFactor?: number;
  totalPnl?: number;
  createdAt: string;
}

// Paper Trading Types
export type PaperOrderType = 'MARKET' | 'LIMIT' | 'STOP';
export type PaperOrderSide = 'BUY' | 'SELL';
export type PaperOrderStatus = 'PENDING' | 'FILLED' | 'CANCELLED' | 'REJECTED';

export interface PaperAccount {
  id: string;
  userId: string;
  balance: number;
  equity: number;
  initialBalance: number;
  unrealizedPnl: number;
  realizedPnl: number;
  positionsCount: number;
}

export interface PaperPosition {
  id: string;
  accountId: string;
  symbol: string;
  direction: TradeDirection;
  entryPrice: number;
  currentPrice: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  leverage: number;
  margin: number;
  unrealizedPnl: number;
  unrealizedPnlPercent: number;
  enteredAt: string;
}

export interface PaperOrder {
  id: string;
  accountId: string;
  symbol: string;
  type: PaperOrderType;
  side: PaperOrderSide;
  price: number;
  quantity: number;
  stopLoss?: number;
  takeProfit?: number;
  status: PaperOrderStatus;
  createdAt: string;
  filledAt?: string;
}

// Analytics & Pattern Detection Types
export interface PerformanceMetrics {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number; // percentage e.g. 65.5
  lossRate: number;
  totalPnl: number;
  grossProfit: number;
  grossLoss: number;
  averageWin: number;
  averageLoss: number;
  largestWin: number;
  largestLoss: number;
  averageRMultiple: number;
  profitFactor: number;
  expectancy: number; // expectancy per trade in $
  expectancyR: number; // expectancy in R
  maxDrawdown: number; // in $
  maxDrawdownPercent: number; // in %
  averageHoldingTimeMinutes: number;
}

export interface EquityPoint {
  date: string;
  pnl: number;
  cumulativePnl: number;
  cumulativeR: number;
  drawdown: number;
  tradeId: string;
  symbol: string;
}

export interface CategoryBreakdown {
  category: string;
  tradeCount: number;
  winRate: number;
  totalPnl: number;
  averageR: number;
  profitFactor: number;
}

export interface PatternInsight {
  id: string;
  title: string;
  description: string;
  type: 'POSITIVE' | 'NEGATIVE' | 'WARNING' | 'NEUTRAL';
  sampleSize: number;
  isSignificant: boolean;
  statDifference?: string;
}

// AI Review & Coach Types
export interface AITradeReview {
  tradeId: string;
  summary: string;
  whatWasDoneWell: string[];
  potentialMistakes: string[];
  riskManagementAssessment: string;
  entryQualityAssessment: string;
  exitQualityAssessment: string;
  psychologicalObservations: string;
  suggestionsForFuture: string[];
  disclaimer: string;
  generatedAt: string;
}

export interface AICoachMessage {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  dataPointsUsed?: number;
}

export interface AICoachResponse {
  response: string;
  dataPointsUsed: number;
}

// WebSocket Event Types
export type WSClientAction =
  | 'subscribe:ticker'
  | 'unsubscribe:ticker'
  | 'subscribe:candle'
  | 'unsubscribe:candle';

export interface WSClientMessage {
  action: WSClientAction;
  symbol: string;
  timeframe?: Timeframe;
}

export interface WSTickerMessage {
  type: 'ticker:update';
  data: Ticker;
}

export interface WSCandleMessage {
  type: 'candle:update';
  symbol: string;
  timeframe: Timeframe;
  data: Candle;
}

export interface WSPaperUpdateMessage {
  type: 'paper:update';
  data: {
    equity: number;
    unrealizedPnl: number;
    positions: PaperPosition[];
  };
}

export interface WSTradeMessage {
  type: 'trade:update';
  data: {
    id: string;
    symbol: string;
    price: number;
    amount: number;
    side: 'BUY' | 'SELL';
    timestamp: number;
  };
}

export type WSServerMessage =
  | WSTickerMessage
  | WSCandleMessage
  | WSTradeMessage
  | WSPaperUpdateMessage
  | { type: 'connection:status'; status: 'CONNECTED' | 'RECONNECTING' | 'DEMO_MODE'; message?: string };
