import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function StatusSection() {
  return (
    <Card className="rounded-2xl border-amber-100 bg-white/85 shadow-lg shadow-amber-100/30">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Current Status</h2>
        <Badge className="border-cyan-200 bg-cyan-50 font-medium text-cyan-700">
          Multi-tenant mode enabled
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
        Storefront data, auth, and APIs are now tenant-scoped under <span className="font-mono">/store/[slug]</span>.
      </p>
    </Card>
  );
}
