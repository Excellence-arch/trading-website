import WebSocket from 'ws';
import https from 'https';
import type { Candle, Ticker, Timeframe } from '@trading/types';
import { config } from '../config/index.js';
import { resilientHttpsAgent, customLookup } from './dns-resolver.js';

function fetchJson<T>(url: string, timeoutMs: number = 8000): Promise<T | null> {
  return new Promise((resolve) => {
    const req = https.get(url, { agent: resilientHttpsAgent, timeout: timeoutMs }, (res) => {
      if (res.statusCode && res.statusCode >= 400) {
        res.resume();
        return resolve(null);
      }
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          resolve(JSON.parse(raw) as T);
        } catch {
          resolve(null);
        }
      });
    });

    req.on('timeout', () => {
      req.destroy();
      resolve(null);
    });

    req.on('error', () => {
      resolve(null);
    });
  });
}

export class BinanceClient {
  private ws: WebSocket | null = null;
  private isConnecting = false;
  private reconnectTimeout: NodeJS.Timeout | null = null;
  private onTickerUpdateCallback?: (ticker: Ticker) => void;
  private onCandleUpdateCallback?: (symbol: string, timeframe: Timeframe, candle: Candle) => void;
  private activeStreams = new Set<string>();
  private isAvailable = false;

  constructor() {
    this.checkAvailability();
  }

  async checkAvailability(): Promise<boolean> {
    try {
      const data = await fetchJson<any>(`${config.binanceApiUrl}/api/v3/ping`, 8000);
      this.isAvailable = data !== null;
      return this.isAvailable;
    } catch {
      this.isAvailable = false;
      return false;
    }
  }

  get available(): boolean {
    return this.isAvailable;
  }

  onTickerUpdate(cb: (ticker: Ticker) => void) {
    this.onTickerUpdateCallback = cb;
  }

  onCandleUpdate(cb: (symbol: string, timeframe: Timeframe, candle: Candle) => void) {
    this.onCandleUpdateCallback = cb;
  }

  async get24hTicker(symbol: string): Promise<Ticker | null> {
    try {
      const data = await fetchJson<any>(`${config.binanceApiUrl}/api/v3/ticker/24hr?symbol=${symbol.toUpperCase()}`, 8000);
      if (!data || !data.symbol) return null;
      return {
        symbol: data.symbol,
        price: parseFloat(data.lastPrice),
        change24h: parseFloat(data.priceChange),
        changePercent24h: parseFloat(data.priceChangePercent),
        high24h: parseFloat(data.highPrice),
        low24h: parseFloat(data.lowPrice),
        volume24h: parseFloat(data.volume),
        bid: parseFloat(data.bidPrice),
        ask: parseFloat(data.askPrice),
        lastUpdated: Date.now(),
      };
    } catch {
      return null;
    }
  }

  async getKlines(
    symbol: string,
    interval: string = '1h',
    limit: number = 1000,
    startTime?: number,
    endTime?: number
  ): Promise<Candle[]> {
    try {
      const safeLimit = Math.min(1000, Math.max(10, limit));
      const params = new URLSearchParams({
        symbol: symbol.toUpperCase(),
        interval,
        limit: safeLimit.toString(),
      });
      if (startTime) params.append('startTime', startTime.toString());
      if (endTime) params.append('endTime', endTime.toString());

      const raw = await fetchJson<any[]>(`${config.binanceApiUrl}/api/v3/klines?${params.toString()}`, 8000);
      if (!raw || !Array.isArray(raw)) return [];

      return raw.map((k: (number | string)[]) => ({
        timestamp: Number(k[0]),
        open: parseFloat(String(k[1])),
        high: parseFloat(String(k[2])),
        low: parseFloat(String(k[3])),
        close: parseFloat(String(k[4])),
        volume: parseFloat(String(k[5])),
        symbol: symbol.toUpperCase(),
        timeframe: interval as Timeframe,
      }));
    } catch {
      return [];
    }
  }

  subscribeStream(streamName: string) {
    const isNew = !this.activeStreams.has(streamName);
    this.activeStreams.add(streamName);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      if (isNew) {
        const payload = {
          method: 'SUBSCRIBE',
          params: [streamName],
          id: Date.now(),
        };
        this.ws.send(JSON.stringify(payload));
      }
    } else {
      this.ensureWebSocket();
    }
  }

  unsubscribeStream(streamName: string) {
    if (!this.activeStreams.has(streamName)) return;
    this.activeStreams.delete(streamName);
    if (this.ws && this.ws.readyState === WebSocket.OPEN) {
      const payload = {
        method: 'UNSUBSCRIBE',
        params: [streamName],
        id: Date.now(),
      };
      this.ws.send(JSON.stringify(payload));
    }
  }

  private ensureWebSocket() {
    if (!this.isAvailable) return;
    if (this.ws && (this.ws.readyState === WebSocket.OPEN || this.ws.readyState === WebSocket.CONNECTING)) {
      return;
    }

    if (this.isConnecting) return;
    this.isConnecting = true;

    try {
      this.ws = new WebSocket(config.binanceWsUrl, {
        lookup: customLookup,
      });

      this.ws.on('open', () => {
        this.isConnecting = false;
        console.log('[BinanceWS] Connected to Binance Stream');
        if (this.activeStreams.size > 0) {
          const payload = {
            method: 'SUBSCRIBE',
            params: Array.from(this.activeStreams),
            id: Date.now(),
          };
          this.ws?.send(JSON.stringify(payload));
        }
      });

      this.ws.on('message', (data: WebSocket.RawData) => {
        try {
          const msg = JSON.parse(data.toString());
          // Handle kline event
          if (msg.e === 'kline') {
            const k = msg.k;
            const candle: Candle = {
              timestamp: k.t,
              open: parseFloat(k.o),
              high: parseFloat(k.h),
              low: parseFloat(k.l),
              close: parseFloat(k.c),
              volume: parseFloat(k.v),
              symbol: msg.s,
              timeframe: k.i as Timeframe,
            };
            this.onCandleUpdateCallback?.(msg.s, k.i as Timeframe, candle);
          } else if (msg.e === '24hrTicker') {
            const ticker: Ticker = {
              symbol: msg.s,
              price: parseFloat(msg.c),
              change24h: parseFloat(msg.p),
              changePercent24h: parseFloat(msg.P),
              high24h: parseFloat(msg.h),
              low24h: parseFloat(msg.l),
              volume24h: parseFloat(msg.v),
              bid: parseFloat(msg.b),
              ask: parseFloat(msg.a),
              lastUpdated: Date.now(),
            };
            this.onTickerUpdateCallback?.(ticker);
          }
        } catch {
          // ignore malformed websocket frame
        }
      });

      this.ws.on('close', () => {
        this.isConnecting = false;
        this.reconnect();
      });

      this.ws.on('error', () => {
        this.isConnecting = false;
        this.ws?.close();
      });
    } catch {
      this.isConnecting = false;
      this.reconnect();
    }
  }

  private reconnect() {
    if (this.reconnectTimeout) clearTimeout(this.reconnectTimeout);
    this.reconnectTimeout = setTimeout(() => {
      this.ensureWebSocket();
    }, 5000);
  }
}
