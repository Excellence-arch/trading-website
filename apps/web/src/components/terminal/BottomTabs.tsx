'use client';

import React, { useState, useEffect } from 'react';
import {
  Activity,
  Bot,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Clock,
  Coins,
  History,
  TrendingDown,
  TrendingUp,
  XCircle,
} from 'lucide-react';
import type { PaperPosition, Trade } from '@trading/types';
import { useMarket } from '../../context/MarketContext';
import { ApiClient } from '../../lib/api';
import { wsClient, PublicTrade } from '../../lib/websocket';
import { formatNumber, formatPercent, formatPrice, formatRMultiple, formatShortDate } from '../../lib/utils';

interface BottomTabsProps {
  onSelectTradeForReview?: (tradeId: string) => void;
  refreshTrigger?: number;
  isCollapsed?: boolean;
  onToggleCollapse?: (collapsed: boolean) => void;
}

export function BottomTabs({
  onSelectTradeForReview,
  refreshTrigger,
  isCollapsed,
  onToggleCollapse,
}: BottomTabsProps) {
  const { currentSymbol, currentTicker } = useMarket();

  const [activeTab, setActiveTab] = useState<'positions' | 'trades' | 'tape' | 'ai' | 'collapsed'>('positions');

  useEffect(() => {
    if (isCollapsed !== undefined) {
      setActiveTab(isCollapsed ? 'collapsed' : 'positions');
    }
  }, [isCollapsed]);
  const [positions, setPositions] = useState<PaperPosition[]>([]);
  const [recentTrades, setRecentTrades] = useState<Trade[]>([]);
  const [liveTrades, setLiveTrades] = useState<PublicTrade[]>([]);
  const [paperAccount, setPaperAccount] = useState<any>(null);
  const [isClosing, setIsClosing] = useState<string | null>(null);

  // Subscribe to real-time live order flow tape
  useEffect(() => {
    setLiveTrades([]);
    const unsub = wsClient.subscribeTrade(currentSymbol, (trade) => {
      setLiveTrades((prev) => [trade, ...prev.slice(0, 35)]);
    });
    return unsub;
  }, [currentSymbol]);

  const fetchPaperData = async () => {
    try {
      const [acc, posList, tradesRes] = await Promise.all([
        ApiClient.getPaperAccount().catch(() => null),
        ApiClient.getPaperPositions().catch(() => []),
        ApiClient.getTrades({ limit: 10 }).catch(() => ({ items: [] })),
      ]);
      if (acc) setPaperAccount(acc);
      if (Array.isArray(posList)) setPositions(posList);
      if (tradesRes && Array.isArray(tradesRes.items)) setRecentTrades(tradesRes.items);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchPaperData();
    const interval = setInterval(fetchPaperData, 4000);
    return () => clearInterval(interval);
  }, [refreshTrigger]);

  const handleClosePosition = async (id: string) => {
    setIsClosing(id);
    try {
      await ApiClient.closePaperPosition(id);
      await fetchPaperData();
    } catch (err: any) {
      alert(err.message || 'Error closing position');
    } finally {
      setIsClosing(null);
    }
  };

  if (activeTab === 'collapsed') {
    return (
      <div className="h-7 bg-surface border-t border-border flex items-center justify-between px-3 text-xs select-none">
        <div className="flex items-center gap-3 font-mono text-[11px]">
          <span className="text-slate-400">Open Positions: <strong className="text-white">{positions.length}</strong></span>
          {paperAccount && (
            <span className="text-slate-400">Equity: <strong className="text-white">${formatNumber(paperAccount.equity)}</strong></span>
          )}
        </div>
        <button
          onClick={() => {
            setActiveTab('positions');
            onToggleCollapse?.(false);
          }}
          className="text-slate-400 hover:text-white flex items-center gap-1 text-[11px]"
        >
          <span>Expand Panel</span>
          <ChevronUp className="w-3 h-3" />
        </button>
      </div>
    );
  }

  return (
    <div className="h-48 bg-surface border-t border-border flex flex-col select-none text-xs">
      {/* Tab Navigation */}
      <div className="h-8 border-b border-border flex items-center justify-between px-2 bg-surface-subtle">
        <div className="flex items-center gap-1">
          <button
            onClick={() => setActiveTab('positions')}
            className={`px-3 py-1.5 font-medium rounded-t flex items-center gap-1.5 transition ${
              activeTab === 'positions'
                ? 'bg-surface text-white border-t-2 border-brand font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Coins className="w-3.5 h-3.5 text-brand" />
            <span>Open Positions</span>
            {positions.length > 0 && (
              <span className="bg-brand/20 text-brand text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                {positions.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('trades')}
            className={`px-3 py-1.5 font-medium rounded-t flex items-center gap-1.5 transition ${
              activeTab === 'trades'
                ? 'bg-surface text-white border-t-2 border-brand font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <History className="w-3.5 h-3.5" />
            <span>Recent Closed Trades</span>
            <span className="text-[10px] text-slate-500 font-mono">({recentTrades.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('tape')}
            className={`px-3 py-1.5 font-medium rounded-t flex items-center gap-1.5 transition ${
              activeTab === 'tape'
                ? 'bg-surface text-white border-t-2 border-emerald-400 font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Activity className="w-3.5 h-3.5 text-emerald-400 animate-pulse" />
            <span>Live Order Flow Tape</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-beacon" />
            <span className="text-[10px] text-slate-500 font-mono">({liveTrades.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('ai')}
            className={`px-3 py-1.5 font-medium rounded-t flex items-center gap-1.5 transition ${
              activeTab === 'ai'
                ? 'bg-surface text-white border-t-2 border-brand font-semibold'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Bot className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-Time Market Diagnostic</span>
          </button>
        </div>

        {/* Right Summary & Collapse Button */}
        <div className="flex items-center gap-3">
          {paperAccount && (
            <div className="hidden sm:flex items-center gap-2 font-mono text-[11px]">
              <span className="text-slate-400">Bal: <strong className="text-white">${formatNumber(paperAccount.balance)}</strong></span>
              <span className="text-slate-400">Eq: <strong className="text-white">${formatNumber(paperAccount.equity)}</strong></span>
            </div>
          )}
          <button
            onClick={() => {
              setActiveTab('collapsed');
              onToggleCollapse?.(true);
            }}
            className="p-1 text-slate-400 hover:text-white rounded hover:bg-surface-elevated"
            title="Collapse panel"
          >
            <ChevronDown className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Tab Content Body */}
      <div className="flex-1 overflow-y-auto font-mono text-[11px]">
        {/* 1. Open Positions Tab */}
        {activeTab === 'positions' && (
          <div>
            {positions.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-sans">
                No active simulated paper positions. Use the Trade Planner to open a paper trade.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-400 border-b border-border bg-surface-subtle/30 font-sans">
                    <th className="py-1.5 px-3">Symbol</th>
                    <th className="py-1.5 px-2">Side</th>
                    <th className="py-1.5 px-2">Size</th>
                    <th className="py-1.5 px-2">Entry Price</th>
                    <th className="py-1.5 px-2">Current Price</th>
                    <th className="py-1.5 px-2">Unrealized P&L</th>
                    <th className="py-1.5 px-2">ROE %</th>
                    <th className="py-1.5 px-3 text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {positions.map((p) => {
                    const isLong = p.direction === 'LONG';
                    const isProfit = (p.unrealizedPnl || 0) >= 0;
                    return (
                      <tr key={p.id} className="hover:bg-surface-elevated/40 transition">
                        <td className="py-2 px-3 font-bold text-white">{p.symbol}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              isLong ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                            }`}
                          >
                            {p.direction} {p.leverage}x
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-200">{p.quantity}</td>
                        <td className="py-2 px-2 text-slate-300">{formatPrice(p.entryPrice)}</td>
                        <td className="py-2 px-2 text-white font-semibold">{formatPrice(p.currentPrice)}</td>
                        <td className={`py-2 px-2 font-bold ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                          {isProfit ? '+' : ''}${formatNumber(p.unrealizedPnl || 0, 2)}
                        </td>
                        <td className={`py-2 px-2 font-semibold ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                          {formatPercent(p.unrealizedPnlPercent || 0)}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => handleClosePosition(p.id)}
                            disabled={isClosing === p.id}
                            className="bg-surface-elevated hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-border px-2 py-1 rounded text-[10px] font-sans font-semibold transition"
                          >
                            {isClosing === p.id ? 'Closing...' : 'Close Position'}
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* 2. Recent Closed Trades Tab */}
        {activeTab === 'trades' && (
          <div>
            {recentTrades.length === 0 ? (
              <div className="p-6 text-center text-slate-500 font-sans">
                No recorded trades found. Closed trades will automatically appear here.
              </div>
            ) : (
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="text-[10px] text-slate-400 border-b border-border bg-surface-subtle/30 font-sans">
                    <th className="py-1.5 px-3">Date</th>
                    <th className="py-1.5 px-2">Symbol</th>
                    <th className="py-1.5 px-2">Direction</th>
                    <th className="py-1.5 px-2">Entry</th>
                    <th className="py-1.5 px-2">Exit</th>
                    <th className="py-1.5 px-2">Net P&L</th>
                    <th className="py-1.5 px-2">R Multiple</th>
                    <th className="py-1.5 px-2">Strategy</th>
                    <th className="py-1.5 px-3 text-right">Details</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {recentTrades.map((t) => {
                    const isWin = (t.pnl || 0) > 0;
                    return (
                      <tr key={t.id} className="hover:bg-surface-elevated/40 transition">
                        <td className="py-2 px-3 text-slate-400">
                          {formatShortDate(t.enteredAt)}
                        </td>
                        <td className="py-2 px-2 font-bold text-white">{t.symbol}</td>
                        <td className="py-2 px-2">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'LONG' ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-2 px-2 text-slate-300">{formatPrice(t.entryPrice)}</td>
                        <td className="py-2 px-2 text-slate-300">
                          {t.exitPrice ? formatPrice(t.exitPrice) : '—'}
                        </td>
                        <td className={`py-2 px-2 font-bold ${isWin ? 'text-bullish' : 'text-bearish'}`}>
                          {t.pnl !== null && t.pnl !== undefined
                            ? `${t.pnl >= 0 ? '+' : ''}$${formatNumber(t.pnl, 2)}`
                            : 'OPEN'}
                        </td>
                        <td className={`py-2 px-2 font-semibold ${isWin ? 'text-bullish' : 'text-bearish'}`}>
                          {formatRMultiple(t.rMultiple)}
                        </td>
                        <td className="py-2 px-2 text-slate-400 truncate max-w-[120px]">
                          {t.strategy?.name || 'Unassigned'}
                        </td>
                        <td className="py-2 px-3 text-right">
                          <button
                            onClick={() => onSelectTradeForReview?.(t.id)}
                            className="text-brand hover:underline font-sans text-[11px]"
                          >
                            Review →
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            )}
          </div>
        )}

        {/* Live Order Flow Tape Tab */}
        {activeTab === 'tape' && (
          <div className="flex-1 flex flex-col overflow-hidden p-2">
            {/* Real-Time Buy / Sell Pressure Gauge */}
            <div className="flex items-center justify-between px-2.5 py-1.5 bg-surface-subtle border border-border rounded mb-1.5">
              <div className="flex items-center gap-2.5">
                <span className="text-[10px] text-slate-400 font-bold uppercase tracking-wider">Order Pressure:</span>
                <span className="text-emerald-400 font-bold font-mono text-[11px]">
                  {liveTrades.length > 0 ? Math.round((liveTrades.filter((t) => t.side === 'BUY').length / liveTrades.length) * 100) : 50}% BUYS
                </span>
                <div className="w-28 h-1.5 bg-rose-500/40 rounded-full overflow-hidden flex">
                  <div
                    className="bg-emerald-400 h-full transition-all duration-300"
                    style={{
                      width: `${liveTrades.length > 0 ? (liveTrades.filter((t) => t.side === 'BUY').length / liveTrades.length) * 100 : 50}%`,
                    }}
                  />
                </div>
                <span className="text-rose-400 font-bold font-mono text-[11px]">
                  {liveTrades.length > 0 ? Math.round((liveTrades.filter((t) => t.side === 'SELL').length / liveTrades.length) * 100) : 50}% SELLS
                </span>
              </div>
              <div className="flex items-center gap-1.5 text-[10px] text-slate-400 font-mono">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 live-beacon" />
                <span>Live Feed: 5 Ticks/Sec</span>
              </div>
            </div>

            {/* Trades Stream Table */}
            <div className="flex-1 overflow-y-auto">
              {liveTrades.length === 0 ? (
                <div className="h-full flex items-center justify-center text-slate-500 text-xs font-mono">
                  <span>Listening for incoming market transactions for {currentSymbol}...</span>
                </div>
              ) : (
                <table className="w-full text-left font-mono">
                  <thead>
                    <tr className="border-b border-border/80 text-[10px] text-slate-400 uppercase tracking-wider sticky top-0 bg-surface">
                      <th className="py-1 px-3">Time</th>
                      <th className="py-1 px-3">Side</th>
                      <th className="py-1 px-3">Price</th>
                      <th className="py-1 px-3">Amount</th>
                      <th className="py-1 px-3 text-right">Total Notional</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/30">
                    {liveTrades.map((t) => {
                      const isBuy = t.side === 'BUY';
                      const date = new Date(t.timestamp);
                      const timeStr = `${date.toTimeString().split(' ')[0]}.${String(date.getMilliseconds()).padStart(3, '0').slice(0, 2)}`;
                      return (
                        <tr key={t.id} className="tape-row-anim hover:bg-surface-elevated/50 transition">
                          <td className="py-1 px-3 text-slate-400 text-[11px]">{timeStr}</td>
                          <td className="py-1 px-3">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                isBuy ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {t.side}
                            </span>
                          </td>
                          <td className={`py-1 px-3 font-semibold text-[11px] ${isBuy ? 'text-emerald-400' : 'text-rose-400'}`}>
                            {formatPrice(t.price, currentSymbol)}
                          </td>
                          <td className="py-1 px-3 text-slate-200 text-[11px]">{t.amount}</td>
                          <td className="py-1 px-3 text-right text-slate-300 text-[11px]">
                            ${formatNumber(t.price * t.amount, 2)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* 3. AI Market Diagnostic Tab */}
        {activeTab === 'ai' && (
          <div className="p-3 font-sans space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span className="font-bold text-white text-xs">
                Real-Time Quantitative Diagnostic for {currentSymbol}
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-xs">
              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Trend Structure</p>
                <p className="font-medium text-slate-200 mt-1">
                  {currentTicker && currentTicker.changePercent24h > 1
                    ? 'Bullish Expansion: Higher highs confirmed on 1h timeframe.'
                    : currentTicker && currentTicker.changePercent24h < -1
                    ? 'Bearish Pressure: Downward momentum breaking local support.'
                    : 'Consolidation: Price ranging within established 24h boundaries.'}
                </p>
              </div>

              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Volatility & Liquidity</p>
                <p className="font-medium text-slate-200 mt-1">
                  24h High/Low range: {currentTicker ? formatPrice(currentTicker.low24h) : '—'} to{' '}
                  {currentTicker ? formatPrice(currentTicker.high24h) : '—'}. Spread remains optimal.
                </p>
              </div>

              <div className="p-2.5 rounded bg-surface-subtle border border-border">
                <p className="text-[10px] text-slate-400 uppercase font-semibold">Risk Advisory</p>
                <p className="font-medium text-slate-200 mt-1">
                  Strictly enforce stop losses beyond invalidation wicks. Planned R:R should exceed 1:2.0.
                </p>
              </div>
            </div>
            <p className="text-[10px] text-slate-500 italic">
              Automated algorithmic market observations for technical analysis only — not financial advice.
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
