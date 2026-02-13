import { AdminDashboard } from "@/components/admin-dashboard";
import { AdminLogin } from "@/components/admin-login";
import { isAdminAuthenticated } from "@/lib/admin-auth";
import { getAllOrders, getAllProductsSafe } from "@/lib/sheets";
import { Product } from "@/lib/products";

export default async function AdminPage() {
  const authed = await isAdminAuthenticated();

  if (!authed) {
    return (
      <main className="mx-auto max-w-5xl px-4 py-12">
        <AdminLogin />
      </main>
    );
  }

  let ordersError = "";
  let orders = [] as Awaited<ReturnType<typeof getAllOrders>>;
  let products = [] as Product[];

  try {
    orders = await getAllOrders();
    products = await getAllProductsSafe();
  } catch (error) {
    ordersError = error instanceof Error ? error.message : "Unknown error";
  }

  if (ordersError) {
    const isPermissionError = ordersError.toLowerCase().includes("permission");

    return (
      <main className="mx-auto max-w-3xl px-4 py-10">
        <div className="rounded-xl border border-red-200 bg-red-50 p-5">
          <h1 className="text-xl font-bold text-red-700">Unable to load admin orders</h1>
          <p className="mt-2 text-sm text-red-700">
            {isPermissionError
              ? "Google Sheets denied access. Share your spreadsheet with the service account email and give it Editor permission."
              : ordersError}
          </p>
          <p className="mt-3 text-sm text-red-700">
            After updating Google Sheets access, restart the dev server and refresh this page.
          </p>
        </div>
      </main>
    );
  }

  return (
    <main className="mx-auto max-w-6xl px-4 py-10">
      <AdminDashboard
        initialOrders={orders.sort((a, b) => (a.timestamp > b.timestamp ? -1 : 1))}
        initialProducts={products}
      />
    </main>
  );
}
