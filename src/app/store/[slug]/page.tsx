import { notFound } from "next/navigation";
import { resolveTenant, buildTenantSheetsConfig } from "@/lib/tenant-middleware";
import { getAllProductsSafe } from "@/lib/sheets";
import { HomeStorefront } from "@/components/home-storefront";
import { Button } from "@/components/ui/button";

export default async function StorePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const tenant = resolveTenant(slug);
  if (!tenant) notFound();

  const config = buildTenantSheetsConfig(tenant);
  const products = await getAllProductsSafe(config);
  const availableCount = products.filter((p) => p.status === "AVAILABLE").length;

  return (
    <main className="min-h-screen bg-gradient-to-b from-amber-50 via-white to-cyan-50">
      <div className="mx-auto max-w-6xl space-y-10 px-4 py-8 sm:px-6 sm:py-10 lg:px-8">
        <section className="relative overflow-hidden rounded-3xl border border-amber-100 bg-white/80 p-8 shadow-xl shadow-amber-100/40 backdrop-blur sm:p-10">
          <div className="absolute -right-20 -top-20 h-56 w-56 rounded-full bg-cyan-200/30 blur-3xl" aria-hidden />
          <div className="absolute -bottom-24 -left-10 h-56 w-56 rounded-full bg-amber-300/20 blur-3xl" aria-hidden />
          <div className="relative">
            <p className="mb-3 inline-flex rounded-full border border-amber-200 bg-amber-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-amber-700">
              {tenant.heroBadge}
            </p>
            <h1 className="max-w-3xl text-4xl font-black leading-tight tracking-tight text-zinc-900 sm:text-5xl">
              {tenant.heroHeadline || `Welcome to ${tenant.storeName}`}
            </h1>
            <p className="mt-4 max-w-2xl text-base leading-relaxed text-zinc-700 sm:text-lg">
              {tenant.shortBio || `Shop trusted items from ${tenant.ownerName}.`}
            </p>
            {tenant.address ? (
              <p className="mt-2 max-w-2xl text-sm text-zinc-600">
                Pickup/Store Address: <span className="font-medium text-zinc-800">{tenant.address}</span>
              </p>
            ) : null}
            <div className="mt-7 flex flex-wrap gap-3">
              <a href="#products"><Button className="rounded-full px-6">View Products</Button></a>
            </div>
            <div className="mt-7 grid max-w-md grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-amber-100 bg-white/80 p-3">
                <p className="text-xl font-bold text-zinc-900">{products.length}</p>
                <p className="text-zinc-600">Total listings</p>
              </div>
              <div className="rounded-xl border border-cyan-100 bg-white/80 p-3">
                <p className="text-xl font-bold text-zinc-900">{availableCount}</p>
                <p className="text-zinc-600">In stock</p>
              </div>
            </div>
          </div>
        </section>

        <section id="products" className="space-y-4">
          <h2 className="text-2xl font-black tracking-tight text-zinc-900 sm:text-3xl">
            {tenant.ownerName}&apos;s Shop
          </h2>
          <p className="max-w-2xl text-sm text-zinc-600 sm:text-base">
            Browse clothing, gadgets, and services. Every listing includes clear pricing and fast ordering.
          </p>
          <HomeStorefront products={products} slug={slug} gcashQrUrl={tenant.gcashQrUrl} />
        </section>
      </div>
    </main>
  );
}
