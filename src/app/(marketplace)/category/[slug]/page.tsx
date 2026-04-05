import { products } from '@/lib/data';
import CategoryClient from './client';

export async function generateStaticParams() {
  const categories = Array.from(new Set(products.map((product) => product.category.toLowerCase())));
  return categories.map((category) => ({
    slug: category,
  }));
}

export default function CategoryPage() {
  return <CategoryClient />;
}
