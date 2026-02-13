Nice—here’s the exact setup checklist for your Google Sheet:

## 1) Create the sheet
1. Go to Google Sheets → create new spreadsheet.
2. Rename file (example: `Angelito Orders`).
3. Rename first tab to: `orders` (or any name, just match env var).

## 2) Add the required columns (Row 1, exact order)
Put these headers in **A1 to K1**:

1. `timestamp`  
2. `orderId`  
3. `itemId`  
4. `itemName`  
5. `price`  
6. `quantity`  
7. `fullName`  
8. `email`  
9. `phone`  
10. `notes`  
11. `paymentStatus`

## 3) Create Google Cloud project + enable Sheets API
1. Open: https://console.cloud.google.com  
2. Create/select a project.
3. Go to **APIs & Services > Library**.
4. Enable **Google Sheets API**.

## 4) Create Service Account
1. Go to **IAM & Admin > Service Accounts**.
2. Click **Create Service Account**.
3. Name it (example: `orders-sheets-bot`) → Create.
4. Open the service account → **Keys** tab.
5. **Add Key > Create new key > JSON**.
6. JSON file downloads — keep it safe.

## 5) Share sheet with service account email
1. Open the downloaded JSON.
2. Copy `client_email` (looks like `xxx@xxx.iam.gserviceaccount.com`).
3. Go back to your Google Sheet.
4. Click **Share**.
5. Paste service account email.
6. Give **Editor** access.
7. Send/share.

## 6) Fill `.env.local`
In your project root (`D:\sell-online`), create `.env.local` from `.env.local.example` and set:

```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=orders
ADMIN_PASSWORD=your_strong_admin_password
```

### Important notes
- `GOOGLE_PRIVATE_KEY` must keep `\n` newlines exactly like above.
- Spreadsheet ID is in URL:  
  `https://docs.google.com/spreadsheets/d/<SPREADSHEET_ID>/edit...`
- `GOOGLE_SHEETS_SHEET_NAME` must match tab name exactly (`orders`).

## 7) Test
1. Run:
   ```bash
   npm install
   npm run dev
   ```
2. Open homepage, place a test order.
3. Check your Google Sheet — new row should appear.
4. Visit `/admin`, login, update status.
5. Visit `/order/<orderId>` to confirm status display.

If you want, I can give you a **copy-paste `.env.local` template with placeholders filled by example values** so you can just edit 5 lines quickly.


