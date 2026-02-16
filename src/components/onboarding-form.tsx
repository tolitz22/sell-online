"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";

const initialForm = {
  storeName: "",
  ownerName: "",
  email: "",
  phone: "",
  heroHeadline: "",
  shortBio: "",
  expectedProducts: "",
  notes: "",
  gcashQrUrl: "",
};

export function OnboardingForm() {
  const [form, setForm] = useState(initialForm);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successId, setSuccessId] = useState("");
  const [uploadingQr, setUploadingQr] = useState(false);

  const slugPreview = form.storeName
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9-]/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-+|-+$/g, "");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setError("");
    setSuccessId("");
    setLoading(true);

    try {
      if (!form.gcashQrUrl) {
        throw new Error("Please upload your GCash QR code before submitting.");
      }

      const res = await fetch("/api/onboarding", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (!res.ok || !data?.ok) throw new Error(data?.error ?? "Failed to submit");

      setSuccessId(data.requestId as string);
      setForm(initialForm);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to submit onboarding request");
    } finally {
      setLoading(false);
    }
  }

  async function uploadQr(file: File) {
    setError("");
    setUploadingQr(true);
    try {
      const payload = new FormData();
      payload.append("file", file);
      const res = await fetch("/api/onboarding/upload-qr", {
        method: "POST",
        body: payload,
      });
      const data = await res.json();
      if (!res.ok || !data?.ok || !data?.imageUrl) {
        throw new Error(data?.error ?? "Failed to upload QR");
      }
      setForm((s) => ({ ...s, gcashQrUrl: String(data.imageUrl) }));
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload QR");
    } finally {
      setUploadingQr(false);
    }
  }

  return (
    <Card className="rounded-3xl border border-cyan-100 bg-white/90 p-6 shadow-xl shadow-cyan-100/30 sm:p-8">
      <div className="mb-6">
        <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">Store Onboarding</h2>
        <p className="mt-2 text-sm text-zinc-600">
          Submit your details. We review and approve your store before it goes live.
        </p>
      </div>

      {successId ? (
        <div className="mb-4 rounded-xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-800">
          Request submitted. Reference ID: <span className="font-mono font-semibold">{successId}</span>
        </div>
      ) : null}
      {error ? (
        <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-4 text-sm text-red-700">{error}</div>
      ) : null}

      <form onSubmit={submit} className="grid gap-4 md:grid-cols-2">
        <Input
          placeholder="Store name"
          value={form.storeName}
          onChange={(e) => setForm((s) => ({ ...s, storeName: e.target.value }))}
          required
        />
        <Input
          placeholder="Owner full name"
          value={form.ownerName}
          onChange={(e) => setForm((s) => ({ ...s, ownerName: e.target.value }))}
          required
        />
        <Input
          type="email"
          placeholder="Email address"
          value={form.email}
          onChange={(e) => setForm((s) => ({ ...s, email: e.target.value }))}
          required
        />
        <Input
          placeholder="Phone number"
          value={form.phone}
          onChange={(e) => setForm((s) => ({ ...s, phone: e.target.value }))}
          required
        />
        <Input value={slugPreview ? `/store/${slugPreview}` : "/store/..."} readOnly className="bg-zinc-50 text-zinc-700" />
        <Textarea
          className="md:col-span-2"
          placeholder="Hero headline (optional)"
          value={form.heroHeadline}
          onChange={(e) => setForm((s) => ({ ...s, heroHeadline: e.target.value }))}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Short bio of your store"
          value={form.shortBio}
          onChange={(e) => setForm((s) => ({ ...s, shortBio: e.target.value }))}
        />
        <Input
          className="md:col-span-2"
          placeholder="Expected products (e.g. shirts, shoes, accessories)"
          value={form.expectedProducts}
          onChange={(e) => setForm((s) => ({ ...s, expectedProducts: e.target.value }))}
        />
        <Textarea
          className="md:col-span-2"
          placeholder="Anything we should know before approval?"
          value={form.notes}
          onChange={(e) => setForm((s) => ({ ...s, notes: e.target.value }))}
        />
        <div className="space-y-2 md:col-span-2">
          <label className="text-sm font-medium text-zinc-800">GCash QR Code</label>
          <Input
            type="file"
            accept="image/*"
            onChange={(e) => {
              const file = e.target.files?.[0];
              if (file) uploadQr(file);
            }}
          />
          <p className="text-xs text-zinc-500">
            {uploadingQr ? "Uploading QR..." : "Upload a clear QR image (max 5MB)."}
          </p>
          {form.gcashQrUrl ? (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 p-3">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-emerald-800">Uploaded QR</p>
              <Image
                src={form.gcashQrUrl}
                alt="Uploaded GCash QR"
                width={176}
                height={176}
                className="h-44 w-44 rounded-md border object-cover"
                unoptimized
              />
            </div>
          ) : null}
        </div>
        <div className="md:col-span-2">
          <Button type="submit" className="rounded-full px-6" disabled={loading || uploadingQr}>
            {loading ? "Submitting..." : "Submit For Review"}
          </Button>
        </div>
      </form>
    </Card>
  );
}
