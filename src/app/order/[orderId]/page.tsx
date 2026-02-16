import Link from "next/link";
import { Card } from "@/components/ui/card";

export default async function LegacyOrderPage({ params }: { params: Promise<{ orderId: string }> }) {
  const { orderId } = await params;
  return (
    <main className="mx-auto max-w-2xl px-4 py-12">
      <Card className="space-y-4">
        <h1 className="text-2xl font-bold">Route Moved</h1>
        <p className="text-zinc-700">
          Order tracking is now tenant-scoped. This legacy path no longer resolves orders safely.
        </p>
        <p className="text-sm text-zinc-600">
          Order ID: <span className="font-medium">{orderId}</span>
        </p>
        <Link href="/" className="text-sm font-semibold text-cyan-700 underline">
          Go to landing page
        </Link>
      </Card>
    </main>
  );
}
