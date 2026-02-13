Setup checklist for Google Sheets + Cloudinary image uploads

1) Create spreadsheet tabs
- Create one spreadsheet.
- Add tab `orders`.
- Add tab `products`.

2) Add required headers
- `orders` tab (A1:K1):
  - `timestamp`, `orderId`, `itemId`, `itemName`, `price`, `quantity`, `fullName`, `email`, `phone`, `notes`, `paymentStatus`
- `products` tab (A1:G1):
  - `id`, `name`, `category`, `price`, `description`, `status`, `imageUrl`

3) Enable APIs in Google Cloud
- Enable `Google Sheets API`.

4) Create service account key
- Create service account.
- Create JSON key.
- Keep `client_email` and `private_key`.

5) Share spreadsheet with service account
- Share spreadsheet to service account email as `Editor`.

6) Create Cloudinary account
- Get these values from Cloudinary dashboard:
  - Cloud name
  - API key
  - API secret
- Optional: choose upload folder (default: `sell-online/products`).

7) Configure `.env.local`
```env
GOOGLE_SERVICE_ACCOUNT_EMAIL=your-service-account@your-project.iam.gserviceaccount.com
GOOGLE_PRIVATE_KEY="-----BEGIN PRIVATE KEY-----\n...\n-----END PRIVATE KEY-----\n"
GOOGLE_SHEETS_SPREADSHEET_ID=your_spreadsheet_id_here
GOOGLE_SHEETS_SHEET_NAME=orders
GOOGLE_SHEETS_PRODUCTS_SHEET_NAME=products
ADMIN_PASSWORD=your_strong_admin_password

CLOUDINARY_CLOUD_NAME=your_cloud_name
CLOUDINARY_API_KEY=your_api_key
CLOUDINARY_API_SECRET=your_api_secret
CLOUDINARY_UPLOAD_FOLDER=sell-online/products
```

8) Test
- Run `npm run dev`.
- Open `/admin`.
- Add an item and upload an image.
- Confirm:
  - New row in `products` tab.
  - `imageUrl` contains a Cloudinary URL.
  - Image appears on homepage.
