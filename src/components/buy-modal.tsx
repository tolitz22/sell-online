"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Product } from "@/lib/products";
import { orderSchema } from "@/lib/schemas";
import { formatPrice } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

type Props = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product: Product | null;
  slug: string;
  gcashQrUrl?: string;
};

type FormState = {
  fullName: string;
  email: string;
  phone: string;
  address: string;
  quantity: number;
  notes: string;
};

export function BuyModal({ open, onOpenChange, product, slug, gcashQrUrl }: Props) {
  const [form, setForm] = useState<FormState>({
    fullName: "",
    email: "",
    phone: "",
    address: "",
    quantity: 1,
    notes: "",
  });
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [orderId, setOrderId] = useState<string | null>(null);

  const total = useMemo(() => {
    if (!product) return 0;
    return product.price * form.quantity;
  }, [form.quantity, product]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!product) return;

    setError("");

    const parsed = orderSchema.safeParse({
      itemId: product.id,
      quantity: form.quantity,
      fullName: form.fullName,
      email: form.email,
      phone: form.phone,
      address: form.address,
      notes: form.notes,
    });

    if (!parsed.success) {
      const first = parsed.error.issues[0]?.message ?? "Invalid input";
      setError(first);
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/store/${slug}/orders`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(parsed.data),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Failed to place order");
      }

      setOrderId(data.orderId);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Something went wrong");
    } finally {
      setLoading(false);
    }
  }

  const resetAndClose = (nextOpen: boolean) => {
    if (!nextOpen) {
      setOrderId(null);
      setError("");
      setLoading(false);
      setForm({ fullName: "", email: "", phone: "", address: "", quantity: 1, notes: "" });
    }
    onOpenChange(nextOpen);
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className="border-amber-100 bg-white p-0 shadow-2xl shadow-amber-100/40 sm:max-w-lg">
        {!orderId ? (
          <form className="space-y-4 p-6 sm:p-7" onSubmit={onSubmit}>
            <div className="rounded-xl border border-amber-100 bg-gradient-to-r from-amber-50 to-cyan-50 p-4">
              <h3 className="text-xl font-bold tracking-tight text-zinc-900">Buy {product?.name}</h3>
              <p className="text-sm text-zinc-600">{product ? formatPrice(product.price) : ""} each</p>
            </div>

            <div className="grid gap-3">
              <Input
                className="bg-white"
                placeholder="Full name"
                value={form.fullName}
                onChange={(e) => setForm((s) => ({ ...s, fullName: e.target.value }))}
                required
              />
              <Input
                className="bg-white"
                type="email"
                placeholder="Email"
                value={form.email}
                onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
                required
              />
              <Input
                className="bg-white"
                placeholder="Phone"
                value={form.phone}
                onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
                required
              />
              <Textarea
                className="bg-white"
                placeholder="Delivery address"
                value={form.address}
                onChange={(e) => setForm((s) => ({ ...s, address: e.target.value }))}
                required
              />
              <Input className="bg-zinc-100 font-medium text-zinc-600" value={product?.name ?? ""} readOnly />
              <Input
                className="bg-white"
                type="number"
                min={1}
                value={form.quantity}
                onChange={(e) => setForm((s) => ({ ...s, quantity: Number(e.target.value || 1) }))}
              />
              <Textarea
                className="bg-white"
                placeholder="Notes (optional)"
                value={form.notes}
                onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
              />
            </div>

            <div className="rounded-xl border border-cyan-100 bg-cyan-50 p-3 text-sm text-zinc-700">
              Total: <span className="font-bold text-zinc-900">{formatPrice(total)}</span>
            </div>
            {error ? <p className="text-sm text-red-600">{error}</p> : null}

            <Button type="submit" className="w-full rounded-full" disabled={loading}>
              {loading ? "Placing order..." : "Place Order"}
            </Button>
          </form>
        ) : (
          <div className="space-y-4 p-6 text-center sm:p-7">
            <h3 className="text-xl font-bold tracking-tight text-zinc-900">Order placed successfully</h3>
            <p className="text-sm text-zinc-700">Order ID: <span className="font-bold text-zinc-900">{orderId}</span></p>

            <div className="mx-auto w-fit rounded-lg border p-3">
              <Image
                src={gcashQrUrl || "/gcash-qr.png"}
                alt="GCash QR Code"
                width={220}
                height={220}
                className="rounded-md"
                unoptimized
              />
            </div>

            <p className="text-sm leading-relaxed text-zinc-700">
              Please pay via GCash, then send proof of payment (screenshot) with your Order ID.
            </p>

            <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
              <Button
                type="button"
                variant="outline"
                className="rounded-full"
                onClick={() => navigator.clipboard.writeText(orderId)}
              >
                Copy Order ID
              </Button>
              <Button type="button" className="rounded-full" onClick={() => resetAndClose(false)}>Done</Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}
