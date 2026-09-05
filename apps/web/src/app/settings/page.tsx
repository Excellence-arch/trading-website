'use client';

import React, { useState } from 'react';
import { Settings as SettingsIcon, Shield, Sliders, User, Bell, Bot, Check } from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { useAuth } from '../../context/AuthContext';

export default function SettingsPage() {
  const { user } = useAuth();

  const [riskPercent, setRiskPercent] = useState('1.0');
  const [currency, setCurrency] = useState('USD');
  const [timezone, setTimezone] = useState('UTC');
  const [defaultTimeframe, setDefaultTimeframe] = useState('1h');
  const [theme, setTheme] = useState('dark');
  const [saved, setSaved] = useState(false);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setSaved(true);
    setTimeout(() => setSaved(false), 2500);
  };

  return (
    <div className="flex flex-col min-h-screen bg-background select-none font-sans text-xs">
      <TopNav />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 md:p-6 space-y-6">
        <div>
          <h1 className="text-xl font-black text-white tracking-tight flex items-center gap-2">
            <SettingsIcon className="w-5 h-5 text-brand" />
            <span>Terminal Preferences & Risk Settings</span>
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Configure your default risk management parameters, layout preferences, and terminal theme.
          </p>
        </div>

        <form onSubmit={handleSave} className="space-y-5">
          {/* Risk Management Presets */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Shield className="w-4 h-4 text-brand" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Risk Management Defaults
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Default Risk Percentage Per Trade
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={riskPercent}
                  onChange={(e) => setRiskPercent(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white font-mono"
                />
                <span className="text-[10px] text-slate-500 mt-1 block">
                  Recommended: 1.0% to 2.0% of total account equity.
                </span>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">
                  Default Chart Timeframe
                </label>
                <select
                  value={defaultTimeframe}
                  onChange={(e) => setDefaultTimeframe(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white font-mono"
                >
                  <option value="15m">15m</option>
                  <option value="1h">1h</option>
                  <option value="4h">4h</option>
                  <option value="1D">1D</option>
                </select>
              </div>
            </div>
          </div>

          {/* Localization & Display */}
          <div className="bg-surface border border-border rounded-xl p-5 shadow-xl space-y-4">
            <div className="flex items-center gap-2 border-b border-border pb-3">
              <Sliders className="w-4 h-4 text-emerald-400" />
              <h2 className="text-xs font-bold text-white uppercase tracking-wider">
                Display & Localization
              </h2>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Base Currency</label>
                <select
                  value={currency}
                  onChange={(e) => setCurrency(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white font-mono"
                >
                  <option value="USD">USD ($)</option>
                  <option value="USDT">USDT</option>
                  <option value="EUR">EUR (€)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Timezone</label>
                <select
                  value={timezone}
                  onChange={(e) => setTimezone(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white font-mono"
                >
                  <option value="UTC">UTC (Universal Coordinated Time)</option>
                  <option value="America/New_York">America/New_York (EST/EDT)</option>
                  <option value="Europe/London">Europe/London (GMT/BST)</option>
                  <option value="Asia/Singapore">Asia/Singapore (SGT)</option>
                </select>
              </div>

              <div>
                <label className="text-[11px] text-slate-300 font-semibold block mb-1">Terminal Theme</label>
                <select
                  value={theme}
                  onChange={(e) => setTheme(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded px-3 py-2 text-white font-mono"
                >
                  <option value="dark">Pro Charcoal Dark (Default)</option>
                  <option value="obsidian">Obsidian Pitch Black</option>
                </select>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end gap-3 pt-2">
            {saved && (
              <span className="text-bullish flex items-center gap-1 font-semibold text-xs">
                <Check className="w-4 h-4" /> Preferences saved
              </span>
            )}
            <button
              type="submit"
              className="bg-brand hover:bg-brand-hover text-white px-6 py-2 rounded-lg font-bold shadow-lg shadow-brand/20 transition"
            >
              Save Changes
            </button>
          </div>
        </form>
      </main>
    </div>
  );
}
