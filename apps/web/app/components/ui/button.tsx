import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const buttonVariants = cva(
  "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-lg border text-sm font-semibold transition-[transform,background-color,border-color,box-shadow] duration-150 disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-[#171717] bg-[#171717] text-white shadow-[3px_3px_0_#cfcfca] hover:-translate-y-px hover:bg-[#30302e] hover:shadow-[4px_4px_0_#bdbdb7]",
        outline: "border-[#c8c8c2] bg-white text-[#171717] hover:border-[#171717] hover:bg-[#f4f4f1]",
        ghost: "border-transparent bg-transparent hover:bg-black/5",
        danger: "border-[#bb2d3b] bg-[#bb2d3b] text-white hover:bg-[#a62431]"
      },
      size: {
        default: "h-10 px-4",
        sm: "h-8 px-3 text-xs",
        lg: "h-12 px-5 text-base",
        icon: "size-10"
      }
    },
    defaultVariants: { variant: "default", size: "default" }
  }
);

export function Button({ className, variant, size, ...props }: ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>) {
  return <button className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}

export { buttonVariants };
