import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "default" | "outline" | "secondary" | "destructive";

type Props = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: Variant;
};

const variants: Record<Variant, string> = {
  default: "bg-black text-white hover:bg-black/85",
  outline: "border border-zinc-300 bg-white hover:bg-zinc-100",
  secondary: "bg-zinc-200 text-zinc-900 hover:bg-zinc-300",
  destructive: "bg-red-600 text-white hover:bg-red-700",
};

export function Button({ className, variant = "default", ...props }: Props) {
  return (
    <button
      className={cn(
        "inline-flex items-center justify-center rounded-md px-4 py-2 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-50",
        variants[variant],
        className,
      )}
      {...props}
    />
  );
}
