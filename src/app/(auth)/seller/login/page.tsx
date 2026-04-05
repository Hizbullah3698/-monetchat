
'use client';

import Link from 'next/link';
import { SellerAuthCard } from '@/components/seller-auth-card';
import { Package2 } from 'lucide-react';

export default function SellerLoginPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-muted/40">
       <div className="absolute top-8 left-8 flex items-center gap-2 font-semibold">
          <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
            <Package2 className="h-6 w-6 text-primary" />
            <span className="text-xl font-headline">Ecomm Now</span>
          </Link>
        </div>
        <SellerAuthCard
          title="Seller Login"
          description="Enter your credentials to access your seller dashboard."
          buttonText="Sign In"
          footerText="Don't have a seller account?"
          footerLink="/seller/signup"
          footerLinkText="Sign Up"
          isLogin={true}
        />
    </div>
  );
}
