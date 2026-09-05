import { describe, it, expect } from 'vitest';
import type { Candle } from '@trading/types';
import {
  calculateSMA,
  calculateEMA,
  calculateRSI,
  calculateMACD,
  calculateBollingerBands,
  calculateVWAP,
  calculateATR,
} from '../src/index.js';

function generateSampleCandles(count: number, basePrice = 100): Candle[] {
  const candles: Candle[] = [];
  let price = basePrice;
  const now = 1700000000000;

  for (let i = 0; i < count; i++) {
    const variation = (Math.sin(i / 5) * 5) + ((i % 2 === 0 ? 1 : -1) * 1.5);
    const close = Number((price + variation).toFixed(2));
    const high = Number((Math.max(price, close) + 2).toFixed(2));
    const low = Number((Math.min(price, close) - 2).toFixed(2));
    const open = price;
    const volume = 1000 + (i * 10);

    candles.push({
      timestamp: now + i * 60000,
      open,
      high,
      low,
      close,
      volume,
      symbol: 'BTCUSDT',
      timeframe: '1m',
    });

    price = close;
  }
  return candles;
}

describe('Technical Indicators Library', () => {
  const candles = generateSampleCandles(100, 100);

  it('calculates SMA correctly', () => {
    const period = 20;
    const sma = calculateSMA(candles, period);
    expect(sma.length).toBe(candles.length - period + 1);
    expect(sma[0].value).toBeGreaterThan(90);
    expect(sma[0].value).toBeLessThan(200);
  });

  it('calculates EMA with fast responsiveness', () => {
    const period = 20;
    const ema = calculateEMA(candles, period);
    expect(ema.length).toBe(candles.length - period + 1);
    expect(ema[0].value).toBeGreaterThan(90);
  });

  it('calculates RSI bounded between 0 and 100', () => {
    const rsi = calculateRSI(candles, 14);
    expect(rsi.length).toBeGreaterThan(0);
    for (const point of rsi) {
      expect(point.value).toBeGreaterThanOrEqual(0);
      expect(point.value).toBeLessThanOrEqual(100);
    }
  });

  it('calculates MACD with macd, signal and histogram components', () => {
    const macd = calculateMACD(candles, 12, 26, 9);
    expect(macd.length).toBeGreaterThan(0);
    expect(macd[0]).toHaveProperty('macd');
    expect(macd[0]).toHaveProperty('signal');
    expect(macd[0]).toHaveProperty('histogram');
    expect(macd[0].histogram).toBeCloseTo(macd[0].macd - macd[0].signal, 2);
  });

  it('calculates Bollinger Bands with upper >= middle >= lower', () => {
    const bb = calculateBollingerBands(candles, 20, 2);
    expect(bb.length).toBeGreaterThan(0);
    for (const point of bb) {
      expect(point.upper).toBeGreaterThanOrEqual(point.middle);
      expect(point.middle).toBeGreaterThanOrEqual(point.lower);
    }
  });

  it('calculates VWAP correctly', () => {
    const vwap = calculateVWAP(candles);
    expect(vwap.length).toBe(candles.length);
    expect(vwap[0].value).toBeGreaterThan(0);
  });

  it('calculates ATR as positive volatility measure', () => {
    const atr = calculateATR(candles, 14);
    expect(atr.length).toBeGreaterThan(0);
    for (const point of atr) {
      expect(point.value).toBeGreaterThan(0);
    }
  });
});
