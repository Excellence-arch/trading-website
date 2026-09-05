import type { Candle } from '@trading/types';

export interface SMAPoint {
  time: number;
  value: number;
}

export interface EMAPoint {
  time: number;
  value: number;
}

export interface RSIPoint {
  time: number;
  value: number;
}

export interface MACDPoint {
  time: number;
  macd: number;
  signal: number;
  histogram: number;
}

export interface BollingerBandsPoint {
  time: number;
  upper: number;
  middle: number;
  lower: number;
}

export interface VWAPPoint {
  time: number;
  value: number;
}

export interface ATRPoint {
  time: number;
  value: number;
}

export interface StochRSIPoint {
  time: number;
  k: number;
  d: number;
}

/**
 * Simple Moving Average (SMA)
 */
export function calculateSMA(candles: Candle[], period: number): SMAPoint[] {
  if (!candles || candles.length < period) return [];

  const results: SMAPoint[] = [];
  let sum = 0;

  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }

  results.push({
    time: Math.floor(candles[period - 1].timestamp / 1000),
    value: Number((sum / period).toFixed(4)),
  });

  for (let i = period; i < candles.length; i++) {
    sum += candles[i].close - candles[i - period].close;
    results.push({
      time: Math.floor(candles[i].timestamp / 1000),
      value: Number((sum / period).toFixed(4)),
    });
  }

  return results;
}

/**
 * Exponential Moving Average (EMA)
 */
export function calculateEMA(candles: Candle[], period: number): EMAPoint[] {
  if (!candles || candles.length < period) return [];

  const multiplier = 2 / (period + 1);
  const results: EMAPoint[] = [];

  // Seed with SMA of the first 'period' elements
  let sum = 0;
  for (let i = 0; i < period; i++) {
    sum += candles[i].close;
  }
  let prevEma = sum / period;

  results.push({
    time: Math.floor(candles[period - 1].timestamp / 1000),
    value: Number(prevEma.toFixed(4)),
  });

  for (let i = period; i < candles.length; i++) {
    const close = candles[i].close;
    const currentEma = (close - prevEma) * multiplier + prevEma;
    results.push({
      time: Math.floor(candles[i].timestamp / 1000),
      value: Number(currentEma.toFixed(4)),
    });
    prevEma = currentEma;
  }

  return results;
}

/**
 * Relative Strength Index (RSI) using Wilder's Smoothing
 */
export function calculateRSI(candles: Candle[], period = 14): RSIPoint[] {
  if (!candles || candles.length <= period) return [];

  const results: RSIPoint[] = [];
  let gains = 0;
  let losses = 0;

  for (let i = 1; i <= period; i++) {
    const change = candles[i].close - candles[i - 1].close;
    if (change >= 0) gains += change;
    else losses += Math.abs(change);
  }

  let avgGain = gains / period;
  let avgLoss = losses / period;

  let rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
  let rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

  results.push({
    time: Math.floor(candles[period].timestamp / 1000),
    value: Number(rsi.toFixed(2)),
  });

  for (let i = period + 1; i < candles.length; i++) {
    const change = candles[i].close - candles[i - 1].close;
    const currentGain = change >= 0 ? change : 0;
    const currentLoss = change < 0 ? Math.abs(change) : 0;

    avgGain = (avgGain * (period - 1) + currentGain) / period;
    avgLoss = (avgLoss * (period - 1) + currentLoss) / period;

    rs = avgLoss === 0 ? 100 : avgGain / avgLoss;
    rsi = avgLoss === 0 ? 100 : 100 - 100 / (1 + rs);

    results.push({
      time: Math.floor(candles[i].timestamp / 1000),
      value: Number(rsi.toFixed(2)),
    });
  }

  return results;
}

/**
 * MACD (Moving Average Convergence Divergence)
 */
export function calculateMACD(
  candles: Candle[],
  fastPeriod = 12,
  slowPeriod = 26,
  signalPeriod = 9
): MACDPoint[] {
  if (!candles || candles.length < slowPeriod + signalPeriod) return [];

  const fastEma = calculateEMA(candles, fastPeriod);
  const slowEma = calculateEMA(candles, slowPeriod);

  // Map slow EMA times to fast EMA
  const slowMap = new Map<number, number>();
  slowEma.forEach((p) => slowMap.set(p.time, p.value));

  const macdLineSeries: { time: number; value: number }[] = [];
  for (const f of fastEma) {
    const slowVal = slowMap.get(f.time);
    if (slowVal !== undefined) {
      macdLineSeries.push({
        time: f.time,
        value: Number((f.value - slowVal).toFixed(4)),
      });
    }
  }

  if (macdLineSeries.length < signalPeriod) return [];

  // Calculate signal line (EMA of MACD line)
  const multiplier = 2 / (signalPeriod + 1);
  let sum = 0;
  for (let i = 0; i < signalPeriod; i++) {
    sum += macdLineSeries[i].value;
  }
  let prevSignal = sum / signalPeriod;

  const results: MACDPoint[] = [];
  results.push({
    time: macdLineSeries[signalPeriod - 1].time,
    macd: macdLineSeries[signalPeriod - 1].value,
    signal: Number(prevSignal.toFixed(4)),
    histogram: Number((macdLineSeries[signalPeriod - 1].value - prevSignal).toFixed(4)),
  });

  for (let i = signalPeriod; i < macdLineSeries.length; i++) {
    const macdVal = macdLineSeries[i].value;
    const currentSignal = (macdVal - prevSignal) * multiplier + prevSignal;
    results.push({
      time: macdLineSeries[i].time,
      macd: macdVal,
      signal: Number(currentSignal.toFixed(4)),
      histogram: Number((macdVal - currentSignal).toFixed(4)),
    });
    prevSignal = currentSignal;
  }

  return results;
}

/**
 * Bollinger Bands
 */
export function calculateBollingerBands(
  candles: Candle[],
  period = 20,
  stdDevMultiplier = 2
): BollingerBandsPoint[] {
  if (!candles || candles.length < period) return [];

  const smaPoints = calculateSMA(candles, period);
  const results: BollingerBandsPoint[] = [];

  for (let i = 0; i < smaPoints.length; i++) {
    const candleIndex = i + period - 1;
    const middle = smaPoints[i].value;

    let varianceSum = 0;
    for (let j = candleIndex - period + 1; j <= candleIndex; j++) {
      const diff = candles[j].close - middle;
      varianceSum += diff * diff;
    }

    const stdDev = Math.sqrt(varianceSum / period);
    const upper = middle + stdDevMultiplier * stdDev;
    const lower = middle - stdDevMultiplier * stdDev;

    results.push({
      time: smaPoints[i].time,
      middle: Number(middle.toFixed(4)),
      upper: Number(upper.toFixed(4)),
      lower: Number(lower.toFixed(4)),
    });
  }

  return results;
}

/**
 * Volume Weighted Average Price (VWAP)
 */
export function calculateVWAP(candles: Candle[]): VWAPPoint[] {
  if (!candles || candles.length === 0) return [];

  const results: VWAPPoint[] = [];
  let cumulativeTypicalVolume = 0;
  let cumulativeVolume = 0;

  for (const c of candles) {
    const typicalPrice = (c.high + c.low + c.close) / 3;
    cumulativeTypicalVolume += typicalPrice * c.volume;
    cumulativeVolume += c.volume;

    const vwap = cumulativeVolume > 0 ? cumulativeTypicalVolume / cumulativeVolume : typicalPrice;

    results.push({
      time: Math.floor(c.timestamp / 1000),
      value: Number(vwap.toFixed(4)),
    });
  }

  return results;
}

/**
 * Average True Range (ATR)
 */
export function calculateATR(candles: Candle[], period = 14): ATRPoint[] {
  if (!candles || candles.length <= period) return [];

  const trValues: number[] = [];

  for (let i = 1; i < candles.length; i++) {
    const high = candles[i].high;
    const low = candles[i].low;
    const prevClose = candles[i - 1].close;

    const tr = Math.max(high - low, Math.abs(high - prevClose), Math.abs(low - prevClose));
    trValues.push(tr);
  }

  let atr = trValues.slice(0, period).reduce((a, b) => a + b, 0) / period;
  const results: ATRPoint[] = [
    {
      time: Math.floor(candles[period].timestamp / 1000),
      value: Number(atr.toFixed(4)),
    },
  ];

  for (let i = period; i < trValues.length; i++) {
    atr = (atr * (period - 1) + trValues[i]) / period;
    results.push({
      time: Math.floor(candles[i + 1].timestamp / 1000),
      value: Number(atr.toFixed(4)),
    });
  }

  return results;
}

/**
 * Stochastic RSI
 */
export function calculateStochRSI(
  candles: Candle[],
  rsiPeriod = 14,
  stochPeriod = 14,
  kSmooth = 3,
  dSmooth = 3
): StochRSIPoint[] {
  const rsi = calculateRSI(candles, rsiPeriod);
  if (rsi.length < stochPeriod) return [];

  const rawStoch: { time: number; value: number }[] = [];

  for (let i = stochPeriod - 1; i < rsi.length; i++) {
    const window = rsi.slice(i - stochPeriod + 1, i + 1);
    const minRsi = Math.min(...window.map((w) => w.value));
    const maxRsi = Math.max(...window.map((w) => w.value));

    const currentRsi = rsi[i].value;
    const stochVal = maxRsi === minRsi ? 50 : ((currentRsi - minRsi) / (maxRsi - minRsi)) * 100;

    rawStoch.push({
      time: rsi[i].time,
      value: stochVal,
    });
  }

  // Smooth K
  const kLine: { time: number; value: number }[] = [];
  for (let i = kSmooth - 1; i < rawStoch.length; i++) {
    const kSlice = rawStoch.slice(i - kSmooth + 1, i + 1);
    const kAvg = kSlice.reduce((sum, item) => sum + item.value, 0) / kSmooth;
    kLine.push({
      time: rawStoch[i].time,
      value: Number(kAvg.toFixed(2)),
    });
  }

  // Smooth D
  const results: StochRSIPoint[] = [];
  for (let i = dSmooth - 1; i < kLine.length; i++) {
    const dSlice = kLine.slice(i - dSmooth + 1, i + 1);
    const dAvg = dSlice.reduce((sum, item) => sum + item.value, 0) / dSmooth;
    results.push({
      time: kLine[i].time,
      k: kLine[i].value,
      d: Number(dAvg.toFixed(2)),
    });
  }

  return results;
}
