import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes, HTMLAttributes, InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "@/lib/cn";

const button = cva("focus-ring inline-flex h-10 cursor-pointer items-center justify-center gap-2 rounded-[8px] border px-4 text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-45", {
  variants: { variant: { default: "border-[#151515] bg-[#151515] text-white shadow-[0_4px_12px_rgba(0,0,0,.14)] hover:bg-[#303030] active:translate-y-px", outline: "border-[#cfcfcf] bg-white hover:border-[#151515] hover:bg-[#fafafa]", ghost: "border-transparent bg-transparent hover:bg-black/5", danger: "border-[#bb2d3b] bg-[#bb2d3b] text-white" } }, defaultVariants: { variant: "default" }
});
export function Button({ className, variant, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof button>) { return <button className={cn(button({ variant }), className)} {...props} />; }
export function Card({ className, ...props }: HTMLAttributes<HTMLDivElement>) { return <div className={cn("rounded-[14px] border border-[#d6d5ce] bg-[#faf9f5] shadow-[0_10px_32px_rgba(27,29,25,.06)]", className)} {...props} />; }
export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) { return <input className={cn("focus-ring h-10 w-full rounded-[9px] border border-[#cecdc6] bg-white px-3 text-sm placeholder:text-[#999c95]", className)} {...props} />; }
export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) { return <textarea className={cn("focus-ring min-h-28 w-full resize-y rounded-[9px] border border-[#cecdc6] bg-white px-3 py-2.5 text-sm leading-5 placeholder:text-[#999c95]", className)} {...props} />; }
