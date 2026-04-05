
import type { Seller, Product } from '@/lib/types';
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const products: Product[] = [
  { name: 'Wireless Headphones', price: 199.99, category: 'Electronics', photoUrl: PlaceHolderImages.find(p => p.id === 'product-headphones')?.imageUrl, photoHint: PlaceHolderImages.find(p => p.id === 'product-headphones')?.imageHint || 'wireless headphones', description: "Experience immersive sound with these noise-cancelling wireless headphones. Up to 30 hours of battery life.", details: { condition: "New", category: "Audio", material: "Plastic", color: "Black", features: "Noise-Cancelling, Bluetooth 5.0" } },
  { name: 'Smartwatch', price: 249.99, category: 'Electronics', photoUrl: PlaceHolderImages.find(p => p.id === 'product-smartwatch')?.imageUrl, photoHint: PlaceHolderImages.find(p => p.id === 'product-smartwatch')?.imageHint || 'smartwatch', description: "Stay connected and track your fitness goals with this sleek smartwatch. Water-resistant with a vibrant display.", details: { condition: "New", category: "Wearable", material: "Aluminum", color: "Space Gray", features: "Heart Rate Monitor, GPS" } },
  { name: 'Coffee Maker', price: 89.00, category: 'Furniture', photoUrl: PlaceHolderImages.find(p => p.id === 'product-coffeemaker')?.imageUrl, photoHint: PlaceHolderImages.find(p => p.id === 'product-coffeemaker')?.imageHint || 'coffee maker', description: "Brew the perfect cup of coffee every morning. Programmable and easy to clean.", details: { condition: "New", category: "Kitchen", material: "Stainless Steel", features: "12-cup capacity, Auto-shut off" } },
  { name: 'Blender', price: 120.00, category: 'Furniture', photoUrl: PlaceHolderImages.find(p => p.id === 'product-blender')?.imageUrl, photoHint: PlaceHolderImages.find(p => p.id === 'product-blender')?.imageHint || 'blender', description: "Powerful blender for smoothies, soups, and more. Features multiple speed settings.", details: { condition: "Used", category: "Kitchen", material: "Glass, Plastic", features: "1000W motor, 6-blade assembly" } },
  { name: 'Portable Speaker', price: 89.99, category: 'Electronics', photoUrl: "https://picsum.photos/seed/speaker/400/300", photoHint: "portable speaker", description: "Take your music anywhere. This portable speaker is waterproof and has a 12-hour battery life.", details: { condition: "New", category: "Audio", color: "Blue", features: "Waterproof, Long Battery Life" } },
  { name: 'Gaming Mouse', price: 79.99, category: 'Electronics', photoUrl: "https://picsum.photos/seed/mouse/400/300", photoHint: "gaming mouse", description: "High-precision gaming mouse with customizable RGB lighting.", details: { condition: "New", category: "Gaming", features: "16,000 DPI, 8 programmable buttons" } },
  { name: 'Mechanical Keyboard', price: 129.99, category: 'Electronics', photoUrl: "https://picsum.photos/seed/keyboard/400/300", photoHint: "mechanical keyboard", description: "Clicky and responsive mechanical keyboard for the ultimate typing experience.", details: { condition: "New", category: "Gaming", material: "Aluminum body", features: "RGB Backlighting, Cherry MX Switches" } },
  { name: 'VR Headset', price: 399.99, category: 'Electronics', photoUrl: "https://picsum.photos/seed/vr/400/300", photoHint: "vr headset", description: "Step into new worlds with this immersive VR headset.", details: { condition: "Like New", category: "Gaming", features: "120Hz refresh rate, 6DoF tracking" } },
  { name: 'Sedan Car', price: 25000, category: 'Automotive', photoUrl: "https://picsum.photos/seed/sedan/400/300", photoHint: "blue sedan", description: "Reliable and fuel-efficient 2023 sedan. Low mileage and in excellent condition.", details: { condition: "Used", category: "Cars", color: "Blue", size: "4-door" } },
  { name: 'Modern Apartment', price: 500000, category: 'Property', photoUrl: "https://picsum.photos/seed/apartment/400/300", photoHint: "modern apartment", description: "Stunning 2-bedroom apartment in the heart of the city with great views.", details: { condition: "N/A", category: "For Sale", size: "2-bedroom" } },
  { name: 'Lawn Mowing Service', price: 50, category: 'Services', photoUrl: "https://picsum.photos/seed/lawn/400/300", photoHint: "lawn mower", description: "Professional lawn mowing and garden maintenance services.", details: { condition: "N/A", category: "Gardening" } },
  { name: 'Camping Tent', price: 150, category: 'Camping', photoUrl: "https://picsum.photos/seed/camptent/400/300", photoHint: "camping tent", description: "Spacious 4-person tent, perfect for family camping trips. Weather-resistant.", details: { condition: "New", category: "Outdoor", size: "4-person" } },
  { name: 'Basketball', price: 25, category: 'Sports', photoUrl: "https://picsum.photos/seed/basketball/400/300", photoHint: "basketball", description: "Official size and weight basketball for indoor and outdoor play.", details: { condition: "New", category: "Team Sports", size: "Size 7" } },
  { name: 'Golden Retriever Puppy', price: 1200, category: 'Animals', photoUrl: "https://picsum.photos/seed/puppy/400/300", photoHint: "golden retriever", description: "Adorable and friendly Golden Retriever puppies looking for a forever home.", details: { condition: "N/A", category: "Dogs" } },
  { name: 'Baby Stroller', price: 250, category: 'Family', photoUrl: "https://picsum.photos/seed/stroller/400/300", photoHint: "baby stroller", description: "Lightweight and easy-to-fold baby stroller with ample storage.", details: { condition: "Used", category: "Baby Gear" } },
  { name: 'Birthday Gift Basket', price: 75, category: 'Gifts', photoUrl: "https://picsum.photos/seed/giftbasket/400/300", photoHint: "gift basket", description: "A curated gift basket with gourmet snacks and treats for any occasion.", details: { condition: "N/A", category: "Food" } },
  { name: 'Wooden Dining Table', price: 800, category: 'Furniture', photoUrl: "https://picsum.photos/seed/diningtable/400/300", photoHint: "dining table", description: "Solid oak dining table that seats up to 8 people. Modern farmhouse style.", details: { condition: "New", category: "Dining Room", material: "Oak Wood", size: "8-seater" } },
  { name: 'Software Developer Role', price: 90000, category: 'Jobs', photoUrl: "https://picsum.photos/seed/devjob/400/300", photoHint: "code on screen", description: "Seeking an experienced software developer for a full-time remote position. React and Node.js experience required.", details: { condition: "N/A", category: "Tech" } },
];


export const sellers: Seller[] = [
  {
    id: 'seller-1',
    name: 'Tech Haven',
    location: { lat: 34.0522, lng: -118.2437 }, // Downtown LA
    address: '123 Main St, Los Angeles, CA',
    phone: '(213) 555-0101',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-1-photo')?.imageUrl || 'https://picsum.photos/seed/tech1/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-1-photo')?.imageHint || 'tech store',
    products: products.filter(p => p.category === 'Electronics').slice(0,3),
  },
  {
    id: 'seller-2',
    name: 'Gadget Galaxy',
    location: { lat: 34.0622, lng: -118.2537 }, // Near Dodger Stadium
    address: '456 Tech Rd, Los Angeles, CA',
    phone: '(213) 555-0102',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-2-photo')?.imageUrl || 'https://picsum.photos/seed/tech2/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-2-photo')?.imageHint || 'gadget store',
    products: products.filter(p => p.category === 'Electronics').slice(1,4),
  },
  {
    id: 'seller-3',
    name: 'Electro World',
    location: { lat: 34.0422, lng: -118.2637 }, // South Park
    address: '789 Circuit Ave, Los Angeles, CA',
    phone: '(213) 555-0103',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-3-photo')?.imageUrl || 'https://picsum.photos/seed/tech3/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-3-photo')?.imageHint || 'electronics shop',
    products: products.filter(p => p.category === 'Electronics').slice(2,5),
  },
  {
    id: 'seller-4',
    name: 'Home Goods Central',
    location: { lat: 40.7128, lng: -74.0060 }, // NYC
    address: '101 Homey Blvd, New York, NY',
    phone: '(212) 555-0104',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-4-photo')?.imageUrl || 'https://picsum.photos/seed/home1/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-4-photo')?.imageHint || 'home goods',
    products: products.filter(p => p.category === 'Furniture').slice(0,2),
  },
  {
    id: 'seller-5',
    name: 'Kitchen Creations',
    location: { lat: 40.7228, lng: -73.9960 }, // Near Washington Square Park, NYC
    address: '212 Culinary Way, New York, NY',
    phone: '(212) 555-0105',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-5-photo')?.imageUrl || 'https://picsum.photos/seed/kitchen1/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-5-photo')?.imageHint || 'kitchenware shop',
    products: products.filter(p => p.category === 'Furniture').slice(1,3),
  },
   {
    id: 'seller-6',
    name: 'Digital Dreams',
    location: { lat: 34.0722, lng: -118.2837 },
    address: '321 Innovation Dr, Los Angeles, CA',
    phone: '(213) 555-0106',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-6-photo')?.imageUrl || 'https://picsum.photos/seed/tech4/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-6-photo')?.imageHint || 'electronics store',
    products: products.filter(p => p.category === 'Electronics').slice(0,2),
  },
  {
    id: 'seller-7',
    name: 'Connect Electronics',
    location: { lat: 34.0322, lng: -118.2237 },
    address: '654 Connection St, Los Angeles, CA',
    phone: '(213) 555-0107',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-7-photo')?.imageUrl || 'https://picsum.photos/seed/tech5/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-7-photo')?.imageHint || 'gadget shop',
    products: products.filter(p => p.category === 'Electronics').slice(4,6),
  },
  {
    id: 'seller-8',
    name: 'Future Gadgets',
    location: { lat: 40.7328, lng: -74.0160 },
    address: '45 Future Ave, New York, NY',
    phone: '(212) 555-0108',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-8-photo')?.imageUrl || 'https://picsum.photos/seed/tech6/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-8-photo')?.imageHint || 'futuristic gadgets',
    products: products.filter(p => p.category === 'Electronics').slice(1,3),
  },
  {
    id: 'seller-9',
    name: 'Urban Homeware',
    location: { lat: 40.7028, lng: -73.9860 },
    address: '789 Domestic Dr, New York, NY',
    phone: '(212) 555-0109',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-9-photo')?.imageUrl || 'https://picsum.photos/seed/home2/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-9-photo')?.imageHint || 'modern homeware',
    products: products.filter(p => p.category === 'Furniture').slice(2,4),
  },
  {
    id: 'seller-10',
    name: 'The Appliance Stop',
    location: { lat: 40.7428, lng: -73.9760 },
    address: '101 Appliance Rd, New York, NY',
    phone: '(212) 555-0110',
    photoUrl: PlaceHolderImages.find(p => p.id === 'seller-10-photo')?.imageUrl || 'https://picsum.photos/seed/home3/400/300',
    photoHint: PlaceHolderImages.find(p => p.id === 'seller-10-photo')?.imageHint || 'appliance store',
    products: products.filter(p => p.category === 'Furniture').slice(3,5),
  },
];

export function findSellersByProduct(productName: string): Seller[] {
    if (!productName) return [];
  const lowerCaseProductName = productName.toLowerCase();
  const foundSellers = sellers.filter(seller =>
    seller.products.some(product =>
      product.name.toLowerCase().includes(lowerCaseProductName)
    )
  );

  return foundSellers.map(seller => ({
    ...seller,
    products: seller.products.filter(product => product.name.toLowerCase().includes(lowerCaseProductName))
  }));
}
