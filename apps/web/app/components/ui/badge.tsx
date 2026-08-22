import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const variants = {
  open: "border-[#cbd2d8] bg-[#f0f3f5] text-[#5e6973]",
  in_progress: "border-[#b9c8d3] bg-[#edf4f8] text-[#3e5d75]",
  done: "border-[#b9ced0] bg-[#eaf2f2] text-[#3f676b]",
  neutral: "border-[#d5dce2] bg-[#eef1f4] text-[#606a73]"
};

export function Badge({ className, variant = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[10px] font-medium", variants[variant], className)} {...props} />;
}
