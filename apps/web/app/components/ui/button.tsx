import { cva, type VariantProps } from "class-variance-authority";
import type { ButtonHTMLAttributes } from "react";
import { cn } from "~/lib/cn";

const buttonVariants = cva(
  "focus-ring inline-flex cursor-pointer items-center justify-center gap-2 rounded-[10px] border text-sm font-bold transition-all disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-[#164dd8] bg-[#164dd8] text-white shadow-[0_5px_16px_#164dd82d] hover:-translate-y-0.5 hover:bg-[#255ff0]",
        outline: "border-[#c9c8c1] bg-[#f8f7f3] text-[#171916] hover:border-[#8f918b] hover:bg-white",
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
