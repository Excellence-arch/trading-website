import type { Candle, SymbolInfo, Ticker, Timeframe } from '@trading/types';
import { BinanceClient } from './binance.js';
import { MarketSimulator } from './simulator.js';
import { cache } from '../cache/index.js';
import { prisma } from '../db/prisma.js';

export class MarketDataService {
  private binance: BinanceClient;
  private simulator: MarketSimulator;
  private isUsingDemo = false;
  private listeners = new Set<(event: string, data: unknown) => void>();

  constructor() {
    this.binance = new BinanceClient();
    this.simulator = new MarketSimulator();

    // Check Binance availability on boot
    this.init();
  }

  private async init() {
    const binanceOk = await this.binance.checkAvailability();
    if (binanceOk) {
      this.isUsingDemo = false;
      console.log('[MarketService] Connected to live Binance Market Data');

      this.binance.onTickerUpdate((ticker) => {
        this.broadcast('ticker:update', ticker);
      });

      this.binance.onCandleUpdate((symbol, timeframe, candle) => {
        this.broadcast('candle:update', { symbol, timeframe, candle });
        this.cacheCandle(candle);
      });
    } else {
      this.isUsingDemo = true;
      console.log('[MarketService] Binance endpoint firewalled or unreachable. Running resilient high-fidelity DEMO DATA engine.');

      this.simulator.onTickerUpdate((ticker) => {
        this.broadcast('ticker:update', ticker);
      });

      this.simulator.onCandleUpdate((symbol, timeframe, candle) => {
        this.broadcast('candle:update', { symbol, timeframe, candle });
      });

      this.simulator.onTradeUpdate((trade) => {
        this.broadcast('trade:update', trade);
      });
    }
  }

  get isDemo(): boolean {
    return this.isUsingDemo;
  }

  setDemoMode(enabled: boolean) {
    this.isUsingDemo = enabled;
  }

  addListener(fn: (event: string, data: unknown) => void) {
    this.listeners.add(fn);
  }

  removeListener(fn: (event: string, data: unknown) => void) {
    this.listeners.delete(fn);
  }

  private broadcast(event: string, data: unknown) {
    this.listeners.forEach((fn) => {
      try {
        fn(event, data);
      } catch (err) {
        console.error('[MarketService] Error in broadcast listener:', err);
      }
    });
  }

  async getSupportedSymbols(): Promise<SymbolInfo[]> {
    return [
      { symbol: 'BTCUSDT', baseAsset: 'BTC', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 5, minNotional: 10, status: 'TRADING' },
      { symbol: 'ETHUSDT', baseAsset: 'ETH', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 4, minNotional: 10, status: 'TRADING' },
      { symbol: 'SOLUSDT', baseAsset: 'SOL', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 2, minNotional: 10, status: 'TRADING' },
      { symbol: 'BNBUSDT', baseAsset: 'BNB', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 3, minNotional: 10, status: 'TRADING' },
      { symbol: 'XRPUSDT', baseAsset: 'XRP', quoteAsset: 'USDT', pricePrecision: 4, quantityPrecision: 1, minNotional: 10, status: 'TRADING' },
      { symbol: 'DOGEUSDT', baseAsset: 'DOGE', quoteAsset: 'USDT', pricePrecision: 5, quantityPrecision: 1, minNotional: 10, status: 'TRADING' },
      { symbol: 'ADAUSDT', baseAsset: 'ADA', quoteAsset: 'USDT', pricePrecision: 5, quantityPrecision: 1, minNotional: 10, status: 'TRADING' },
      { symbol: 'AVAXUSDT', baseAsset: 'AVAX', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 2, minNotional: 10, status: 'TRADING' },
      { symbol: 'LINKUSDT', baseAsset: 'LINK', quoteAsset: 'USDT', pricePrecision: 2, quantityPrecision: 2, minNotional: 10, status: 'TRADING' },
      { symbol: 'NEARUSDT', baseAsset: 'NEAR', quoteAsset: 'USDT', pricePrecision: 4, quantityPrecision: 2, minNotional: 10, status: 'TRADING' },
    ];
  }

  async getAllTickers(): Promise<Ticker[]> {
    if (this.isUsingDemo) {
      return this.simulator.getAllTickers();
    }
    const symbols = await this.getSupportedSymbols();
    const promises = symbols.map((s) => this.binance.get24hTicker(s.symbol));
    const tickers = await Promise.all(promises);
    return tickers.filter((t): t is Ticker => t !== null);
  }

  async getTicker(symbol: string): Promise<Ticker | null> {
    const sym = symbol.toUpperCase();
    if (this.isUsingDemo) {
      return this.simulator.getTicker(sym);
    }
    const live = await this.binance.get24hTicker(sym);
    if (live) return live;
    return this.simulator.getTicker(sym);
  }

  async getCandles(symbol: string, timeframe: Timeframe = '1h', limit: number = 1000): Promise<Candle[]> {
    const sym = symbol.toUpperCase();

    if (this.isUsingDemo) {
      return this.simulator.getKlines(sym, timeframe, limit);
    }

    try {
      const candles = await this.binance.getKlines(sym, timeframe, limit);
      if (candles && candles.length > 0) {
        return candles;
      }
    } catch {
      // Fallback
    }

    return this.simulator.getKlines(sym, timeframe, limit);
  }

  private async cacheCandle(candle: Candle) {
    if (!candle.symbol || !candle.timeframe) return;
    try {
      await prisma.candle.upsert({
        where: {
          symbol_timeframe_timestamp: {
            symbol: candle.symbol,
            timeframe: candle.timeframe,
            timestamp: BigInt(candle.timestamp),
          },
        },
        create: {
          symbol: candle.symbol,
          timeframe: candle.timeframe,
          timestamp: BigInt(candle.timestamp),
          open: candle.open,
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        },
        update: {
          high: candle.high,
          low: candle.low,
          close: candle.close,
          volume: candle.volume,
        },
      });
    } catch {
      // Cache insert failure should not interrupt stream
    }
  }

  subscribeClient(symbol: string, timeframe?: Timeframe) {
    if (!this.isUsingDemo && this.binance.available) {
      const sym = symbol.toLowerCase();
      this.binance.subscribeStream(`${sym}@ticker`);
      if (timeframe) {
        this.binance.subscribeStream(`${sym}@kline_${timeframe}`);
      }
    } else {
      if (timeframe) {
        this.simulator.ensureTimeframe(symbol, timeframe);
      }
    }
  }
}

export const marketService = new MarketDataService();
