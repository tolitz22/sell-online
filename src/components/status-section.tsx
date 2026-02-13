import { siteConfig } from "@/lib/site-config";
import { Badge } from "@/components/ui/badge";
import { Card } from "@/components/ui/card";

export function StatusSection() {
  return (
    <Card className="rounded-2xl border-amber-100 bg-white/85 shadow-lg shadow-amber-100/30">
      <div className="mb-3 flex flex-wrap items-center gap-3">
        <h2 className="text-xl font-bold tracking-tight text-zinc-900">Current Status</h2>
        <Badge
          className={
            siteConfig.availableForWork
              ? "border-emerald-200 bg-emerald-50 font-medium text-emerald-700"
              : "border-amber-200 bg-amber-50 font-medium text-amber-700"
          }
        >
          Available for work: {siteConfig.availableForWork ? "Yes" : "No"}
        </Badge>
      </div>
      <p className="text-sm leading-relaxed text-zinc-700 sm:text-base">
        <span className="font-semibold text-zinc-900">Currently working on: </span>
        {siteConfig.currentlyWorkingOn}
      </p>
    </Card>
  );
}
