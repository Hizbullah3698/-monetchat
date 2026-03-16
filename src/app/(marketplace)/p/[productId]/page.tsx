import { ProductGallery } from "@/components/product/product-gallery";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Phone, Heart, Flag, CheckCircle2, Star } from "lucide-react";
import Link from "next/link";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { ReviewList } from "@/components/reviews/review-list";
import { AddReviewForm } from "@/components/reviews/add-review-form";
import { MessageSellerButton } from "@/components/product/message-seller-button";
import { notFound } from "next/navigation";
import { headers } from "next/headers";

const conditionLabels: Record<string, string> = {
  new: "New",
  like_new: "Like New",
  good: "Good",
  fair: "Fair",
  poor: "Poor",
};

async function getProduct(productId: string) {
  const headersList = await headers();
  const host = headersList.get("host") || "localhost:3000";
  const protocol = process.env.NODE_ENV === "production" ? "https" : "http";

  try {
    const res = await fetch(`${protocol}://${host}/api/products/${productId}`, {
      cache: "no-store",
    });
    if (!res.ok) return null;
    const data = await res.json();
    return data.product;
  } catch {
    return null;
  }
}

export default async function ProductPage({
  params,
}: {
  params: Promise<{ productId: string }>;
}) {
  const { productId } = await params;
  const product = await getProduct(productId);

  if (!product) notFound();

  const images =
    product.images?.map(
      (img: { id: string; url: string; isPrimary: boolean }, i: number) => ({
        id: img.id,
        url: img.url,
        alt: img.isPrimary ? product.title : `${product.title} - Photo ${i + 1}`,
      })
    ) ?? [];

  const currencySymbol =
    product.country?.currencySymbol ||
    (product.currency === "KWD" ? "KD" : product.currency);

  const whatsappNumber = product.seller?.whatsappNumber?.replace(/[^0-9]/g, "");
  const whatsappLink = whatsappNumber
    ? `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(`Hi, I'm interested in: ${product.title}`)}`
    : null;

  const hasImages = images.length > 0;

  return (
    <div className="h-full overflow-y-auto">
      <div className={`mx-auto px-4 sm:px-6 py-6 sm:py-10 ${hasImages ? "max-w-5xl" : "max-w-2xl"}`}>

        {/* Main grid: gallery + info */}
        <div className={hasImages ? "grid md:grid-cols-[1fr_380px] gap-8 lg:gap-12 items-start" : ""}>

          {/* Gallery */}
          {hasImages && (
            <div className="md:sticky md:top-6">
              <ProductGallery images={images} />
            </div>
          )}

          {/* Info column */}
          <div className="space-y-5">

            {/* Badges */}
            <div className="flex flex-wrap gap-2">
              {product.category && (
                <Badge variant="secondary" className="text-xs">
                  {product.category.name}
                </Badge>
              )}
              <Badge variant="outline" className="text-xs">
                {conditionLabels[product.condition] || product.condition}
              </Badge>
              {product.isNegotiable && (
                <Badge variant="outline" className="text-xs text-green-600 border-green-200 bg-green-50 dark:bg-green-950/30">
                  Negotiable
                </Badge>
              )}
            </div>

            {/* Title + Price */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold leading-tight">
                {product.title}
              </h1>
              <p className="text-2xl sm:text-3xl font-bold text-primary mt-2">
                {currencySymbol} {Number(product.price).toLocaleString()}
              </p>
            </div>

            <Separator />

            {/* Contact actions */}
            <div className="space-y-2">
              {product.seller?.phonePublic && (
                <a href={`tel:${product.seller.phonePublic}`} className="block">
                  <Button className="w-full" size="lg">
                    <Phone className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                    Call Seller
                  </Button>
                </a>
              )}
              {whatsappLink && (
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="block">
                  <Button
                    variant="outline"
                    size="lg"
                    className="w-full text-green-600 border-green-300 hover:bg-green-50 dark:hover:bg-green-950/30"
                  >
                    <svg className="h-4 w-4 ltr:mr-2 rtl:ml-2" viewBox="0 0 24 24" fill="currentColor">
                      <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z" />
                      <path d="M12 0C5.373 0 0 5.373 0 12c0 2.625.846 5.059 2.284 7.034L.789 23.492a.5.5 0 00.611.611l4.458-1.495A11.952 11.952 0 0012 24c6.627 0 12-5.373 12-12S18.627 0 12 0zm0 22c-2.387 0-4.592-.838-6.313-2.236l-.44-.368-3.244 1.088 1.088-3.244-.368-.44A9.956 9.956 0 012 12C2 6.486 6.486 2 12 2s10 4.486 10 10-4.486 10-10 10z" />
                    </svg>
                    WhatsApp Seller
                  </Button>
                </a>
              )}
              <MessageSellerButton
                sellerId={product.seller?.id || ""}
                productId={product.id}
              />
              <div className="flex gap-2 pt-1">
                <Button variant="outline" className="flex-1 text-muted-foreground">
                  <Heart className="h-4 w-4 ltr:mr-2 rtl:ml-2" />
                  Save
                </Button>
                <Button variant="ghost" size="icon" className="text-muted-foreground">
                  <Flag className="h-4 w-4" />
                </Button>
              </div>
            </div>

            <Separator />

            {/* Seller card */}
            <div className="rounded-xl border bg-muted/30 p-4 space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Avatar className="h-10 w-10">
                    <AvatarImage src={product.seller?.avatarUrl || ""} />
                    <AvatarFallback className="bg-primary/10 text-primary font-semibold">
                      {(product.seller?.name || "S")[0].toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div>
                    <div className="flex items-center gap-1.5">
                      <span className="font-semibold text-sm">
                        {product.seller?.name || "Seller"}
                      </span>
                      {product.seller?.isVerified && (
                        <CheckCircle2 className="h-3.5 w-3.5 text-blue-500" />
                      )}
                    </div>
                    {(product.seller?.rating > 0 || product.seller?.totalSales > 0) && (
                      <div className="flex items-center gap-1 text-xs text-muted-foreground mt-0.5">
                        <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
                        <span>{Number(product.seller.rating || 0).toFixed(1)}</span>
                        <span className="text-muted-foreground/50">·</span>
                        <span>{product.seller.totalSales || 0} sales</span>
                      </div>
                    )}
                  </div>
                </div>
                <Button variant="ghost" size="sm" asChild className="text-xs">
                  <Link href={`/seller/${product.seller?.id || ""}`}>
                    View Profile
                  </Link>
                </Button>
              </div>
            </div>

            {/* Description / Reviews */}
            {(product.description || true) && (
              <Tabs defaultValue="details">
                <TabsList className="w-full">
                  <TabsTrigger value="details" className="flex-1">Details</TabsTrigger>
                  <TabsTrigger value="reviews" className="flex-1">Reviews</TabsTrigger>
                </TabsList>
                <TabsContent value="details" className="mt-4 text-sm leading-relaxed text-muted-foreground">
                  {product.description || "No description provided."}
                </TabsContent>
                <TabsContent value="reviews" className="mt-4">
                  <div className="grid gap-8">
                    <ReviewList />
                    <AddReviewForm onSubmit={(d) => console.log(d)} />
                  </div>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
