import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const buttonVariants = cva(
  "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-xl border text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-200 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-[#1d4ed8] bg-[#2563eb] text-white! shadow-[0_6px_16px_rgba(37,99,235,.18)] hover:-translate-y-px hover:bg-[#1d4ed8] hover:shadow-[0_9px_22px_rgba(37,99,235,.23)] active:translate-y-0",
        outline: "border-[#c4d0dd] bg-white text-[#0f172a] shadow-[0_2px_7px_rgba(15,23,42,.04)] hover:border-[#94a3b8] hover:bg-[#f8fafc]",
        ghost: "border-transparent bg-transparent text-[#64748b] hover:bg-[#eff6ff] hover:text-[#0f172a]",
        danger: "border-[#a93e3e] bg-[#a93e3e] text-white! shadow-[0_5px_14px_rgba(169,62,62,.14)] hover:bg-[#913434]"
      },
      size: {
        default: "h-11 px-4",
        sm: "h-9 px-3 text-xs",
        lg: "h-[3.25rem] px-5 text-base",
        icon: "size-11"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
