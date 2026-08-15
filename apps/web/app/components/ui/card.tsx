import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) {
  return <div className={cn("rounded-[16px] border border-[#d6d5ce] bg-[#faf9f5] shadow-[0_14px_45px_rgba(32,34,30,.06)]", className)} {...props} />;
}
