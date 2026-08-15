import type { Route } from "./+types/api";
import { pinhereApi } from "~/api/app.server";

export function loader({ request }: Route.LoaderArgs) {
  return pinhereApi.fetch(request);
}

export function action({ request }: Route.ActionArgs) {
  return pinhereApi.fetch(request);
}
