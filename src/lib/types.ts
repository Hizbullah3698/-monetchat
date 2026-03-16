
export type Product = {
  name: string;
  price: number;
  category: string;
  photoUrl?: string;
  photoHint?: string;
  description?: string;
  details?: {
    condition?: string;
    category?: string;
    size?: string;
    color?: string;
    material?: string;
    features?: string;
  }
};

export type Seller = {
  id: string;
  name: string;
  location: {
    lat: number;
    lng: number;
  };
  address: string;
  products: Product[];
  phone: string;
  photoUrl: string;
  photoHint: string;
};

export type Coordinates = {
  lat: number;
  lng: number;
};
