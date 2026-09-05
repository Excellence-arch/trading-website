const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export class ApiClient {
  private static token: string | null = null;

  static setToken(token: string | null) {
    this.token = token;
    if (typeof window !== 'undefined') {
      if (token) localStorage.setItem('auth_token', token);
      else localStorage.removeItem('auth_token');
    }
  }

  static getToken(): string | null {
    if (this.token) return this.token;
    if (typeof window !== 'undefined') {
      this.token = localStorage.getItem('auth_token');
    }
    return this.token;
  }

  static async fetch<T>(path: string, options: RequestInit = {}): Promise<T> {
    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    const token = this.getToken();
    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const url = path.startsWith('http') ? path : `${API_BASE}${path}`;

    const res = await fetch(url, {
      ...options,
      headers,
    });

    if (!res.ok) {
      const errorData = await res.json().catch(() => ({ error: res.statusText }));
      throw new Error(errorData.error || `HTTP Error ${res.status}`);
    }

    return res.json();
  }

  // Auth endpoints
  static login(email: string, password: string) {
    return this.fetch<{ user: any; token: string }>('/api/auth/login', {
      method: 'POST',
      body: JSON.stringify({ email, password }),
    });
  }

  static register(email: string, password: string, name: string) {
    return this.fetch<{ user: any; token: string }>('/api/auth/register', {
      method: 'POST',
      body: JSON.stringify({ email, password, name }),
    });
  }

  static getMe() {
    return this.fetch<any>('/api/auth/me');
  }

  // Market endpoints
  static getSymbols() {
    return this.fetch<any[]>('/api/market/symbols');
  }

  static getTickers() {
    return this.fetch<any[]>('/api/market/tickers');
  }

  static getTicker(symbol: string) {
    return this.fetch<any>(`/api/market/ticker/${symbol}`);
  }

  static getCandles(symbol: string, timeframe: string = '1h', limit: number = 1000) {
    return this.fetch<any[]>(`/api/market/candles?symbol=${symbol}&timeframe=${timeframe}&limit=${limit}`);
  }

  static getMarketStatus() {
    return this.fetch<{ isDemo: boolean; status: string; timestamp: number }>('/api/market/status');
  }

  static toggleDemoMode(enabled: boolean) {
    return this.fetch<{ success: boolean; isDemo: boolean }>('/api/market/demo-mode', {
      method: 'POST',
      body: JSON.stringify({ enabled }),
    });
  }

  // Watchlist endpoints
  static getWatchlist() {
    return this.fetch<any>('/api/watchlist');
  }

  static addWatchlistItem(symbol: string) {
    return this.fetch<any>('/api/watchlist/item', {
      method: 'POST',
      body: JSON.stringify({ symbol }),
    });
  }

  static removeWatchlistItem(symbol: string) {
    return this.fetch<any>(`/api/watchlist/item/${symbol}`, {
      method: 'DELETE',
    });
  }

  // Trades & Journal endpoints
  static getTrades(params: Record<string, string | number> = {}) {
    const q = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => {
      if (v !== undefined && v !== '') q.append(k, String(v));
    });
    return this.fetch<{ items: any[]; pagination: any }>(`/api/trades?${q.toString()}`);
  }

  static getTrade(id: string) {
    return this.fetch<any>(`/api/trades/${id}`);
  }

  static createTrade(data: any) {
    return this.fetch<any>('/api/trades', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static updateTrade(id: string, data: any) {
    return this.fetch<any>(`/api/trades/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(data),
    });
  }

  static deleteTrade(id: string) {
    return this.fetch<any>(`/api/trades/${id}`, {
      method: 'DELETE',
    });
  }

  static clearAllTrades() {
    return this.fetch<{ message: string; count: number }>('/api/trades/clear-all', {
      method: 'DELETE',
    });
  }

  // Analytics endpoints
  static getAnalytics() {
    return this.fetch<any>('/api/analytics');
  }

  // Paper trading endpoints
  static getPaperAccount() {
    return this.fetch<any>('/api/paper/account');
  }

  static getPaperPositions() {
    return this.fetch<any[]>('/api/paper/positions');
  }

  static openPaperPosition(data: any) {
    return this.fetch<any>('/api/paper/positions', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static closePaperPosition(id: string) {
    return this.fetch<any>(`/api/paper/positions/${id}/close`, {
      method: 'POST',
    });
  }

  static resetPaperAccount() {
    return this.fetch<any>('/api/paper/reset', {
      method: 'POST',
    });
  }

  // Historical Replay endpoints
  static getReplayCandles(symbol: string, timeframe: string = '1h', startDate?: string, limit: number = 300) {
    const q = new URLSearchParams({ symbol, timeframe, limit: limit.toString() });
    if (startDate) q.append('startDate', startDate);
    return this.fetch<any[]>(`/api/replay/candles?${q.toString()}`);
  }

  static saveReplayTrade(data: any) {
    return this.fetch<any>('/api/replay/trade', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  // AI Review & Coach
  static getAITradeReview(tradeId: string) {
    return this.fetch<any>(`/api/ai/trade-review/${tradeId}`, {
      method: 'POST',
    });
  }

  static queryAICoach(question: string) {
    return this.fetch<{ response: string; dataPointsUsed: number }>('/api/ai/coach', {
      method: 'POST',
      body: JSON.stringify({ question }),
    });
  }

  // Drawings endpoints
  static getDrawings(symbol: string, timeframe?: string) {
    const q = new URLSearchParams({ symbol });
    if (timeframe) q.append('timeframe', timeframe);
    return this.fetch<any[]>(`/api/drawings?${q.toString()}`);
  }

  static saveDrawing(data: any) {
    return this.fetch<any>('/api/drawings', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  static deleteDrawing(id: string) {
    return this.fetch<any>(`/api/drawings/${id}`, {
      method: 'DELETE',
    });
  }

  // Strategy endpoints
  static getStrategies() {
    return this.fetch<any[]>('/api/strategies');
  }

  static createStrategy(data: any) {
    return this.fetch<any>('/api/strategies', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}
