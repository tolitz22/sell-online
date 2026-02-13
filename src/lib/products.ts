export type ProductStatus = "AVAILABLE" | "SOLD_OUT";

export type Product = {
  id: string;
  name: string;
  category: string;
  price: number;
  description: string;
  status: ProductStatus;
  imageUrl?: string;
};

export const defaultProducts: Product[] = [
  {
    id: "cotton-tee-black",
    name: "Premium Cotton Tee - Black",
    category: "Clothing",
    price: 799,
    description: "Soft, breathable unisex shirt for daily wear.",
    status: "AVAILABLE",
  },
  {
    id: "denim-jacket-v1",
    name: "Denim Jacket - Classic Blue",
    category: "Clothing",
    price: 1899,
    description: "Midweight denim jacket with durable stitching and clean fit.",
    status: "AVAILABLE",
  },
  {
    id: "wireless-earbuds-lite",
    name: "Wireless Earbuds Lite",
    category: "Electronics",
    price: 1499,
    description: "Compact earbuds with crisp sound and all-day battery.",
    status: "AVAILABLE",
  },
  {
    id: "website-setup-basic",
    name: "Basic Website Setup",
    category: "Service",
    price: 3500,
    description: "Quick setup for small business pages, contact forms, and launch support.",
    status: "SOLD_OUT",
  },
];

export const getProductById = (items: Product[], id: string) => items.find((p) => p.id === id);
