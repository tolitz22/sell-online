"use client";

import Image from "next/image";
import { Product } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

type Props = {
  product: Product;
  onBuy: (product: Product) => void;
};

export function ProductCard({ product, onBuy }: Props) {
  const isAvailable = product.status === "AVAILABLE";

  return (
    <Card className="group flex h-full flex-col gap-4 rounded-2xl border-zinc-200 bg-white/90 transition duration-200 hover:-translate-y-1 hover:border-amber-200 hover:shadow-xl hover:shadow-amber-100/40">
      {product.imageUrl ? (
        <div className="relative h-44 overflow-hidden rounded-xl border">
          <Image
            src={product.imageUrl}
            alt={product.name}
            fill
            className="object-cover transition duration-300 group-hover:scale-105"
          />
        </div>
      ) : null}

      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-zinc-500">{product.category}</p>
          <h3 className="text-lg font-bold tracking-tight text-zinc-900">{product.name}</h3>
        </div>
        <Badge
          className={
            isAvailable
              ? "border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
              : "border-zinc-200 bg-zinc-100 font-medium text-zinc-500"
          }
        >
          {isAvailable ? "Available" : "Sold Out"}
        </Badge>
      </div>

      <p className="text-sm leading-relaxed text-zinc-700">{product.description}</p>
      <div className="rounded-xl bg-zinc-50 p-3">
        <p className="text-xs font-semibold uppercase tracking-wider text-zinc-500">Starting at</p>
        <p className="text-2xl font-black text-zinc-900">{formatPrice(product.price)}</p>
      </div>

      <Button onClick={() => onBuy(product)} disabled={!isAvailable} className="mt-auto w-full rounded-full">
        {isAvailable ? "Buy Now" : "Currently Unavailable"}
      </Button>
    </Card>
  );
}
