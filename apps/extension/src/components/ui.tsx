import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const button = cva("focus-ring inline-flex min-h-11 cursor-pointer touch-manipulation items-center justify-center gap-2 rounded-[11px] border px-4 text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-45", {
  variants: { variant: { default: "border-[#315efb] bg-[#315efb] text-white shadow-[0_7px_18px_rgba(49,94,251,.2)] hover:border-[#244bd7] hover:bg-[#244bd7] active:translate-y-px", outline: "border-[#cfd7e2] bg-white text-[#273348] hover:border-[#8e9aad] hover:bg-[#f8fafc]", ghost: "border-transparent bg-transparent text-[#596579] hover:bg-[#edf1f5]", danger: "border-[#bb2d3b] bg-[#bb2d3b] text-white" } }, defaultVariants: { variant: "default" }
});
export function Button({ className, variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) { return <button className={cn(button({ variant }), className)} {...props} />; }
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-2xl border border-[#dfe5ec] bg-white shadow-[0_10px_28px_rgba(35,48,68,.055)]", className)} {...props} />; }
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("focus-ring h-11 w-full rounded-[11px] border border-[#cfd7e2] bg-white px-3 text-base text-[#172033] placeholder:text-[#9aa3b0] sm:text-sm", className)} {...props} />; }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn("focus-ring min-h-28 w-full resize-y rounded-[11px] border border-[#cfd7e2] bg-white px-3 py-2.5 text-sm leading-5 text-[#172033] placeholder:text-[#9aa3b0]", className)} {...props} />; }
