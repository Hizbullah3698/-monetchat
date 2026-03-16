
"use client";

import { useSearchParams, useRouter } from 'next/navigation';
import { useState, Suspense } from 'react';
import { VisualSearchUploader } from '@/components/search/visual-search-uploader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Slider } from '@/components/ui/slider';
import { Search } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import Image from 'next/image';
import Link from 'next/link';

import { productService, Product } from '@/services/product-service'; // Import service
import { Loader2 } from 'lucide-react'; // Import loader

// Mock data (replace with API)
const MOCK_PRODUCTS = [
    { id: '1', title: 'Vintage Camera', price: '$150', image: 'https://picsum.photos/seed/camera/300/300', category: 'Electronics' },
    { id: '2', title: 'Leather Jacket', price: '$85', image: 'https://picsum.photos/seed/jacket/300/300', category: 'Fashion' },
    { id: '3', title: 'Smart Watch', price: '$299', image: 'https://picsum.photos/seed/watch/300/300', category: 'Electronics' },
    { id: '4', title: 'Coffee Table', price: '$120', image: 'https://picsum.photos/seed/table/300/300', category: 'Furniture' },
];

function SearchContent() {
    const searchParams = useSearchParams();
    const router = useRouter();
    const mode = searchParams.get('mode');
    const query = searchParams.get('q') || '';

    const [searchQuery, setSearchQuery] = useState(query);
    const [priceRange, setPriceRange] = useState([0, 1000]);
    const [products, setProducts] = useState<Product[]>(MOCK_PRODUCTS); // State for results
    const [isSearching, setIsSearching] = useState(false);

    const handleSearch = async (e?: React.FormEvent) => {
        if (e) e.preventDefault();
        router.push(`/search?q=${encodeURIComponent(searchQuery)}`);
        // In real app, we would also fetch here or rely on useEffect on searchParams
        // For now, let's just mock filter if needed, or keep as is.
    };

    const handleVisualSearch = async (file: File) => {
        setIsSearching(true);
        try {
            const results = await productService.searchByImage(file);
            setProducts(results);
        } catch (error) {
            console.error("Visual search failed", error);
        } finally {
            setIsSearching(false);
        }
    };

    const handleClearVisual = () => {
        setProducts(MOCK_PRODUCTS); // Reset to default
    };

    return (
        <div className="container py-8">
            <h1 className="text-3xl font-bold mb-8">
                {mode === 'visual' ? 'Visual Search' : 'Find Products'}
            </h1>

            {mode === 'visual' && (
                <VisualSearchUploader
                    onImageSelect={handleVisualSearch}
                    onClear={handleClearVisual}
                />
            )}

            <div className="flex flex-col md:flex-row gap-8">
                {/* Filters Sidebar */}
                <aside className="w-full md:w-64 space-y-6">
                    <div>
                        <h3 className="font-semibold mb-2">Search</h3>
                        <form onSubmit={handleSearch} className="flex gap-2">
                            <Input
                                placeholder="Keywords..."
                                value={searchQuery}
                                onChange={(e) => setSearchQuery(e.target.value)}
                            />
                            <Button type="submit" size="icon">
                                <Search className="h-4 w-4" />
                            </Button>
                        </form>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Category</h3>
                        <Select>
                            <SelectTrigger>
                                <SelectValue placeholder="All Categories" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">All Categories</SelectItem>
                                <SelectItem value="electronics">Electronics</SelectItem>
                                <SelectItem value="furniture">Furniture</SelectItem>
                                <SelectItem value="fashion">Fashion</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <h3 className="font-semibold mb-2">Price Range</h3>
                        <Slider
                            value={priceRange}
                            max={1000}
                            step={10}
                            onValueChange={setPriceRange}
                            className="mb-2"
                        />
                        <div className="flex justify-between text-sm text-muted-foreground">
                            <span>${priceRange[0]}</span>
                            <span>${priceRange[1]}</span>
                        </div>
                    </div>
                </aside>

                {/* Results Grid */}
                <div className="flex-1">
                    {isSearching ? (
                        <div className="min-h-[300px] flex flex-col items-center justify-center text-muted-foreground">
                            <Loader2 className="h-10 w-10 animate-spin mb-4 text-primary" />
                            <p>Analyzing image and finding matches...</p>
                        </div>
                    ) : (
                        <div className="grid grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.map((product) => (
                                <Link key={product.id} href={`/p/${product.id}`} className="group">
                                    <Card className="overflow-hidden hover:shadow-lg transition-shadow bg-card">
                                        <div className="aspect-square relative">
                                            <Image
                                                src={product.image}
                                                alt={product.title}
                                                fill
                                                className="object-cover group-hover:scale-105 transition-transform"
                                            />
                                        </div>
                                        <CardContent className="p-4">
                                            <h3 className="font-semibold truncate">{product.title}</h3>
                                            <div className="flex justify-between items-center mt-2">
                                                <span className="text-primary font-bold">{product.price}</span>
                                                <span className="text-xs text-muted-foreground">{product.category}</span>
                                            </div>
                                        </CardContent>
                                    </Card>
                                </Link>
                            ))}
                            {products.length === 0 && (
                                <div className="col-span-full text-center py-12 text-muted-foreground">
                                    No products found.
                                </div>
                            )}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default function SearchPage() {
    return (
        <Suspense fallback={<div className="container py-8">Loading search...</div>}>
            <SearchContent />
        </Suspense>
    );
}
