import "@/lib/polyfill";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { LocationProvider } from '@/hooks/use-location';
import { ReactNode } from 'react';
import { AppShell } from './app-shell';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Monetchat - AI Marketplace',
  description: 'Chat with AI to find and buy products. Upload images, use voice, or just type what you need.',
};

export default function MarketplaceLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <LocationProvider>
      <AppShell>{children}</AppShell>
    </LocationProvider>
  );
}
