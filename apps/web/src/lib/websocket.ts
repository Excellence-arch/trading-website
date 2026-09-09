import type { Candle, Ticker, Timeframe, WSServerMessage } from '@trading/types';

export interface PublicTrade {
  id: string;
  symbol: string;
  price: number;
  amount: number;
  side: 'BUY' | 'SELL';
  timestamp: number;
}

export class WebSocketClient {
  private ws: WebSocket | null = null;
  private url: string;
  private reconnectInterval = 3000;
  private isExplicitlyClosed = false;
  private tickerListeners = new Map<string, Set<(ticker: Ticker) => void>>();
  private candleListeners = new Map<string, Set<(candle: Candle) => void>>();
  private tradeListeners = new Map<string, Set<(trade: PublicTrade) => void>>();
  private statusListeners = new Set<(status: string, isDemo?: boolean) => void>();

  constructor(url?: string) {
    const defaultWsUrl =
      typeof window !== 'undefined'
        ? `ws://${window.location.hostname}:3001/ws`
        : 'ws://localhost:3001/ws';
    this.url = process.env.NEXT_PUBLIC_WS_URL || url || defaultWsUrl;
  }

  connect() {
    if (typeof window === 'undefined') return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    this.isExplicitlyClosed = false;

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        this.statusListeners.forEach((fn) => fn('CONNECTED'));
        this.resubscribe();
      };

      this.ws.onmessage = (event) => {
        try {
          const msg = JSON.parse(event.data) as WSServerMessage;
          this.handleServerMessage(msg);
        } catch {
          // ignore malformed frame
        }
      };

      this.ws.onclose = () => {
        this.statusListeners.forEach((fn) => fn('DISCONNECTED'));
        if (!this.isExplicitlyClosed) {
          setTimeout(() => this.connect(), this.reconnectInterval);
        }
      };

      this.ws.onerror = () => {
        this.statusListeners.forEach((fn) => fn('ERROR'));
      };
    } catch {
      setTimeout(() => this.connect(), this.reconnectInterval);
    }
  }

  private handleServerMessage(msg: WSServerMessage) {
    if (msg.type === 'ticker:update') {
      const ticker = msg.data;
      const listeners = this.tickerListeners.get(ticker.symbol);
      if (listeners) {
        listeners.forEach((fn) => fn(ticker));
      }
    } else if (msg.type === 'candle:update') {
      const key = `${msg.symbol}:${msg.timeframe}`;
      const listeners = this.candleListeners.get(key);
      if (listeners) {
        listeners.forEach((fn) => fn(msg.data));
      }
    } else if (msg.type === 'trade:update') {
      const trade = (msg as any).data as PublicTrade;
      const listeners = this.tradeListeners.get(trade.symbol);
      if (listeners) {
        listeners.forEach((fn) => fn(trade));
      }
    } else if (msg.type === 'connection:status') {
      this.statusListeners.forEach((fn) => fn(msg.status, (msg as any).isDemo));
    }
  }

  private resubscribe() {
    if (!this.ws || this.ws.readyState !== WebSocket.OPEN) return;

    for (const [symbol] of this.tickerListeners) {
      this.send({ action: 'subscribe:ticker', symbol });
    }

    for (const [key] of this.candleListeners) {
      const [symbol, timeframe] = key.split(':');
      this.send({ action: 'subscribe:candle', symbol, timeframe: timeframe as Timeframe });
    }
  }

  subscribeTicker(symbol: string, callback: (ticker: Ticker) => void) {
    const sym = symbol.toUpperCase();
    if (!this.tickerListeners.has(sym)) {
      this.tickerListeners.set(sym, new Set());
      this.send({ action: 'subscribe:ticker', symbol: sym });
    }
    this.tickerListeners.get(sym)!.add(callback);

    return () => {
      const listeners = this.tickerListeners.get(sym);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.tickerListeners.delete(sym);
          this.send({ action: 'unsubscribe:ticker', symbol: sym });
        }
      }
    };
  }

  subscribeCandle(symbol: string, timeframe: Timeframe, callback: (candle: Candle) => void) {
    const key = `${symbol.toUpperCase()}:${timeframe}`;
    if (!this.candleListeners.has(key)) {
      this.candleListeners.set(key, new Set());
      this.send({ action: 'subscribe:candle', symbol: symbol.toUpperCase(), timeframe });
    }
    this.candleListeners.get(key)!.add(callback);

    return () => {
      const listeners = this.candleListeners.get(key);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.candleListeners.delete(key);
          this.send({ action: 'unsubscribe:candle', symbol: symbol.toUpperCase(), timeframe });
        }
      }
    };
  }

  subscribeTrade(symbol: string, callback: (trade: PublicTrade) => void) {
    const sym = symbol.toUpperCase();
    if (!this.tradeListeners.has(sym)) {
      this.tradeListeners.set(sym, new Set());
      this.send({ action: 'subscribe:ticker', symbol: sym });
    }
    this.tradeListeners.get(sym)!.add(callback);

    return () => {
      const listeners = this.tradeListeners.get(sym);
      if (listeners) {
        listeners.delete(callback);
        if (listeners.size === 0) {
          this.tradeListeners.delete(sym);
        }
      }
    };
  }

  onStatusChange(callback: (status: string, isDemo?: boolean) => void) {
    this.statusListeners.add(callback);
    return () => this.statusListeners.delete(callback);
  }

  private send(data: object) {
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      this.ws.send(JSON.stringify(data));
    }
  }

  disconnect() {
    this.isExplicitlyClosed = true;
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }
}

export const wsClient = new WebSocketClient();
