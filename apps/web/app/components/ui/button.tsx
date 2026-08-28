import { cva, type VariantProps } from "class-variance-authority";
import type { ComponentProps } from "react";
import { LoaderCircle } from "lucide-react";
import { Button as BeuiButton } from "~/components/motion/button/base";
import { cn } from "~/lib/cn";

const buttonVariants = cva(
  "focus-ring inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-semibold transition-[transform,background-color,border-color,box-shadow,color] duration-200 active:scale-[.98] disabled:pointer-events-none disabled:opacity-45",
  {
    variants: {
      variant: {
        default: "border-[#1d4ed8] bg-[#2563eb] text-white! shadow-[0_6px_16px_rgba(37,99,235,.18)] hover:-translate-y-px hover:bg-[#1d4ed8] hover:shadow-[0_9px_22px_rgba(37,99,235,.23)] active:translate-y-0 active:bg-[#1e40af] active:shadow-[0_2px_7px_rgba(30,64,175,.2)]",
        outline: "border-[#c4d0dd] bg-white text-[#0f172a] shadow-[0_2px_7px_rgba(15,23,42,.04)] hover:-translate-y-px hover:border-[#94a3b8] hover:bg-[#f8fafc] hover:shadow-[0_7px_18px_rgba(15,23,42,.08)] active:translate-y-0 active:border-[#93b4dc] active:bg-[#eff6ff] active:shadow-[0_1px_3px_rgba(15,23,42,.08)]",
        ghost: "border-transparent bg-transparent text-[#64748b] hover:bg-[#eff6ff] hover:text-[#0f172a] active:bg-[#dbeafe]",
        danger: "border-[#a93e3e] bg-[#a93e3e] text-white! shadow-[0_5px_14px_rgba(169,62,62,.14)] hover:bg-[#913434] active:bg-[#7f2d2d] active:shadow-[0_2px_6px_rgba(127,45,45,.18)]"
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

type ButtonProps = Omit<ComponentProps<typeof BeuiButton>, "variant" | "size"> & VariantProps<typeof buttonVariants> & {
  pending?: boolean;
  pendingLabel?: string;
};

export function Button({ className, variant, size, pending = false, pendingLabel, children, disabled, ...props }: ButtonProps) {
  return (
    <BeuiButton
      variant={variant === "ghost" ? "ghost" : variant === "outline" ? "outline" : "primary"}
      size={size === "sm" ? "sm" : size === "lg" ? "lg" : size === "icon" ? "icon" : "md"}
      pressScale={0.975}
      ripple={variant === "default"}
      className={cn(buttonVariants({ variant, size }), className)}
      disabled={disabled || pending}
      aria-busy={pending || undefined}
      {...props}
    >
      {pending && <LoaderCircle aria-hidden="true" className="animate-spin" size={size === "sm" ? 13 : 16} />}
      {pending && pendingLabel ? pendingLabel : children}
    </BeuiButton>
  );
}

export { buttonVariants };
