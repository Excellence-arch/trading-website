# Crypto Trading Analysis & Automatic Trading Journal Platform

A production-grade cryptocurrency trading terminal and automated journaling platform engineered for quantitative clarity, disciplined risk management, and performance optimization.

---

## 🌟 Key Highlights & Features

### 1. Professional Market Analysis Terminal
- **Interactive Candlestick Charts**: Powered by TradingView Lightweight Charts with custom dark-palette styling, responsive crosshairs, and volume histogram overlay.
- **Multiple Timeframes**: 1m, 5m, 15m, 1h, 4h, and 1D.
- **Chart Styles**: Candlestick, Line, Area, and Heikin-Ashi.
- **Built-in Technical Indicators**:
  - Moving Averages: Simple Moving Average (SMA), Exponential Moving Average (EMA)
  - Momentum: Relative Strength Index (RSI), Stochastic RSI, Moving Average Convergence Divergence (MACD)
  - Volatility: Bollinger Bands, Average True Range (ATR)
  - Volume: Volume-Weighted Average Price (VWAP)
- **Overlay Drawing Tools**:
  - Trendline, Horizontal Support/Resistance Ray, Fibonacci Retracement, Measurement ruler, and Risk/Reward planning box.

### 2. Trade Planning & Position Size Calculator
- Precision position sizing calculated with `decimal.js` to avoid JavaScript floating-point inaccuracies.
- Calculates exact position size based on account balance, risk percentage (e.g. 1% or 2%), and stop-loss distance.
- Live Risk-to-Reward (R:R) ratio, breakeven price, and estimated maker/taker exchange fee computation.
- Visual stop-loss and take-profit line overlays directly on the chart.

### 3. Integrated Paper Trading Simulator
- Execute risk-free simulated market and limit orders with customizable leverage (1x to 100x).
- Real-time mark-to-market unrealized P&L tracking via live WebSocket feed.
- One-click position closure, stop-loss / take-profit triggers, and seamless conversion into closed journal trades.

### 4. Automatic & Manual Trade Journaling
- **Auto-Sync**: Automatically logs all paper trading executions into your journal.
- **Manual Logging**: Comprehensive trade entry modal capturing setup types, market conditions, reasons for entry, emotional states (before, during, after), mistakes tagged, lessons learned, and chart snapshots.
- **Multi-Factor Filtering**: Filter trades by symbol, direction (Long/Short), outcome (Win/Loss/Breakeven), strategy, timeframe, date range, and keyword search.

### 5. Advanced Portfolio Analytics
- **Performance KPIs**: Win Rate, Loss Rate, Total PnL, Profit Factor, Expectancy ($ and R-multiple), Average Win/Loss, Max Drawdown ($ and %), and Average Holding Time.
- **Interactive Visualizations**: Cumulative PnL Equity Curve, R-Multiple Distribution Histogram, and Monthly/Weekly PnL calendars.
- **Multi-Dimensional Breakdowns**: Strategy win rates, symbol profitability, timeframe analysis, Long vs. Short directional edge, and trading session breakdown (Asian, London, New York).

### 6. Statistically Grounded Pattern Recognition Engine
- Scans closed trade history for statistically valid behavioral edges and leakages:
  - **Emotional Penalties**: Identifies win-rate degradation on trades entered with FOMO or impatience.
  - **Trading Session Edge**: Detects outperformance during specific market liquidity sessions (e.g. London open).
  - **Symbol Specialization**: Compares edge across Bitcoin versus altcoins.
  - **Retest Confirmation**: Quantifies the statistical benefit of waiting for breakout retests.
- *Strict statistical safeguard: Displays "Not enough data" until at least 5 qualifying trades are logged.*

### 7. Historical Trade Replay Simulator
- Practice and backtest execution with bar-by-bar historical candle streaming.
- Play, pause, step forward, and dynamic playback speed controls (1x, 2x, 5x, 10x).

### 8. AI Trade Review & Interactive Performance Coach
- **Detailed Trade Reviews**: Evaluates execution quality, risk management discipline, psychological mindset, and provides constructive future suggestions.
- **Conversational AI Coach**: Answers trader queries grounded strictly in their actual recorded trade data.
- **Dual Engine**: Uses OpenAI GPT-4o-mini when `OPENAI_API_KEY` is supplied, with an automatic fallback to a mathematical heuristic rule engine when offline.
- **Compliance Disclaimer**: Includes mandatory educational disclaimers clarifying that outputs are performance analyses, never financial advice or price predictions.

---

## 🏛️ System Architecture

Monorepo architecture with clean separation between shared computation packages, backend services, and web client:

```
├── apps/
│   ├── api/                     # Node.js + Express + WebSocket backend
│   │   ├── prisma/              # Prisma schema & SQLite / PostgreSQL migrations
│   │   └── src/
│   │       ├── ai/              # AI Coach & Trade Review service
│   │       ├── analytics/       # Performance metrics & pattern detector
│   │       ├── auth/            # JWT authentication & password hashing
│   │       ├── market/          # Real-time Binance / Resilient Demo engine
│   │       ├── paper/           # Paper trading execution engine
│   │       ├── trades/          # Trade journaling & filtering
│   │       └── ws/              # Real-time WebSocket streaming gateway
│   └── web/                     # Next.js 14 frontend application
│       └── src/
│           ├── app/             # App router pages (/terminal, /journal, etc.)
│           ├── components/      # UI components (TradingChart, OrderPanel, etc.)
│           └── lib/             # API client & WebSocket hooks
└── packages/
    ├── calculations/            # Pure, decimal-safe financial formulas (16 tests)
    ├── indicators/              # Pure TypeScript technical indicators (7 tests)
    └── types/                   # Shared TypeScript interfaces and DTOs
```

---

## 🚀 Quick Start (Zero-Docker Local Setup)

### 1. Prerequisites
- **Node.js**: v18.0.0 or later (v20+ recommended)
- **npm**: v9.0.0 or later
- **No Docker required**: Runs natively on Windows, macOS, and Linux using zero-config SQLite.

### 2. Installation
Clone the repository and install all monorepo dependencies:
```bash
npm install
```

### 3. Database Initialization & Demo Seeding
Push the Prisma database schema and seed the database with realistic sample strategies and historical trades:
```bash
npm run db:push
npm run db:seed
```

### 4. Start Development Servers
Start both the API server (port 3001) and Next.js frontend (port 3000) concurrently:
```bash
npm run dev
```

- **Frontend Terminal**: [http://localhost:3000](http://localhost:3000)
- **API Server & Healthcheck**: [http://localhost:3001/api/health](http://localhost:3001/api/health)
- **WebSocket Gateway**: `ws://localhost:3001/ws`

### 5. Preconfigured Demo Account
Use the 1-click demo login on the landing page or enter:
- **Email**: `demo@tradingterminal.io`
- **Password**: `Demo1234!`

---

## ⚙️ Environment Configuration

Configuration files are preconfigured with sensible zero-docker local defaults:

### `apps/api/.env`
```env
PORT=3001
NODE_ENV=development
DATABASE_URL="file:./dev.db"
JWT_SECRET="crypto-terminal-jwt-secret-key-production-change-in-prod"
JWT_EXPIRES_IN="7d"

# Optional: Set for live OpenAI AI Coach; falls back to deterministic heuristic coach if omitted
OPENAI_API_KEY=""
OPENAI_MODEL="gpt-4o-mini"
```

### Production PostgreSQL Support
To switch from SQLite to PostgreSQL in production:
1. Replace `apps/api/prisma/schema.prisma` with `apps/api/prisma/schema.postgresql.prisma`.
2. Update `DATABASE_URL="postgresql://user:password@localhost:5432/tradingdb?schema=public"`.
3. Run `npm run db:push --workspace=apps/api`.

---

## 🧪 Testing & Verification

Run the comprehensive automated test suites:

```bash
# Run unit tests for financial calculations (16 passed)
npm run test:calc

# Run unit tests for technical analysis indicators (7 passed)
npm run test:ind

# Run full end-to-end integration test (Auth, Market, Trades, Analytics, AI, Paper, Frontend)
node verify-all.js
```

---

## 🔒 Security & Educational Compliance
- **No Live Trading Execution**: This platform is designed exclusively for paper trading and journaling; it does not connect to live exchange execution keys or risk real capital.
- **Educational Disclaimer**: All AI-generated reviews and coaching responses are strictly informational post-trade performance reflections and do not provide investment advice or price forecasting.
