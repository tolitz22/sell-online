import { getAllTenants } from "@/lib/tenant-db";
import { ensureTenantsSheetHeader, upsertTenantInSheet } from "@/lib/tenant-registry-sheet";

async function main() {
  const tenants = getAllTenants();
  if (tenants.length === 0) {
    console.log("No tenants found in SQLite.");
    return;
  }

  await ensureTenantsSheetHeader();
  for (const tenant of tenants) {
    await upsertTenantInSheet(tenant);
  }

  console.log(`Synced ${tenants.length} tenant(s) to Google Sheets.`);
}

main().catch((error) => {
  console.error("Sync failed:", error);
  process.exit(1);
});
