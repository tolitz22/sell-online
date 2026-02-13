"use client";

import Image from "next/image";
import { useEffect, useMemo, useState } from "react";
import { PaymentStatus } from "@/lib/schemas";
import { SheetOrder } from "@/lib/sheets";
import { Product } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";

type Props = {
  initialOrders: SheetOrder[];
  initialProducts: Product[];
};

type Notice = { type: "success" | "error"; text: string } | null;

const PAGE_SIZE = 10;

function StatusBadge({ status }: { status: PaymentStatus }) {
  const styles = {
    PENDING_PROOF: "border-amber-200 bg-amber-50 text-amber-700",
    PAID: "border-emerald-200 bg-emerald-50 text-emerald-700",
    CANCELLED: "border-red-200 bg-red-50 text-red-700",
  };

  return <Badge className={styles[status]}>{status}</Badge>;
}

function toCsvValue(value: string | number) {
  const text = String(value ?? "");
  if (text.includes(",") || text.includes('"') || text.includes("\n")) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function formatOrderDate(value: string) {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat("en-PH", {
    year: "numeric",
    month: "short",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

export function AdminDashboard({ initialOrders, initialProducts }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [page, setPage] = useState(1);
  const [addLoading, setAddLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    status: "AVAILABLE" as "AVAILABLE" | "SOLD_OUT",
    imageUrl: "",
  });

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  function showNotice(type: "success" | "error", text: string) {
    setNotice({ type, text });
  }

  async function update(orderId: string, paymentStatus: PaymentStatus) {
    setLoadingId(orderId + paymentStatus);
    try {
      const res = await fetch(`/api/orders/${orderId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ paymentStatus }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Update failed");

      setOrders((prev) => prev.map((o) => (o.orderId === orderId ? { ...o, paymentStatus } : o)));
      showNotice("success", `Order ${orderId} updated to ${paymentStatus}.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to update order");
    } finally {
      setLoadingId(null);
    }
  }

  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.reload();
  }

  function resetForm() {
    setForm({ name: "", category: "", price: "", description: "", status: "AVAILABLE", imageUrl: "" });
    setEditingId(null);
  }

  async function uploadImage(file: File) {
    setUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append("file", file);

      const res = await fetch("/api/admin/products/upload", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.imageUrl) throw new Error(data?.error ?? "Upload failed");

      setForm((s) => ({ ...s, imageUrl: data.imageUrl as string }));
      showNotice("success", "Image uploaded.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to upload image");
    } finally {
      setUploadingImage(false);
    }
  }

  async function saveProduct(e: React.FormEvent) {
    e.preventDefault();
    setAddLoading(true);

    try {
      const payload = {
        name: form.name,
        category: form.category,
        price: Number(form.price),
        description: form.description,
        status: form.status,
        imageUrl: form.imageUrl,
      };

      const isEdit = Boolean(editingId);
      const url = isEdit ? `/api/admin/products/${editingId}` : "/api/admin/products";
      const method = isEdit ? "PATCH" : "POST";

      const res = await fetch(url, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.product) {
        throw new Error(data?.error ?? "Failed to save item");
      }

      const nextProduct = data.product as Product;
      setProducts((prev) => {
        if (isEdit) {
          return prev.map((p) => (p.id === nextProduct.id ? nextProduct : p));
        }
        return [nextProduct, ...prev];
      });

      showNotice("success", isEdit ? "Item updated." : "Item added.");
      resetForm();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setForm({
      name: product.name,
      category: product.category,
      price: String(product.price),
      description: product.description,
      status: product.status,
      imageUrl: product.imageUrl ?? "",
    });
  }

  async function toggleProductStatus(product: Product) {
    const nextStatus = product.status === "AVAILABLE" ? "SOLD_OUT" : "AVAILABLE";
    try {
      const res = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.product) {
        throw new Error(data?.error ?? "Failed to update item status");
      }

      const nextProduct = data.product as Product;
      setProducts((prev) => prev.map((p) => (p.id === nextProduct.id ? nextProduct : p)));
      showNotice("success", `Item marked as ${nextStatus}.`);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to update item status");
    }
  }

  async function removeProduct(productId: string) {
    const confirmed = window.confirm("Delete this item?");
    if (!confirmed) return;

    try {
      const res = await fetch(`/api/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Failed to delete item");

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showNotice("success", "Item deleted.");

      if (editingId === productId) {
        resetForm();
      }
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to delete item");
    }
  }

  const filteredOrders = useMemo(() => {
    const q = query.trim().toLowerCase();
    return orders.filter((order) => {
      const statusOk = statusFilter === "ALL" ? true : order.paymentStatus === statusFilter;
      if (!statusOk) return false;
      if (!q) return true;

      return (
        order.orderId.toLowerCase().includes(q) ||
        order.fullName.toLowerCase().includes(q) ||
        order.itemName.toLowerCase().includes(q) ||
        order.email.toLowerCase().includes(q) ||
        order.phone.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page, totalPages]);

  function nextPage() {
    setPage((p) => Math.min(totalPages, p + 1));
  }

  function prevPage() {
    setPage((p) => Math.max(1, p - 1));
  }

  function exportCsv() {
    const header = [
      "timestamp",
      "orderId",
      "itemId",
      "itemName",
      "price",
      "quantity",
      "fullName",
      "email",
      "phone",
      "notes",
      "paymentStatus",
    ];

    const lines = [
      header.join(","),
      ...filteredOrders.map((o) =>
        [
          o.timestamp,
          o.orderId,
          o.itemId,
          o.itemName,
          o.price,
          o.quantity,
          o.fullName,
          o.email,
          o.phone,
          o.notes,
          o.paymentStatus,
        ]
          .map(toCsvValue)
          .join(","),
      ),
    ];

    const blob = new Blob([lines.join("\n")], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    const date = new Date().toISOString().slice(0, 10);
    a.href = url;
    a.download = `orders-${date}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="space-y-4">
      {notice ? (
        <div
          className={
            notice.type === "success"
              ? "rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700"
              : "rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700"
          }
        >
          {notice.text}
        </div>
      ) : null}

      <div className="flex flex-wrap items-center justify-between gap-2">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>Export CSV</Button>
          <Button variant="outline" onClick={logout}>Logout</Button>
        </div>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        <Input
          placeholder="Search order, name, item, email, phone"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="sm:col-span-2"
        />
        <select
          value={statusFilter}
          onChange={(e) => {
            setStatusFilter(e.target.value as "ALL" | PaymentStatus);
            setPage(1);
          }}
          className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
        >
          <option value="ALL">All statuses</option>
          <option value="PENDING_PROOF">PENDING_PROOF</option>
          <option value="PAID">PAID</option>
          <option value="CANCELLED">CANCELLED</option>
        </select>
      </div>

      <div className="rounded-xl border bg-white p-4">
        <h2 className="text-lg font-semibold">{editingId ? "Edit Item" : "Add Item"}</h2>
        <p className="mt-1 text-sm text-zinc-600">Create and manage products saved in your Google Sheets products tab.</p>
        <form className="mt-4 grid gap-2 sm:grid-cols-2" onSubmit={saveProduct}>
          <Input
            placeholder="Item name"
            value={form.name}
            onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
            required
          />
          <Input
            placeholder="Category (e.g. Clothing)"
            value={form.category}
            onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
            required
          />
          <Input
            type="number"
            min={1}
            step="0.01"
            placeholder="Price"
            value={form.price}
            onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
            required
          />
          <select
            value={form.status}
            onChange={(e) => setForm((s) => ({ ...s, status: e.target.value as "AVAILABLE" | "SOLD_OUT" }))}
            className="h-10 rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-zinc-900"
          >
            <option value="AVAILABLE">AVAILABLE</option>
            <option value="SOLD_OUT">SOLD_OUT</option>
          </select>

          <div className="sm:col-span-2">
            <Input
              placeholder="Image URL (optional)"
              value={form.imageUrl}
              onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
            />
          </div>

          <div className="sm:col-span-2 flex flex-wrap items-center gap-2">
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) uploadImage(file);
              }}
              className="max-w-sm"
            />
            <span className="text-xs text-zinc-500">{uploadingImage ? "Uploading image..." : "Upload image file (max 5MB)"}</span>
          </div>

          {form.imageUrl ? (
            <div className="sm:col-span-2">
              <div className="relative h-24 w-24 overflow-hidden rounded-md border">
                <Image src={form.imageUrl} alt="Product preview" fill unoptimized className="object-cover" />
              </div>
            </div>
          ) : null}

          <Input
            className="sm:col-span-2"
            placeholder="Description"
            value={form.description}
            onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
            required
          />

          <div className="sm:col-span-2 flex gap-2">
            <Button disabled={addLoading || uploadingImage}>{addLoading ? "Saving..." : editingId ? "Save Changes" : "Add Item"}</Button>
            {editingId ? (
              <Button type="button" variant="outline" onClick={resetForm}>Cancel Edit</Button>
            ) : null}
          </div>
        </form>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <THead>
            <TR>
              <TH>Image</TH>
              <TH>ID</TH>
              <TH>Name</TH>
              <TH>Category</TH>
              <TH>Price</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {products.map((product) => (
              <TR key={product.id}>
                <TD>
                  {product.imageUrl ? (
                    <div className="relative h-12 w-12 overflow-hidden rounded-md border">
                      <Image src={product.imageUrl} alt={product.name} fill unoptimized className="object-cover" />
                    </div>
                  ) : (
                    <span className="text-xs text-zinc-500">No image</span>
                  )}
                </TD>
                <TD className="font-medium">{product.id}</TD>
                <TD>{product.name}</TD>
                <TD>{product.category}</TD>
                <TD>{formatPrice(product.price)}</TD>
                <TD>
                  <Badge
                    className={
                      product.status === "AVAILABLE"
                        ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                        : "border-zinc-200 bg-zinc-100 text-zinc-700"
                    }
                  >
                    {product.status}
                  </Badge>
                </TD>
                <TD className="space-x-2">
                  <Button type="button" variant="outline" onClick={() => startEdit(product)}>Edit</Button>
                  <Button type="button" variant="secondary" onClick={() => toggleProductStatus(product)}>
                    {product.status === "AVAILABLE" ? "Mark Sold Out" : "Mark Available"}
                  </Button>
                  <Button type="button" variant="destructive" onClick={() => removeProduct(product.id)}>Delete</Button>
                </TD>
              </TR>
            ))}
            {products.length === 0 ? (
              <TR>
                <TD className="py-6 text-center text-zinc-500" colSpan={7}>No products found</TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      <div className="overflow-x-auto rounded-xl border">
        <Table>
          <THead>
            <TR>
              <TH>Date</TH>
              <TH>Order ID</TH>
              <TH>Name</TH>
              <TH>Item</TH>
              <TH>Qty</TH>
              <TH>Status</TH>
              <TH>Actions</TH>
            </TR>
          </THead>
          <TBody>
            {paginatedOrders.map((order) => (
              <TR key={order.orderId}>
                <TD className="whitespace-nowrap">{formatOrderDate(order.timestamp)}</TD>
                <TD className="font-medium">{order.orderId}</TD>
                <TD>{order.fullName}</TD>
                <TD>{order.itemName}</TD>
                <TD>{order.quantity}</TD>
                <TD><StatusBadge status={order.paymentStatus} /></TD>
                <TD className="space-x-2">
                  <Button
                    variant="secondary"
                    disabled={loadingId === order.orderId + "PAID"}
                    onClick={() => update(order.orderId, "PAID")}
                  >
                    Mark as PAID
                  </Button>
                  <Button
                    variant="destructive"
                    disabled={loadingId === order.orderId + "CANCELLED"}
                    onClick={() => update(order.orderId, "CANCELLED")}
                  >
                    Mark as CANCELLED
                  </Button>
                </TD>
              </TR>
            ))}

            {paginatedOrders.length === 0 ? (
              <TR>
                <TD className="py-6 text-center text-zinc-500" colSpan={7}>No orders found</TD>
              </TR>
            ) : null}
          </TBody>
        </Table>
      </div>

      <div className="flex items-center justify-between">
        <p className="text-sm text-zinc-600">
          Showing {paginatedOrders.length} of {filteredOrders.length} filtered orders
        </p>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={prevPage} disabled={page <= 1}>Prev</Button>
          <span className="text-sm">Page {Math.min(page, totalPages)} / {totalPages}</span>
          <Button variant="outline" onClick={nextPage} disabled={page >= totalPages}>Next</Button>
        </div>
      </div>
    </div>
  );
}
