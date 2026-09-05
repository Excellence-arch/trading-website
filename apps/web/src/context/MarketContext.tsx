'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import type { Ticker, Timeframe } from '@trading/types';
import { ApiClient } from '../lib/api';
import { wsClient } from '../lib/websocket';

interface MarketContextType {
  currentSymbol: string;
  currentTimeframe: Timeframe;
  setCurrentSymbol: (sym: string) => void;
  setCurrentTimeframe: (tf: Timeframe) => void;
  tickers: Record<string, Ticker>;
  currentTicker: Ticker | null;
  isDemoMode: boolean;
  setDemoMode: (enabled: boolean) => Promise<void>;
  wsStatus: string;
  symbolsList: string[];
}

const MarketContext = createContext<MarketContextType | undefined>(undefined);

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [currentSymbol, setCurrentSymbol] = useState<string>('BTCUSDT');
  const [currentTimeframe, setCurrentTimeframe] = useState<Timeframe>('1h');
  const [tickers, setTickers] = useState<Record<string, Ticker>>({});
  const [isDemoMode, setIsDemoMode] = useState<boolean>(false);
  const [wsStatus, setWsStatus] = useState<string>('CONNECTING');
  const [symbolsList, setSymbolsList] = useState<string[]>([
    'BTCUSDT',
    'ETHUSDT',
    'SOLUSDT',
    'BNBUSDT',
    'XRPUSDT',
    'DOGEUSDT',
    'ADAUSDT',
    'AVAXUSDT',
    'LINKUSDT',
    'NEARUSDT',
  ]);

  useEffect(() => {
    try {
      const savedSym = localStorage.getItem('trading_symbol');
      if (savedSym) setCurrentSymbol(savedSym);
      const savedTf = localStorage.getItem('trading_timeframe');
      if (savedTf) setCurrentTimeframe(savedTf as Timeframe);
    } catch {
      // ignore
    }

    // 1. Initial market status
    ApiClient.getMarketStatus()
      .then((status) => {
        setIsDemoMode(status.isDemo);
      })
      .catch(() => {});

    // 2. Fetch initial tickers
    ApiClient.getTickers()
      .then((data) => {
        if (Array.isArray(data)) {
          const map: Record<string, Ticker> = {};
          data.forEach((t) => {
            map[t.symbol] = t;
          });
          setTickers(map);
          setSymbolsList(data.map((t) => t.symbol));
        }
      })
      .catch(() => {});

    // 3. Connect WebSocket
    wsClient.connect();

    const unsubStatus = wsClient.onStatusChange((status, isDemo) => {
      setWsStatus(status);
      if (isDemo !== undefined) setIsDemoMode(isDemo);
    });

    return () => {
      unsubStatus();
      wsClient.disconnect();
    };
  }, []);

  // Subscribe to all symbols for the watchlist tickers
  useEffect(() => {
    const unsubs: (() => void)[] = [];

    symbolsList.forEach((sym) => {
      const unsub = wsClient.subscribeTicker(sym, (ticker) => {
        setTickers((prev) => ({
          ...prev,
          [ticker.symbol]: ticker,
        }));
      });
      unsubs.push(unsub);
    });

    return () => {
      unsubs.forEach((u) => u());
    };
  }, [symbolsList]);

  const toggleDemo = async (enabled: boolean) => {
    try {
      const res = await ApiClient.toggleDemoMode(enabled);
      setIsDemoMode(res.isDemo);
    } catch {
      setIsDemoMode(enabled);
    }
  };

  const handleSetCurrentSymbol = (sym: string) => {
    setCurrentSymbol(sym);
    try {
      localStorage.setItem('trading_symbol', sym);
    } catch {}
  };

  const handleSetCurrentTimeframe = (tf: Timeframe) => {
    setCurrentTimeframe(tf);
    try {
      localStorage.setItem('trading_timeframe', tf);
    } catch {}
  };

  const currentTicker = tickers[currentSymbol] || null;

  return (
    <MarketContext.Provider
      value={{
        currentSymbol,
        currentTimeframe,
        setCurrentSymbol: handleSetCurrentSymbol,
        setCurrentTimeframe: handleSetCurrentTimeframe,
        tickers,
        currentTicker,
        isDemoMode,
        setDemoMode: toggleDemo,
        wsStatus,
        symbolsList,
      }}
    >
      {children}
    </MarketContext.Provider>
  );
}

export function useMarket() {
  const ctx = useContext(MarketContext);
  if (!ctx) throw new Error('useMarket must be used within a MarketProvider');
  return ctx;
}
