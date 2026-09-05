'use client';

import React, { useState, useRef, useEffect } from 'react';
import {
  Bot,
  Compass,
  MessageSquare,
  Send,
  Sparkles,
  User,
  Zap,
} from 'lucide-react';
import { TopNav } from '../../components/terminal/TopNav';
import { ApiClient } from '../../lib/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  dataPointsUsed?: number;
}

export default function AICoachPage() {
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: 'welcome',
      role: 'assistant',
      content:
        "Hello! I am your AI Trading Performance Coach. I analyze your actual trade journal, emotional states, and execution metrics to diagnose leaks in your edge.\n\nYou can click any of the recommended questions below, or ask your own questions based on your trade history.",
      timestamp: 'Just now',
    },
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const quickPrompts = [
    'What is my biggest recurring mistake?',
    'Which strategy performs best for me?',
    'Why am I losing on my recent setups?',
    'Do I overtrade on specific days?',
    'How do emotional entries affect my win rate?',
    'What should I focus on improving next?',
  ];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isLoading]);

  const handleSend = async (queryText?: string) => {
    const text = queryText || input;
    if (!text.trim() || isLoading) return;

    const userMsg: ChatMessage = {
      id: `user-${Date.now()}`,
      role: 'user',
      content: text,
      timestamp: new Date().toLocaleTimeString(),
    };

    setMessages((prev) => [...prev, userMsg]);
    if (!queryText) setInput('');
    setIsLoading(true);

    try {
      const res = await ApiClient.queryAICoach(text);
      const botMsg: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: 'assistant',
        content: res.response,
        timestamp: new Date().toLocaleTimeString(),
        dataPointsUsed: res.dataPointsUsed,
      };
      setMessages((prev) => [...prev, botMsg]);
    } catch (err: any) {
      const errorMsg: ChatMessage = {
        id: `err-${Date.now()}`,
        role: 'assistant',
        content: `Error evaluating journal: ${err.message || 'Server error'}. Please try again.`,
        timestamp: new Date().toLocaleTimeString(),
      };
      setMessages((prev) => [...prev, errorMsg]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="flex flex-col h-screen bg-background select-none font-sans text-xs overflow-hidden">
      <TopNav />

      <main className="flex-1 max-w-4xl w-full mx-auto p-4 flex flex-col overflow-hidden">
        {/* Header Strip */}
        <div className="flex items-center justify-between pb-3 border-b border-border">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Bot className="w-4 h-4" />
            </div>
            <div>
              <h1 className="text-sm font-bold text-white flex items-center gap-2">
                <span>AI Trading Performance Coach</span>
                <span className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/30 px-2 py-0.2 rounded font-mono">
                  Grounded in Journal Data
                </span>
              </h1>
              <p className="text-[11px] text-slate-400">
                Audits your discipline, R:R discipline, and trade setups based strictly on your historical logs.
              </p>
            </div>
          </div>
        </div>

        {/* Quick Prompts Carousel / Pills */}
        <div className="py-2.5 flex items-center gap-1.5 overflow-x-auto no-scrollbar">
          {quickPrompts.map((p, idx) => (
            <button
              key={idx}
              onClick={() => handleSend(p)}
              disabled={isLoading}
              className="whitespace-nowrap bg-surface hover:bg-surface-elevated text-slate-300 hover:text-white border border-border px-3 py-1 rounded-full text-[11px] transition"
            >
              {p}
            </button>
          ))}
        </div>

        {/* Messages Stream Container */}
        <div className="flex-1 overflow-y-auto space-y-4 p-4 bg-surface border border-border rounded-xl shadow-xl">
          {messages.map((m) => {
            const isBot = m.role === 'assistant';
            return (
              <div
                key={m.id}
                className={`flex gap-3 max-w-3xl ${isBot ? '' : 'ml-auto flex-row-reverse'}`}
              >
                <div
                  className={`w-7 h-7 rounded-lg flex items-center justify-center shrink-0 ${
                    isBot
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-brand/20 text-brand border border-brand/30'
                  }`}
                >
                  {isBot ? <Bot className="w-4 h-4" /> : <User className="w-4 h-4" />}
                </div>

                <div
                  className={`p-4 rounded-xl text-xs space-y-1.5 ${
                    isBot
                      ? 'bg-surface-subtle border border-border/80 text-slate-200'
                      : 'bg-brand text-white'
                  }`}
                >
                  <p className="whitespace-pre-wrap leading-relaxed">{m.content}</p>
                  <div
                    className={`flex items-center justify-between text-[10px] pt-1 font-mono ${
                      isBot ? 'text-slate-500' : 'text-blue-200'
                    }`}
                  >
                    <span>{m.timestamp}</span>
                    {m.dataPointsUsed !== undefined && isBot && (
                      <span>Audited {m.dataPointsUsed} historical trades</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })}

          {isLoading && (
            <div className="flex gap-3 max-w-xl">
              <div className="w-7 h-7 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 border border-emerald-500/30">
                <Bot className="w-4 h-4 animate-bounce" />
              </div>
              <div className="p-3 bg-surface-subtle border border-border rounded-xl text-xs text-slate-400 font-mono flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
                <span>Scanning journal database & calculating statistics...</span>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className="pt-3">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              handleSend();
            }}
            className="flex items-center gap-2 bg-surface border border-border rounded-xl p-1.5 shadow-lg"
          >
            <input
              type="text"
              placeholder="Ask a question about your trading performance, mistakes, or setups..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              disabled={isLoading}
              className="flex-1 bg-transparent px-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none"
            />
            <button
              type="submit"
              disabled={!input.trim() || isLoading}
              className="bg-brand hover:bg-brand-hover text-white p-2 rounded-lg transition disabled:opacity-40"
            >
              <Send className="w-4 h-4" />
            </button>
          </form>
          <p className="text-[10px] text-slate-500 text-center mt-1.5">
            AI analysis is generated strictly from your journaled trade history for educational purposes. Not financial advice.
          </p>
        </div>
      </main>
    </div>
  );
}
