import { Crosshair } from "lucide-react";
import { Link } from "react-router";

export function Logo({ locale = "zh-CN" }: { locale?: string }) {
  return (
    <Link to={`/${locale}`} className="focus-ring inline-flex items-center gap-2 rounded-lg text-[15px] font-extrabold tracking-[-.02em]">
      <span className="grid size-8 place-items-center rounded-[9px] bg-[#171916] text-white shadow-[3px_3px_0_#164dd8]">
        <Crosshair size={17} strokeWidth={2.4} />
      </span>
      PINHERE
    </Link>
  );
}
