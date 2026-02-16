import { getTenantBySlug, type Tenant } from "@/lib/tenant-db";

/**
 * Resolve a slug to a tenant. Returns the tenant or null if not found / inactive.
 */
export function resolveTenant(slug: string): Tenant | null {
    return getTenantBySlug(slug);
}

/**
 * Build a TenantSheetsConfig from the shared env vars + tenant id.
 */
export function buildTenantSheetsConfig(tenant: Tenant) {
    return {
        tenantId: tenant.id,
        serviceAccountEmail: process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "",
        privateKey: (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n"),
        spreadsheetId: process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "",
        ordersSheetName: process.env.GOOGLE_SHEETS_SHEET_NAME?.trim() || "orders",
        productsSheetName: process.env.GOOGLE_SHEETS_PRODUCTS_SHEET_NAME?.trim() || "products",
    };
}
