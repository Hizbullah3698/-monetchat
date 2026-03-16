
'use client';

import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { Button } from '@/components/ui/button';
import SimilarProductsChat from '@/components/similar-products-chat';

export default function VisionSearchPage() {
  return (
    <div className="flex flex-col h-screen bg-background">
      <header className="flex h-16 items-center border-b px-4 shrink-0 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60 sticky top-0 z-10">
        <nav className="flex items-center gap-4 text-lg font-medium">
          <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
            <Link href="/">
              <ArrowLeft className="h-5 w-5" />
              <span className="sr-only">Back</span>
            </Link>
          </Button>
          <h1 className="font-semibold text-lg">Visual Search</h1>
        </nav>
      </header>
      <main className="flex-1 flex flex-col min-h-0 p-4">
        <div className="w-full max-w-4xl mx-auto flex-1 flex flex-col h-full">
          <SimilarProductsChat />
        </div>
      </main>
    </div>
  );
}
