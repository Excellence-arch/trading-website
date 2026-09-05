'use client';

import React, { useState } from 'react';
import { ChevronLeft, ChevronRight, Layers, Plus, Search, Trash2, TrendingDown, TrendingUp, X } from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { formatNumber, formatPercent, formatPrice } from '../../lib/utils';
import { ApiClient } from '../../lib/api';

interface WatchlistProps {
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function Watchlist({ isCollapsed = false, onToggleCollapse }: WatchlistProps) {
  const { currentSymbol, setCurrentSymbol, tickers, symbolsList } = useMarket();
  const [search, setSearch] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [newSymbolInput, setNewSymbolInput] = useState('');

  const filteredSymbols = symbolsList.filter((s) =>
    s.toLowerCase().includes(search.toLowerCase())
  );

  const handleAddSymbol = async () => {
    if (!newSymbolInput.trim()) return;
    const clean = newSymbolInput.trim().toUpperCase();
    try {
      await ApiClient.addWatchlistItem(clean);
    } catch {
      // ignore
    }
    setNewSymbolInput('');
    setIsAdding(false);
  };

  const handleRemove = async (e: React.MouseEvent, sym: string) => {
    e.stopPropagation();
    try {
      await ApiClient.removeWatchlistItem(sym);
    } catch {
      // ignore
    }
  };

  if (isCollapsed) {
    return (
      <div className="w-9 bg-surface border-r border-border flex flex-col items-center py-2 select-none h-full z-10 transition-all">
        <button
          onClick={onToggleCollapse}
          className="p-1.5 text-slate-400 hover:text-white hover:bg-surface-elevated rounded transition mb-3"
          title="Expand Watchlist"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
        <div className="flex-1 flex flex-col items-center justify-center gap-2">
          <Layers className="w-4 h-4 text-slate-500" />
          <span className="text-[10px] font-bold text-slate-500 uppercase tracking-widest [writing-mode:vertical-lr] rotate-180">
            Watchlist
          </span>
          <span className="text-[9px] font-mono text-slate-400 bg-surface-elevated px-1 py-0.5 rounded mt-2">
            {symbolsList.length}
          </span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-64 bg-surface border-r border-border flex flex-col h-full select-none transition-all">
      {/* Watchlist Header */}
      <div className="p-3 border-b border-border flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-xs font-bold uppercase tracking-wider text-slate-200">Watchlist</span>
          <span className="text-[10px] text-slate-400 bg-surface-elevated px-1.5 py-0.5 rounded font-mono">
            {symbolsList.length}
          </span>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => setIsAdding(!isAdding)}
            className="p-1 text-slate-400 hover:text-white hover:bg-surface-elevated rounded transition"
            title="Add symbol to watchlist"
          >
            {isAdding ? <X className="w-3.5 h-3.5" /> : <Plus className="w-3.5 h-3.5" />}
          </button>
          {onToggleCollapse && (
            <button
              onClick={onToggleCollapse}
              className="p-1 text-slate-400 hover:text-white hover:bg-surface-elevated rounded transition"
              title="Collapse Watchlist"
            >
              <ChevronLeft className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Add Symbol Input */}
      {isAdding && (
        <div className="p-2 border-b border-border bg-surface-subtle flex gap-1.5">
          <input
            type="text"
            placeholder="e.g. ADAUSDT"
            value={newSymbolInput}
            onChange={(e) => setNewSymbolInput(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAddSymbol()}
            className="flex-1 bg-surface border border-border rounded px-2 py-1 text-xs font-mono text-white focus:outline-none focus:border-brand"
            autoFocus
          />
          <button
            onClick={handleAddSymbol}
            className="bg-brand text-white px-2.5 py-1 rounded text-xs font-medium hover:bg-brand-hover transition"
          >
            Add
          </button>
        </div>
      )}

      {/* Filter / Search Bar */}
      <div className="px-2 py-1.5 border-b border-border bg-surface-subtle/50">
        <div className="relative">
          <Search className="w-3 h-3 text-slate-500 absolute left-2 top-2" />
          <input
            type="text"
            placeholder="Filter..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-surface border border-border rounded pl-7 pr-2 py-1 text-[11px] text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand"
          />
        </div>
      </div>

      {/* Symbol List Items */}
      <div className="flex-1 overflow-y-auto divide-y divide-border/50">
        {filteredSymbols.map((sym) => {
          const ticker = tickers[sym];
          const isSelected = sym === currentSymbol;
          const isPositive = (ticker?.changePercent24h || 0) >= 0;

          return (
            <div
              key={sym}
              onClick={() => setCurrentSymbol(sym)}
              className={`group flex items-center justify-between p-2.5 cursor-pointer transition ${
                isSelected
                  ? 'bg-brand/15 border-l-2 border-brand text-white'
                  : 'hover:bg-surface-elevated/70 text-slate-300'
              }`}
            >
              {/* Left Info: Symbol & Volume */}
              <div className="flex flex-col text-left">
                <span className="font-mono font-bold text-xs tracking-tight">{sym}</span>
                <span className="text-[10px] text-slate-500 font-mono">
                  Vol: {ticker ? formatNumber(ticker.volume24h, 0) : '—'}
                </span>
              </div>

              {/* Right Info: Price & 24h Change */}
              <div className="flex items-center gap-2">
                <div className="flex flex-col text-right font-mono">
                  <span className="text-xs font-semibold text-white">
                    {ticker ? formatPrice(ticker.price, sym) : '—'}
                  </span>
                  <div
                    className={`flex items-center justify-end gap-0.5 text-[10px] font-medium ${
                      isPositive ? 'text-bullish' : 'text-bearish'
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-2.5 h-2.5" />
                    ) : (
                      <TrendingDown className="w-2.5 h-2.5" />
                    )}
                    <span>{ticker ? formatPercent(ticker.changePercent24h) : '0.00%'}</span>
                  </div>
                </div>

                {/* Quick Remove Action */}
                <button
                  onClick={(e) => handleRemove(e, sym)}
                  className="opacity-0 group-hover:opacity-100 text-slate-500 hover:text-red-400 p-1 rounded transition"
                  title="Remove from watchlist"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
