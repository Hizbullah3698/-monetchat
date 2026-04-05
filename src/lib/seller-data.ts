export type Sale = {
  id: string;
  customerName: string;
  customerEmail: string;
  productName: string;
  quantity: number;
  price: number;
  status: 'Fulfilled' | 'Pending' | 'Refunded';
  date: string;
};

export const salesHistory: Sale[] = [
  {
    id: 'sale-1',
    customerName: 'Alice Johnson',
    customerEmail: 'alice@example.com',
    productName: 'Wireless Headphones',
    quantity: 1,
    price: 199.99,
    status: 'Fulfilled',
    date: '2023-10-26',
  },
  {
    id: 'sale-2',
    customerName: 'Bob Williams',
    customerEmail: 'bob@example.com',
    productName: 'Smartwatch',
    quantity: 1,
    price: 249.99,
    status: 'Fulfilled',
    date: '2023-10-25',
  },
  {
    id: 'sale-3',
    customerName: 'Charlie Brown',
    customerEmail: 'charlie@example.com',
    productName: 'Coffee Maker',
    quantity: 1,
    price: 89.0,
    status: 'Pending',
    date: '2023-10-25',
  },
  {
    id: 'sale-4',
    customerName: 'Diana Prince',
    customerEmail: 'diana@example.com',
    productName: 'Wireless Headphones',
    quantity: 2,
    price: 199.99,
    status: 'Fulfilled',
    date: '2023-10-24',
  },
  {
    id: 'sale-5',
    customerName: 'Ethan Hunt',
    customerEmail: 'ethan@example.com',
    productName: 'Blender',
    quantity: 1,
    price: 120.0,
    status: 'Refunded',
    date: '2023-10-22',
  },
  {
    id: 'sale-6',
    customerName: 'Fiona Glenanne',
    customerEmail: 'fiona@example.com',
    productName: 'Smartwatch',
    quantity: 1,
    price: 249.99,
    status: 'Fulfilled',
    date: '2023-10-21',
  },
];
