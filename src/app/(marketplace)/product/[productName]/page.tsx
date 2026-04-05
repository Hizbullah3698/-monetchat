import { products } from '@/lib/data';
import ProductClient from './client';

export async function generateStaticParams() {
  return products.map((product) => ({
    productName: product.name,
  }));
}

export default function ProductPage() {
  return <ProductClient />;
}
