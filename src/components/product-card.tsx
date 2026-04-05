
"use client";

import Image from "next/image";
import Link from "next/link";
import { Product } from "@/lib/types";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

interface ProductCardProps {
  product: Product;
}

export function ProductCard({ product }: ProductCardProps) {
  const encodedProductName = encodeURIComponent(product.name);
  
  return (
    <Link href={`/product/${encodedProductName}`} className="group">
      <Card className="overflow-hidden h-full flex flex-col">
        <CardContent className="p-0 flex-grow flex flex-col">
          <div className="aspect-square relative w-full">
            <Image
              src={product.photoUrl || "https://picsum.photos/seed/product/300/300"}
              alt={product.name}
              fill
              className="object-cover transition-transform group-hover:scale-105"
              data-ai-hint={product.photoHint}
            />
          </div>
          <div className="p-3 flex-grow flex flex-col justify-between">
            <h3 className="font-semibold text-sm leading-tight truncate group-hover:text-primary">{product.name}</h3>
            <Badge variant="secondary" className="text-sm font-bold mt-2 self-start">
              ${product.price.toFixed(2)}
            </Badge>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
