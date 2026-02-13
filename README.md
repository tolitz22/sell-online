# Angelito Personal Website (Next.js + Tailwind + TypeScript)

Production-ready personal website with:
- Product/service listing
- Buy flow modal + GCash QR instructions
- Google Sheets order storage
- Public order-status page
- Password-protected admin dashboard

## 1) Install

```bash
npm install
```

## 2) Environment variables

Create `.env.local` from `.env.local.example`.

```bash
cp .env.local.example .env.local
```

Set all required values.

## 3) Run locally

```bash
npm run dev
```

Open: `http://localhost:3000`

## 4) Build for production

```bash
npm run build
npm run start
```

## 5) Deploy on Vercel

1. Push this project to GitHub.
2. Import the repo in Vercel.
3. Add all environment variables from `.env.local.example` in Vercel Project Settings.
4. Deploy.

---

## Google Sheets setup (Database)

1. Create a Google Sheet.
2. Create a worksheet/tab name (example: `orders`).
3. In row 1, add exact headers:

- `timestamp`
- `orderId`
- `itemId`
- `itemName`
- `price`
- `quantity`
- `fullName`
- `email`
- `phone`
- `notes`
- `paymentStatus`

4. Create a Google Cloud Service Account.
5. Enable **Google Sheets API** in your Google Cloud project.
6. Generate a JSON key for the service account.
7. Copy these fields to `.env.local`:
   - `client_email` -> `GOOGLE_SERVICE_ACCOUNT_EMAIL`
   - `private_key` -> `GOOGLE_PRIVATE_KEY`
8. Share your Google Sheet with the service account email (Editor access).
9. Use spreadsheet ID from sheet URL as `GOOGLE_SHEETS_SPREADSHEET_ID`.
10. Set sheet/tab name in `GOOGLE_SHEETS_SHEET_NAME`.

---

## QR Code

Put your real GCash QR image at:

```text
/public/gcash-qr.png
```

Current file is placeholder. Replace it with your own QR image.

---

## Editable content

- Products: `src/lib/products.ts`
- Availability + current status: `src/lib/site-config.ts`

---

## API routes

- `POST /api/orders` -> create order (validated with Zod), append to Google Sheets
- `GET /api/orders/[orderId]` -> fetch single order status
- `PATCH /api/orders/[orderId]` -> admin-only update payment status
- `POST /api/admin/login` -> admin login
- `POST /api/admin/logout` -> admin logout

---

## Payment flow behavior

After successful order:
- Show Order ID
- Show GCash QR
- Show instruction: **"Please pay via GCash, then send proof of payment (screenshot) with your Order ID."**
- User can copy Order ID
