import type { Candle, Ticker, Timeframe } from '@trading/types';

interface SymbolState {
  symbol: string;
  currentPrice: number;
  open24h: number;
  high24h: number;
  low24h: number;
  volume24h: number;
  volatility: number;
  precision: number;
  candles: Map<string, Candle[]>; // key: timeframe
}

export class MarketSimulator {
  private symbols = new Map<string, SymbolState>();
  private onTickerUpdateCallback?: (ticker: Ticker) => void;
  private onCandleUpdateCallback?: (symbol: string, timeframe: Timeframe, candle: Candle) => void;
  private intervalTimer: NodeJS.Timeout | null = null;

  constructor() {
    this.initSymbols();
    this.startLiveTickEngine();
  }

  private initSymbols() {
    const baseAssets: { symbol: string; price: number; volatility: number; precision: number }[] = [
      { symbol: 'BTCUSDT', price: 96450.0, volatility: 0.0006, precision: 2 },
      { symbol: 'ETHUSDT', price: 3420.0, volatility: 0.0009, precision: 2 },
      { symbol: 'SOLUSDT', price: 184.5, volatility: 0.0014, precision: 2 },
      { symbol: 'BNBUSDT', price: 645.0, volatility: 0.0007, precision: 2 },
      { symbol: 'XRPUSDT', price: 2.24, volatility: 0.0016, precision: 4 },
      { symbol: 'DOGEUSDT', price: 0.258, volatility: 0.0018, precision: 5 },
      { symbol: 'ADAUSDT', price: 0.725, volatility: 0.0015, precision: 5 },
      { symbol: 'AVAXUSDT', price: 31.8, volatility: 0.0016, precision: 2 },
      { symbol: 'LINKUSDT', price: 18.2, volatility: 0.0014, precision: 2 },
      { symbol: 'NEARUSDT', price: 5.65, volatility: 0.0017, precision: 4 },
    ];

    for (const asset of baseAssets) {
      const open24h = asset.price * (1 - (Math.random() * 0.06 - 0.02)); // between -2% and +4%
      this.symbols.set(asset.symbol, {
        symbol: asset.symbol,
        currentPrice: asset.price,
        open24h,
        high24h: Math.max(asset.price, open24h) * 1.025,
        low24h: Math.min(asset.price, open24h) * 0.975,
        volume24h: asset.price > 1000 ? 15400 + Math.random() * 5000 : 450000 + Math.random() * 100000,
        volatility: asset.volatility,
        precision: asset.precision,
        candles: new Map(),
      });
    }
  }

  onTickerUpdate(cb: (ticker: Ticker) => void) {
    this.onTickerUpdateCallback = cb;
  }

  onCandleUpdate(cb: (symbol: string, timeframe: Timeframe, candle: Candle) => void) {
    this.onCandleUpdateCallback = cb;
  }

  private getTimeframeDurationMs(timeframe: Timeframe): number {
    const map: Record<Timeframe, number> = {
      '1m': 60 * 1000,
      '3m': 3 * 60 * 1000,
      '5m': 5 * 60 * 1000,
      '15m': 15 * 60 * 1000,
      '30m': 30 * 60 * 1000,
      '1h': 60 * 60 * 1000,
      '2h': 2 * 60 * 60 * 1000,
      '4h': 4 * 60 * 60 * 1000,
      '6h': 6 * 60 * 60 * 1000,
      '12h': 12 * 60 * 60 * 1000,
      '1D': 24 * 60 * 60 * 1000,
      '1W': 7 * 24 * 60 * 60 * 1000,
    };
    return map[timeframe] || 60 * 60 * 1000;
  }

  getKlines(symbol: string, timeframe: Timeframe = '1h', limit: number = 1000): Candle[] {
    const sym = this.symbols.get(symbol.toUpperCase());
    if (!sym) return [];

    const cached = sym.candles.get(timeframe);
    if (cached && cached.length >= limit) {
      return cached.slice(-limit);
    }

    // Generate historical candles
    const duration = this.getTimeframeDurationMs(timeframe);
    const now = Date.now();
    const currentPeriodStart = Math.floor(now / duration) * duration;

    const candles: Candle[] = [];
    let price = sym.currentPrice;

    // Walk backwards to create authentic price history
    const history: { open: number; high: number; low: number; close: number; volume: number; timestamp: number }[] = [];

    for (let i = 0; i < limit; i++) {
      const timestamp = currentPeriodStart - i * duration;
      const changePct = (Math.random() - 0.495) * sym.volatility * Math.sqrt(duration / 60000) * 10;
      const open = Number((price / (1 + changePct)).toFixed(sym.precision));
      const close = price;
      const wick1 = Math.random() * sym.volatility * 3 * price;
      const wick2 = Math.random() * sym.volatility * 3 * price;
      const high = Number((Math.max(open, close) + wick1).toFixed(sym.precision));
      const low = Number((Math.min(open, close) - wick2).toFixed(sym.precision));
      const volume = Number(((sym.volume24h / (24 * 60)) * (duration / 60000) * (0.6 + Math.random() * 0.8)).toFixed(2));

      history.push({ timestamp, open, high, low, close, volume });
      price = open;
    }

    history.reverse();
    const formatted: Candle[] = history.map((h) => ({
      ...h,
      symbol: sym.symbol,
      timeframe,
    }));

    sym.candles.set(timeframe, formatted);
    return formatted;
  }

  getTicker(symbol: string): Ticker | null {
    const sym = this.symbols.get(symbol.toUpperCase());
    if (!sym) return null;

    const change24h = Number((sym.currentPrice - sym.open24h).toFixed(sym.precision));
    const changePercent24h = Number(((change24h / sym.open24h) * 100).toFixed(2));
    const spread = sym.currentPrice * 0.0002;

    return {
      symbol: sym.symbol,
      price: sym.currentPrice,
      change24h,
      changePercent24h,
      high24h: sym.high24h,
      low24h: sym.low24h,
      volume24h: sym.volume24h,
      bid: Number((sym.currentPrice - spread / 2).toFixed(sym.precision)),
      ask: Number((sym.currentPrice + spread / 2).toFixed(sym.precision)),
      lastUpdated: Date.now(),
    };
  }

  getAllTickers(): Ticker[] {
    const results: Ticker[] = [];
    for (const [sym] of this.symbols) {
      const t = this.getTicker(sym);
      if (t) results.push(t);
    }
    return results;
  }

  private startLiveTickEngine() {
    this.intervalTimer = setInterval(() => {
      for (const [symbol, state] of this.symbols) {
        // Random walk tick
        const tickPct = (Math.random() - 0.498) * state.volatility * 1.5;
        const newPrice = Number((state.currentPrice * (1 + tickPct)).toFixed(state.precision));
        state.currentPrice = newPrice;

        if (newPrice > state.high24h) state.high24h = newPrice;
        if (newPrice < state.low24h) state.low24h = newPrice;
        state.volume24h += (Math.random() * 0.5 + 0.1);

        // Update active candles across timeframes
        for (const [tf, candles] of state.candles) {
          if (candles.length === 0) continue;
          const lastCandle = candles[candles.length - 1];
          const duration = this.getTimeframeDurationMs(tf as Timeframe);
          const currentSlot = Math.floor(Date.now() / duration) * duration;

          if (lastCandle.timestamp === currentSlot) {
            // Update current open candle
            lastCandle.close = newPrice;
            if (newPrice > lastCandle.high) lastCandle.high = newPrice;
            if (newPrice < lastCandle.low) lastCandle.low = newPrice;
            lastCandle.volume = Number((lastCandle.volume + Math.random() * 0.2).toFixed(2));

            this.onCandleUpdateCallback?.(symbol, tf as Timeframe, { ...lastCandle });
          } else if (Date.now() - lastCandle.timestamp >= duration) {
            // Close candle and open a new candle
            const nextCandle: Candle = {
              timestamp: currentSlot,
              open: lastCandle.close,
              high: Math.max(lastCandle.close, newPrice),
              low: Math.min(lastCandle.close, newPrice),
              close: newPrice,
              volume: Number((Math.random() * 0.5 + 0.1).toFixed(2)),
              symbol,
              timeframe: tf as Timeframe,
            };
            candles.push(nextCandle);
            if (candles.length > 500) candles.shift();

            this.onCandleUpdateCallback?.(symbol, tf as Timeframe, { ...nextCandle });
          }
        }

        // Trigger ticker update
        const ticker = this.getTicker(symbol);
        if (ticker) {
          this.onTickerUpdateCallback?.(ticker);
        }
      }
    }, 1000);
  }

  destroy() {
    if (this.intervalTimer) clearInterval(this.intervalTimer);
  }
}
