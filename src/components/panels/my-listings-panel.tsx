"use client";

import { useState, useEffect, useCallback } from "react";
import { useAuth } from "@/context/auth-context";
import { useLanguage } from "@/context/language-context";
import { useAppMode } from "@/context/app-mode-context";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  ArrowLeft,
  Package,
  Plus,
  Loader2,
  Eye,
  Trash2,
  Camera,
} from "lucide-react";
import Image from "next/image";
import { cn } from "@/lib/utils";
import type { TranslationKey } from "@/lib/i18n/translations";

interface ProductListing {
  id: string;
  title: string;
  titleAr?: string;
  price: number;
  currency: string;
  status: string;
  condition: string;
  imageUrl: string | null;
  viewCount: number;
  createdAt: string;
}

const STATUS_COLORS: Record<string, string> = {
  active: "bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400",
  sold: "bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400",
  expired: "bg-yellow-100 text-yellow-700 dark:bg-yellow-900/30 dark:text-yellow-400",
  rejected: "bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400",
};

export function MyListingsPanel() {
  const { user } = useAuth();
  const { t, locale } = useLanguage();
  const { setCurrentView } = useAppMode();

  const [products, setProducts] = useState<ProductListing[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);

  const fetchProducts = useCallback(async () => {
    if (!user) {
      setLoading(false);
      return;
    }
    try {
      const res = await fetch(`/api/products?seller=${user.id}&status=active`);
      if (res.ok) {
        const data = await res.json();
        setProducts(
          data.products.map((p: Record<string, unknown>) => ({
            id: p.id,
            title: p.title,
            titleAr: p.titleAr,
            price: p.price,
            currency: p.currency,
            status: p.status || "active",
            condition: p.condition || "good",
            imageUrl: p.imageUrl,
            viewCount: p.viewCount || 0,
            createdAt: p.createdAt,
          }))
        );
      }
    } catch (err) {
      console.error("Failed to fetch products:", err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const handleDelete = async (productId: string) => {
    setDeleting(productId);
    try {
      const res = await fetch(`/api/products/${productId}`, {
        method: "DELETE",
      });
      if (res.ok) {
        setProducts((prev) => prev.filter((p) => p.id !== productId));
      }
    } catch (err) {
      console.error("Failed to delete:", err);
    } finally {
      setDeleting(null);
    }
  };

  const handleNewListing = () => {
    setCurrentView("chat");
  };

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <Package className="h-12 w-12 text-muted-foreground mb-4" />
        <h2 className="text-xl font-semibold mb-2">
          {t("sell.loginRequired" as TranslationKey)}
        </h2>
        <Button onClick={() => setCurrentView("chat")} variant="outline" className="mt-4">
          <ArrowLeft className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
          {t("settings.backToChat" as TranslationKey)}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full">
      {/* Header */}
      <div className="border-b px-4 md:px-6 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setCurrentView("chat")}
            className="shrink-0"
          >
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <h1 className="text-lg font-semibold">
            {t("sidebar.myListings" as TranslationKey)}
          </h1>
        </div>
        <Button onClick={handleNewListing} size="sm" className="gap-1.5">
          <Plus className="h-4 w-4" />
          {t("listings.newListing" as TranslationKey)}
        </Button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 md:p-6">
        <div className="max-w-2xl mx-auto">
          {loading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          ) : products.length === 0 ? (
            <div className="flex flex-col items-center text-center py-16">
              <div className="h-16 w-16 rounded-full bg-muted flex items-center justify-center mb-4">
                <Package className="h-8 w-8 text-muted-foreground" />
              </div>
              <h2 className="text-xl font-semibold mb-1">
                {t("dashboard.noProducts" as TranslationKey)}
              </h2>
              <p className="text-muted-foreground mb-6">
                {t("dashboard.noProductsDesc" as TranslationKey)}
              </p>
              <Button onClick={handleNewListing} className="gap-2">
                <Plus className="h-4 w-4" />
                {t("listings.newListing" as TranslationKey)}
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {products.map((product) => {
                const displayTitle =
                  locale === "ar" && product.titleAr
                    ? product.titleAr
                    : product.title;

                return (
                  <div
                    key={product.id}
                    className="flex items-center gap-3 p-3 rounded-xl border bg-card hover:bg-muted/30 transition-colors group"
                  >
                    {/* Image */}
                    {product.imageUrl ? (
                      <Image
                        src={product.imageUrl}
                        alt={product.title}
                        width={72}
                        height={72}
                        className="rounded-lg object-cover w-[72px] h-[72px] shrink-0"
                      />
                    ) : (
                      <div className="w-[72px] h-[72px] rounded-lg bg-muted flex items-center justify-center shrink-0">
                        <Camera className="h-6 w-6 text-muted-foreground" />
                      </div>
                    )}

                    {/* Info */}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">{displayTitle}</p>
                      <p className="text-sm font-bold text-primary">
                        {product.currency} {product.price.toLocaleString()}
                      </p>
                      <div className="flex items-center gap-2 mt-1">
                        <Badge
                          variant="secondary"
                          className={cn(
                            "text-[10px] px-1.5 py-0",
                            STATUS_COLORS[product.status] || ""
                          )}
                        >
                          {product.status}
                        </Badge>
                        <span className="text-xs text-muted-foreground flex items-center gap-1">
                          <Eye className="h-3 w-3" />
                          {product.viewCount}
                        </span>
                      </div>
                    </div>

                    {/* Actions */}
                    <Button
                      variant="ghost"
                      size="icon"
                      className="shrink-0 opacity-0 group-hover:opacity-100 transition-opacity text-muted-foreground hover:text-destructive"
                      onClick={() => handleDelete(product.id)}
                      disabled={deleting === product.id}
                    >
                      {deleting === product.id ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        <Trash2 className="h-4 w-4" />
                      )}
                    </Button>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
