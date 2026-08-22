import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("focus-ring h-11 w-full rounded-xl border border-[#c4d0dd] bg-white px-3.5 text-base text-[#0f172a] shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] outline-none placeholder:text-[#94a3b8] focus:border-[#2563eb] sm:text-sm", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("focus-ring min-h-28 w-full resize-y rounded-xl border border-[#c4d0dd] bg-white px-3.5 py-3 text-base text-[#0f172a] shadow-[inset_0_1px_2px_rgba(15,23,42,.04)] outline-none placeholder:text-[#94a3b8] focus:border-[#2563eb] sm:text-sm", className)} {...props} />;
}
