"use client";

import { useState } from "react";
import { Product } from "@/lib/products";
import { BuyModal } from "@/components/buy-modal";
import { ProductCard } from "@/components/product-card";

type Props = {
  products: Product[];
};

export function HomeStorefront({ products }: Props) {
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);

  return (
    <>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <ProductCard key={product.id} product={product} onBuy={setSelectedProduct} />
        ))}
      </div>
      {products.length === 0 ? (
        <div className="rounded-xl border border-dashed border-zinc-300 bg-white/70 p-6 text-sm text-zinc-600">
          No items yet. Add products from the admin dashboard and they will appear here automatically.
        </div>
      ) : null}

      <BuyModal open={Boolean(selectedProduct)} onOpenChange={(open) => !open && setSelectedProduct(null)} product={selectedProduct} />
    </>
  );
}
