
import { api } from "./api";

export interface Product {
    id: string;
    title: string;
    price: number | string;
    image: string;
    category: string;
    description?: string;
    condition?: string;
}

export const productService = {
    search: async (query: string) => {
        // Real: return api.get<Product[]>(`/products/search?q=${query}`);
        // Mock:
        return [
            { id: '1', title: 'Vintage Camera', price: '$150', image: 'https://picsum.photos/seed/camera/300/300', category: 'Electronics' },
            { id: '2', title: 'Leather Jacket', price: '$85', image: 'https://picsum.photos/seed/jacket/300/300', category: 'Fashion' },
        ];
    },

    searchByImage: async (file: File) => {
        const formData = new FormData();
        formData.append('image', file);

        // Real: 
        // return fetch('/api/search/visual', { method: 'POST', body: formData }).then(r => r.json());

        // Mock:
        return new Promise<Product[]>((resolve) => {
            setTimeout(() => {
                resolve([
                    { id: '3', title: 'Similar Watch', price: '$299', image: 'https://picsum.photos/seed/watch/300/300', category: 'Electronics' },
                    { id: '5', title: 'Exact Match Watch', price: '$250', image: 'https://picsum.photos/seed/watch2/300/300', category: 'Electronics' },
                ]);
            }, 1500);
        });
    },

    analyzeImage: async (file: File) => {
        // Mock for listing wizard
        return new Promise<any>((resolve) => {
            setTimeout(() => {
                resolve({
                    title: "Detected Item",
                    price: "0.00",
                    category: "electronics",
                    condition: "good",
                    description: "AI analysis detected..."
                });
            }, 2000);
        });
    }
};
