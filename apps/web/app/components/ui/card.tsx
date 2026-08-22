import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-xl border border-[#d8d8d2] bg-white shadow-[0_1px_0_rgba(0,0,0,.03)]", className)} {...props} />;
}
