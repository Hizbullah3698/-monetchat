'use client';

import Image from 'next/image';
import Link from 'next/link';
import { products, sellers as allSellers } from '@/lib/data';
import { Product, Seller } from '@/lib/types';
import { notFound, useParams } from 'next/navigation';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Share2, Heart, Clock, Eye, Video, Check, ChevronLeft, ChevronRight, MapPin, Sparkles, Star } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { useEffect, useState } from 'react';
import { SellerChatDialog } from '@/components/seller-chat-dialog';

export default function ProductClient() {
  const params = useParams();
  const [product, setProduct] = useState<Product | null | undefined>(undefined);
  const [advertisementId, setAdvertisementId] = useState<number | null>(null);
  const [advertisementCount, setAdvertisementCount] = useState<number | null>(null);
  const [viewCount, setViewCount] = useState<number | null>(null);
  const [mainImage, setMainImage] = useState<string | undefined>(undefined);

  const decodedProductName = params.productName ? decodeURIComponent(Array.isArray(params.productName) ? params.productName[0] : params.productName) : '';

  useEffect(() => {
    if (decodedProductName) {
      const foundProduct = products.find(p => p.name.toLowerCase() === decodedProductName.toLowerCase());
      setProduct(foundProduct || null);
      if (foundProduct) {
        setMainImage(foundProduct.photoUrl);
      }
    } else {
      setProduct(null);
    }
  }, [decodedProductName]);

  useEffect(() => {
    // Generate random numbers only on the client to avoid hydration errors
    setAdvertisementId(Math.floor(Math.random() * 10000000));
    setAdvertisementCount(Math.floor(Math.random() * 50));
    setViewCount(Math.floor(Math.random() * 100));
  }, []);

  if (product === undefined) {
    // Still loading
    return null;
  }

  if (!product) {
    notFound();
  }

  const seller: Seller | undefined = allSellers.find(s => s.products.some(p => p.name.toLowerCase() === product.name.toLowerCase()));

  if (!seller) {
    // Or handle this case differently, e.g. show product without seller
    notFound();
  }

  const securityGuidelines = [
    "Make sure to meet the seller in person and confirm his identity (preferably in a public place in the presence of a friend).",
    "Ensure that the product is inspected and examined by specialists.",
    "Documenting the sale/purchase process with full details of the product.",
    "Not to transfer any money only after confirming the identity of the seller and documenting the sale process and receiving the product.",
    "Ensure that you get a signed receipt from the seller."
  ];

  const galleryImages = [
    product.photoUrl,
    "https://picsum.photos/seed/gallery1/200/200",
    "https://picsum.photos/seed/gallery2/200/200",
    "https://picsum.photos/seed/gallery3/200/200",
    "https://picsum.photos/seed/gallery4/200/200",
  ].filter(Boolean) as string[];

  return (
    <div className="container mx-auto p-4 md:p-6 bg-muted/20">
      <Breadcrumb className="mb-4 text-sm">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home Page</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href={`/category/${product.category.toLowerCase()}`}>{product.category}</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>Advertised: {advertisementId}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-4">
        {/* Left Column */}
        <div className="lg:col-span-1 space-y-6">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-4">
                <Avatar className="h-16 w-16 border">
                  <AvatarImage src={seller.photoUrl} alt={seller.name} />
                  <AvatarFallback>{seller.name.charAt(0)}</AvatarFallback>
                </Avatar>
                <div className="flex-grow">
                  <h3 className="font-bold text-lg">{seller.name}</h3>
                  <div className="flex justify-between text-sm text-muted-foreground mt-1">
                    <span>Member since August 2025</span>
                    {advertisementCount !== null && <span>{advertisementCount} Advertisement</span>}
                  </div>
                </div>
              </div>
              <Button className="w-full mt-4" variant="outline">Follow</Button>
            </CardContent>
          </Card>

          <Card className="bg-muted/40 border-dashed">
            <CardContent className="p-6 h-48 flex flex-col items-center justify-center text-center text-muted-foreground">
              <div className="h-12 w-12 bg-muted rounded-full flex items-center justify-center mb-2">
                <Sparkles className="h-6 w-6 text-foreground/50" />
              </div>
              <p className="text-sm font-medium">Advertising Space</p>
              <p className="text-xs">AD HERE</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Security Guidelines</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm text-muted-foreground">
              {securityGuidelines.map((guideline, index) => (
                <div key={index} className="flex items-start gap-2">
                  <Check className="h-4 w-4 text-green-500 mt-0.5 flex-shrink-0" />
                  <p>{guideline}</p>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="overflow-hidden">
            <CardContent className="p-0">
              <div className="aspect-video relative w-full group">
                {mainImage && (
                  <Image
                    src={mainImage}
                    alt={product.name}
                    fill
                    className="object-cover"
                    data-ai-hint={product.photoHint}
                    key={mainImage} // Force re-render on image change
                  />
                )}
                <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity"></div>
                <Button variant="secondary" size="icon" className="absolute top-1/2 left-2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100">
                  <ChevronLeft />
                </Button>
                <Button variant="secondary" size="icon" className="absolute top-1/2 right-2 -translate-y-1/2 rounded-full opacity-0 group-hover:opacity-100">
                  <ChevronRight />
                </Button>
                <Badge className="absolute bottom-2 left-2">1/{galleryImages.length}</Badge>
                <Button variant="secondary" className="absolute bottom-2 right-2">
                  <Video className="h-4 w-4 mr-2" />
                  Video
                </Button>
              </div>
              <div className="p-2">
                <div className="flex gap-2 p-2">
                  {galleryImages.map((img, index) => (
                    <button
                      key={index}
                      className={`relative w-20 h-20 rounded-md overflow-hidden border-2 ${mainImage === img ? 'border-primary' : 'border-transparent'}`}
                      onClick={() => setMainImage(img)}
                    >
                      <Image src={img} alt={`Product thumbnail ${index + 1}`} fill className="object-cover" />
                    </button>
                  ))}
                </div>
              </div>
              <div className="p-6 pt-0">
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon">
                      <Share2 className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon">
                      <Heart className="h-5 w-5" />
                    </Button>
                  </div>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-1.5">
                      <Clock className="h-4 w-4" />
                      <span>Three weeks ago</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <Eye className="h-4 w-4" />
                      {viewCount !== null && <span>{viewCount} Views</span>}
                    </div>
                  </div>
                </div>
                <h1 className="text-3xl font-bold mb-2">{product.name}</h1>
                <div className="flex justify-between items-center mb-6">
                  <p className="text-3xl font-bold text-primary">
                    {product.price.toFixed(0)} KWD
                  </p>
                  <div className="flex items-center gap-2 text-sm text-muted-foreground">
                    <MapPin className="h-4 w-4" />
                    <span>Kuwait</span>
                  </div>
                </div>
                <div className="space-y-4">
                  <Button size="lg" className="w-full">
                    Call
                  </Button>
                  <SellerChatDialog sellerName={seller.name}>
                    <Button size="lg" variant="outline" className="w-full">
                      Chat
                    </Button>
                  </SellerChatDialog>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Advertising Specifications</CardTitle>
            </CardHeader>
            <CardContent className="flex flex-wrap gap-2">
              <Button variant="outline" className="bg-muted">
                {product.details?.category || 'General'}
                <svg xmlns="http://www.w3.org/2000/svg" width="1em" height="1em" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="ml-2 h-4 w-4"><path d="M16 12h2a2 2 0 0 1 0 4h-2V12Z"></path><path d="M6 12H4a2 2 0 0 0 0 4h2v-4Z"></path><path d="M12 18V6"></path><path d="m14 6-2-2-2 2"></path><path d="m10 18 2 2 2-2"></path></svg>
              </Button>
              <Button variant="outline" className="bg-muted">
                {product.details?.condition || 'New'}
                <Sparkles className="ml-2 h-4 w-4" />
              </Button>
              <Button variant="outline" className="bg-muted">
                Other
                <Star className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Description</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-foreground space-y-4 whitespace-pre-line">
              <p>{product.description}</p>
              {product.details && (
                <div>
                  <ul className="space-y-1 text-muted-foreground">
                    {product.details.size && <li><strong>Size:</strong> {product.details.size}</li>}
                    {product.details.color && <li><strong>Color:</strong> {product.details.color}</li>}
                    {product.details.material && <li><strong>Material:</strong> {product.details.material}</li>}
                    {product.details.features && <li><strong>Features:</strong> {product.details.features}</li>}
                  </ul>
                </div>
              )}
            </CardContent>
            <CardContent>
              <Button variant="link" className="p-0 h-auto">Show more</Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
