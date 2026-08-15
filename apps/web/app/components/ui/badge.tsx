import type { HTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const variants = {
  open: "border-[#d9770644] bg-[#fff2d8] text-[#995304]",
  in_progress: "border-[#164dd844] bg-[#e8efff] text-[#1644b8]",
  done: "border-[#1d7a5244] bg-[#e0f4e9] text-[#17623f]",
  neutral: "border-[#d6d5ce] bg-[#efeee9] text-[#61645e]"
};

export function Badge({ className, variant = "neutral", ...props }: HTMLAttributes<HTMLSpanElement> & { variant?: keyof typeof variants }) {
  return <span className={cn("inline-flex items-center rounded-full border px-2.5 py-1 font-mono text-[11px] font-medium", variants[variant], className)} {...props} />;
}
