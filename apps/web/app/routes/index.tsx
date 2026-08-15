import type { Route } from "./+types/index";
import { redirect } from "react-router";

export function loader({ request }: Route.LoaderArgs) {
  const language = request.headers.get("accept-language")?.toLowerCase() ?? "";
  return redirect(language.startsWith("en") ? "/en" : "/zh-CN");
}
