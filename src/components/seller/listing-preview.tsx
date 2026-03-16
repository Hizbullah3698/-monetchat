"use client";

import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ArrowLeft, Check } from "lucide-react";
import { useLanguage } from "@/context/language-context";

interface ListingPreviewProps {
  title: string;
  description: string;
  price: string;
  category: string;
  condition: string;
  imageUrls: string[];
  onConfirm: () => void;
  onBack: () => void;
  isSubmitting: boolean;
}

export function ListingPreview({
  title,
  description,
  price,
  category,
  condition,
  imageUrls,
  onConfirm,
  onBack,
  isSubmitting,
}: ListingPreviewProps) {
  const { t } = useLanguage();

  const conditionKey = `condition.${condition.replace("-", "_")}` as Parameters<typeof t>[0];
  const categoryKey = `category.${category}` as Parameters<typeof t>[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-xl font-bold">{t("preview.title")}</h2>
        <Badge variant="outline" className="text-sm">
          {t("preview.draft")}
        </Badge>
      </div>

      <Card>
        <CardContent className="p-0">
          {/* Image gallery */}
          {imageUrls.length > 0 && (
            <div className="relative aspect-[4/3] w-full overflow-hidden rounded-t-lg bg-muted">
              <Image
                src={imageUrls[0]}
                alt={title}
                fill
                className="object-contain"
              />
              {imageUrls.length > 1 && (
                <div className="absolute bottom-2 right-2 bg-black/60 text-white text-xs px-2 py-1 rounded">
                  +{imageUrls.length - 1} {t("common.more")}
                </div>
              )}
            </div>
          )}

          {/* Thumbnail strip */}
          {imageUrls.length > 1 && (
            <div className="flex gap-2 p-3 overflow-x-auto">
              {imageUrls.map((url, i) => (
                <div
                  key={i}
                  className="relative w-16 h-16 rounded-md overflow-hidden shrink-0 border-2 border-transparent first:border-primary"
                >
                  <Image
                    src={url}
                    alt={`Photo ${i + 1}`}
                    fill
                    className="object-cover"
                  />
                </div>
              ))}
            </div>
          )}

          {/* Details */}
          <div className="p-4 space-y-3">
            <div className="flex items-center gap-2">
              <Badge variant="secondary">
                {t(categoryKey)}
              </Badge>
              <Badge variant="outline">
                {t(conditionKey)}
              </Badge>
            </div>

            <h3 className="text-2xl font-bold">{title}</h3>

            <p className="text-2xl font-bold text-primary">KWD {price}</p>

            <p className="text-sm text-muted-foreground leading-relaxed">
              {description}
            </p>
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-3">
        <Button
          variant="outline"
          className="flex-1"
          onClick={onBack}
          disabled={isSubmitting}
        >
          <ArrowLeft className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
          {t("preview.edit")}
        </Button>
        <Button
          className="flex-1"
          onClick={onConfirm}
          disabled={isSubmitting}
        >
          {isSubmitting ? (
            t("preview.publishing")
          ) : (
            <>
              <Check className="ltr:mr-2 rtl:ml-2 h-4 w-4" />
              {t("preview.publish")}
            </>
          )}
        </Button>
      </div>
    </div>
  );
}
