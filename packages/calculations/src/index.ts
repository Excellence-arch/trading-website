import { Decimal } from 'decimal.js';
import type {
  PositionSizeInput,
  PositionSizeResult,
  ProfitLossInput,
  ProfitLossResult,
  RMultipleInput,
  TradeDirection,
} from '@trading/types';

// Configure Decimal precision for financial calculations
Decimal.set({ precision: 28, rounding: Decimal.ROUND_HALF_UP });

/**
 * Calculates dollar amount at risk given account balance and risk percentage.
 */
export function calculateRiskAmount(balance: number, riskPercentage: number): number {
  if (balance <= 0 || riskPercentage <= 0) return 0;
  const b = new Decimal(balance);
  const r = new Decimal(riskPercentage).dividedBy(100);
  return b.times(r).toNumber();
}

/**
 * Calculates per-unit price distance to stop loss.
 */
export function calculatePriceRisk(
  entryPrice: number,
  stopLossPrice: number,
  direction: TradeDirection
): number {
  const entry = new Decimal(entryPrice);
  const sl = new Decimal(stopLossPrice);

  if (direction === 'LONG') {
    if (sl.greaterThanOrEqualTo(entry)) {
      throw new Error('Stop loss for a LONG trade must be below entry price');
    }
    return entry.minus(sl).toNumber();
  } else {
    if (sl.lessThanOrEqualTo(entry)) {
      throw new Error('Stop loss for a SHORT trade must be above entry price');
    }
    return sl.minus(entry).toNumber();
  }
}

/**
 * Calculates professional position size, notional value, R:R and fees.
 */
export function calculatePositionSize(input: PositionSizeInput): PositionSizeResult {
  const {
    accountBalance,
    riskPercentage,
    entryPrice,
    stopLossPrice,
    takeProfitPrice,
    leverage = 1,
    feeRatePercentage = 0.05,
  } = input;

  if (accountBalance <= 0) throw new Error('Account balance must be positive');
  if (riskPercentage <= 0) throw new Error('Risk percentage must be positive');
  if (entryPrice <= 0) throw new Error('Entry price must be positive');
  if (stopLossPrice <= 0) throw new Error('Stop loss must be positive');

  const direction: TradeDirection = entryPrice > stopLossPrice ? 'LONG' : 'SHORT';
  const priceRisk = new Decimal(calculatePriceRisk(entryPrice, stopLossPrice, direction));
  const maxRiskAmount = new Decimal(accountBalance).times(new Decimal(riskPercentage).dividedBy(100));

  // Position size in base asset units: Risk Amount / Price Risk
  const positionSize = maxRiskAmount.dividedBy(priceRisk);
  const notionalValue = positionSize.times(entryPrice);

  const potentialLoss = positionSize.times(priceRisk);

  let potentialProfit = new Decimal(0);
  let riskRewardRatio = 0;
  let percentageMoveToTarget = 0;

  if (takeProfitPrice && takeProfitPrice > 0) {
    const tp = new Decimal(takeProfitPrice);
    const entry = new Decimal(entryPrice);

    if (direction === 'LONG' && tp.greaterThan(entry)) {
      potentialProfit = positionSize.times(tp.minus(entry));
    } else if (direction === 'SHORT' && tp.lessThan(entry)) {
      potentialProfit = positionSize.times(entry.minus(tp));
    }

    if (potentialLoss.greaterThan(0)) {
      riskRewardRatio = potentialProfit.dividedBy(potentialLoss).toDecimalPlaces(2).toNumber();
    }

    percentageMoveToTarget = tp.minus(entry).abs().dividedBy(entry).times(100).toDecimalPlaces(2).toNumber();
  }

  const percentageMoveToStop = new Decimal(entryPrice)
    .minus(stopLossPrice)
    .abs()
    .dividedBy(entryPrice)
    .times(100)
    .toDecimalPlaces(2)
    .toNumber();

  // Fee calculation (entry + exit estimated on notional)
  const feeRate = new Decimal(feeRatePercentage).dividedBy(100);
  const entryFee = notionalValue.times(feeRate);
  const exitNotional = takeProfitPrice
    ? positionSize.times(takeProfitPrice)
    : notionalValue;
  const exitFee = exitNotional.times(feeRate);
  const estimatedFees = entryFee.plus(exitFee).toDecimalPlaces(4).toNumber();

  const estimatedNetProfit = potentialProfit.minus(estimatedFees).toNumber();
  const estimatedNetLoss = potentialLoss.plus(estimatedFees).toNumber();

  return {
    maxRiskAmount: maxRiskAmount.toDecimalPlaces(2).toNumber(),
    positionSize: positionSize.toDecimalPlaces(6).toNumber(),
    notionalValue: notionalValue.toDecimalPlaces(2).toNumber(),
    potentialLoss: potentialLoss.toDecimalPlaces(2).toNumber(),
    potentialProfit: potentialProfit.toDecimalPlaces(2).toNumber(),
    riskRewardRatio,
    estimatedFees,
    estimatedNetProfit: Number(estimatedNetProfit.toFixed(2)),
    estimatedNetLoss: Number(estimatedNetLoss.toFixed(2)),
    priceRiskPerUnit: priceRisk.toDecimalPlaces(4).toNumber(),
    percentageMoveToStop,
    percentageMoveToTarget,
  };
}

/**
 * Calculates profit/loss for a closed trade (Long or Short).
 */
export function calculateProfitLoss(input: ProfitLossInput): ProfitLossResult {
  const { direction, entryPrice, exitPrice, quantity, leverage = 1, feeRatePercentage = 0.05 } = input;

  const entry = new Decimal(entryPrice);
  const exit = new Decimal(exitPrice);
  const qty = new Decimal(quantity);

  const notionalEntry = entry.times(qty);
  const notionalExit = exit.times(qty);

  let grossPnl: Decimal;
  if (direction === 'LONG') {
    grossPnl = exit.minus(entry).times(qty);
  } else {
    grossPnl = entry.minus(exit).times(qty);
  }

  // Fees on both legs
  const feeRate = new Decimal(feeRatePercentage).dividedBy(100);
  const fees = notionalEntry.plus(notionalExit).times(feeRate);
  const netPnl = grossPnl.minus(fees);

  // Return percentage based on margin allocated
  const margin = notionalEntry.dividedBy(leverage);
  const returnPercentage = margin.greaterThan(0)
    ? netPnl.dividedBy(margin).times(100).toDecimalPlaces(2).toNumber()
    : 0;

  return {
    grossPnl: grossPnl.toDecimalPlaces(2).toNumber(),
    netPnl: netPnl.toDecimalPlaces(2).toNumber(),
    returnPercentage,
    fees: fees.toDecimalPlaces(4).toNumber(),
    notionalEntry: notionalEntry.toDecimalPlaces(2).toNumber(),
    notionalExit: notionalExit.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Calculates percentage change between two values.
 */
export function calculatePercentageChange(currentPrice: number, previousPrice: number): number {
  if (previousPrice === 0) return 0;
  const curr = new Decimal(currentPrice);
  const prev = new Decimal(previousPrice);
  return curr.minus(prev).dividedBy(prev.abs()).times(100).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates R-Multiple realized on a trade.
 * R = (Exit Price - Entry Price) / (Entry Price - Stop Loss) for LONG
 * R = (Entry Price - Exit Price) / (Stop Loss - Entry Price) for SHORT
 */
export function calculateRMultiple(input: RMultipleInput): number {
  const { direction, entryPrice, stopLossPrice, exitPrice } = input;

  const entry = new Decimal(entryPrice);
  const sl = new Decimal(stopLossPrice);
  const exit = new Decimal(exitPrice);

  let priceRisk: Decimal;
  let priceMoved: Decimal;

  if (direction === 'LONG') {
    priceRisk = entry.minus(sl);
    priceMoved = exit.minus(entry);
  } else {
    priceRisk = sl.minus(entry);
    priceMoved = entry.minus(exit);
  }

  if (priceRisk.isZero()) return 0;
  return priceMoved.dividedBy(priceRisk).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates trading fee for a given notional amount.
 */
export function calculateFees(notional: number, feeRatePercentage: number): number {
  const n = new Decimal(notional);
  const r = new Decimal(feeRatePercentage).dividedBy(100);
  return n.times(r).toDecimalPlaces(4).toNumber();
}

/**
 * Calculates net profit or loss by subtracting fees.
 */
export function calculateNetProfitLoss(grossPnl: number, fees: number): number {
  return new Decimal(grossPnl).minus(fees).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates maximum drawdown ($ and %) from an equity curve series.
 */
export function calculateDrawdown(equitySeries: number[]): {
  maxDrawdown: number;
  maxDrawdownPercent: number;
} {
  if (!equitySeries || equitySeries.length === 0) {
    return { maxDrawdown: 0, maxDrawdownPercent: 0 };
  }

  let peak = new Decimal(equitySeries[0]);
  let maxDrawdown = new Decimal(0);
  let maxDrawdownPercent = new Decimal(0);

  for (const equity of equitySeries) {
    const current = new Decimal(equity);
    if (current.greaterThan(peak)) {
      peak = current;
    }

    const drawdown = peak.minus(current);
    if (drawdown.greaterThan(maxDrawdown)) {
      maxDrawdown = drawdown;
    }

    if (peak.greaterThan(0)) {
      const ddPercent = drawdown.dividedBy(peak).times(100);
      if (ddPercent.greaterThan(maxDrawdownPercent)) {
        maxDrawdownPercent = ddPercent;
      }
    }
  }

  return {
    maxDrawdown: maxDrawdown.toDecimalPlaces(2).toNumber(),
    maxDrawdownPercent: maxDrawdownPercent.toDecimalPlaces(2).toNumber(),
  };
}

/**
 * Calculates win rate, loss rate, and trade outcome distribution.
 */
export function calculateWinRate(pnls: number[]): {
  totalTrades: number;
  winningTrades: number;
  losingTrades: number;
  breakevenTrades: number;
  winRate: number;
  lossRate: number;
} {
  const totalTrades = pnls.length;
  if (totalTrades === 0) {
    return {
      totalTrades: 0,
      winningTrades: 0,
      losingTrades: 0,
      breakevenTrades: 0,
      winRate: 0,
      lossRate: 0,
    };
  }

  let wins = 0;
  let losses = 0;
  let breakeven = 0;

  for (const pnl of pnls) {
    if (pnl > 0) wins++;
    else if (pnl < 0) losses++;
    else breakeven++;
  }

  const winRate = new Decimal(wins).dividedBy(totalTrades).times(100).toDecimalPlaces(2).toNumber();
  const lossRate = new Decimal(losses).dividedBy(totalTrades).times(100).toDecimalPlaces(2).toNumber();

  return {
    totalTrades,
    winningTrades: wins,
    losingTrades: losses,
    breakevenTrades: breakeven,
    winRate,
    lossRate,
  };
}

/**
 * Calculates Profit Factor = Gross Profits / Gross Losses.
 */
export function calculateProfitFactor(pnls: number[]): number {
  let grossWins = new Decimal(0);
  let grossLosses = new Decimal(0);

  for (const pnl of pnls) {
    if (pnl > 0) {
      grossWins = grossWins.plus(pnl);
    } else if (pnl < 0) {
      grossLosses = grossLosses.plus(Math.abs(pnl));
    }
  }

  if (grossLosses.isZero()) {
    return grossWins.greaterThan(0) ? 99.99 : 0;
  }

  return grossWins.dividedBy(grossLosses).toDecimalPlaces(2).toNumber();
}

/**
 * Calculates Expectancy = (Win Rate * Avg Win) - (Loss Rate * Avg Loss).
 */
export function calculateExpectancy(pnls: number[]): {
  expectancy: number;
  averageWin: number;
  averageLoss: number;
} {
  if (!pnls.length) return { expectancy: 0, averageWin: 0, averageLoss: 0 };

  const { winRate, lossRate, winningTrades, losingTrades } = calculateWinRate(pnls);

  let totalWinAmount = new Decimal(0);
  let totalLossAmount = new Decimal(0);

  for (const pnl of pnls) {
    if (pnl > 0) totalWinAmount = totalWinAmount.plus(pnl);
    if (pnl < 0) totalLossAmount = totalLossAmount.plus(Math.abs(pnl));
  }

  const avgWin = winningTrades > 0 ? totalWinAmount.dividedBy(winningTrades) : new Decimal(0);
  const avgLoss = losingTrades > 0 ? totalLossAmount.dividedBy(losingTrades) : new Decimal(0);

  const winProb = new Decimal(winRate).dividedBy(100);
  const lossProb = new Decimal(lossRate).dividedBy(100);

  const expectancy = winProb.times(avgWin).minus(lossProb.times(avgLoss));

  return {
    expectancy: expectancy.toDecimalPlaces(2).toNumber(),
    averageWin: avgWin.toDecimalPlaces(2).toNumber(),
    averageLoss: avgLoss.toDecimalPlaces(2).toNumber(),
  };
}
