import { Link } from "react-router";
import { cn } from "~/lib/cn";

export function BrandMark({ className }: { className?: string }) {
  return (
    <svg
      aria-hidden="true"
      focusable="false"
      viewBox="0 0 128 128"
      className={cn("size-9 shrink-0", className)}
    >
      <rect width="128" height="128" rx="32" fill="#151515" />
      <path d="M64 23C45.22 23 30 38.22 30 57c0 26.13 34 51.2 34 51.2S98 83.13 98 57C98 38.22 82.78 23 64 23Z" fill="#fff" />
      <circle cx="64" cy="57" r="12" fill="#151515" />
      <path d="M44 88.5 34.5 98M84 88.5l9.5 9.5" stroke="#fff" strokeWidth="5" strokeLinecap="round" />
    </svg>
  );
}

export function Logo({ locale = "zh-CN", className, inverse = false }: { locale?: string; className?: string; inverse?: boolean }) {
  return (
    <Link
      to={`/${locale}`}
      prefetch="intent"
      aria-label="Pinhere"
      className={cn("focus-ring inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[15px] font-bold tracking-[-.025em]", inverse && "text-white", className)}
    >
      <BrandMark />
      PINHERE
    </Link>
  );
}
