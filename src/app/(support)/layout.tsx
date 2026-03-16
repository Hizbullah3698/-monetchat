import "@/lib/polyfill";
import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '../globals.css';
import { Toaster } from "@/components/ui/toaster";
import { LocationProvider } from '@/hooks/use-location';
import { AuthProvider } from '@/context/auth-context';
import { ReactNode } from 'react';
import { Header } from "@/components/layout/header";
import { Footer } from "@/components/layout/footer";

const inter = Inter({ subsets: ['latin'], variable: '--font-body' });

export const metadata: Metadata = {
  title: 'Ecomm Now',
  description: 'Upload an image to find products sold by nearby sellers.',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className={`${inter.variable} font-body antialiased`} suppressHydrationWarning>
        <AuthProvider>
          <LocationProvider>
            <div className="flex flex-col min-h-screen">
              <Header />
              <main className="flex-1">
                {children}
              </main>
              <Footer />
            </div>
          </LocationProvider>
          <Toaster />
        </AuthProvider>
      </body>
    </html>
  );
}
