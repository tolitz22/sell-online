import { notFound } from "next/navigation";
import { resolveTenant, buildTenantSheetsConfig } from "@/lib/tenant-middleware";
import type { Metadata } from "next";

type LayoutProps = {
  children: React.ReactNode;
  params: Promise<{ slug: string }>;
};

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const tenant = resolveTenant(slug);
  if (!tenant) return { title: "Store Not Found" };

  return {
    title: `${tenant.storeName} | ${tenant.ownerName}`,
    description: tenant.shortBio || `Shop at ${tenant.storeName}`,
  };
}

export default async function StoreLayout({ children, params }: LayoutProps) {
  const { slug } = await params;
  const tenant = resolveTenant(slug);
  if (!tenant) notFound();

  // Validate Google Sheets config is present
  const config = buildTenantSheetsConfig(tenant);
  if (!config.serviceAccountEmail || !config.spreadsheetId) {
    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="text-xl font-bold text-red-700">Store Configuration Error</h1>
          <p className="mt-2 text-sm text-red-700">
            Google Sheets is not configured. Please contact the platform administrator.
          </p>
        </div>
      </main>
    );
  }

  return <>{children}</>;
}
