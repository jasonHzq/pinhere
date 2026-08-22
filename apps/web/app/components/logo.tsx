import { Link } from "react-router";

export function Logo({ locale = "zh-CN" }: { locale?: string }) {
  return (
    <Link to={`/${locale}`} className="focus-ring inline-flex min-h-11 items-center gap-2.5 rounded-xl text-[15px] font-bold tracking-[-.025em]">
      <span className="grid size-9 place-items-center rounded-xl bg-[#2563eb] shadow-[0_5px_15px_rgba(37,99,235,.2)]"><img className="size-6 invert" src="/pinhere-mark.svg" alt="" /></span>
      PINHERE
    </Link>
  );
}
