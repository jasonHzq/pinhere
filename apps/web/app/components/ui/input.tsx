import type { InputHTMLAttributes, TextareaHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

export function Input({ className, ...props }: InputHTMLAttributes<HTMLInputElement>) {
  return <input className={cn("focus-ring h-10 w-full rounded-[9px] border border-[#cecdc6] bg-white px-3 text-sm placeholder:text-[#9a9d96]", className)} {...props} />;
}

export function Textarea({ className, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className={cn("focus-ring min-h-28 w-full resize-y rounded-[9px] border border-[#cecdc6] bg-white px-3 py-2.5 text-sm placeholder:text-[#9a9d96]", className)} {...props} />;
}
