'use client';

import React, { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import {
  Activity,
  BarChart3,
  BookOpen,
  Bot,
  ChevronDown,
  Clock,
  Coins,
  History,
  LayoutDashboard,
  LogOut,
  Search,
  Settings,
  Sparkles,
  TrendingUp,
  User,
  Zap,
} from 'lucide-react';
import { useMarket } from '../../context/MarketContext';
import { useAuth } from '../../context/AuthContext';
import { formatNumber, formatPercent, formatPrice } from '../../lib/utils';

export function TopNav() {
  const pathname = usePathname();
  const { currentSymbol, setCurrentSymbol, currentTicker, isDemoMode, setDemoMode, wsStatus, tickers, symbolsList } =
    useMarket();
  const { user, loginAsDemo, logout } = useAuth();

  const [searchOpen, setSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Live price flash tracking
  const prevPriceRef = useRef<number | null>(null);
  const [priceFlash, setPriceFlash] = useState<'up' | 'down' | null>(null);

  useEffect(() => {
    if (!currentTicker) return;
    if (prevPriceRef.current !== null && prevPriceRef.current !== currentTicker.price) {
      const flash = currentTicker.price > prevPriceRef.current ? 'up' : 'down';
      setPriceFlash(flash);
      const timer = setTimeout(() => setPriceFlash(null), 600);
      prevPriceRef.current = currentTicker.price;
      return () => clearTimeout(timer);
    }
    prevPriceRef.current = currentTicker.price;
  }, [currentTicker?.price]);

  const filteredSymbols = symbolsList.filter((s) =>
    s.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const navLinks = [
    { label: 'Terminal', href: '/terminal', icon: Activity },
    { label: 'Journal', href: '/journal', icon: BookOpen },
    { label: 'Analytics', href: '/analytics', icon: BarChart3 },
    { label: 'Paper Trading', href: '/paper', icon: Coins },
    { label: 'Replay', href: '/replay', icon: History },
    { label: 'AI Coach', href: '/ai-coach', icon: Bot },
    { label: 'Strategies', href: '/strategies', icon: TrendingUp },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <header className="h-14 bg-surface border-b border-border flex items-center justify-between px-3 select-none z-30 sticky top-0">
      {/* Left: Brand & Symbol Selector */}
      <div className="flex items-center gap-3">
        <Link href="/" className="flex items-center gap-2 font-bold tracking-tight text-white mr-2 hover:opacity-90 transition">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-blue-600 to-emerald-500 flex items-center justify-center shadow-lg shadow-blue-500/20">
            <Zap className="w-5 h-5 text-white fill-white" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-black tracking-wider leading-none">NEXUS</span>
            <span className="text-[10px] text-slate-400 font-mono font-medium tracking-widest">TERMINAL</span>
          </div>
        </Link>

        {/* Symbol Search / Selector */}
        <div className="relative">
          <button
            onClick={() => {
              setSearchOpen(!searchOpen);
              setTimeout(() => searchInputRef.current?.focus(), 100);
            }}
            className="flex items-center gap-2 bg-surface-subtle hover:bg-surface-elevated border border-border px-3 py-1.5 rounded-md text-xs font-semibold tracking-wide transition group"
          >
            <Search className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
            <span className="font-mono text-white text-sm">{currentSymbol}</span>
            <span className="text-[10px] text-slate-400 bg-surface-elevated px-1.5 py-0.5 rounded">Spot</span>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-200" />
          </button>

          {searchOpen && (
            <div className="absolute top-11 left-0 w-80 bg-surface-elevated border border-border-strong rounded-lg shadow-2xl p-2 z-50 animate__animated animate__fadeInDown animate__faster">
              <div className="relative mb-2">
                <Search className="w-4 h-4 text-slate-400 absolute left-2.5 top-2.5" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search symbols (BTC, ETH, SOL...)"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full bg-surface-subtle border border-border rounded-md pl-9 pr-3 py-1.5 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-brand"
                />
              </div>

              <div className="max-h-64 overflow-y-auto space-y-1">
                {filteredSymbols.map((sym) => {
                  const ticker = tickers[sym];
                  const isUp = (ticker?.changePercent24h || 0) >= 0;
                  return (
                    <button
                      key={sym}
                      onClick={() => {
                        setCurrentSymbol(sym);
                        setSearchOpen(false);
                      }}
                      className={`w-full flex items-center justify-between p-2 rounded text-xs transition ${
                        sym === currentSymbol
                          ? 'bg-brand/20 border border-brand/40 text-white'
                          : 'hover:bg-surface hover:text-white text-slate-300'
                      }`}
                    >
                      <div className="flex flex-col text-left">
                        <span className="font-mono font-bold">{sym}</span>
                        <span className="text-[10px] text-slate-500">Binance Spot</span>
                      </div>
                      {ticker && (
                        <div className="flex flex-col text-right font-mono">
                          <span className="text-white font-medium">{formatPrice(ticker.price, sym)}</span>
                          <span className={`text-[10px] ${isUp ? 'text-bullish' : 'text-bearish'}`}>
                            {formatPercent(ticker.changePercent24h)}
                          </span>
                        </div>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Live Ticker Metrics Strip */}
        {currentTicker && (
          <div className="hidden lg:flex items-center gap-4 text-xs font-mono ml-2 border-l border-border pl-4">
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">Price</span>
              <span
                className={`font-bold text-sm px-1 rounded transition-all duration-300 ${
                  priceFlash === 'up'
                    ? 'ticker-flash-up text-emerald-400 bg-emerald-500/20'
                    : priceFlash === 'down'
                    ? 'ticker-flash-down text-rose-400 bg-rose-500/20'
                    : 'text-white'
                }`}
              >
                {formatPrice(currentTicker.price, currentSymbol)}
              </span>
            </div>

            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500">24h Change</span>
              <span
                className={`font-semibold flex items-center gap-0.5 ${
                  currentTicker.changePercent24h >= 0 ? 'text-bullish' : 'text-bearish'
                }`}
              >
                {formatPercent(currentTicker.changePercent24h)}
              </span>
            </div>

            <div className="hidden xl:flex flex-col">
              <span className="text-[10px] text-slate-500">24h High</span>
              <span className="text-slate-300">{formatPrice(currentTicker.high24h, currentSymbol)}</span>
            </div>

            <div className="hidden xl:flex flex-col">
              <span className="text-[10px] text-slate-500">24h Low</span>
              <span className="text-slate-300">{formatPrice(currentTicker.low24h, currentSymbol)}</span>
            </div>

            <div className="hidden 2xl:flex flex-col">
              <span className="text-[10px] text-slate-500">24h Volume</span>
              <span className="text-slate-300">{formatNumber(currentTicker.volume24h, 0)}</span>
            </div>
          </div>
        )}
      </div>

      {/* Center: Navigation Tabs */}
      <nav className="hidden md:flex items-center gap-1">
        {navLinks.map((link) => {
          const Icon = link.icon;
          const isActive = pathname === link.href || (link.href !== '/' && pathname.startsWith(link.href));
          return (
            <Link
              key={link.href}
              href={link.href}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium transition ${
                isActive
                  ? 'bg-surface-elevated text-white border border-border-strong font-semibold shadow-sm'
                  : 'text-slate-400 hover:text-slate-200 hover:bg-surface-subtle'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              <span>{link.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Right: Demo Banner, Feed Status & Account Dropdown */}
      <div className="flex items-center gap-2.5">
        {/* DEMO DATA badge */}
        {mounted && isDemoMode ? (
          <div className="flex items-center gap-1.5 bg-amber-500/10 border border-amber-500/30 text-amber-400 px-2.5 py-1 rounded text-[11px] font-bold font-mono tracking-wider animate-pulse">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span>DEMO DATA</span>
          </div>
        ) : (
          <div className="hidden sm:flex items-center gap-1.5 bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 px-2.5 py-1 rounded text-[11px] font-mono shadow-sm">
            <span className="w-2 h-2 rounded-full bg-emerald-400 live-beacon" />
            <span className="font-semibold tracking-wide">LIVE FEED</span>
          </div>
        )}

        {/* Demo Mode Toggle */}
        <button
          onClick={() => setDemoMode(!isDemoMode)}
          className={`text-[11px] font-medium px-2 py-1 rounded border transition ${
            mounted && isDemoMode
              ? 'bg-amber-600/20 text-amber-300 border-amber-500/40 hover:bg-amber-600/30'
              : 'bg-surface-subtle text-slate-400 border-border hover:text-slate-200'
          }`}
          title="Toggle between Live Binance data and simulated high-precision Demo data"
        >
          {mounted && isDemoMode ? 'Exit Demo' : 'Demo Mode'}
        </button>

        {/* User Account Button */}
        {mounted && user ? (
          <div className="relative">
            <button
              onClick={() => setUserMenuOpen(!userMenuOpen)}
              className="flex items-center gap-2 bg-surface-subtle hover:bg-surface-elevated border border-border px-2.5 py-1.5 rounded-md text-xs transition"
            >
              <div className="w-5 h-5 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-[10px] font-bold text-white">
                {user.name?.charAt(0) || 'U'}
              </div>
              <span className="text-slate-200 font-medium hidden sm:inline">{user.name}</span>
              <ChevronDown className="w-3 h-3 text-slate-400" />
            </button>

            {userMenuOpen && (
              <div className="absolute right-0 top-11 w-48 bg-surface-elevated border border-border-strong rounded-lg shadow-2xl p-1 z-50 text-xs animate__animated animate__fadeInDown animate__faster">
                <div className="px-3 py-2 border-b border-border">
                  <p className="font-bold text-white truncate">{user.name}</p>
                  <p className="text-[11px] text-slate-400 truncate">{user.email}</p>
                </div>
                <Link
                  href="/settings"
                  onClick={() => setUserMenuOpen(false)}
                  className="flex items-center gap-2 px-3 py-2 rounded hover:bg-surface text-slate-300 hover:text-white"
                >
                  <Settings className="w-3.5 h-3.5" />
                  <span>Settings</span>
                </Link>
                <button
                  onClick={() => {
                    logout();
                    setUserMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2 px-3 py-2 rounded hover:bg-red-500/10 text-red-400 hover:text-red-300 text-left"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Log Out</span>
                </button>
              </div>
            )}
          </div>
        ) : (
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => loginAsDemo()}
              className="bg-brand hover:bg-brand-hover text-white text-xs font-semibold px-3 py-1.5 rounded-md shadow-md transition flex items-center gap-1.5"
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Demo Trader</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
}
