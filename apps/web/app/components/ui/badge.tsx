import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const variants = {
  open: "border-[#d6b479] bg-[#fff8e8] text-[#82550a]",
  in_progress: "border-[#b8b8b1] bg-[#f0f0ec] text-[#20201e]",
  done: "border-[#a7cdb7] bg-[#edf8f0] text-[#17623f]",
  neutral: "border-[#d8d8d2] bg-[#f4f4f1] text-[#61615e]"
};

export function Badge({ className, variant = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium", variants[variant], className)} {...props} />;
}
