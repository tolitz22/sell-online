import { isSuperAdminAuthenticated } from "@/lib/admin-auth";
import { SuperAdminLogin } from "@/components/super-admin-login";
import {
  SuperAdminDashboard,
  type TenantView,
  type OnboardingRequestView,
} from "@/components/super-admin-dashboard";

export const runtime = "nodejs";

function toTenantView(tenants: Array<{
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
}>): TenantView[] {
  return tenants.map((tenant) => ({
    id: tenant.id,
    slug: tenant.slug,
    storeName: tenant.storeName,
    ownerName: tenant.ownerName,
    heroBadge: tenant.heroBadge,
    heroHeadline: tenant.heroHeadline,
    shortBio: tenant.shortBio,
    cloudinaryFolder: tenant.cloudinaryFolder,
    gcashQrUrl: tenant.gcashQrUrl,
    isActive: tenant.isActive,
    createdAt: tenant.createdAt,
  }));
}

function toOnboardingView(requests: Array<{
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
}>): OnboardingRequestView[] {
  return requests.map((request) => ({
    id: request.id,
    slug: request.slug,
    storeName: request.storeName,
    ownerName: request.ownerName,
    email: request.email,
    phone: request.phone,
    heroHeadline: request.heroHeadline,
    shortBio: request.shortBio,
    expectedProducts: request.expectedProducts,
    notes: request.notes,
    cloudinaryFolder: request.cloudinaryFolder,
    gcashQrUrl: request.gcashQrUrl,
    createdAt: request.createdAt,
  }));
}

export default async function SuperAdminPage() {
  const configured = Boolean(process.env.SUPER_ADMIN_PASSWORD?.trim());
  if (!configured) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <h1 className="text-xl font-bold text-amber-800">Super Admin Not Configured</h1>
          <p className="mt-2 text-sm text-amber-800">
            Set <span className="font-mono">SUPER_ADMIN_PASSWORD</span> in <span className="font-mono">.env.local</span>.
          </p>
        </div>
      </main>
    );
  }

  const authed = await isSuperAdminAuthenticated();
  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <SuperAdminLogin />
      </main>
    );
  }

  try {
    const { getAllTenants, getPendingOnboardingRequests } = await import("@/lib/tenant-db");
    const tenants = getAllTenants();
    const requests = getPendingOnboardingRequests();
    return (
      <main className="mx-auto max-w-6xl px-4 py-10">
        <SuperAdminDashboard initialTenants={toTenantView(tenants)} initialRequests={toOnboardingView(requests)} />
      </main>
    );
  } catch (error) {
    console.error("GET /super-admin error", error);
    return (
      <main className="mx-auto max-w-3xl px-4 py-12">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="text-xl font-bold text-red-800">Super Admin Data Error</h1>
          <p className="mt-2 text-sm text-red-800">
            The server could not load tenant data. Check Netlify function logs and database runtime configuration.
          </p>
        </div>
      </main>
    );
  }
}
