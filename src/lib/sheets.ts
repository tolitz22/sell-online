import { google } from "googleapis";
import { PaymentStatus } from "@/lib/schemas";
import { Product, ProductStatus } from "@/lib/products";

export type TenantSheetsConfig = {
  tenantId: string;
  serviceAccountEmail: string;
  privateKey: string;
  spreadsheetId: string;
  ordersSheetName: string;
  productsSheetName: string;
};

export type SheetOrder = {
  timestamp: string;
  orderId: string;
  itemId: string;
  itemName: string;
  price: number;
  quantity: number;
  fullName: string;
  email: string;
  phone: string;
  address: string;
  notes: string;
  paymentStatus: PaymentStatus;
};

function getSheetsClient(config: TenantSheetsConfig) {
  const auth = new google.auth.JWT({
    email: config.serviceAccountEmail,
    key: config.privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });
  return google.sheets({ version: "v4", auth });
}

function toProductStatus(value: string): ProductStatus {
  return value === "SOLD_OUT" ? "SOLD_OUT" : "AVAILABLE";
}

// --- Per-tenant products cache ---
const PRODUCTS_CACHE_TTL_MS = 200_000;
const productsCacheMap = new Map<string, { data: Product[]; expiresAt: number }>();

function clearProductsCache(tenantId: string) {
  productsCacheMap.delete(tenantId);
}

function setProductsCache(tenantId: string, data: Product[]) {
  productsCacheMap.set(tenantId, { data, expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS });
}

function getProductsCache(tenantId: string): Product[] | null {
  const entry = productsCacheMap.get(tenantId);
  if (!entry) return null;
  if (entry.expiresAt < Date.now()) {
    productsCacheMap.delete(tenantId);
    return null;
  }
  return entry.data;
}

// Column A is tenantId, columns B–H are product data
function normalizeProduct(row: string[]): Product {
  return {
    id: row[1] ?? "",
    name: row[2] ?? "",
    category: row[3] ?? "General",
    price: Number(row[4] ?? 0),
    description: row[5] ?? "",
    status: toProductStatus(row[6] ?? "AVAILABLE"),
    imageUrl: row[7] ?? "",
  };
}

// ─── Orders ──────────────────────────────────────────────────

export async function appendOrderRow(config: TenantSheetsConfig, order: SheetOrder) {
  const sheets = getSheetsClient(config);

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${config.ordersSheetName}!A:M`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          config.tenantId,
          order.timestamp,
          order.orderId,
          order.itemId,
          order.itemName,
          order.price,
          order.quantity,
          order.fullName,
          order.email,
          order.phone,
          order.address,
          order.notes,
          order.paymentStatus,
        ],
      ],
    },
  });
}

export async function getAllOrders(config: TenantSheetsConfig) {
  const sheets = getSheetsClient(config);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.ordersSheetName}!A:M`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [] as SheetOrder[];

  return rows
    .slice(1)
    .filter((row) => row[0] === config.tenantId)
    .map((row) => {
      const hasAddressColumn = row.length >= 13;
      return {
        timestamp: row[1] ?? "",
        orderId: row[2] ?? "",
        itemId: row[3] ?? "",
        itemName: row[4] ?? "",
        price: Number(row[5] ?? 0),
        quantity: Number(row[6] ?? 0),
        fullName: row[7] ?? "",
        email: row[8] ?? "",
        phone: row[9] ?? "",
        address: hasAddressColumn ? (row[10] ?? "") : "",
        notes: hasAddressColumn ? (row[11] ?? "") : (row[10] ?? ""),
        paymentStatus: (hasAddressColumn ? row[12] : row[11] ?? "PENDING_PROOF") as PaymentStatus,
      };
    });
}

export async function getOrderById(config: TenantSheetsConfig, orderId: string) {
  const orders = await getAllOrders(config);
  return orders.find((o) => o.orderId === orderId) ?? null;
}

export async function updateOrderPaymentStatus(
  config: TenantSheetsConfig,
  orderId: string,
  paymentStatus: PaymentStatus,
) {
  const sheets = getSheetsClient(config);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.ordersSheetName}!A:M`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return false;

  const rowIndex = rows.findIndex(
    (row, idx) => idx > 0 && row[0] === config.tenantId && row[2] === orderId,
  );
  if (rowIndex === -1) return false;

  const sheetRowNumber = rowIndex + 1;
  const hasAddressColumn = (rows[rowIndex]?.length ?? 0) >= 13;
  const paymentStatusColumn = hasAddressColumn ? "M" : "L";
  await sheets.spreadsheets.values.update({
    spreadsheetId: config.spreadsheetId,
    range: `${config.ordersSheetName}!${paymentStatusColumn}${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[paymentStatus]] },
  });

  return true;
}

// ─── Products ────────────────────────────────────────────────

export async function appendProductRow(config: TenantSheetsConfig, product: Product) {
  const sheets = getSheetsClient(config);

  await sheets.spreadsheets.values.append({
    spreadsheetId: config.spreadsheetId,
    range: `${config.productsSheetName}!A:H`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          config.tenantId,
          product.id,
          product.name,
          product.category,
          product.price,
          product.description,
          product.status,
          product.imageUrl ?? "",
        ],
      ],
    },
  });

  clearProductsCache(config.tenantId);
}

export async function getAllProducts(config: TenantSheetsConfig) {
  const sheets = getSheetsClient(config);

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.productsSheetName}!A:H`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [] as Product[];

  return rows
    .slice(1)
    .filter((row) => row[0] === config.tenantId)
    .map((row) => normalizeProduct(row));
}

export async function getAllProductsSafe(config: TenantSheetsConfig) {
  const cached = getProductsCache(config.tenantId);
  if (cached) return cached;

  try {
    const products = await getAllProducts(config);
    setProductsCache(config.tenantId, products);
    return products;
  } catch {
    return getProductsCache(config.tenantId) ?? ([] as Product[]);
  }
}

async function findProductRow(config: TenantSheetsConfig, productId: string) {
  const sheets = getSheetsClient(config);
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: config.spreadsheetId,
    range: `${config.productsSheetName}!A:H`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return null;

  const idx = rows.findIndex(
    (row, rowIndex) => rowIndex > 0 && row[0] === config.tenantId && row[1] === productId,
  );
  if (idx === -1) return null;

  const sheetRowNumber = idx + 1;
  return {
    spreadsheetId: config.spreadsheetId,
    productsSheetName: config.productsSheetName,
    sheetRowNumber,
    product: normalizeProduct(rows[idx] as string[]),
  };
}

export async function updateProductById(
  config: TenantSheetsConfig,
  productId: string,
  updates: Partial<Pick<Product, "name" | "category" | "price" | "description" | "status" | "imageUrl">>,
) {
  const sheets = getSheetsClient(config);
  const row = await findProductRow(config, productId);
  if (!row) return null;

  const next: Product = {
    ...row.product,
    ...updates,
    id: productId,
    imageUrl: updates.imageUrl ?? row.product.imageUrl ?? "",
  };

  await sheets.spreadsheets.values.update({
    spreadsheetId: row.spreadsheetId,
    range: `${row.productsSheetName}!A${row.sheetRowNumber}:H${row.sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          config.tenantId,
          next.id,
          next.name,
          next.category,
          next.price,
          next.description,
          next.status,
          next.imageUrl ?? "",
        ],
      ],
    },
  });

  clearProductsCache(config.tenantId);
  return next;
}

async function getSheetIdByName(config: TenantSheetsConfig, sheetName: string) {
  const sheets = getSheetsClient(config);
  const meta = await sheets.spreadsheets.get({ spreadsheetId: config.spreadsheetId });
  const match = (meta.data.sheets ?? []).find((sheet) => sheet.properties?.title === sheetName);
  return match?.properties?.sheetId ?? null;
}

export async function deleteProductById(config: TenantSheetsConfig, productId: string) {
  const row = await findProductRow(config, productId);
  if (!row) return false;

  const sheetId = await getSheetIdByName(config, row.productsSheetName);
  if (sheetId === null) return false;

  const sheets = getSheetsClient(config);
  await sheets.spreadsheets.batchUpdate({
    spreadsheetId: row.spreadsheetId,
    requestBody: {
      requests: [
        {
          deleteDimension: {
            range: {
              sheetId,
              dimension: "ROWS",
              startIndex: row.sheetRowNumber - 1,
              endIndex: row.sheetRowNumber,
            },
          },
        },
      ],
    },
  });

  clearProductsCache(config.tenantId);
  return true;
}
