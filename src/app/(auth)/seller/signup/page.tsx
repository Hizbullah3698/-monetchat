
'use client';

import Link from 'next/link';
import { SellerAuthCard } from '@/components/seller-auth-card';
import { Package2 } from 'lucide-react';

export default function SellerSignupPage() {
  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 bg-muted/40">
        <div className="absolute top-8 left-8 flex items-center gap-2 font-semibold">
            <Link href="/" className="flex items-center gap-2 font-semibold text-foreground">
                <Package2 className="h-6 w-6 text-primary" />
                <span className="text-xl font-headline">Ecomm Now</span>
            </Link>
        </div>
        <SellerAuthCard
          title="Create Seller Account"
          description="Fill out the form to start selling on our platform."
          buttonText="Sign Up"
          footerText="Already have a seller account?"
          footerLink="/seller/login"
          footerLinkText="Log In"
          isLogin={false}
        />
    </div>
  );
}
