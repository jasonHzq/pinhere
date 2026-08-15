import { Link } from "react-router";

export function Logo({ locale = "zh-CN" }: { locale?: string }) {
  return (
    <Link to={`/${locale}`} className="focus-ring inline-flex items-center gap-2 rounded-lg text-[15px] font-extrabold tracking-[-.02em]">
      <img className="size-8" src="/pinhere-mark.svg" alt="" />
      PINHERE
    </Link>
  );
}
