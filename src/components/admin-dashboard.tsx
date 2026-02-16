
"use client";

import Image from "next/image";
import { useEffect, useMemo, useRef, useState } from "react";
import {
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  Download,
  LogOut,
  MoreHorizontal,
  Package,
  Plus,
  ShoppingCart,
} from "lucide-react";
import { PaymentStatus } from "@/lib/schemas";
import { SheetOrder } from "@/lib/sheets";
import { Product } from "@/lib/products";
import { formatPrice } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Table, TBody, TD, TH, THead, TR } from "@/components/ui/table";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Textarea } from "@/components/ui/textarea";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

type Props = {
  slug: string;
  initialProfile: {
    shortBio: string;
    gcashQrUrl: string;
    address: string;
  };
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

export function AdminDashboard({ slug, initialProfile, initialOrders, initialProducts }: Props) {
  const [orders, setOrders] = useState(initialOrders);
  const [products, setProducts] = useState(initialProducts);
  const [loadingId, setLoadingId] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"ALL" | PaymentStatus>("ALL");
  const [page, setPage] = useState(1);
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [productCategoryFilter, setProductCategoryFilter] = useState<string>("ALL");
  const [productStatusFilter, setProductStatusFilter] = useState<"ALL" | "AVAILABLE" | "SOLD_OUT">("ALL");
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState<Product | null>(null);
  const [addLoading, setAddLoading] = useState(false);
  const [uploadingImage, setUploadingImage] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [notice, setNotice] = useState<Notice>(null);
  const [profileSaving, setProfileSaving] = useState(false);
  const [profileUploadingQr, setProfileUploadingQr] = useState(false);
  const [profileForm, setProfileForm] = useState({
    shortBio: initialProfile.shortBio ?? "",
    gcashQrUrl: initialProfile.gcashQrUrl ?? "",
    address: initialProfile.address ?? "",
  });
  const [form, setForm] = useState({
    name: "",
    category: "",
    price: "",
    description: "",
    status: "AVAILABLE" as "AVAILABLE" | "SOLD_OUT",
    imageUrl: "",
  });
  const editTargetRef = useRef<string>("__new__");

  useEffect(() => {
    editTargetRef.current = editingId ?? "__new__";
  }, [editingId]);

  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(null), 3000);
    return () => clearTimeout(timer);
  }, [notice]);

  useEffect(() => {
    setSelectedOrderIds((prev) => prev.filter((id) => orders.some((order) => order.orderId === id)));
  }, [orders]);

  function showNotice(type: "success" | "error", text: string) {
    setNotice({ type, text });
  }

  async function update(orderId: string, paymentStatus: PaymentStatus) {
    setLoadingId(orderId + paymentStatus);
    try {
      const res = await fetch(`/api/store/${slug}/orders/${orderId}`, {
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
    await fetch(`/api/store/${slug}/admin/logout`, { method: "POST" });
    window.location.reload();
  }

  async function saveProfile(e: React.FormEvent) {
    e.preventDefault();
    setProfileSaving(true);
    try {
      const res = await fetch(`/api/store/${slug}/admin/profile`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(profileForm),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.profile) throw new Error(data?.error ?? "Failed to save profile");
      setProfileForm({
        shortBio: String(data.profile.shortBio ?? ""),
        gcashQrUrl: String(data.profile.gcashQrUrl ?? ""),
        address: String(data.profile.address ?? ""),
      });
      showNotice("success", "Store profile updated.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to save profile");
    } finally {
      setProfileSaving(false);
    }
  }

  async function uploadProfileQr(file: File) {
    setProfileUploadingQr(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await fetch(`/api/store/${slug}/admin/profile/upload-qr`, {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.imageUrl) throw new Error(data?.error ?? "QR upload failed");
      setProfileForm((prev) => ({ ...prev, gcashQrUrl: String(data.imageUrl) }));
      showNotice("success", "QR uploaded.");
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to upload QR");
    } finally {
      setProfileUploadingQr(false);
    }
  }

  function resetForm() {
    setForm({ name: "", category: "", price: "", description: "", status: "AVAILABLE", imageUrl: "" });
    setEditingId(null);
  }

  async function uploadImage(file: File) {
    const targetAtUploadStart = editingId ?? "__new__";
    setUploadingImage(true);
    try {
      const payload = new FormData();
      payload.append("file", file);

      const res = await fetch(`/api/store/${slug}/admin/products/upload`, {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.imageUrl) throw new Error(data?.error ?? "Upload failed");

      if (editTargetRef.current !== targetAtUploadStart) {
        showNotice("error", "Upload finished for a different edit session. Please upload again.");
        return;
      }

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
    if (!form.name.trim() || !form.category.trim() || !form.description.trim() || !form.price.trim()) {
      showNotice("error", "Please complete all required fields.");
      return;
    }
    if (!Number.isFinite(Number(form.price)) || Number(form.price) <= 0) {
      showNotice("error", "Price must be greater than 0.");
      return;
    }

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
      const url = isEdit
        ? `/api/store/${slug}/admin/products/${editingId}`
        : `/api/store/${slug}/admin/products`;
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
      setSheetOpen(false);
      resetForm();
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to save item");
    } finally {
      setAddLoading(false);
    }
  }

  function startEdit(product: Product) {
    setEditingId(product.id);
    setSheetOpen(true);
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
      const res = await fetch(`/api/store/${slug}/admin/products/${product.id}`, {
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
    try {
      const res = await fetch(`/api/store/${slug}/admin/products/${productId}`, { method: "DELETE" });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Failed to delete item");

      setProducts((prev) => prev.filter((p) => p.id !== productId));
      showNotice("success", "Item deleted.");
      setDeleteTarget(null);

      if (editingId === productId) {
        resetForm();
        setSheetOpen(false);
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
        order.phone.toLowerCase().includes(q) ||
        order.address.toLowerCase().includes(q)
      );
    });
  }, [orders, query, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / PAGE_SIZE));

  useEffect(() => {
    setPage((p) => Math.min(p, totalPages));
  }, [totalPages]);

  const paginatedOrders = useMemo(() => {
    const safePage = Math.min(page, totalPages);
    const start = (safePage - 1) * PAGE_SIZE;
    return filteredOrders.slice(start, start + PAGE_SIZE);
  }, [filteredOrders, page, totalPages]);

  const productCategories = useMemo(() => {
    return Array.from(new Set(products.map((product) => product.category))).sort((a, b) =>
      a.localeCompare(b, undefined, { sensitivity: "base" }),
    );
  }, [products]);

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    return products.filter((product) => {
      const queryOk =
        !q ||
        product.id.toLowerCase().includes(q) ||
        product.name.toLowerCase().includes(q) ||
        product.category.toLowerCase().includes(q);
      const categoryOk = productCategoryFilter === "ALL" || product.category === productCategoryFilter;
      const statusOk = productStatusFilter === "ALL" || product.status === productStatusFilter;
      return queryOk && categoryOk && statusOk;
    });
  }, [products, productQuery, productCategoryFilter, productStatusFilter]);

  const summaryCounts = useMemo(() => {
    const today = new Date().toDateString();
    const pending = orders.filter((order) => order.paymentStatus === "PENDING_PROOF").length;
    const paid = orders.filter((order) => order.paymentStatus === "PAID").length;
    const cancelled = orders.filter((order) => order.paymentStatus === "CANCELLED").length;
    const todayOrders = orders.filter((order) => {
      const date = new Date(order.timestamp);
      if (Number.isNaN(date.getTime())) return false;
      return date.toDateString() === today;
    }).length;
    return { pending, paid, cancelled, todayOrders };
  }, [orders]);

  const allOnPageSelected =
    paginatedOrders.length > 0 && paginatedOrders.every((order) => selectedOrderIds.includes(order.orderId));
  const someOnPageSelected = paginatedOrders.some((order) => selectedOrderIds.includes(order.orderId));

  function toggleSelectOrder(orderId: string, checked: boolean) {
    setSelectedOrderIds((prev) => {
      if (checked) {
        if (prev.includes(orderId)) return prev;
        return [...prev, orderId];
      }
      return prev.filter((id) => id !== orderId);
    });
  }

  function toggleSelectPage(checked: boolean) {
    const pageIds = paginatedOrders.map((order) => order.orderId);
    setSelectedOrderIds((prev) => {
      if (checked) {
        return Array.from(new Set([...prev, ...pageIds]));
      }
      return prev.filter((id) => !pageIds.includes(id));
    });
  }

  async function bulkUpdate(paymentStatus: PaymentStatus) {
    if (selectedOrderIds.length === 0) return;

    const targetIds = [...selectedOrderIds];
    setLoadingId(`bulk-${paymentStatus}`);
    try {
      for (const orderId of targetIds) {
        const res = await fetch(`/api/store/${slug}/orders/${orderId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ paymentStatus }),
        });
        const data = await res.json();
        if (!res.ok || !data?.ok) throw new Error(data?.error ?? `Failed to update ${orderId}`);
      }

      setOrders((prev) =>
        prev.map((order) => (targetIds.includes(order.orderId) ? { ...order, paymentStatus } : order)),
      );
      showNotice("success", `${targetIds.length} order(s) updated to ${paymentStatus}.`);
      setSelectedOrderIds([]);
    } catch (err) {
      showNotice("error", err instanceof Error ? err.message : "Failed to run bulk update");
    } finally {
      setLoadingId(null);
    }
  }

  function startAddProduct() {
    resetForm();
    setSheetOpen(true);
  }

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
      "address",
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
          o.address,
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

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Admin Dashboard</h1>
          <p className="text-sm text-zinc-600">Manage orders and products synced to Google Sheets.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={exportCsv}>
            <Download className="mr-2 h-4 w-4" />
            Export CSV
          </Button>
          <Button variant="outline" onClick={logout}>
            <LogOut className="mr-2 h-4 w-4" />
            Logout
          </Button>
        </div>
      </div>

      <div className="grid gap-2 md:grid-cols-3">
        <Input
          placeholder="Search order ID, customer, item, email, phone"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setPage(1);
          }}
          className="md:col-span-1"
        />
        <Select
          value={statusFilter}
          onValueChange={(value) => {
            setStatusFilter(value as "ALL" | PaymentStatus);
            setPage(1);
          }}
        >
          <SelectTrigger>
            <SelectValue placeholder="All statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="ALL">All statuses</SelectItem>
            <SelectItem value="PENDING_PROOF">PENDING_PROOF</SelectItem>
            <SelectItem value="PAID">PAID</SelectItem>
            <SelectItem value="CANCELLED">CANCELLED</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex h-10 items-center rounded-md border border-dashed border-zinc-300 px-3 text-sm text-zinc-500">
          <CalendarDays className="mr-2 h-4 w-4" />
          Date range filter (coming soon)
        </div>
      </div>

      <Tabs defaultValue="orders" className="space-y-4">
        <TabsList>
          <TabsTrigger value="orders">
            <ShoppingCart className="mr-2 h-4 w-4" />
            Orders
          </TabsTrigger>
          <TabsTrigger value="products">
            <Package className="mr-2 h-4 w-4" />
            Products
          </TabsTrigger>
          <TabsTrigger value="store-profile">
            Store Profile
          </TabsTrigger>
        </TabsList>

        <TabsContent value="orders" className="space-y-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Pending</p>
              <p className="mt-1 text-2xl font-semibold">{summaryCounts.pending}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Paid</p>
              <p className="mt-1 text-2xl font-semibold">{summaryCounts.paid}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Cancelled</p>
              <p className="mt-1 text-2xl font-semibold">{summaryCounts.cancelled}</p>
            </Card>
            <Card className="p-4">
              <p className="text-xs uppercase tracking-wide text-zinc-500">Today&apos;s Orders</p>
              <p className="mt-1 text-2xl font-semibold">{summaryCounts.todayOrders}</p>
            </Card>
          </div>

          {selectedOrderIds.length > 0 ? (
            <div className="flex flex-wrap items-center gap-2 rounded-lg border border-zinc-200 bg-zinc-50 p-3">
              <p className="text-sm font-medium">{selectedOrderIds.length} selected</p>
              <Separator orientation="vertical" className="hidden h-5 sm:block" />
              <Button
                variant="secondary"
                onClick={() => bulkUpdate("PAID")}
                disabled={loadingId === "bulk-PAID" || loadingId === "bulk-CANCELLED"}
              >
                Mark Paid
              </Button>
              <Button
                variant="destructive"
                onClick={() => bulkUpdate("CANCELLED")}
                disabled={loadingId === "bulk-PAID" || loadingId === "bulk-CANCELLED"}
              >
                Cancel
              </Button>
            </div>
          ) : null}

          <div className="overflow-x-auto rounded-xl border">
            <Table>
              <THead>
                <TR>
                  <TH className="w-12">
                    <Checkbox
                      checked={allOnPageSelected ? true : someOnPageSelected ? "indeterminate" : false}
                      onCheckedChange={(checked) => toggleSelectPage(Boolean(checked))}
                      aria-label="Select all orders on page"
                    />
                  </TH>
                  <TH>Date</TH>
                  <TH>Order ID</TH>
                  <TH>Customer</TH>
                  <TH>Item</TH>
                  <TH>Qty</TH>
                  <TH>Status</TH>
                  <TH className="w-16">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {paginatedOrders.map((order) => (
                  <TR key={order.orderId}>
                    <TD>
                      <Checkbox
                        checked={selectedOrderIds.includes(order.orderId)}
                        onCheckedChange={(checked) => toggleSelectOrder(order.orderId, Boolean(checked))}
                        aria-label={`Select order ${order.orderId}`}
                      />
                    </TD>
                    <TD className="whitespace-nowrap">{formatOrderDate(order.timestamp)}</TD>
                    <TD className="font-medium">{order.orderId}</TD>
                    <TD>
                      <p className="font-medium">{order.fullName}</p>
                      <p className="text-xs text-zinc-500">{order.email}</p>
                    </TD>
                    <TD>{order.itemName}</TD>
                    <TD>{order.quantity}</TD>
                    <TD>
                      <StatusBadge status={order.paymentStatus} />
                    </TD>
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-8 w-8 p-0" aria-label="Open actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => window.open(`/store/${slug}/order/${order.orderId}`, "_blank")}>
                            View
                          </DropdownMenuItem>
                          <DropdownMenuItem
                            onSelect={() => update(order.orderId, "PAID")}
                            disabled={loadingId === order.orderId + "PAID"}
                          >
                            Mark Paid
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => update(order.orderId, "CANCELLED")}
                            className="text-red-600 focus:text-red-600"
                            disabled={loadingId === order.orderId + "CANCELLED"}
                          >
                            Cancel
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}

                {paginatedOrders.length === 0 ? (
                  <TR>
                    <TD className="py-6 text-center text-zinc-500" colSpan={8}>
                      No orders found
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-sm text-zinc-600">
              Showing {paginatedOrders.length} of {filteredOrders.length} filtered orders
            </p>
            <div className="flex items-center gap-2">
              <Button variant="outline" onClick={prevPage} disabled={page <= 1}>
                <ChevronLeft className="mr-1 h-4 w-4" />
                Prev
              </Button>
              <span className="text-sm">
                Page {Math.min(page, totalPages)} / {totalPages}
              </span>
              <Button variant="outline" onClick={nextPage} disabled={page >= totalPages}>
                Next
                <ChevronRight className="ml-1 h-4 w-4" />
              </Button>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="products" className="space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <Input
              placeholder="Search product ID, name, category"
              value={productQuery}
              onChange={(e) => setProductQuery(e.target.value)}
              className="min-w-64 flex-1"
            />
            <Select value={productCategoryFilter} onValueChange={setProductCategoryFilter}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Category" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All categories</SelectItem>
                {productCategories.map((category) => (
                  <SelectItem key={category} value={category}>
                    {category}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <Select
              value={productStatusFilter}
              onValueChange={(value) => setProductStatusFilter(value as "ALL" | "AVAILABLE" | "SOLD_OUT")}
            >
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All status</SelectItem>
                <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                <SelectItem value="SOLD_OUT">SOLD_OUT</SelectItem>
              </SelectContent>
            </Select>
            <Button onClick={startAddProduct}>
              <Plus className="mr-2 h-4 w-4" />
              Add Product
            </Button>
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
                  <TH className="w-16">Actions</TH>
                </TR>
              </THead>
              <TBody>
                {filteredProducts.map((product) => (
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
                    <TD>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="h-8 w-8 p-0" aria-label="Open product actions">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onSelect={() => startEdit(product)}>Edit</DropdownMenuItem>
                          <DropdownMenuItem onSelect={() => toggleProductStatus(product)}>
                            {product.status === "AVAILABLE" ? "Mark Sold Out" : "Mark Available"}
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onSelect={() => setDeleteTarget(product)}
                            className="text-red-600 focus:text-red-600"
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TD>
                  </TR>
                ))}
                {filteredProducts.length === 0 ? (
                  <TR>
                    <TD className="py-6 text-center text-zinc-500" colSpan={7}>
                      No products found
                    </TD>
                  </TR>
                ) : null}
              </TBody>
            </Table>
          </div>
        </TabsContent>
        <TabsContent value="store-profile" className="space-y-4">
          <Card className="space-y-4 p-5">
            <div>
              <h2 className="text-lg font-semibold">Store Profile</h2>
              <p className="text-sm text-zinc-600">Update storefront bio, GCash QR, and delivery address.</p>
            </div>
            <form className="space-y-4" onSubmit={saveProfile}>
              <div className="space-y-2">
                <label className="text-sm font-medium">Short Bio</label>
                <Textarea
                  placeholder="Describe your store"
                  value={profileForm.shortBio}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, shortBio: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Store Address</label>
                <Textarea
                  placeholder="Address for pickups/delivery reference"
                  value={profileForm.address}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, address: e.target.value }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">GCash QR URL</label>
                <Input
                  placeholder="https://..."
                  value={profileForm.gcashQrUrl}
                  onChange={(e) => setProfileForm((prev) => ({ ...prev, gcashQrUrl: e.target.value }))}
                />
                <Input
                  type="file"
                  accept="image/*"
                  onChange={(e) => {
                    const file = e.target.files?.[0];
                    if (file) uploadProfileQr(file);
                  }}
                />
                <p className="text-xs text-zinc-500">
                  {profileUploadingQr ? "Uploading QR..." : "Upload QR image (max 5MB)."}
                </p>
                {profileForm.gcashQrUrl ? (
                  <div className="relative h-44 w-44 overflow-hidden rounded-md border">
                    <Image src={profileForm.gcashQrUrl} alt="Store GCash QR" fill unoptimized className="object-cover" />
                  </div>
                ) : null}
              </div>
              <div>
                <Button type="submit" disabled={profileSaving || profileUploadingQr}>
                  {profileSaving ? "Saving..." : "Save Profile"}
                </Button>
              </div>
            </form>
          </Card>
        </TabsContent>
      </Tabs>

      <Sheet open={sheetOpen} onOpenChange={setSheetOpen}>
        <SheetContent side="right" className="overflow-y-auto">
          <SheetHeader>
            <SheetTitle>{editingId ? "Edit Product" : "Add Product"}</SheetTitle>
            <SheetDescription>Changes are saved to your Google Sheets products tab.</SheetDescription>
          </SheetHeader>
          <form className="mt-6 space-y-3" onSubmit={saveProduct}>
            <div className="space-y-2">
              <label className="text-sm font-medium">Name</label>
              <Input
                placeholder="Item name"
                value={form.name}
                onChange={(e) => setForm((s) => ({ ...s, name: e.target.value }))}
                required
              />
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Category</label>
              <Input
                placeholder="Category (e.g. Clothing)"
                value={form.category}
                onChange={(e) => setForm((s) => ({ ...s, category: e.target.value }))}
                required
              />
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium">Price</label>
                <Input
                  type="number"
                  min={1}
                  step="0.01"
                  placeholder="Price"
                  value={form.price}
                  onChange={(e) => setForm((s) => ({ ...s, price: e.target.value }))}
                  required
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Status</label>
                <Select
                  value={form.status}
                  onValueChange={(value) => setForm((s) => ({ ...s, status: value as "AVAILABLE" | "SOLD_OUT" }))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="AVAILABLE">AVAILABLE</SelectItem>
                    <SelectItem value="SOLD_OUT">SOLD_OUT</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Image URL</label>
              <Input
                placeholder="https://..."
                value={form.imageUrl}
                onChange={(e) => setForm((s) => ({ ...s, imageUrl: e.target.value }))}
              />
              <p className="truncate text-xs text-zinc-500">Current: {form.imageUrl || "none"}</p>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Upload image</label>
              <Input
                type="file"
                accept="image/*"
                onChange={(e) => {
                  const file = e.target.files?.[0];
                  if (file) uploadImage(file);
                }}
              />
              <p className="text-xs text-zinc-500">{uploadingImage ? "Uploading image..." : "Upload image file (max 5MB)."}</p>
            </div>
            {form.imageUrl ? (
              <div className="space-y-2">
                <label className="text-sm font-medium">Preview</label>
                <div className="relative h-28 w-28 overflow-hidden rounded-md border">
                  <Image src={form.imageUrl} alt="Product preview" fill unoptimized className="object-cover" />
                </div>
              </div>
            ) : null}
            <div className="space-y-2">
              <label className="text-sm font-medium">Description</label>
              <Textarea
                placeholder="Product description"
                value={form.description}
                onChange={(e) => setForm((s) => ({ ...s, description: e.target.value }))}
                required
              />
            </div>
            <SheetFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setSheetOpen(false)}>
                Close
              </Button>
              <Button type="submit" disabled={addLoading || uploadingImage}>
                {addLoading ? "Saving..." : editingId ? "Save Changes" : "Add Product"}
              </Button>
            </SheetFooter>
          </form>
        </SheetContent>
      </Sheet>

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete this product?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently remove <span className="font-medium">{deleteTarget?.name}</span> from your catalog.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => deleteTarget && removeProduct(deleteTarget.id)}>Delete</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
