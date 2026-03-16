
"use client";

import { useState, useEffect, Suspense } from "react";
import { useSearchParams } from "next/navigation";
import dynamic from "next/dynamic";
import { Package2, ArrowLeft } from 'lucide-react';
import { Skeleton } from "@/components/ui/skeleton";
import SellerList from "@/components/seller-list";
import type { Seller } from "@/lib/types";
import { findSellersByProduct, sellers as allSellersData } from "@/lib/data";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { useLocation } from "@/hooks/use-location";

const MapView = dynamic(() => import("@/components/map-view"), {
  ssr: false,
  loading: () => <Skeleton className="h-full w-full rounded-lg" />,
});

function SellersPageContent() {
  const searchParams = useSearchParams();
  const productName = searchParams.get("productName");
  const confidence = searchParams.get("confidence");

  const [sellers, setSellers] = useState<Seller[]>([]);
  const [selectedSeller, setSelectedSeller] = useState<Seller | null>(null);
  
  const { location: buyerLocation } = useLocation();

  useEffect(() => {
    if (productName) {
      let foundSellers = findSellersByProduct(productName);
      if (foundSellers.length === 0) {
        foundSellers = allSellersData; // Show all sellers if none are found
      }
      setSellers(foundSellers);
    }
  }, [productName]);
  
  const handleSellerSelect = (seller: Seller | null) => {
    setSelectedSeller(seller);
  };

  return (
    <div className="min-h-screen w-full bg-background font-body text-foreground">
       <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background/95 px-4 backdrop-blur supports-[backdrop-filter]:bg-background/60 md:px-6">
        <Button variant="ghost" size="icon" asChild>
            <Link href="/">
                <ArrowLeft />
            </Link>
        </Button>
        <div className="flex items-center gap-2 font-semibold">
          <Package2 className="h-6 w-6 text-primary" />
          <span className="text-xl font-headline">Ecomm Now</span>
        </div>
      </header>

      <main className="grid h-[calc(100vh-3.5rem)] md:grid-cols-2 lg:grid-cols-[480px_1fr]">
        <div className="flex flex-col overflow-y-auto border-r p-4 md:p-6 space-y-4">
            {productName && (
            <div className="space-y-4 flex-grow min-h-0 flex flex-col">
                <div className="flex-shrink-0">
                    <div className="flex gap-4 items-start">
                        <div>
                            <h1 className="text-2xl font-semibold">Sellers for: <span className="text-primary font-bold">{productName}</span></h1>
                            {confidence && <p className="text-sm text-muted-foreground">Confidence: {confidence}%</p>}
                        </div>
                    </div>
                </div>
                <div className="overflow-y-auto pr-1 flex-grow">
                <SellerList 
                    sellers={sellers} 
                    productName={productName} 
                    onSellerSelect={handleSellerSelect}
                />
                </div>
            </div>
            )}
        </div>
        <div className="hidden h-full w-full items-center justify-center bg-muted md:flex">
            <MapView 
              sellers={sellers}
              buyerLocation={buyerLocation}
              selectedSeller={selectedSeller}
            />
        </div>
      </main>
    </div>
  );
}


export default function SellersPage() {
    return (
        <Suspense fallback={<div className="h-screen w-full flex items-center justify-center"><p>Loading sellers...</p></div>}>
            <SellersPageContent />
        </Suspense>
    )
}

    
