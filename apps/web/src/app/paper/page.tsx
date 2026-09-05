'use client';

import React, { useState, useEffect } from 'react';
import {
  Coins,
  DollarSign,
  TrendingUp,
  TrendingDown,
  RefreshCw,
  Plus,
  ShieldCheck,
  AlertCircle,
  ArrowUpRight,
  ArrowDownRight,
} from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { useMarket } from '../../context/MarketContext';
import { ApiClient } from '../../lib/api';
import { formatNumber, formatPercent, formatPrice } from '../../lib/utils';

export default function PaperTradingPage() {
  const { currentSymbol, currentTicker, symbolsList } = useMarket();

  const [account, setAccount] = useState<any>(null);
  const [positions, setPositions] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // New Paper Position Form State
  const [selectedSymbol, setSelectedSymbol] = useState('BTCUSDT');
  const [direction, setDirection] = useState<'LONG' | 'SHORT'>('LONG');
  const [quantity, setQuantity] = useState<number>(0.1);
  const [leverage, setLeverage] = useState<number>(1);
  const [stopLoss, setStopLoss] = useState<number>(0);
  const [takeProfit, setTakeProfit] = useState<number>(0);

  const [isOpening, setIsOpening] = useState(false);
  const [feedback, setFeedback] = useState<string | null>(null);

  const fetchPaperData = async () => {
    try {
      const [acc, pos] = await Promise.all([
        ApiClient.getPaperAccount(),
        ApiClient.getPaperPositions(),
      ]);
      setAccount(acc);
      setPositions(pos);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchPaperData();
    const timer = setInterval(fetchPaperData, 3000);
    return () => clearInterval(timer);
  }, []);

  const handleOpenPosition = async (e: React.FormEvent) => {
    e.preventDefault();
    if (quantity <= 0) return;
    setIsOpening(true);
    setFeedback(null);

    try {
      await ApiClient.openPaperPosition({
        symbol: selectedSymbol,
        direction,
        quantity,
        leverage,
        stopLoss: stopLoss > 0 ? stopLoss : undefined,
        takeProfit: takeProfit > 0 ? takeProfit : undefined,
      });
      setFeedback('Simulated position opened successfully!');
      fetchPaperData();
      setTimeout(() => setFeedback(null), 3000);
    } catch (err: any) {
      setFeedback(err.message || 'Error opening position');
    } finally {
      setIsOpening(false);
    }
  };

  const handleClosePosition = async (id: string) => {
    try {
      await ApiClient.closePaperPosition(id);
      fetchPaperData();
    } catch (err: any) {
      alert(err.message || 'Error closing position');
    }
  };

  const handleResetAccount = async () => {
    if (confirm('Reset your paper account balance to $10,000 and clear simulated positions?')) {
      await ApiClient.resetPaperAccount();
      fetchPaperData();
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background select-none font-sans text-xs">
      <TopNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6">
        {/* Page Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Coins className="w-5 h-5 text-brand" />
              <span>Simulated Paper Trading</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Practice trading strategies risk-free with virtual capital in real market conditions.
            </p>
          </div>

          <button
            onClick={handleResetAccount}
            className="bg-surface hover:bg-surface-elevated border border-border text-slate-300 hover:text-white px-3 py-1.5 rounded-lg flex items-center gap-1.5 transition text-xs"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Reset Virtual Capital ($10,000)</span>
          </button>
        </div>

        {/* 1. Account Summary KPIs */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Account Equity</span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              ${formatNumber(account?.equity || 10000, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              Unrealized P&L: {account?.unrealizedPnl >= 0 ? '+' : ''}${formatNumber(account?.unrealizedPnl || 0, 2)}
            </span>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Cash Balance</span>
            <p className="text-xl font-bold font-mono text-white mt-1">
              ${formatNumber(account?.balance || 10000, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Available for new orders</span>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Realized P&L</span>
            <p
              className={`text-xl font-bold font-mono mt-1 ${
                (account?.realizedPnl || 0) >= 0 ? 'text-bullish' : 'text-bearish'
              }`}
            >
              {account?.realizedPnl >= 0 ? '+' : ''}${formatNumber(account?.realizedPnl || 0, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">From closed paper trades</span>
          </div>

          <div className="p-4 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Open Positions</span>
            <p className="text-xl font-bold font-mono text-brand mt-1">{positions.length}</p>
            <span className="text-[10px] text-slate-500 font-mono">Actively tracked live</span>
          </div>
        </div>

        {/* 2. Order Execution & Active Positions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Quick Simulated Order Form */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4 font-mono">
            <div className="flex items-center gap-2 border-b border-border pb-3 font-sans">
              <Plus className="w-4 h-4 text-brand" />
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Place Simulated Order
              </h3>
            </div>

            <form onSubmit={handleOpenPosition} className="space-y-3">
              {/* Direction Toggle */}
              <div className="grid grid-cols-2 gap-2 font-sans">
                <button
                  type="button"
                  onClick={() => setDirection('LONG')}
                  className={`py-2 rounded font-bold transition flex items-center justify-center gap-1 text-xs ${
                    direction === 'LONG'
                      ? 'bg-bullish text-white shadow-md shadow-bullish/20'
                      : 'bg-surface-subtle text-slate-400'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4" />
                  <span>LONG</span>
                </button>
                <button
                  type="button"
                  onClick={() => setDirection('SHORT')}
                  className={`py-2 rounded font-bold transition flex items-center justify-center gap-1 text-xs ${
                    direction === 'SHORT'
                      ? 'bg-bearish text-white shadow-md shadow-bearish/20'
                      : 'bg-surface-subtle text-slate-400'
                  }`}
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>SHORT</span>
                </button>
              </div>

              {/* Symbol */}
              <div>
                <label className="text-[10px] text-slate-400 uppercase block mb-1 font-sans">
                  Crypto Asset
                </label>
                <select
                  value={selectedSymbol}
                  onChange={(e) => setSelectedSymbol(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-1.5 text-white font-bold"
                >
                  {symbolsList.map((sym) => (
                    <option key={sym} value={sym}>
                      {sym}
                    </option>
                  ))}
                </select>
              </div>

              {/* Quantity & Leverage */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1 font-sans">
                    Quantity
                  </label>
                  <input
                    type="number"
                    step="any"
                    value={quantity}
                    onChange={(e) => setQuantity(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-400 uppercase block mb-1 font-sans">
                    Leverage
                  </label>
                  <select
                    value={leverage}
                    onChange={(e) => setLeverage(parseInt(e.target.value, 10))}
                    className="w-full bg-surface-subtle border border-border rounded px-2.5 py-1.5 text-white text-xs"
                  >
                    <option value={1}>1x</option>
                    <option value={2}>2x</option>
                    <option value={5}>5x</option>
                    <option value={10}>10x</option>
                  </select>
                </div>
              </div>

              {/* Optional SL & TP */}
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-red-400 uppercase block mb-1 font-sans">
                    Stop Loss (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 94000"
                    value={stopLoss || ''}
                    onChange={(e) => setStopLoss(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-white text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-emerald-400 uppercase block mb-1 font-sans">
                    Take Profit (Optional)
                  </label>
                  <input
                    type="number"
                    step="any"
                    placeholder="e.g. 99000"
                    value={takeProfit || ''}
                    onChange={(e) => setTakeProfit(parseFloat(e.target.value) || 0)}
                    className="w-full bg-surface-subtle border border-border rounded px-2 py-1.5 text-white text-xs"
                  />
                </div>
              </div>

              {feedback && (
                <div className="p-2 bg-brand/10 border border-brand/30 rounded text-brand text-xs font-sans text-center">
                  {feedback}
                </div>
              )}

              <button
                type="submit"
                disabled={isOpening}
                className="w-full bg-brand hover:bg-brand-hover text-white font-bold py-2.5 rounded font-sans transition shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                {isOpening ? 'Opening Position...' : `Execute Paper ${direction}`}
              </button>
            </form>
          </div>

          {/* Active Positions Table */}
          <div className="lg:col-span-2 bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center justify-between border-b border-border pb-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                Active Paper Positions ({positions.length})
              </h3>
              <span className="text-[11px] text-slate-400 font-mono">
                Live price feed active
              </span>
            </div>

            {positions.length === 0 ? (
              <div className="py-16 text-center text-slate-500 font-sans">
                No simulated positions open. Place an order to start paper trading.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse font-mono text-[11px]">
                  <thead>
                    <tr className="text-[10px] text-slate-400 bg-surface-subtle border-b border-border uppercase font-sans">
                      <th className="py-2.5 px-3">Symbol</th>
                      <th className="py-2.5 px-2">Side</th>
                      <th className="py-2.5 px-2">Size</th>
                      <th className="py-2.5 px-2">Entry</th>
                      <th className="py-2.5 px-2">Mark Price</th>
                      <th className="py-2.5 px-2">Unrealized P&L</th>
                      <th className="py-2.5 px-3 text-right font-sans">Close</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-border/40">
                    {positions.map((p) => {
                      const isProfit = (p.unrealizedPnl || 0) >= 0;
                      return (
                        <tr key={p.id} className="hover:bg-surface-elevated/40 transition">
                          <td className="py-3 px-3 font-bold text-white">{p.symbol}</td>
                          <td className="py-3 px-2">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                p.direction === 'LONG'
                                  ? 'bg-bullish/20 text-bullish'
                                  : 'bg-bearish/20 text-bearish'
                              }`}
                            >
                              {p.direction} {p.leverage}x
                            </span>
                          </td>
                          <td className="py-3 px-2 text-slate-200">{p.quantity}</td>
                          <td className="py-3 px-2 text-slate-300">{formatPrice(p.entryPrice)}</td>
                          <td className="py-3 px-2 text-white font-semibold">
                            {formatPrice(p.currentPrice)}
                          </td>
                          <td
                            className={`py-3 px-2 font-bold ${
                              isProfit ? 'text-bullish' : 'text-bearish'
                            }`}
                          >
                            {isProfit ? '+' : ''}${formatNumber(p.unrealizedPnl || 0, 2)}
                          </td>
                          <td className="py-3 px-3 text-right">
                            <button
                              onClick={() => handleClosePosition(p.id)}
                              className="bg-surface-elevated hover:bg-red-500/20 text-slate-300 hover:text-red-400 border border-border px-2.5 py-1 rounded text-[10px] font-sans font-semibold transition"
                            >
                              Market Close
                            </button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </main>
    </div>
  );
}
