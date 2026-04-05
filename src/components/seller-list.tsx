"use client";

import Image from "next/image";
import type { Seller } from "@/lib/types";
import { getDistance } from "@/lib/utils";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { MapPin, Navigation, Phone, SearchX } from "lucide-react";
import { Alert, AlertTitle, AlertDescription } from "./ui/alert";
import { Badge } from "./ui/badge";
import { useLocation } from "@/hooks/use-location";

type SellerListProps = {
  sellers: Seller[];
  productName: string;
  onSellerSelect: (seller: Seller | null) => void;
};

export default function SellerList({ sellers, productName, onSellerSelect }: SellerListProps) {
  const { location: buyerLocation, error: geolocationError } = useLocation();

  if (sellers.length === 0) {
    return (
      <div className="text-center text-muted-foreground mt-8 h-full flex flex-col items-center justify-center bg-background/50 rounded-lg p-6">
        <SearchX className="h-12 w-12 text-muted-foreground/50 mb-4" />
        <h3 className="text-lg font-semibold text-foreground">No Sellers Available</h3>
        <p className="text-sm">We couldn&apos;t find any sellers at the moment.</p>
        <p className="text-xs mt-2">Please try again later.</p>
      </div>
    );
  }

  const handleNavigate = (seller: Seller) => {
    if (buyerLocation) {
      const url = `https://www.google.com/maps/dir/?api=1&origin=${buyerLocation.lat},${buyerLocation.lng}&destination=${seller.location.lat},${seller.location.lng}`;
      window.open(url, '_blank', 'noopener,noreferrer');
    }
  };

  const getProductPrice = (seller: Seller, productName: string) => {
    const product = seller.products.find(p => p.name.toLowerCase().includes(productName.toLowerCase()));
    return product ? `$${product.price.toFixed(2)}` : null;
  };

  const sortedSellers = sellers
    .map(seller => ({
      seller,
      distance: buyerLocation ? getDistance(buyerLocation.lat, buyerLocation.lng, seller.location.lat, seller.location.lng) : Infinity
    }))
    .sort((a, b) => a.distance - b.distance)
    .slice(0, 10);

  return (
    <div className="space-y-4 pt-2">
      {geolocationError && !buyerLocation && (
        <Alert variant="destructive" className="mb-4">
          <MapPin className="h-4 w-4" />
          <AlertTitle>Location Error</AlertTitle>
          <AlertDescription>
            Could not get your location to calculate distances. Please enable location services in your browser.
          </AlertDescription>
        </Alert>
      )}
      {sortedSellers
        .map(({ seller, distance }) => {
          const price = getProductPrice(seller, productName);
          return (
            <Card
              key={seller.id}
              className="hover:shadow-lg transition-shadow cursor-pointer border-transparent hover:border-primary overflow-hidden"
              onMouseEnter={() => onSellerSelect(seller)}
              onMouseLeave={() => onSellerSelect(null)}
            >
              <div className="grid grid-cols-[100px_1fr]">
                <div className="relative h-full bg-muted">
                  <Image
                    src={seller.photoUrl}
                    alt={seller.name}
                    fill
                    className="object-cover"
                    data-ai-hint={seller.photoHint}
                  />
                </div>
                <div>
                  <CardHeader className="p-4">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <CardTitle className="text-lg">{seller.name}</CardTitle>
                        <CardDescription className="flex items-center gap-1.5 pt-1 text-xs">
                          <MapPin className="w-3 h-3 flex-shrink-0" />
                          <span>{seller.address}</span>
                        </CardDescription>
                        <CardDescription className="flex items-center gap-1.5 pt-1 text-xs">
                          <Phone className="w-3 h-3 flex-shrink-0" />
                          <a href={`tel:${seller.phone}`} className="hover:underline">{seller.phone}</a>
                        </CardDescription>
                      </div>
                      {price && (
                        <Badge variant="secondary" className="text-base font-bold whitespace-nowrap">
                          {price}
                        </Badge>
                      )}
                    </div>
                  </CardHeader>
                  <CardContent className="p-4 pt-0">
                    <div className="flex justify-between items-center text-sm">
                      <div className="text-muted-foreground font-medium">
                        {distance !== Infinity ? `${distance.toFixed(1)} km away` : 'Distance unknown'}
                      </div>
                      <Button
                        className="bg-accent text-accent-foreground hover:bg-accent/90"
                        size="sm"
                        onClick={() => handleNavigate(seller)}
                        disabled={!buyerLocation}>
                        <Navigation className="mr-2 h-4 w-4" />
                        Navigate
                      </Button>
                    </div>
                  </CardContent>
                </div>
              </div>
            </Card>
          );
        })}
    </div>
  );
}
