import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("focus-ring h-10 w-full rounded-lg border border-[#d0d0ca] bg-white px-3 text-sm placeholder:text-[#9a9a94] focus:border-[#151515]", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("focus-ring min-h-28 w-full resize-y rounded-lg border border-[#d0d0ca] bg-white px-3 py-2.5 text-sm placeholder:text-[#9a9a94] focus:border-[#151515]", className)} {...props} />;
}
