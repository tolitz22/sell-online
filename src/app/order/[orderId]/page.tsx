import Link from "next/link";
import { getOrderById } from "@/lib/sheets";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

function statusMessage(status: string) {
  if (status === "PAID") return "Payment confirmed. Thank you!";
  if (status === "CANCELLED") return "Order cancelled";
  return "Waiting for payment proof";
}

function statusClass(status: string) {
  if (status === "PAID") return "border-emerald-200 bg-emerald-50 text-emerald-700";
  if (status === "CANCELLED") return "border-red-200 bg-red-50 text-red-700";
  return "border-amber-200 bg-amber-50 text-amber-700";
}

export default async function OrderStatusPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  const order = await getOrderById(orderId);

  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Order Status</h1>

        {!order ? (
          <>
            <p className="text-zinc-600">No order found for ID: <span className="font-medium">{orderId}</span></p>
            <Link href="/" className="text-sm text-blue-600 underline">Back to homepage</Link>
          </>
        ) : (
          <>
            <p><span className="font-medium">Order ID:</span> {order.orderId}</p>
            <p><span className="font-medium">Item:</span> {order.itemName}</p>
            <p><span className="font-medium">Quantity:</span> {order.quantity}</p>
            <div className="flex items-center gap-2">
              <span className="font-medium">Payment Status:</span>
              <Badge className={statusClass(order.paymentStatus)}>{order.paymentStatus}</Badge>
            </div>
            <p className="text-zinc-700">{statusMessage(order.paymentStatus)}</p>
          </>
        )}
      </Card>
    </main>
  );
}
