'use client';

import React, { useState, useEffect } from 'react';
import { Layers, Plus, TrendingUp, TrendingDown, Trash2 } from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { ApiClient } from '../../lib/api';
import { formatNumber, formatPercent } from '../../lib/utils';

export default function StrategiesPage() {
  const [strategies, setStrategies] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isAdding, setIsAdding] = useState(false);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [color, setColor] = useState('#3B82F6');

  const fetchStrategies = async () => {
    try {
      const list = await ApiClient.getStrategies();
      if (Array.isArray(list)) setStrategies(list);
    } catch {
      // ignore
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    fetchStrategies();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;
    try {
      await ApiClient.createStrategy({ name, description, color });
      setName('');
      setDescription('');
      setIsAdding(false);
      fetchStrategies();
    } catch (err: any) {
      alert(err.message || 'Error creating strategy');
    }
  };

  return (
    <div className="flex flex-col min-h-screen bg-background select-none font-sans text-xs">
      <TopNav />

      <main className="flex-1 max-w-6xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
              <Layers className="w-5 h-5 text-brand" />
              <span>Trading Strategies & Edge Management</span>
            </h1>
            <p className="text-xs text-slate-400 mt-0.5">
              Organize your trade setups by playbook strategies and track which methodologies deliver positive expectancy.
            </p>
          </div>

          <button
            onClick={() => setIsAdding(!isAdding)}
            className="bg-brand hover:bg-brand-hover text-white px-3.5 py-2 rounded-lg font-bold flex items-center gap-1.5 transition shadow-lg shadow-brand/20"
          >
            <Plus className="w-4 h-4" />
            <span>Create Strategy</span>
          </button>
        </div>

        {/* Add Strategy Form */}
        {isAdding && (
          <form onSubmit={handleCreate} className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase">New Strategy Playbook</h3>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Strategy Name</label>
                <input
                  type="text"
                  placeholder="e.g. S/R Flip, Liquidity Sweep"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-1.5 text-white"
                  required
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Color Identifier</label>
                <input
                  type="color"
                  value={color}
                  onChange={(e) => setColor(e.target.value)}
                  className="w-full h-8 bg-surface-subtle border border-border rounded p-1 cursor-pointer"
                />
              </div>

              <div>
                <label className="text-[10px] text-slate-400 block mb-1">Rules & Confluence Description</label>
                <input
                  type="text"
                  placeholder="e.g. Requires 4h structure break + 1h retest"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-1.5 text-white"
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setIsAdding(false)}
                className="px-3 py-1.5 rounded text-slate-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="bg-brand text-white px-4 py-1.5 rounded font-bold hover:bg-brand-hover transition"
              >
                Save Strategy
              </button>
            </div>
          </form>
        )}

        {/* Strategies Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {strategies.map((s) => {
            const isProfit = (s.totalPnl || 0) >= 0;
            return (
              <div
                key={s.id}
                className="bg-surface border border-border rounded-xl p-5 shadow-lg space-y-3"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <span
                      className="w-3.5 h-3.5 rounded-full"
                      style={{ backgroundColor: s.color || '#3b82f6' }}
                    />
                    <h3 className="font-bold text-white text-sm">{s.name}</h3>
                  </div>
                  <span className="text-[10px] font-mono text-slate-400 bg-surface-subtle px-2 py-0.5 rounded">
                    {s.tradeCount || 0} setups
                  </span>
                </div>

                {s.description && (
                  <p className="text-slate-400 text-xs line-clamp-2">{s.description}</p>
                )}

                <div className="grid grid-cols-2 gap-2 p-2.5 bg-surface-subtle border border-border/60 rounded-lg font-mono text-xs">
                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Win Rate</span>
                    <span className={`font-bold ${s.winRate >= 60 ? 'text-bullish' : 'text-white'}`}>
                      {formatPercent(s.winRate || 0)}
                    </span>
                  </div>

                  <div>
                    <span className="text-[10px] text-slate-500 block font-sans">Net Realized P&L</span>
                    <span className={`font-bold ${isProfit ? 'text-bullish' : 'text-bearish'}`}>
                      {isProfit ? '+' : ''}${formatNumber(s.totalPnl || 0, 2)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </main>
    </div>
  );
}
