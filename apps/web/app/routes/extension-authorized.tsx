import { CheckCircle2 } from "lucide-react";
import type { MetaFunction } from "react-router";
import { useParams } from "react-router";
import { Card } from "~/components/ui/card";

export const meta: MetaFunction = () => [
  { title: "Extension authorized | Pinhere" },
  { name: "robots", content: "noindex, nofollow" }
];

export default function ExtensionAuthorized() {
  const { locale = "zh-CN" } = useParams();
  const en = locale === "en";
  return <main className="workspace-grid noise grid min-h-screen place-items-center px-5 py-12 text-[#171a1d]"><Card className="warm-panel w-full max-w-[440px] p-8 text-center"><span className="mx-auto grid size-14 place-items-center rounded-full bg-[#e3f3e9] text-[#26704e]"><CheckCircle2 size={26} /></span><h1 className="font-display mt-5 text-2xl font-bold tracking-[-.04em]">{en ? "Pinhere is connected" : "Pinhere 已连接"}</h1><p className="mt-3 text-sm leading-6 text-[#69737c]">{en ? "Safari should close this tab automatically. You can return to the extension and start selecting page issues." : "Safari 应会自动关闭此标签页。现在可以返回扩展，开始圈选页面问题。"}</p></Card></main>;
}
