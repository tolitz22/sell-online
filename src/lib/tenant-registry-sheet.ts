import { google } from "googleapis";
import type { Tenant } from "@/lib/tenant-db";

const TENANTS_HEADERS = [
  "id",
  "slug",
  "storeName",
  "ownerName",
  "heroBadge",
  "heroHeadline",
  "shortBio",
  "address",
  "cloudinaryFolder",
  "gcashQrUrl",
  "isActive",
  "createdAt",
  "adminPasswordHash",
];

function getConfig() {
  const serviceAccountEmail = process.env.GOOGLE_SERVICE_ACCOUNT_EMAIL ?? "";
  const privateKey = (process.env.GOOGLE_PRIVATE_KEY ?? "").replace(/\\n/g, "\n");
  const spreadsheetId = process.env.GOOGLE_SHEETS_SPREADSHEET_ID ?? "";
  const tenantsSheetName = process.env.GOOGLE_SHEETS_TENANTS_SHEET_NAME?.trim() || "tenants";
  return { serviceAccountEmail, privateKey, spreadsheetId, tenantsSheetName };
}

function getSheetsClient() {
  const config = getConfig();
  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return {
    sheets: google.sheets({ version: "v4", auth }),
    ...config,
  };
}

function tenantToRow(tenant: Tenant): string[] {
  return [
    tenant.id,
    tenant.slug,
    tenant.storeName,
    tenant.ownerName,
    tenant.heroBadge ?? "",
    tenant.heroHeadline ?? "",
    tenant.shortBio ?? "",
    tenant.address ?? "",
    tenant.cloudinaryFolder ?? "",
    tenant.gcashQrUrl ?? "",
    tenant.isActive ? "1" : "0",
    tenant.createdAt ?? "",
    tenant.adminPasswordHash ?? "",
  ];
}

function isConfigured() {
  const { serviceAccountEmail, privateKey, spreadsheetId } = getConfig();
  return Boolean(serviceAccountEmail && privateKey && spreadsheetId);
}

export async function ensureTenantsSheetHeader() {
  if (!isConfigured()) return false;
  const { sheets, spreadsheetId, tenantsSheetName } = getSheetsClient();
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${tenantsSheetName}!A1:M1`,
    valueInputOption: "RAW",
    requestBody: { values: [TENANTS_HEADERS] },
  });
  return true;
}

export async function upsertTenantInSheet(tenant: Tenant) {
  if (!isConfigured()) return false;
  const { sheets, spreadsheetId, tenantsSheetName } = getSheetsClient();

  await ensureTenantsSheetHeader();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${tenantsSheetName}!A:M`,
  });

  const rows = res.data.values ?? [];
  const rowData = tenantToRow(tenant);
  const idx = rows.findIndex((row, rowIndex) => rowIndex > 0 && row[0] === tenant.id);

  if (idx === -1) {
    await sheets.spreadsheets.values.append({
      spreadsheetId,
      range: `${tenantsSheetName}!A:M`,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  } else {
    const sheetRowNumber = idx + 1;
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${tenantsSheetName}!A${sheetRowNumber}:M${sheetRowNumber}`,
      valueInputOption: "RAW",
      requestBody: { values: [rowData] },
    });
  }

  return true;
}
