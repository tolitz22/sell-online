"use client";

import { useMemo, useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

export type TenantView = {
  id: string;
  slug: string;
  storeName: string;
  ownerName: string;
  heroBadge: string;
  heroHeadline: string;
  shortBio: string;
  cloudinaryFolder: string;
  gcashQrUrl: string;
  isActive: boolean;
  createdAt: string;
};

export type OnboardingRequestView = {
  id: string;
  slug: string;
  storeName: string;
  ownerName: string;
  email: string;
  phone: string;
  heroHeadline: string;
  shortBio: string;
  expectedProducts: string;
  notes: string;
  cloudinaryFolder: string;
  gcashQrUrl: string;
  createdAt: string;
};

type EditState = {
  slug: string;
  storeName: string;
  ownerName: string;
  heroBadge: string;
  heroHeadline: string;
  shortBio: string;
  cloudinaryFolder: string;
  gcashQrUrl: string;
  adminPassword: string;
  isActive: boolean;
};

type Props = {
  initialTenants: TenantView[];
  initialRequests: OnboardingRequestView[];
};

function toEditState(tenant: TenantView): EditState {
  return {
    slug: tenant.slug,
    storeName: tenant.storeName,
    ownerName: tenant.ownerName,
    heroBadge: tenant.heroBadge,
    heroHeadline: tenant.heroHeadline,
    shortBio: tenant.shortBio,
    cloudinaryFolder: tenant.cloudinaryFolder,
    gcashQrUrl: tenant.gcashQrUrl,
    adminPassword: "",
    isActive: tenant.isActive,
  };
}

export function SuperAdminDashboard({ initialTenants, initialRequests }: Props) {
  const [tenants, setTenants] = useState(initialTenants);
  const [requests, setRequests] = useState(initialRequests);
  const [approvalPasswords, setApprovalPasswords] = useState<Record<string, string>>({});
  const [editing, setEditing] = useState<Record<string, EditState>>(
    Object.fromEntries(initialTenants.map((tenant) => [tenant.id, toEditState(tenant)])),
  );
  const [loading, setLoading] = useState<string | null>(null);
  const [notice, setNotice] = useState<string>("");
  const [error, setError] = useState<string>("");
  const [createForm, setCreateForm] = useState({
    slug: "",
    storeName: "",
    ownerName: "",
    heroBadge: "Online Store",
    heroHeadline: "",
    shortBio: "",
    cloudinaryFolder: "",
    gcashQrUrl: "",
    adminPassword: "",
  });

  const stats = useMemo(() => {
    const total = tenants.length;
    const active = tenants.filter((tenant) => tenant.isActive).length;
    const pending = requests.length;
    return { total, active, inactive: total - active, pending };
  }, [tenants, requests]);

  function setEditField(id: string, key: keyof EditState, value: string | boolean) {
    setEditing((prev) => ({
      ...prev,
      [id]: {
        ...prev[id],
        [key]: value,
      },
    }));
  }

  async function createTenant(e: React.FormEvent) {
    e.preventDefault();
    setNotice("");
    setError("");
    setLoading("create");

    try {
      const res = await fetch("/api/super-admin/tenants", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(createForm),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.tenant) throw new Error(data?.error ?? "Failed to create tenant");

      const tenant = data.tenant as TenantView;
      setTenants((prev) => [tenant, ...prev]);
      setEditing((prev) => ({ ...prev, [tenant.id]: toEditState(tenant) }));
      setCreateForm({
        slug: "",
        storeName: "",
        ownerName: "",
        heroBadge: "Online Store",
        heroHeadline: "",
        shortBio: "",
        cloudinaryFolder: "",
        gcashQrUrl: "",
        adminPassword: "",
      });
      setNotice(`Tenant created: ${tenant.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to create tenant");
    } finally {
      setLoading(null);
    }
  }

  async function saveTenant(id: string) {
    const payload = editing[id];
    if (!payload) return;

    setNotice("");
    setError("");
    setLoading(`save-${id}`);

    try {
      const body: Record<string, string | boolean> = {
        slug: payload.slug,
        storeName: payload.storeName,
        ownerName: payload.ownerName,
        heroBadge: payload.heroBadge,
        heroHeadline: payload.heroHeadline,
        shortBio: payload.shortBio,
        cloudinaryFolder: payload.cloudinaryFolder,
        gcashQrUrl: payload.gcashQrUrl,
        isActive: payload.isActive,
      };

      if (payload.adminPassword.trim()) {
        body.adminPassword = payload.adminPassword;
      }

      const res = await fetch(`/api/super-admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.tenant) throw new Error(data?.error ?? "Failed to update tenant");

      const updated = data.tenant as TenantView;
      setTenants((prev) => prev.map((tenant) => (tenant.id === id ? updated : tenant)));
      setEditing((prev) => ({ ...prev, [id]: toEditState(updated) }));
      setNotice(`Tenant updated: ${updated.slug}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tenant");
    } finally {
      setLoading(null);
    }
  }

  async function toggleActive(id: string, nextActive: boolean) {
    setNotice("");
    setError("");
    setLoading(`toggle-${id}`);

    try {
      const res = await fetch(`/api/super-admin/tenants/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ isActive: nextActive }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.tenant) throw new Error(data?.error ?? "Failed to update tenant");

      const updated = data.tenant as TenantView;
      setTenants((prev) => prev.map((tenant) => (tenant.id === id ? updated : tenant)));
      setEditing((prev) => ({ ...prev, [id]: toEditState(updated) }));
      setNotice(`${updated.slug} is now ${updated.isActive ? "active" : "inactive"}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to update tenant");
    } finally {
      setLoading(null);
    }
  }

  async function approveRequest(id: string) {
    const adminPassword = (approvalPasswords[id] ?? "").trim();
    if (!adminPassword) {
      setError("Admin password is required to approve a request.");
      return;
    }

    setNotice("");
    setError("");
    setLoading(`approve-${id}`);

    try {
      const res = await fetch(`/api/super-admin/onboarding/${id}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ adminPassword }),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.tenant) {
        throw new Error(data?.error ?? "Failed to approve request");
      }

      const tenant = data.tenant as TenantView;
      setTenants((prev) => [tenant, ...prev]);
      setEditing((prev) => ({ ...prev, [tenant.id]: toEditState(tenant) }));
      setRequests((prev) => prev.filter((request) => request.id !== id));
      setApprovalPasswords((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setNotice(`Approved ${tenant.storeName}. Store is live at /store/${tenant.slug}.`);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to approve request");
    } finally {
      setLoading(null);
    }
  }

  async function rejectRequest(id: string) {
    setNotice("");
    setError("");
    setLoading(`reject-${id}`);

    try {
      const res = await fetch(`/api/super-admin/onboarding/${id}/reject`, {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) {
        throw new Error(data?.error ?? "Failed to reject request");
      }

      setRequests((prev) => prev.filter((request) => request.id !== id));
      setApprovalPasswords((prev) => {
        const next = { ...prev };
        delete next[id];
        return next;
      });
      setNotice("Request rejected.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to reject request");
    } finally {
      setLoading(null);
    }
  }

  async function logout() {
    await fetch("/api/super-admin/logout", { method: "POST" });
    window.location.reload();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Super Admin</h1>
          <p className="text-sm text-zinc-600">Create and manage tenants.</p>
        </div>
        <Button variant="outline" onClick={logout}>Logout</Button>
      </div>

      {notice ? <p className="rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700">{notice}</p> : null}
      {error ? <p className="rounded-md border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{error}</p> : null}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <Card className="p-4"><p className="text-xs uppercase text-zinc-500">Total</p><p className="text-2xl font-semibold">{stats.total}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-zinc-500">Active</p><p className="text-2xl font-semibold">{stats.active}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-zinc-500">Inactive</p><p className="text-2xl font-semibold">{stats.inactive}</p></Card>
        <Card className="p-4"><p className="text-xs uppercase text-zinc-500">Pending Onboarding</p><p className="text-2xl font-semibold">{stats.pending}</p></Card>
      </div>

      <Card className="space-y-4 border-cyan-100 bg-gradient-to-br from-cyan-50/70 via-white to-amber-50/70 p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-semibold">Onboarding Queue</h2>
          <p className="text-sm text-zinc-600">{requests.length} pending</p>
        </div>

        {requests.length === 0 ? (
          <p className="text-sm text-zinc-600">No pending requests right now.</p>
        ) : (
          <div className="space-y-3">
            {requests.map((request) => (
              <Card key={request.id} className="space-y-3 border-zinc-200 p-4">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div>
                    <h3 className="text-lg font-semibold">{request.storeName}</h3>
                    <p className="text-sm text-zinc-600">Requested slug: /store/{request.slug}</p>
                  </div>
                  <p className="text-xs text-zinc-500">{new Date(request.createdAt).toLocaleString()}</p>
                </div>

                <div className="grid gap-2 text-sm md:grid-cols-2">
                  <p><span className="font-semibold">Owner:</span> {request.ownerName}</p>
                  <p><span className="font-semibold">Email:</span> {request.email}</p>
                  <p><span className="font-semibold">Phone:</span> {request.phone}</p>
                  <p><span className="font-semibold">Products:</span> {request.expectedProducts || "-"}</p>
                </div>
                {request.shortBio ? <p className="text-sm text-zinc-700">{request.shortBio}</p> : null}
                {request.notes ? <p className="text-sm text-zinc-600">Notes: {request.notes}</p> : null}
                {request.gcashQrUrl ? (
                  <div className="rounded-lg border bg-white p-2">
                    <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-zinc-500">GCash QR</p>
                    <Image
                      src={request.gcashQrUrl}
                      alt="Applicant GCash QR"
                      width={160}
                      height={160}
                      className="h-40 w-40 rounded-md object-cover"
                      unoptimized
                    />
                  </div>
                ) : null}

                <div className="grid gap-2 md:grid-cols-[1fr_auto_auto]">
                  <Input
                    type="password"
                    placeholder="Set tenant admin password"
                    value={approvalPasswords[request.id] ?? ""}
                    onChange={(e) =>
                      setApprovalPasswords((prev) => ({ ...prev, [request.id]: e.target.value }))
                    }
                  />
                  <Button
                    onClick={() => approveRequest(request.id)}
                    disabled={loading === `approve-${request.id}` || loading === `reject-${request.id}`}
                  >
                    {loading === `approve-${request.id}` ? "Approving..." : "Approve"}
                  </Button>
                  <Button
                    variant="outline"
                    onClick={() => rejectRequest(request.id)}
                    disabled={loading === `approve-${request.id}` || loading === `reject-${request.id}`}
                  >
                    {loading === `reject-${request.id}` ? "Rejecting..." : "Reject"}
                  </Button>
                </div>
              </Card>
            ))}
          </div>
        )}
      </Card>

      <Card className="space-y-3 p-4">
        <h2 className="text-lg font-semibold">Create Tenant</h2>
        <form onSubmit={createTenant} className="grid gap-3 md:grid-cols-2">
          <Input placeholder="slug (e.g. angel-store)" value={createForm.slug} onChange={(e) => setCreateForm((s) => ({ ...s, slug: e.target.value }))} required />
          <Input placeholder="Store name" value={createForm.storeName} onChange={(e) => setCreateForm((s) => ({ ...s, storeName: e.target.value }))} required />
          <Input placeholder="Owner name" value={createForm.ownerName} onChange={(e) => setCreateForm((s) => ({ ...s, ownerName: e.target.value }))} required />
          <Input placeholder="Admin password" type="password" value={createForm.adminPassword} onChange={(e) => setCreateForm((s) => ({ ...s, adminPassword: e.target.value }))} required />
          <Input placeholder="Hero badge" value={createForm.heroBadge} onChange={(e) => setCreateForm((s) => ({ ...s, heroBadge: e.target.value }))} />
          <Input placeholder="Cloudinary folder (optional)" value={createForm.cloudinaryFolder} onChange={(e) => setCreateForm((s) => ({ ...s, cloudinaryFolder: e.target.value }))} />
          <Input placeholder="GCash QR URL (optional)" value={createForm.gcashQrUrl} onChange={(e) => setCreateForm((s) => ({ ...s, gcashQrUrl: e.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Hero headline" value={createForm.heroHeadline} onChange={(e) => setCreateForm((s) => ({ ...s, heroHeadline: e.target.value }))} />
          <Textarea className="md:col-span-2" placeholder="Short bio" value={createForm.shortBio} onChange={(e) => setCreateForm((s) => ({ ...s, shortBio: e.target.value }))} />
          <div className="md:col-span-2">
            <Button type="submit" disabled={loading === "create"}>{loading === "create" ? "Creating..." : "Create Tenant"}</Button>
          </div>
        </form>
      </Card>

      <div className="space-y-3">
        {tenants.map((tenant) => {
          const edit = editing[tenant.id];
          return (
            <Card key={tenant.id} className="space-y-3 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div>
                  <h3 className="text-lg font-semibold">{tenant.storeName}</h3>
                  <p className="text-sm text-zinc-600">/store/{tenant.slug}</p>
                </div>
                <p className={tenant.isActive ? "text-sm font-semibold text-emerald-700" : "text-sm font-semibold text-amber-700"}>
                  {tenant.isActive ? "ACTIVE" : "INACTIVE"}
                </p>
              </div>

              <div className="grid gap-2 md:grid-cols-2">
                <Input value={edit?.slug ?? ""} onChange={(e) => setEditField(tenant.id, "slug", e.target.value)} />
                <Input value={edit?.storeName ?? ""} onChange={(e) => setEditField(tenant.id, "storeName", e.target.value)} />
                <Input value={edit?.ownerName ?? ""} onChange={(e) => setEditField(tenant.id, "ownerName", e.target.value)} />
                <Input value={edit?.heroBadge ?? ""} onChange={(e) => setEditField(tenant.id, "heroBadge", e.target.value)} />
                <Input value={edit?.cloudinaryFolder ?? ""} onChange={(e) => setEditField(tenant.id, "cloudinaryFolder", e.target.value)} />
                <Input value={edit?.gcashQrUrl ?? ""} onChange={(e) => setEditField(tenant.id, "gcashQrUrl", e.target.value)} />
                <Input type="password" placeholder="Set new admin password (optional)" value={edit?.adminPassword ?? ""} onChange={(e) => setEditField(tenant.id, "adminPassword", e.target.value)} />
                <Textarea className="md:col-span-2" value={edit?.heroHeadline ?? ""} onChange={(e) => setEditField(tenant.id, "heroHeadline", e.target.value)} />
                <Textarea className="md:col-span-2" value={edit?.shortBio ?? ""} onChange={(e) => setEditField(tenant.id, "shortBio", e.target.value)} />
              </div>

              <div className="flex flex-wrap gap-2">
                <Button onClick={() => saveTenant(tenant.id)} disabled={loading === `save-${tenant.id}` || loading === `toggle-${tenant.id}`}>
                  {loading === `save-${tenant.id}` ? "Saving..." : "Save"}
                </Button>
                <Button
                  variant="outline"
                  onClick={() => toggleActive(tenant.id, !tenant.isActive)}
                  disabled={loading === `save-${tenant.id}` || loading === `toggle-${tenant.id}`}
                >
                  {loading === `toggle-${tenant.id}` ? "Updating..." : tenant.isActive ? "Deactivate" : "Activate"}
                </Button>
              </div>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
