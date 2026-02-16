import Link from "next/link";
import { getActiveTenants } from "@/lib/tenant-db";
import { Card } from "@/components/ui/card";

export default function LandingPage() {
  const tenants = getActiveTenants();

  return (
    <main className="min-h-screen bg-gradient-to-b from-cyan-50 via-white to-amber-50">
      <div className="mx-auto max-w-6xl space-y-8 px-4 py-10 sm:px-6 lg:px-8">
        <section className="rounded-3xl border border-cyan-100 bg-white/90 p-8 shadow-xl shadow-cyan-100/40 sm:p-10">
          <p className="mb-3 inline-flex rounded-full border border-cyan-200 bg-cyan-50 px-3 py-1 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-700">
            Multi-tenant SaaS
          </p>
          <h1 className="max-w-3xl text-4xl font-black tracking-tight text-zinc-900 sm:text-5xl">
            Create and run independent online stores from one platform
          </h1>
          <p className="mt-4 max-w-2xl text-zinc-700">
            Each store has isolated products, orders, branding, and admin access.
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/onboarding" className="rounded-full border border-cyan-300 bg-cyan-50 px-5 py-2 text-sm font-semibold text-cyan-800">
              Apply as Seller
            </Link>
            <Link href="/super-admin" className="rounded-full bg-zinc-900 px-5 py-2 text-sm font-semibold text-white">
              Open Super Admin
            </Link>
          </div>
        </section>

        <section className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-black tracking-tight text-zinc-900">Active Stores</h2>
            <p className="text-sm text-zinc-600">{tenants.length} total</p>
          </div>

          {tenants.length === 0 ? (
            <Card className="rounded-2xl border border-dashed border-zinc-300 p-6 text-sm text-zinc-600">
              No active stores yet. Create one from <Link href="/super-admin" className="font-semibold underline">/super-admin</Link>.
            </Card>
          ) : (
            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {tenants.map((tenant) => (
                <Card key={tenant.id} className="space-y-2 rounded-2xl border-zinc-200 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-zinc-500">{tenant.heroBadge || "Store"}</p>
                  <h3 className="text-lg font-bold text-zinc-900">{tenant.storeName}</h3>
                  <p className="text-sm text-zinc-600">{tenant.shortBio || `Owned by ${tenant.ownerName}`}</p>
                  <Link href={`/store/${tenant.slug}`} className="inline-block pt-1 text-sm font-semibold text-cyan-700 hover:underline">
                    Visit /store/{tenant.slug}
                  </Link>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
