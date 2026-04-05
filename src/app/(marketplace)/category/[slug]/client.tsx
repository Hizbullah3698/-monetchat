'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { products } from '@/lib/data';
import { ProductCard } from '@/components/product-card';
import {
  Breadcrumb,
  BreadcrumbItem,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbPage,
  BreadcrumbSeparator,
} from '@/components/ui/breadcrumb';

export default function CategoryClient() {
  const params = useParams();
  const slug = params.slug as string;
  const categoryName = slug ? slug.charAt(0).toUpperCase() + slug.slice(1) : '';

  const categoryProducts = products.filter(
    (product) => product.category.toLowerCase() === categoryName.toLowerCase()
  );

  return (
    <div className="container mx-auto p-4 md:p-6">
      <Breadcrumb className="mb-4">
        <BreadcrumbList>
          <BreadcrumbItem>
            <BreadcrumbLink asChild>
              <Link href="/">Home</Link>
            </BreadcrumbLink>
          </BreadcrumbItem>
          <BreadcrumbSeparator />
          <BreadcrumbItem>
            <BreadcrumbPage>{categoryName}</BreadcrumbPage>
          </BreadcrumbItem>
        </BreadcrumbList>
      </Breadcrumb>

      <h1 className="text-3xl font-bold mb-6">
        Products in <span className="text-primary">{categoryName}</span>
      </h1>

      {categoryProducts.length > 0 ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
          {categoryProducts.map((product) => (
            <ProductCard key={product.name} product={product} />
          ))}
        </div>
      ) : (
        <div className="text-center py-16">
          <p className="text-lg text-muted-foreground">
            No products found in this category yet.
          </p>
        </div>
      )}
    </div>
  );
}
