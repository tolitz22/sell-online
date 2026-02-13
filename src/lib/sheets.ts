import { google } from "googleapis";
import { PaymentStatus } from "@/lib/schemas";
import { Product, ProductStatus } from "@/lib/products";

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
  notes: string;
  paymentStatus: PaymentStatus;
};

type RequiredEnv =
  | "GOOGLE_SERVICE_ACCOUNT_EMAIL"
  | "GOOGLE_PRIVATE_KEY"
  | "GOOGLE_SHEETS_SPREADSHEET_ID"
  | "GOOGLE_SHEETS_SHEET_NAME";

function getEnv(name: RequiredEnv) {
  const value = process.env[name];
  if (!value) throw new Error(`Missing env: ${name}`);
  return value;
}

function getSheetsClient() {
  const clientEmail = getEnv("GOOGLE_SERVICE_ACCOUNT_EMAIL");
  const privateKey = getEnv("GOOGLE_PRIVATE_KEY").replace(/\\n/g, "\n");

  const auth = new google.auth.JWT({
    email: clientEmail,
    key: privateKey,
    scopes: ["https://www.googleapis.com/auth/spreadsheets"],
  });

  return google.sheets({ version: "v4", auth });
}

function getConfig() {
  return {
    spreadsheetId: getEnv("GOOGLE_SHEETS_SPREADSHEET_ID"),
    sheetName: getEnv("GOOGLE_SHEETS_SHEET_NAME"),
    productsSheetName: process.env.GOOGLE_SHEETS_PRODUCTS_SHEET_NAME?.trim() || "products",
  };
}

function toProductStatus(value: string): ProductStatus {
  return value === "SOLD_OUT" ? "SOLD_OUT" : "AVAILABLE";
}

const PRODUCTS_CACHE_TTL_MS = 200_000;
let productsCache: { data: Product[]; expiresAt: number } | null = null;

function clearProductsCache() {
  productsCache = null;
}

function setProductsCache(data: Product[]) {
  productsCache = {
    data,
    expiresAt: Date.now() + PRODUCTS_CACHE_TTL_MS,
  };
}

function normalizeProduct(row: string[]): Product {
  return {
    id: row[0] ?? "",
    name: row[1] ?? "",
    category: row[2] ?? "General",
    price: Number(row[3] ?? 0),
    description: row[4] ?? "",
    status: toProductStatus(row[5] ?? "AVAILABLE"),
    imageUrl: row[6] ?? "",
  };
}

export async function appendOrderRow(order: SheetOrder) {
  const sheets = getSheetsClient();
  const { spreadsheetId, sheetName } = getConfig();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${sheetName}!A:K`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
          order.timestamp,
          order.orderId,
          order.itemId,
          order.itemName,
          order.price,
          order.quantity,
          order.fullName,
          order.email,
          order.phone,
          order.notes,
          order.paymentStatus,
        ],
      ],
    },
  });
}

export async function getAllOrders() {
  const sheets = getSheetsClient();
  const { spreadsheetId, sheetName } = getConfig();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:K`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [] as SheetOrder[];

  return rows.slice(1).map((row) => ({
    timestamp: row[0] ?? "",
    orderId: row[1] ?? "",
    itemId: row[2] ?? "",
    itemName: row[3] ?? "",
    price: Number(row[4] ?? 0),
    quantity: Number(row[5] ?? 0),
    fullName: row[6] ?? "",
    email: row[7] ?? "",
    phone: row[8] ?? "",
    notes: row[9] ?? "",
    paymentStatus: (row[10] ?? "PENDING_PROOF") as PaymentStatus,
  }));
}

export async function appendProductRow(product: Product) {
  const sheets = getSheetsClient();
  const { spreadsheetId, productsSheetName } = getConfig();

  await sheets.spreadsheets.values.append({
    spreadsheetId,
    range: `${productsSheetName}!A:G`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
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

  clearProductsCache();
}

export async function getAllProducts() {
  const sheets = getSheetsClient();
  const { spreadsheetId, productsSheetName } = getConfig();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${productsSheetName}!A:G`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return [] as Product[];

  return rows.slice(1).map((row) => normalizeProduct(row));
}

export async function getAllProductsSafe() {
  if (productsCache && productsCache.expiresAt > Date.now()) {
    return productsCache.data;
  }

  try {
    const products = await getAllProducts();
    setProductsCache(products);
    return products;
  } catch {
    return productsCache?.data ?? ([] as Product[]);
  }
}

async function findProductRow(productId: string) {
  const sheets = getSheetsClient();
  const { spreadsheetId, productsSheetName } = getConfig();
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${productsSheetName}!A:G`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return null;

  const idx = rows.findIndex((row, rowIndex) => rowIndex > 0 && row[0] === productId);
  if (idx === -1) return null;

  const sheetRowNumber = idx + 1;
  return {
    spreadsheetId,
    productsSheetName,
    sheetRowNumber,
    product: normalizeProduct(rows[idx] as string[]),
  };
}

export async function updateProductById(
  productId: string,
  updates: Partial<Pick<Product, "name" | "category" | "price" | "description" | "status" | "imageUrl">>,
) {
  const sheets = getSheetsClient();
  const row = await findProductRow(productId);
  if (!row) return null;

  const next: Product = {
    ...row.product,
    ...updates,
    id: productId,
    imageUrl: updates.imageUrl ?? row.product.imageUrl ?? "",
  };

  await sheets.spreadsheets.values.update({
    spreadsheetId: row.spreadsheetId,
    range: `${row.productsSheetName}!A${row.sheetRowNumber}:G${row.sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: {
      values: [
        [
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

  clearProductsCache();
  return next;
}

async function getSheetIdByName(spreadsheetId: string, sheetName: string) {
  const sheets = getSheetsClient();
  const meta = await sheets.spreadsheets.get({ spreadsheetId });
  const match = (meta.data.sheets ?? []).find((sheet) => sheet.properties?.title === sheetName);
  return match?.properties?.sheetId ?? null;
}

export async function deleteProductById(productId: string) {
  const row = await findProductRow(productId);
  if (!row) return false;

  const sheetId = await getSheetIdByName(row.spreadsheetId, row.productsSheetName);
  if (sheetId === null) return false;

  const sheets = getSheetsClient();
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

  clearProductsCache();
  return true;
}

export async function getOrderById(orderId: string) {
  const orders = await getAllOrders();
  return orders.find((o) => o.orderId === orderId) ?? null;
}

export async function updateOrderPaymentStatus(orderId: string, paymentStatus: PaymentStatus) {
  const sheets = getSheetsClient();
  const { spreadsheetId, sheetName } = getConfig();

  const res = await sheets.spreadsheets.values.get({
    spreadsheetId,
    range: `${sheetName}!A:K`,
  });

  const rows = res.data.values ?? [];
  if (rows.length <= 1) return false;

  const rowIndex = rows.findIndex((row, idx) => idx > 0 && row[1] === orderId);
  if (rowIndex === -1) return false;

  const sheetRowNumber = rowIndex + 1;
  await sheets.spreadsheets.values.update({
    spreadsheetId,
    range: `${sheetName}!K${sheetRowNumber}`,
    valueInputOption: "RAW",
    requestBody: { values: [[paymentStatus]] },
  });

  return true;
}
