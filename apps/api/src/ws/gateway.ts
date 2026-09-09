import { Server as HttpServer } from 'http';
import WebSocket, { WebSocketServer } from 'ws';
import type { WSClientMessage } from '@trading/types';
import { marketService } from '../market/market-service.js';

interface ClientState {
  subscribedTickers: Set<string>;
  subscribedCandles: Set<string>; // format: "SYMBOL:TIMEFRAME"
  isAlive: boolean;
}

export class WebSocketGateway {
  private wss: WebSocketServer;
  private clientStates = new Map<WebSocket, ClientState>();
  private heartbeatInterval: NodeJS.Timeout | null = null;

  constructor(server: HttpServer) {
    this.wss = new WebSocketServer({ server, path: '/ws' });

    this.wss.on('connection', (ws: WebSocket) => {
      this.handleConnection(ws);
    });

    this.setupMarketDataForwarding();
    this.startHeartbeat();
  }

  private handleConnection(ws: WebSocket) {
    const state: ClientState = {
      subscribedTickers: new Set(),
      subscribedCandles: new Set(),
      isAlive: true,
    };
    this.clientStates.set(ws, state);

    // Send initial greeting & status
    ws.send(
      JSON.stringify({
        type: 'connection:status',
        status: 'CONNECTED',
        isDemo: marketService.isDemo,
        timestamp: Date.now(),
      })
    );

    ws.on('pong', () => {
      const client = this.clientStates.get(ws);
      if (client) client.isAlive = true;
    });

    ws.on('message', (raw: WebSocket.RawData) => {
      try {
        const msg = JSON.parse(raw.toString()) as WSClientMessage;
        this.handleClientMessage(ws, state, msg);
      } catch {
        // ignore invalid JSON
      }
    });

    ws.on('close', () => {
      this.clientStates.delete(ws);
    });

    ws.on('error', () => {
      this.clientStates.delete(ws);
    });
  }

  private handleClientMessage(ws: WebSocket, state: ClientState, msg: WSClientMessage) {
    const symbol = msg.symbol?.toUpperCase();
    if (!symbol) return;

    switch (msg.action) {
      case 'subscribe:ticker': {
        state.subscribedTickers.add(symbol);
        marketService.subscribeClient(symbol);
        // Immediately send latest ticker
        marketService.getTicker(symbol).then((ticker) => {
          if (ticker && ws.readyState === WebSocket.OPEN) {
            ws.send(JSON.stringify({ type: 'ticker:update', data: ticker }));
          }
        });
        break;
      }
      case 'unsubscribe:ticker': {
        state.subscribedTickers.delete(symbol);
        break;
      }
      case 'subscribe:candle': {
        const tf = msg.timeframe || '1h';
        const key = `${symbol}:${tf}`;
        state.subscribedCandles.add(key);
        marketService.subscribeClient(symbol, tf);
        break;
      }
      case 'unsubscribe:candle': {
        const tf = msg.timeframe || '1h';
        const key = `${symbol}:${tf}`;
        state.subscribedCandles.delete(key);
        break;
      }
    }
  }

  private setupMarketDataForwarding() {
    marketService.addListener((event: string, payload: unknown) => {
      if (event === 'ticker:update') {
        const ticker = payload as { symbol: string };
        const msg = JSON.stringify({ type: 'ticker:update', data: ticker });

        for (const [ws, state] of this.clientStates) {
          if (ws.readyState === WebSocket.OPEN && state.subscribedTickers.has(ticker.symbol)) {
            ws.send(msg);
          }
        }
      } else if (event === 'candle:update') {
        const p = payload as { symbol: string; timeframe: string; candle: unknown };
        const key = `${p.symbol}:${p.timeframe}`;
        const msg = JSON.stringify({
          type: 'candle:update',
          symbol: p.symbol,
          timeframe: p.timeframe,
          data: p.candle,
        });

        for (const [ws, state] of this.clientStates) {
          if (ws.readyState === WebSocket.OPEN && state.subscribedCandles.has(key)) {
            ws.send(msg);
          }
        }
      } else if (event === 'trade:update') {
        const trade = payload as { symbol: string };
        const msg = JSON.stringify({ type: 'trade:update', data: trade });
        for (const [ws, state] of this.clientStates) {
          if (ws.readyState === WebSocket.OPEN && state.subscribedTickers.has(trade.symbol)) {
            ws.send(msg);
          }
        }
      }
    });
  }

  private startHeartbeat() {
    this.heartbeatInterval = setInterval(() => {
      for (const [ws, state] of this.clientStates) {
        if (!state.isAlive) {
          this.clientStates.delete(ws);
          ws.terminate();
          continue;
        }
        state.isAlive = false;
        ws.ping();
      }
    }, 30000);
  }

  broadcast(message: object) {
    const payload = JSON.stringify(message);
    for (const [ws] of this.clientStates) {
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(payload);
      }
    }
  }

  destroy() {
    if (this.heartbeatInterval) clearInterval(this.heartbeatInterval);
    this.wss.close();
  }
}
