import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('[Seed] Seeding database...');

  // 1. Create Demo User
  const salt = await bcrypt.genSalt(10);
  const passwordHash = await bcrypt.hash('Demo1234!', salt);

  const demoUser = await prisma.user.upsert({
    where: { email: 'demo@tradingterminal.io' },
    update: {},
    create: {
      email: 'demo@tradingterminal.io',
      name: 'Professional Trader',
      passwordHash,
      settings: {
        create: {
          defaultRiskPercent: 1.0,
          defaultTimeframe: '1h',
          currency: 'USD',
          timezone: 'UTC',
          demoMode: true,
          theme: 'dark',
        },
      },
      paperAccount: {
        create: {
          balance: 10450.0,
          equity: 10620.0,
          initialBalance: 10000.0,
        },
      },
      watchlists: {
        create: {
          name: 'Core Cryptos',
          items: {
            create: [
              { symbol: 'BTCUSDT', sortOrder: 0 },
              { symbol: 'ETHUSDT', sortOrder: 1 },
              { symbol: 'SOLUSDT', sortOrder: 2 },
              { symbol: 'BNBUSDT', sortOrder: 3 },
              { symbol: 'XRPUSDT', sortOrder: 4 },
              { symbol: 'DOGEUSDT', sortOrder: 5 },
            ],
          },
        },
      },
    },
  });

  console.log(`[Seed] Demo user created: ${demoUser.email} (Password: Demo1234!)`);

  // 2. Create Strategies
  const strategies = [
    { name: 'Breakout & Retest', description: 'Trading key horizontal resistance breaks on confirmed 1h retest candle', color: '#10b981' },
    { name: 'Trend Pullback', description: 'Entering on 20 EMA dynamic support touch in strong trending direction', color: '#3b82f6' },
    { name: 'S/R Level Reversal', description: 'Exhaustion wicks rejecting weekly horizontal support/resistance levels', color: '#f59e0b' },
    { name: 'Volume Expansion', description: 'High-volume volatility breakout from multi-day compression zones', color: '#8b5cf6' },
  ];

  const createdStrategies = [];
  for (const s of strategies) {
    const strat = await prisma.strategy.upsert({
      where: { userId_name: { userId: demoUser.id, name: s.name } },
      update: {},
      create: {
        userId: demoUser.id,
        name: s.name,
        description: s.description,
        color: s.color,
      },
    });
    createdStrategies.push(strat);
  }

  // 3. Seed Realistic Historical Trades & Journals
  const sampleTrades = [
    {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 94200,
      exitPrice: 97400,
      stopLoss: 93200, // Risk: 1000/btc
      takeProfit: 97500,
      quantity: 0.1, // Risk $100
      pnl: 317.5,
      rMultiple: 3.2,
      strategyIndex: 0,
      setupType: 'Breakout & Retest',
      reasonForEntry: 'Clean 1h candle close above $94,000 with high volume retest holding structure.',
      emotionBefore: 'CONFIDENT',
      emotionDuring: 'CALM',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'Waiting for the 1h candle to close confirmed buyer defense and avoided false breakout.',
      notes: 'Executed smoothly. Trailed stop loss once price surpassed 2R target.',
      daysAgo: 14,
    },
    {
      symbol: 'ETHUSDT',
      direction: 'LONG',
      entryPrice: 3250,
      exitPrice: 3420,
      stopLoss: 3180, // Risk: 70
      takeProfit: 3450,
      quantity: 1.5,
      pnl: 252.0,
      rMultiple: 2.43,
      strategyIndex: 1,
      setupType: '20 EMA Pullback',
      reasonForEntry: 'Bullish engulfing candle off 20 EMA in strong upward 4h trend.',
      emotionBefore: 'CALM',
      emotionDuring: 'PATIENT',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'Confluence of 20 EMA and prior resistance turned support provided high probability entry.',
      notes: 'Took full profit at $3,420 key supply zone.',
      daysAgo: 12,
    },
    {
      symbol: 'SOLUSDT',
      direction: 'SHORT',
      entryPrice: 192.5,
      exitPrice: 196.0,
      stopLoss: 196.0,
      takeProfit: 182.0,
      quantity: 15,
      pnl: -53.25,
      rMultiple: -1.0,
      strategyIndex: 2,
      setupType: 'S/R Reversal',
      reasonForEntry: 'Resistance rejection wick near $193 local high.',
      emotionBefore: 'FOMO',
      emotionDuring: 'ANXIOUS',
      emotionAfter: 'DISAPPOINTED',
      mistakes: ['Fought the trend', 'Entered before confirmation'],
      lessons: 'Do not short strong trends simply because price reached an oscillator overbought zone.',
      notes: 'Price pushed through resistance without pausing. Stop loss respected.',
      daysAgo: 10,
    },
    {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 95500,
      exitPrice: 98200,
      stopLoss: 94500,
      takeProfit: 98500,
      quantity: 0.1,
      pnl: 268.0,
      rMultiple: 2.7,
      strategyIndex: 0,
      setupType: 'Breakout & Retest',
      reasonForEntry: 'Consolidation box breakout on 4h chart with surging spot CVD.',
      emotionBefore: 'CONFIDENT',
      emotionDuring: 'CALM',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'High timeframe consolidation breakouts deliver the most consistent trending moves.',
      notes: 'Target was $98,500, took off position slightly early at $98,200 due to weekend liquidity drop.',
      daysAgo: 8,
    },
    {
      symbol: 'XRPUSDT',
      direction: 'LONG',
      entryPrice: 2.10,
      exitPrice: 2.45,
      stopLoss: 1.98,
      takeProfit: 2.50,
      quantity: 1000,
      pnl: 346.5,
      rMultiple: 2.92,
      strategyIndex: 3,
      setupType: 'Volume Expansion',
      reasonForEntry: 'Unusual volume spike clearing 2.05 multi-month resistance.',
      emotionBefore: 'CONFIDENT',
      emotionDuring: 'EXCITED',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'Relative volume spikes greater than 3x 20-period average signal institutional participation.',
      notes: 'Sold 70% at 2.40 and remaining 30% at 2.45.',
      daysAgo: 6,
    },
    {
      symbol: 'ETHUSDT',
      direction: 'SHORT',
      entryPrice: 3480,
      exitPrice: 3530,
      stopLoss: 3530,
      takeProfit: 3350,
      quantity: 1.2,
      pnl: -61.0,
      rMultiple: -1.0,
      strategyIndex: 2,
      setupType: 'Double Top Rejection',
      reasonForEntry: 'Double top pattern on 15m chart.',
      emotionBefore: 'IMPATIENT',
      emotionDuring: 'NERVOUS',
      emotionAfter: 'REGRETFUL',
      mistakes: ['Lower timeframe noise', 'Ignored higher timeframe bias'],
      lessons: 'Never counter-trend trade a 15m pattern when 4h and daily candles are forming bullish expansions.',
      notes: 'Stopped out quickly. Good risk control despite poor setup selection.',
      daysAgo: 5,
    },
    {
      symbol: 'BTCUSDT',
      direction: 'LONG',
      entryPrice: 96200,
      exitPrice: 99400,
      stopLoss: 95300,
      takeProfit: 99500,
      quantity: 0.15,
      pnl: 476.0,
      rMultiple: 3.56,
      strategyIndex: 0,
      setupType: 'Breakout & Retest',
      reasonForEntry: 'Retest of $96,000 previous resistance turned support with long lower wick.',
      emotionBefore: 'CALM',
      emotionDuring: 'RELAXED',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'When high timeframe structure is respected, wide targets are achievable.',
      notes: 'Best trade of the week. Perfect R:R execution.',
      daysAgo: 3,
    },
    {
      symbol: 'SOLUSDT',
      direction: 'LONG',
      entryPrice: 180.0,
      exitPrice: 188.5,
      stopLoss: 176.0,
      takeProfit: 190.0,
      quantity: 20,
      pnl: 167.0,
      rMultiple: 2.13,
      strategyIndex: 1,
      setupType: 'Trend Pullback',
      reasonForEntry: 'Retest of VWAP and 50 EMA during London morning session.',
      emotionBefore: 'CONFIDENT',
      emotionDuring: 'PATIENT',
      emotionAfter: 'SATISFIED',
      mistakes: [],
      lessons: 'London open volatility consistently provides clean pullback entries in direction of macro trend.',
      notes: 'Closed before US market opening bell.',
      daysAgo: 2,
    },
  ];

  // Clean existing sample trades if needed
  await prisma.trade.deleteMany({ where: { userId: demoUser.id } });

  for (const t of sampleTrades) {
    const enteredAt = new Date(Date.now() - t.daysAgo * 86400000);
    const exitedAt = new Date(enteredAt.getTime() + 4 * 3600000); // 4 hours holding time

    await prisma.trade.create({
      data: {
        userId: demoUser.id,
        strategyId: createdStrategies[t.strategyIndex].id,
        symbol: t.symbol,
        direction: t.direction,
        entryPrice: t.entryPrice,
        exitPrice: t.exitPrice,
        stopLoss: t.stopLoss,
        takeProfit: t.takeProfit,
        quantity: t.quantity,
        leverage: 1.0,
        fees: 4.5,
        pnl: t.pnl,
        rMultiple: t.rMultiple,
        status: 'CLOSED',
        source: 'MANUAL',
        timeframe: '1h',
        enteredAt,
        exitedAt,
        journal: {
          create: {
            setupType: t.setupType,
            reasonForEntry: t.reasonForEntry,
            marketCondition: 'TRENDING',
            emotionBefore: t.emotionBefore,
            emotionDuring: t.emotionDuring,
            emotionAfter: t.emotionAfter,
            mistakesJson: JSON.stringify(t.mistakes),
            lessons: t.lessons,
            notes: t.notes,
          },
        },
      },
    });
  }

  // Create an open paper position for live tracking
  const paperAcc = await prisma.paperAccount.findUnique({ where: { userId: demoUser.id } });
  if (paperAcc) {
    await prisma.paperPosition.deleteMany({ where: { accountId: paperAcc.id } });
    await prisma.paperPosition.create({
      data: {
        accountId: paperAcc.id,
        symbol: 'BTCUSDT',
        direction: 'LONG',
        entryPrice: 96000,
        currentPrice: 96500,
        quantity: 0.1,
        stopLoss: 94800,
        takeProfit: 99000,
        leverage: 1.0,
        margin: 9600.0,
        unrealizedPnl: 50.0,
      },
    });
  }

  console.log(`[Seed] Seeded ${sampleTrades.length} historical trades, strategies, and open paper position!`);
}

main()
  .catch((e) => {
    console.error('[Seed Error]', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
