'use client';

import React, { useState, useEffect } from 'react';
import {
  ArrowDownRight,
  ArrowUpRight,
  BookOpen,
  Calendar,
  ChevronLeft,
  ChevronRight,
  Download,
  Filter,
  Layers,
  Plus,
  Search,
  SlidersHorizontal,
  Table as TableIcon,
  LayoutGrid,
  Trash2,
} from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { TradeReviewModal } from '../../components/journal/TradeReviewModal';
import { JournalModal } from '../../components/journal/JournalModal';
import { ApiClient } from '../../lib/api';
import { formatNumber, formatPercent, formatPrice, formatRMultiple, formatShortDate } from '../../lib/utils';

export default function JournalPage() {
  const [trades, setTrades] = useState<any[]>([]);
  const [pagination, setPagination] = useState({ total: 0, page: 1, limit: 15, pages: 1 });
  const [viewMode, setViewMode] = useState<'table' | 'cards'>('table');
  const [isLoading, setIsLoading] = useState(true);

  // Filters State
  const [search, setSearch] = useState('');
  const [symbolFilter, setSymbolFilter] = useState('');
  const [directionFilter, setDirectionFilter] = useState('');
  const [outcomeFilter, setOutcomeFilter] = useState('');
  const [strategyFilter, setStrategyFilter] = useState('');
  const [timeframeFilter, setTimeframeFilter] = useState('');
  const [strategies, setStrategies] = useState<any[]>([]);

  // Modals State
  const [selectedTradeId, setSelectedTradeId] = useState<string | null>(null);
  const [isRecordModalOpen, setIsRecordModalOpen] = useState(false);

  const fetchTrades = async () => {
    setIsLoading(true);
    try {
      const res = await ApiClient.getTrades({
        search,
        symbol: symbolFilter,
        direction: directionFilter,
        outcome: outcomeFilter,
        strategyId: strategyFilter,
        timeframe: timeframeFilter,
        page: pagination.page,
        limit: pagination.limit,
      });
      setTrades(res.items || []);
      setPagination(res.pagination || { total: 0, page: 1, limit: 15, pages: 1 });
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  const handleClearAllTrades = async () => {
    if (window.confirm('Are you sure you want to clear all trades? This will remove all sample test data so you can start with a clean journal.')) {
      try {
        await ApiClient.clearAllTrades();
        await fetchTrades();
      } catch (err: any) {
        alert(err.message || 'Error clearing trades');
      }
    }
  };

  useEffect(() => {
    ApiClient.getStrategies().then((s) => {
      if (Array.isArray(s)) setStrategies(s);
    }).catch(() => {});
  }, []);

  useEffect(() => {
    fetchTrades();
  }, [search, symbolFilter, directionFilter, outcomeFilter, strategyFilter, timeframeFilter, pagination.page]);

  return (
    <div className="flex flex-col min-h-screen bg-background select-none font-sans text-xs">
      <TopNav />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 md:p-6 space-y-5 animate__animated animate__fadeIn animate__faster">
        {/* Page Title & Actions */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <BookOpen className="w-5 h-5 text-brand" />
              <span>Trading Journal</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Review and filter your historical setups, emotional logs, and quantitative execution outcomes.
            </p>
          </div>

          <div className="flex items-center gap-2">
            {/* Clear Sample Trades Button */}
            {trades.length > 0 && (
              <button
                onClick={handleClearAllTrades}
                className="bg-surface hover:bg-red-500/15 border border-border hover:border-red-500/40 text-slate-400 hover:text-red-400 px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition text-xs"
                title="Clear all test data"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Clear Test Data</span>
              </button>
            )}

            {/* View Mode Toggle */}
            <div className="bg-surface border border-border rounded-lg p-1 flex items-center">
              <button
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded transition ${
                  viewMode === 'table' ? 'bg-surface-elevated text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Table View"
              >
                <TableIcon className="w-4 h-4" />
              </button>
              <button
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded transition ${
                  viewMode === 'cards' ? 'bg-surface-elevated text-white' : 'text-slate-400 hover:text-white'
                }`}
                title="Cards View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
            </div>

            {/* Record New Trade Button */}
            <button
              onClick={() => setIsRecordModalOpen(true)}
              className="bg-brand hover:bg-brand-hover text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition shadow-lg shadow-brand/20 animate__animated animate__pulse animate__infinite animate__slower"
            >
              <Plus className="w-4 h-4" />
              <span>Record New Trade</span>
            </button>
          </div>
        </div>

        {/* Filter Controls Bar */}
        <div className="bg-surface border border-border rounded-xl p-3.5 space-y-3 animate__animated animate__fadeInUp animate__faster">
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-6 gap-2.5">
            {/* Search */}
            <div className="md:col-span-2 relative">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
              <input
                type="text"
                placeholder="Search notes, setups, symbols..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md pl-8 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
              />
            </div>

            {/* Symbol Filter */}
            <div>
              <select
                value={symbolFilter}
                onChange={(e) => setSymbolFilter(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              >
                <option value="">All Symbols</option>
                <option value="BTCUSDT">BTCUSDT</option>
                <option value="ETHUSDT">ETHUSDT</option>
                <option value="SOLUSDT">SOLUSDT</option>
                <option value="BNBUSDT">BNBUSDT</option>
                <option value="XRPUSDT">XRPUSDT</option>
                <option value="DOGEUSDT">DOGEUSDT</option>
              </select>
            </div>

            {/* Direction */}
            <div>
              <select
                value={directionFilter}
                onChange={(e) => setDirectionFilter(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              >
                <option value="">All Directions</option>
                <option value="LONG">Long</option>
                <option value="SHORT">Short</option>
              </select>
            </div>

            {/* Outcome */}
            <div>
              <select
                value={outcomeFilter}
                onChange={(e) => setOutcomeFilter(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              >
                <option value="">All Outcomes</option>
                <option value="WIN">Winners Only</option>
                <option value="LOSS">Losses Only</option>
                <option value="BREAKEVEN">Breakeven</option>
              </select>
            </div>

            {/* Strategy */}
            <div>
              <select
                value={strategyFilter}
                onChange={(e) => setStrategyFilter(e.target.value)}
                className="w-full bg-surface-subtle border border-border rounded-md px-2.5 py-1.5 text-xs text-white focus:outline-none focus:border-brand"
              >
                <option value="">All Strategies</option>
                {strategies.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Trades Display Table / Cards */}
        {isLoading ? (
          <div className="py-20 text-center text-slate-500 font-mono">
            Loading journal records...
          </div>
        ) : trades.length === 0 ? (
          <div className="bg-surface border border-border rounded-xl p-12 text-center space-y-3">
            <BookOpen className="w-10 h-10 text-slate-600 mx-auto" />
            <h3 className="text-sm font-bold text-white">No Trades Match Your Criteria</h3>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              Clear your filters or record a new trade to populate your journal.
            </p>
          </div>
        ) : viewMode === 'table' ? (
          /* Table View */
          <div className="bg-surface border border-border rounded-xl overflow-hidden shadow-xl">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse font-mono text-[11px]">
                <thead>
                  <tr className="text-[10px] text-slate-400 bg-surface-subtle border-b border-border font-sans uppercase">
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-3">Symbol</th>
                    <th className="py-3 px-3">Direction</th>
                    <th className="py-3 px-3">Entry</th>
                    <th className="py-3 px-3">Exit</th>
                    <th className="py-3 px-3">P&L ($)</th>
                    <th className="py-3 px-3">R-Multiple</th>
                    <th className="py-3 px-3 font-sans">Strategy</th>
                    <th className="py-3 px-3 font-sans">Emotion</th>
                    <th className="py-3 px-4 text-right font-sans">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/40">
                  {trades.map((t) => {
                    const isWin = (t.pnl || 0) > 0;
                    return (
                      <tr
                        key={t.id}
                        onClick={() => setSelectedTradeId(t.id)}
                        className="hover:bg-surface-elevated/50 cursor-pointer transition"
                      >
                        <td className="py-3 px-4 text-slate-400">
                          {formatShortDate(t.enteredAt)}
                        </td>
                        <td className="py-3 px-3 font-bold text-white">{t.symbol}</td>
                        <td className="py-3 px-3">
                          <span
                            className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              t.direction === 'LONG'
                                ? 'bg-bullish/20 text-bullish'
                                : 'bg-bearish/20 text-bearish'
                            }`}
                          >
                            {t.direction}
                          </span>
                        </td>
                        <td className="py-3 px-3 text-slate-300">{formatPrice(t.entryPrice)}</td>
                        <td className="py-3 px-3 text-slate-300">
                          {t.exitPrice ? formatPrice(t.exitPrice) : 'Open'}
                        </td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            isWin ? 'text-bullish' : 'text-bearish'
                          }`}
                        >
                          {t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}$${formatNumber(t.pnl, 2)}` : '—'}
                        </td>
                        <td
                          className={`py-3 px-3 font-bold ${
                            isWin ? 'text-bullish' : 'text-bearish'
                          }`}
                        >
                          {formatRMultiple(t.rMultiple)}
                        </td>
                        <td className="py-3 px-3 text-slate-300 font-sans truncate max-w-[140px]">
                          {t.strategy?.name || 'Unassigned'}
                        </td>
                        <td className="py-3 px-3 text-slate-400 font-sans">
                          {t.journal?.emotionBefore || '—'}
                        </td>
                        <td className="py-3 px-4 text-right">
                          <span className="text-brand hover:underline font-sans text-xs">
                            Review Setup →
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          /* Cards View */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {trades.map((t) => {
              const isWin = (t.pnl || 0) > 0;
              return (
                <div
                  key={t.id}
                  onClick={() => setSelectedTradeId(t.id)}
                  className="bg-surface hover:bg-surface-elevated/70 border border-border hover:border-brand/40 rounded-xl p-4 cursor-pointer transition shadow-lg space-y-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-white text-sm">{t.symbol}</span>
                      <span
                        className={`px-1.5 py-0.5 rounded text-[10px] font-bold font-mono ${
                          t.direction === 'LONG'
                            ? 'bg-bullish/20 text-bullish'
                            : 'bg-bearish/20 text-bearish'
                        }`}
                      >
                        {t.direction}
                      </span>
                    </div>

                    <span
                      className={`text-xs font-bold font-mono px-2 py-0.5 rounded ${
                        isWin ? 'bg-bullish/20 text-bullish' : 'bg-bearish/20 text-bearish'
                      }`}
                    >
                      {t.pnl !== null ? `${t.pnl >= 0 ? '+' : ''}$${formatNumber(t.pnl, 2)}` : 'OPEN'}
                    </span>
                  </div>

                  <div className="grid grid-cols-2 gap-2 text-[11px] font-mono p-2 bg-surface-subtle rounded-lg">
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans">Entry</span>
                      <p className="text-slate-300 font-medium">{formatPrice(t.entryPrice)}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans">Exit</span>
                      <p className="text-slate-300 font-medium">{t.exitPrice ? formatPrice(t.exitPrice) : 'Open'}</p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans">R Multiple</span>
                      <p className={`font-bold ${isWin ? 'text-bullish' : 'text-bearish'}`}>
                        {formatRMultiple(t.rMultiple)}
                      </p>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 font-sans">Strategy</span>
                      <p className="text-slate-300 truncate font-sans">{t.strategy?.name || 'Unassigned'}</p>
                    </div>
                  </div>

                  {t.journal?.reasonForEntry && (
                    <p className="text-[11px] text-slate-400 line-clamp-2 italic">
                      "{t.journal.reasonForEntry}"
                    </p>
                  )}

                  <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1 border-t border-border/40 font-mono">
                    <span>{formatShortDate(t.enteredAt)}</span>
                    <span className="text-brand hover:underline font-sans font-semibold">Review →</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Controls */}
        {pagination.pages > 1 && (
          <div className="flex items-center justify-between pt-2">
            <span className="text-slate-500 font-mono text-[11px]">
              Showing page {pagination.page} of {pagination.pages} ({pagination.total} trades)
            </span>

            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.max(1, prev.page - 1) }))}
                disabled={pagination.page <= 1}
                className="p-1.5 bg-surface border border-border rounded hover:bg-surface-elevated text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronLeft className="w-4 h-4" />
              </button>
              <button
                onClick={() => setPagination((prev) => ({ ...prev, page: Math.min(pagination.pages, prev.page + 1) }))}
                disabled={pagination.page >= pagination.pages}
                className="p-1.5 bg-surface border border-border rounded hover:bg-surface-elevated text-slate-300 disabled:opacity-40 transition"
              >
                <ChevronRight className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </main>

      {/* Review Modal */}
      <TradeReviewModal
        tradeId={selectedTradeId}
        onClose={() => setSelectedTradeId(null)}
      />

      {/* Record New Trade Modal */}
      <JournalModal
        isOpen={isRecordModalOpen}
        onClose={() => setIsRecordModalOpen(false)}
        onTradeSaved={fetchTrades}
      />
    </div>
  );
}
