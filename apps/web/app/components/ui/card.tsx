import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-2xl border border-[#d9e2ec] bg-white shadow-[0_10px_34px_rgba(15,23,42,.055)]", className)} {...props} />;
}
