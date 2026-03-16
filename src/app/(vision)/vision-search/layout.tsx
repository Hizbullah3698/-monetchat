
import "@/lib/polyfill";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../../globals.css';
import { Toaster } from "@/components/ui/toaster";
import { AuthProvider } from '@/context/auth-context';
import { ReactNode } from 'react';

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Visual Search | Ecomm Now',
  description: 'Search for products by uploading an image.',
};

export default function VisionSearchLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`} suppressHydrationWarning>
        <AuthProvider>
          {children}
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
