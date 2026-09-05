'use client';

import React, { useState, useEffect } from 'react';
import {
  AlertCircle,
  AlertTriangle,
  ArrowDownRight,
  ArrowUpRight,
  Award,
  BarChart3,
  Calendar,
  CheckCircle2,
  Clock,
  Coins,
  Compass,
  DollarSign,
  Flame,
  Layers,
  Percent,
  PieChart,
  Shield,
  Sparkles,
  TrendingDown,
  TrendingUp,
} from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { ApiClient } from '../../lib/api';
import { formatNumber, formatPercent, formatPrice, formatRMultiple } from '../../lib/utils';

export default function AnalyticsPage() {
  const [data, setData] = useState<any>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'strategies' | 'patterns' | 'sessions'>('overview');

  useEffect(() => {
    ApiClient.getAnalytics()
      .then((res) => setData(res))
      .catch(() => {})
      .finally(() => setIsLoading(false));
  }, []);

  if (isLoading) {
    return (
      <div className="flex flex-col min-h-screen bg-background">
        <TopNav />
        <div className="flex-1 flex items-center justify-center text-slate-500 font-mono text-xs">
          Calculating portfolio analytics & quantitative metrics...
        </div>
      </div>
    );
  }

  const m = data?.metrics || {};
  const isNetProfit = (m.totalPnl || 0) >= 0;

  return (
    <div className="flex flex-col min-h-screen bg-background select-none font-sans text-xs">
      <TopNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-6 animate__animated animate__fadeIn animate__faster">
        {/* Title Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-brand" />
              <span>Performance Analytics & Pattern Discovery</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Comprehensive statistical audit of your trading edge, risk metrics, and behavioral patterns.
            </p>
          </div>

          {/* Sub-nav Tabs */}
          <div className="bg-surface border border-border rounded-lg p-1 flex items-center gap-1">
            <button
              onClick={() => setActiveTab('overview')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'overview' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Overview & Curve
            </button>
            <button
              onClick={() => setActiveTab('strategies')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'strategies' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Strategy Breakdown
            </button>
            <button
              onClick={() => setActiveTab('patterns')}
              className={`px-3 py-1.5 rounded-md font-semibold transition flex items-center gap-1.5 ${
                activeTab === 'patterns' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-400" />
              <span>Pattern Detection</span>
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`px-3 py-1.5 rounded-md font-semibold transition ${
                activeTab === 'sessions' ? 'bg-brand text-white' : 'text-slate-400 hover:text-white'
              }`}
            >
              Sessions & Time
            </button>
          </div>
        </div>

        {/* 1. Core KPIs Strip */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 animate__animated animate__fadeInUp animate__faster">
          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Total Net P&L</span>
            <p className={`text-lg font-bold font-mono mt-1 ${isNetProfit ? 'text-bullish' : 'text-bearish'}`}>
              {m.totalPnl >= 0 ? '+' : ''}${formatNumber(m.totalPnl || 0, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Gross: +${formatNumber(m.grossProfit || 0, 0)}</span>
          </div>

          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Win Rate</span>
            <p className="text-lg font-bold font-mono text-white mt-1">
              {formatPercent(m.winRate || 0)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">
              {m.winningTrades}W / {m.losingTrades}L ({m.totalTrades} total)
            </span>
          </div>

          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Profit Factor</span>
            <p className={`text-lg font-bold font-mono mt-1 ${m.profitFactor >= 1.5 ? 'text-bullish' : 'text-slate-200'}`}>
              {formatNumber(m.profitFactor || 0, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Benchmark: &gt; 1.75</span>
          </div>

          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Average R</span>
            <p className={`text-lg font-bold font-mono mt-1 ${m.averageRMultiple >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {formatRMultiple(m.averageRMultiple)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Avg Win: ${formatNumber(m.averageWin || 0, 0)}</span>
          </div>

          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Expectancy / Trade</span>
            <p className={`text-lg font-bold font-mono mt-1 ${m.expectancy >= 0 ? 'text-bullish' : 'text-bearish'}`}>
              {m.expectancy >= 0 ? '+' : ''}${formatNumber(m.expectancy || 0, 2)}
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Mathematical Edge</span>
          </div>

          <div className="p-3.5 bg-surface border border-border rounded-xl">
            <span className="text-[10px] text-slate-400 uppercase font-semibold">Max Drawdown</span>
            <p className="text-lg font-bold font-mono text-bearish mt-1">
              -{formatNumber(m.maxDrawdownPercent || 0, 1)}%
            </p>
            <span className="text-[10px] text-slate-500 font-mono">Peak Drop: -${formatNumber(m.maxDrawdown || 0, 0)}</span>
          </div>
        </div>

        {/* 2. Main Tab View */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Equity Curve Chart Visualizer */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-brand" />
                    <span>Cumulative Equity Curve ($ P&L)</span>
                  </h3>
                  <p className="text-[11px] text-slate-400">Account growth progression across consecutive closed trades.</p>
                </div>
                <div className="flex items-center gap-4 font-mono text-xs">
                  <span className="text-slate-400">Current Equity: <strong className="text-white">${formatNumber(10000 + (m.totalPnl || 0), 2)}</strong></span>
                  <span className="text-slate-400">Return: <strong className="text-bullish">{formatPercent(((m.totalPnl || 0) / 10000) * 100)}</strong></span>
                </div>
              </div>

              {/* Curve Polyline SVG */}
              <div className="h-64 w-full relative bg-surface-subtle border border-border/60 rounded-lg p-3 flex items-end">
                {data?.equityCurve?.length > 0 ? (
                  <div className="w-full h-full flex items-end gap-1.5 pt-4">
                    {data.equityCurve.map((point: any, idx: number) => {
                      const minPnl = -200;
                      const maxPnl = Math.max(1000, m.totalPnl * 1.2 || 1000);
                      const heightPct = Math.max(10, Math.min(95, ((point.cumulativePnl - minPnl) / (maxPnl - minPnl)) * 100));
                      const isUp = point.pnl >= 0;

                      return (
                        <div
                          key={idx}
                          className="flex-1 flex flex-col items-center justify-end h-full group relative"
                        >
                          {/* Tooltip */}
                          <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-14 bg-surface-elevated border border-border p-2 rounded text-[10px] font-mono text-white shadow-xl z-20 pointer-events-none whitespace-nowrap">
                            <p className="font-bold">{point.symbol} ({point.date})</p>
                            <p className={isUp ? 'text-bullish' : 'text-bearish'}>
                              Trade: {isUp ? '+' : ''}${point.pnl.toFixed(2)}
                            </p>
                            <p className="text-slate-300">Equity: ${point.cumulativePnl.toFixed(2)}</p>
                          </div>

                          {/* Bar */}
                          <div
                            style={{ height: `${heightPct}%` }}
                            className={`w-full max-w-[28px] rounded-t transition-all ${
                              isUp ? 'bg-gradient-to-t from-emerald-600/40 to-emerald-400' : 'bg-gradient-to-t from-red-600/40 to-red-400'
                            }`}
                          />
                          <span className="text-[9px] text-slate-500 font-mono mt-1 truncate max-w-[32px]">
                            #{idx + 1}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-slate-500 font-mono">
                    No closed trades recorded yet.
                  </div>
                )}
              </div>
            </div>

            {/* R-Multiple & Win/Loss Distribution */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {/* R-Distribution */}
              <div className="bg-surface border border-border rounded-xl p-4 shadow-xl space-y-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <BarChart3 className="w-3.5 h-3.5 text-brand" />
                  <span>R-Multiple Realized Distribution</span>
                </h3>
                <div className="space-y-2 pt-1 font-mono">
                  {data?.rMultipleDistribution?.map((bin: any, idx: number) => {
                    const maxCount = Math.max(1, ...data.rMultipleDistribution.map((b: any) => b.count));
                    const widthPct = (bin.count / maxCount) * 100;
                    const isProfitBin = !bin.label.includes('-');

                    return (
                      <div key={idx} className="flex items-center gap-2 text-xs">
                        <span className="w-24 text-slate-400 text-[11px] truncate">{bin.label}</span>
                        <div className="flex-1 h-5 bg-surface-subtle rounded overflow-hidden p-0.5">
                          <div
                            style={{ width: `${Math.max(2, widthPct)}%` }}
                            className={`h-full rounded transition-all ${
                              isProfitBin ? 'bg-bullish' : 'bg-bearish'
                            }`}
                          />
                        </div>
                        <span className="w-6 text-right font-bold text-white text-[11px]">{bin.count}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trade Efficiency Metrics */}
              <div className="bg-surface border border-border rounded-xl p-4 shadow-xl space-y-3 font-mono">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans flex items-center gap-1.5">
                  <Award className="w-3.5 h-3.5 text-amber-400" />
                  <span>Execution & Risk Diagnostics</span>
                </h3>

                <div className="space-y-2.5 divide-y divide-border/40 text-xs">
                  <div className="flex items-center justify-between pt-1">
                    <span className="text-slate-400 font-sans">Largest Winning Trade</span>
                    <span className="font-bold text-bullish">+${formatNumber(m.largestWin || 0, 2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400 font-sans">Largest Losing Trade</span>
                    <span className="font-bold text-bearish">-${formatNumber(m.largestLoss || 0, 2)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400 font-sans">Average Trade Holding Time</span>
                    <span className="font-bold text-white">{m.averageHoldingTimeMinutes || 0} minutes</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400 font-sans">Loss Rate</span>
                    <span className="font-bold text-bearish">{formatPercent(m.lossRate || 0)}</span>
                  </div>

                  <div className="flex items-center justify-between pt-2">
                    <span className="text-slate-400 font-sans">Breakeven Trades</span>
                    <span className="font-bold text-slate-300">{m.breakevenTrades || 0}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* 3. Strategy Breakdown Tab */}
        {activeTab === 'strategies' && (
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
            <div>
              <h3 className="text-sm font-bold text-white">Performance by Strategy</h3>
              <p className="text-[11px] text-slate-400">Evaluate which setups generate real quantitative expectancy.</p>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="text-[10px] text-slate-400 bg-surface-subtle border-b border-border font-sans uppercase">
                    <th className="py-2.5 px-4">Strategy Name</th>
                    <th className="py-2.5 px-3">Trades</th>
                    <th className="py-2.5 px-3">Win Rate</th>
                    <th className="py-2.5 px-3">Total P&L</th>
                    <th className="py-2.5 px-3">Profit Factor</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {data?.breakdownByStrategy?.map((s: any, idx: number) => {
                    const isProfitable = s.totalPnl >= 0;
                    return (
                      <tr key={idx} className="hover:bg-surface-elevated/50 transition">
                        <td className="py-3 px-4 font-bold text-white font-sans">{s.category}</td>
                        <td className="py-3 px-3 text-slate-300">{s.tradeCount}</td>
                        <td className={`py-3 px-3 font-bold ${s.winRate >= 60 ? 'text-bullish' : 'text-slate-300'}`}>
                          {formatPercent(s.winRate)}
                        </td>
                        <td className={`py-3 px-3 font-bold ${isProfitable ? 'text-bullish' : 'text-bearish'}`}>
                          {isProfitable ? '+' : ''}${formatNumber(s.totalPnl, 2)}
                        </td>
                        <td className="py-3 px-3 font-semibold text-slate-200">
                          {formatNumber(s.profitFactor, 2)}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 4. Automatic Pattern Detection Tab */}
        {activeTab === 'patterns' && (
          <div className="space-y-4">
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
              <div>
                <h3 className="text-sm font-bold text-white flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-amber-400" />
                  <span>Algorithmic Pattern Detection</span>
                </h3>
                <p className="text-[11px] text-slate-400">
                  Patterns derived directly from your personal trade logs without fabricated figures.
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {data?.patternInsights?.map((insight: any) => {
                  const isPositive = insight.type === 'POSITIVE';
                  const isWarning = insight.type === 'WARNING';

                  return (
                    <div
                      key={insight.id}
                      className={`p-4 rounded-xl border space-y-2 transition ${
                        isPositive
                          ? 'bg-emerald-500/10 border-emerald-500/30 text-slate-200'
                          : isWarning
                          ? 'bg-amber-500/10 border-amber-500/30 text-slate-200'
                          : 'bg-surface-subtle border-border text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          {isPositive ? (
                            <CheckCircle2 className="w-4 h-4 text-bullish" />
                          ) : isWarning ? (
                            <AlertTriangle className="w-4 h-4 text-amber-400" />
                          ) : (
                            <AlertCircle className="w-4 h-4 text-slate-400" />
                          )}
                          <h4 className="font-bold text-white text-xs">{insight.title}</h4>
                        </div>

                        {insight.sampleSize > 0 && (
                          <span className="text-[10px] font-mono bg-surface px-2 py-0.5 rounded border border-border/60 text-slate-400">
                            N={insight.sampleSize} trades
                          </span>
                        )}
                      </div>

                      <p className="text-xs text-slate-300 leading-relaxed">{insight.description}</p>

                      {insight.statDifference && (
                        <div className="text-[11px] font-mono font-bold text-amber-400 pt-1">
                          Key Metric: {insight.statDifference}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* 5. Sessions & Time Tab */}
        {activeTab === 'sessions' && (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Session Breakdown */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                Trading Session Performance
              </h3>
              <div className="space-y-3 divide-y divide-border/40 font-mono text-xs">
                {data?.breakdownBySession?.map((sess: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between pt-2">
                    <span className="font-sans text-slate-300">{sess.category}</span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="text-slate-400 font-sans">{sess.tradeCount} trades</span>
                      <span className={`font-bold ${sess.totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {sess.totalPnl >= 0 ? '+' : ''}${formatNumber(sess.totalPnl, 2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Day of Week Breakdown */}
            <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-3">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider font-sans">
                Day of Week Win Rates
              </h3>
              <div className="space-y-3 divide-y divide-border/40 font-mono text-xs">
                {data?.breakdownByDayOfWeek?.map((day: any, idx: number) => (
                  <div key={idx} className="flex items-center justify-between pt-2">
                    <span className="font-sans text-slate-300">{day.category}</span>
                    <div className="flex items-center gap-4 text-right">
                      <span className="font-bold text-white">{formatPercent(day.winRate)} WR</span>
                      <span className={`font-bold ${day.totalPnl >= 0 ? 'text-bullish' : 'text-bearish'}`}>
                        {day.totalPnl >= 0 ? '+' : ''}${formatNumber(day.totalPnl, 2)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
