import type { Metadata } from 'next';
import './globals.css';
import { AuthProvider } from '../context/AuthContext';
import { MarketProvider } from '../context/MarketContext';

export const metadata: Metadata = {
  title: 'Nexus Crypto Terminal & Trading Journal',
  description:
    'Professional cryptocurrency market analysis terminal, interactive TradingView charts, trade planning, automatic journal, portfolio analytics, and AI coach.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark" suppressHydrationWarning>
      <body
        className="bg-background text-slate-100 min-h-screen antialiased selection:bg-brand selection:text-white"
        suppressHydrationWarning
      >
        <AuthProvider>
          <MarketProvider>{children}</MarketProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
