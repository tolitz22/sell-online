import { cn } from "@/lib/utils";
import { HTMLAttributes, TableHTMLAttributes, ThHTMLAttributes, TdHTMLAttributes } from "react";

export function Table(props: TableHTMLAttributes<HTMLTableElement>) {
  return <table {...props} className={cn("w-full text-sm", props.className)} />;
}

export function THead(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <thead {...props} className={cn("bg-zinc-50", props.className)} />;
}

export function TBody(props: HTMLAttributes<HTMLTableSectionElement>) {
  return <tbody {...props} className={cn("divide-y", props.className)} />;
}

export function TR(props: HTMLAttributes<HTMLTableRowElement>) {
  return <tr {...props} className={cn("border-b", props.className)} />;
}

export function TH(props: ThHTMLAttributes<HTMLTableCellElement>) {
  return <th {...props} className={cn("px-3 py-2 text-left font-semibold text-zinc-600", props.className)} />;
}

export function TD(props: TdHTMLAttributes<HTMLTableCellElement>) {
  return <td {...props} className={cn("px-3 py-2 align-top", props.className)} />;
}
