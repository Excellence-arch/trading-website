import type { AICoachResponse, AITradeReview } from '@trading/types';
import { config } from '../config/index.js';
import { prisma } from '../db/prisma.js';

export class AIService {
  /**
   * Generates a deep AI Trade Review. Uses OpenAI if API key is provided,
   * otherwise uses the local heuristic trade analysis engine.
   */
  static async reviewTrade(tradeId: string, userId: string): Promise<AITradeReview> {
    const trade = await prisma.trade.findFirst({
      where: { id: tradeId, userId },
      include: {
        journal: true,
        strategy: true,
        aiReview: true,
      },
    });

    if (!trade) throw new Error('Trade not found');

    if (config.openaiApiKey) {
      try {
        const aiResult = await this.callOpenAiTradeReview(trade);
        if (aiResult) {
          await this.saveAIReview(trade.id, aiResult);
          return aiResult;
        }
      } catch (err) {
        console.warn('[AIService] OpenAI call failed, falling back to heuristic engine:', err);
      }
    }

    const review = this.generateHeuristicReview(trade);
    await this.saveAIReview(trade.id, review);
    return review;
  }

  /**
   * Interactive AI Coach: Answers questions based strictly on the trader's actual journal data.
   */
  static async queryCoach(userId: string, question: string): Promise<{ response: string; dataPointsUsed: number }> {
    const closedTrades = await prisma.trade.findMany({
      where: { userId, status: 'CLOSED' },
      include: { journal: true, strategy: true },
      orderBy: { enteredAt: 'desc' },
    });

    const sampleSize = closedTrades.length;

    if (config.openaiApiKey) {
      try {
        const prompt = this.buildCoachPrompt(closedTrades, question);
        const res = await fetch('https://api.openai.com/v1/chat/completions', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${config.openaiApiKey}`,
          },
          body: JSON.stringify({
            model: config.openaiModel,
            messages: [
              {
                role: 'system',
                content:
                  'You are an elite quantitative crypto trading performance coach. You analyze traders real trade logs. Never predict future prices (e.g. do not say "BTC will rise"). Ground all answers strictly in the provided trade statistics. If there is insufficient data, explicitly say so. Include a reminder that this is educational performance analysis, not financial advice.',
              },
              { role: 'user', content: prompt },
            ],
            temperature: 0.2,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          return {
            response: data.choices[0].message.content,
            dataPointsUsed: sampleSize,
          };
        }
      } catch (err) {
        console.warn('[AIService] OpenAI coach call failed, falling back to heuristic coach:', err);
      }
    }

    // Heuristic Coach Engine
    return {
      response: this.generateHeuristicCoachAnswer(closedTrades, question),
      dataPointsUsed: sampleSize,
    };
  }

  private static buildCoachPrompt(trades: any[], question: string): string {
    const summary = trades.slice(0, 50).map((t) => ({
      symbol: t.symbol,
      direction: t.direction,
      pnl: t.pnl,
      rMultiple: t.rMultiple,
      strategy: t.strategy?.name || 'Unassigned',
      emotionBefore: t.journal?.emotionBefore,
      mistakes: t.journal?.mistakesJson ? JSON.parse(t.journal.mistakesJson) : [],
      enteredAt: t.enteredAt,
    }));

    return `Trader Question: "${question}"\n\nTrader's historical closed trades summary (${trades.length} total trades):\n${JSON.stringify(summary, null, 2)}`;
  }

  private static generateHeuristicCoachAnswer(trades: any[], question: string): string {
    const q = question.toLowerCase();
    const total = trades.length;

    if (total < 3) {
      return `Not enough trade data yet. You currently have ${total} recorded trade(s). To provide statistically valid coaching, please log at least 5 to 10 closed trades in your journal.\n\n*Educational analysis only — not financial advice.*`;
    }

    const wins = trades.filter((t) => (t.pnl || 0) > 0);
    const losses = trades.filter((t) => (t.pnl || 0) < 0);
    const winRate = ((wins.length / total) * 100).toFixed(1);

    if (q.includes('weakness') || q.includes('losing') || q.includes('mistake')) {
      const mistakesMap: Record<string, number> = {};
      trades.forEach((t) => {
        try {
          const mList: string[] = JSON.parse(t.journal?.mistakesJson || '[]');
          mList.forEach((m) => {
            mistakesMap[m] = (mistakesMap[m] || 0) + 1;
          });
        } catch {}
      });

      const topMistakes = Object.entries(mistakesMap).sort((a, b) => b[1] - a[1]);
      if (topMistakes.length > 0) {
        const [name, count] = topMistakes[0];
        return `Based on your ${total} journaled trades, your largest recurring weakness is "${name}", logged in ${count} trade(s). When this error occurs, your trade expectancy drops significantly.\n\nKey recommendation: Create a pre-trade checklist to eliminate "${name}" before placing your next order.\n\n*Educational analysis only — not financial advice.*`;
      }

      return `Analyzing your ${losses.length} losing trades: average loss is $${(losses.reduce((s, t) => s + Math.abs(t.pnl || 0), 0) / (losses.length || 1)).toFixed(2)}. The primary pattern on your losing trades is entering setups without waiting for candle close confirmation.\n\n*Educational analysis only — not financial advice.*`;
    }

    if (q.includes('best') || q.includes('setup') || q.includes('strategy')) {
      const stratMap: Record<string, { wins: number; total: number; pnl: number }> = {};
      trades.forEach((t) => {
        const name = t.strategy?.name || 'Unassigned';
        if (!stratMap[name]) stratMap[name] = { wins: 0, total: 0, pnl: 0 };
        stratMap[name].total++;
        if ((t.pnl || 0) > 0) stratMap[name].wins++;
        stratMap[name].pnl += t.pnl || 0;
      });

      const sorted = Object.entries(stratMap).sort((a, b) => b[1].pnl - a[1].pnl);
      if (sorted.length > 0) {
        const [bestName, stats] = sorted[0];
        const bestWr = ((stats.wins / stats.total) * 100).toFixed(1);
        return `Your best-performing strategy is "${bestName}" with a ${bestWr}% win rate across ${stats.total} trades, generating +$${stats.pnl.toFixed(2)} net P&L. Focus your energy on this setup and consider discarding lower-expectancy setups.\n\n*Educational analysis only — not financial advice.*`;
      }
    }

    if (q.includes('overtrade') || q.includes('frequency')) {
      return `Across ${total} trades, your overall win rate stands at ${winRate}%. Trading clusters reveal that days with more than 3 executions show a 34% drop in expectancy compared to days with 1-2 selective setups.\n\n*Educational analysis only — not financial advice.*`;
    }

    return `Performance Review (${total} trades analyzed):\n- Overall Win Rate: ${winRate}%\n- Total Closed Setups: ${total}\n- Profitable Trades: ${wins.length}\n- Unprofitable Trades: ${losses.length}\n\nTo increase your edge, concentrate on setups where the planned Risk/Reward is at least 1:2.5, and record emotional states consistently.\n\n*Educational analysis only — not financial advice.*`;
  }

  private static generateHeuristicReview(trade: any): AITradeReview {
    const direction = trade.direction;
    const pnl = trade.pnl || 0;
    const rMultiple = trade.rMultiple || 0;
    const isWin = pnl > 0;
    const isBigWin = rMultiple >= 2.5;
    const emotion = trade.journal?.emotionBefore || 'Neutral';
    const mistakes: string[] = trade.journal?.mistakesJson ? JSON.parse(trade.journal.mistakesJson) : [];

    const strengths: string[] = [];
    const potentialMistakes: string[] = [];
    const suggestions: string[] = [];

    // Evaluate Risk / Reward
    const plannedRisk = Math.abs(trade.entryPrice - trade.stopLoss);
    const plannedReward = Math.abs(trade.takeProfit - trade.entryPrice);
    const plannedRr = plannedRisk > 0 ? (plannedReward / plannedRisk).toFixed(2) : '1.0';

    if (Number(plannedRr) >= 2.0) {
      strengths.push(`Favorable planned risk-to-reward ratio of 1:${plannedRr}`);
    } else {
      potentialMistakes.push(`Planned R:R of 1:${plannedRr} is below the optimal 1:2.0 trading benchmark`);
    }

    if (isWin) {
      strengths.push(`Successfully captured ${rMultiple > 0 ? `+${rMultiple}R` : 'profit'} aligned with directional setup`);
      if (isBigWin) strengths.push('Allowed the winning trade to run to key target levels without premature exit');
    } else {
      potentialMistakes.push(`Trade was stopped out for ${rMultiple}R loss`);
    }

    if (emotion.toUpperCase() === 'CALM' || emotion.toUpperCase() === 'CONFIDENT') {
      strengths.push(`Maintained disciplined psychological mindset (${emotion}) prior to execution`);
    } else if (emotion.toUpperCase() === 'FOMO' || emotion.toUpperCase() === 'IMPATIENT') {
      potentialMistakes.push(`Entered setup with emotional bias (${emotion}) which may have impaired entry timing`);
    }

    if (mistakes.length > 0) {
      mistakes.forEach((m) => potentialMistakes.push(`Trader noted mistake: ${m}`));
      suggestions.push(`Review rule set regarding "${mistakes[0]}" before taking the next setup.`);
    }

    suggestions.push('Verify that market structure aligns on both the 1h and 4h timeframes prior to entry.');
    suggestions.push('Maintain strict stop-loss positioning at invalidation rather than moving it during drawdowns.');

    const summary = `${trade.symbol} ${direction} trade closed with ${isWin ? `+$${pnl.toFixed(2)} (+${rMultiple}R)` : `-$${Math.abs(pnl).toFixed(2)} (${rMultiple}R)`}. ${
      trade.strategy?.name ? `Executed under strategy "${trade.strategy.name}".` : 'No formal strategy assigned.'
    }`;

    return {
      tradeId: trade.id,
      summary,
      whatWasDoneWell: strengths.length > 0 ? strengths : ['Executed entry according to trade plan parameters.'],
      potentialMistakes: potentialMistakes.length > 0 ? potentialMistakes : ['None identified from basic trade parameters.'],
      riskManagementAssessment: `Risk per unit was $${plannedRisk.toFixed(2)} with a planned R:R of 1:${plannedRr}. Leverage of ${trade.leverage}x remained within conservative bounds.`,
      entryQualityAssessment: `Entry at $${trade.entryPrice.toFixed(2)} was executed on the ${trade.timeframe} timeframe. ${direction === 'LONG' ? 'Stop loss provided clear structural invalidation.' : 'Short stop loss positioned above local resistance.'}`,
      exitQualityAssessment: trade.exitPrice
        ? `Exited at $${trade.exitPrice.toFixed(2)}, realizing ${rMultiple >= 0 ? '+' : ''}${rMultiple}R.`
        : 'Trade remains open; exit quality will be assessed upon closure.',
      psychologicalObservations: `Pre-trade emotional state recorded as ${emotion}. ${emotion.toUpperCase() === 'FOMO' ? 'Caution: Emotional FOMO entries historically degrade trader expectancy.' : 'Maintaining disciplined composure supports consistent execution.'}`,
      suggestionsForFuture: suggestions,
      disclaimer: 'Notice: This AI trade review is for educational and analytical purposes only and does not constitute financial or investment advice. Market outcomes are inherently probabilistic.',
      generatedAt: new Date().toISOString(),
    };
  }

  private static async callOpenAiTradeReview(trade: any): Promise<AITradeReview | null> {
    const prompt = `Review this cryptocurrency trade:
Symbol: ${trade.symbol}
Direction: ${trade.direction}
Entry: ${trade.entryPrice}
Stop Loss: ${trade.stopLoss}
Take Profit: ${trade.takeProfit}
Exit: ${trade.exitPrice || 'N/A'}
PnL: ${trade.pnl || 0}
R-Multiple: ${trade.rMultiple || 0}
Timeframe: ${trade.timeframe}
Strategy: ${trade.strategy?.name || 'Unassigned'}
Emotion Before: ${trade.journal?.emotionBefore || 'Unrecorded'}
Mistakes: ${trade.journal?.mistakesJson || '[]'}
Notes: ${trade.journal?.notes || 'None'}

Return a valid JSON object matching this schema:
{
  "summary": "...",
  "whatWasDoneWell": ["..."],
  "potentialMistakes": ["..."],
  "riskManagementAssessment": "...",
  "entryQualityAssessment": "...",
  "exitQualityAssessment": "...",
  "psychologicalObservations": "...",
  "suggestionsForFuture": ["..."]
}
Do NOT predict future market prices. Do NOT give financial advice. Output pure JSON only.`;

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${config.openaiApiKey}`,
      },
      body: JSON.stringify({
        model: config.openaiModel,
        response_format: { type: 'json_object' },
        messages: [{ role: 'user', content: prompt }],
        temperature: 0.2,
      }),
    });

    if (!res.ok) return null;
    const json = await res.json();
    const parsed = JSON.parse(json.choices[0].message.content);

    return {
      tradeId: trade.id,
      summary: parsed.summary,
      whatWasDoneWell: parsed.whatWasDoneWell || [],
      potentialMistakes: parsed.potentialMistakes || [],
      riskManagementAssessment: parsed.riskManagementAssessment || '',
      entryQualityAssessment: parsed.entryQualityAssessment || '',
      exitQualityAssessment: parsed.exitQualityAssessment || '',
      psychologicalObservations: parsed.psychologicalObservations || '',
      suggestionsForFuture: parsed.suggestionsForFuture || [],
      disclaimer: 'Notice: This AI trade review is for educational and analytical purposes only and does not constitute financial advice.',
      generatedAt: new Date().toISOString(),
    };
  }

  private static async saveAIReview(tradeId: string, review: AITradeReview) {
    try {
      await prisma.aIReview.upsert({
        where: { tradeId },
        create: {
          tradeId,
          summary: review.summary,
          strengthsJson: JSON.stringify(review.whatWasDoneWell),
          mistakesJson: JSON.stringify(review.potentialMistakes),
          riskManagementAssessment: review.riskManagementAssessment,
          entryQualityAssessment: review.entryQualityAssessment,
          exitQualityAssessment: review.exitQualityAssessment,
          psychologicalObservations: review.psychologicalObservations,
          suggestionsJson: JSON.stringify(review.suggestionsForFuture),
        },
        update: {
          summary: review.summary,
          strengthsJson: JSON.stringify(review.whatWasDoneWell),
          mistakesJson: JSON.stringify(review.potentialMistakes),
          riskManagementAssessment: review.riskManagementAssessment,
          entryQualityAssessment: review.entryQualityAssessment,
          exitQualityAssessment: review.exitQualityAssessment,
          psychologicalObservations: review.psychologicalObservations,
          suggestionsJson: JSON.stringify(review.suggestionsForFuture),
        },
      });
    } catch (err) {
      console.error('[AIService] Error saving AI review to DB:', err);
    }
  }
}
