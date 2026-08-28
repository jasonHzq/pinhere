import type { MetaFunction, ShouldRevalidateFunctionArgs } from "react-router";
import { Outlet, redirect, useLoaderData } from "react-router";
import type { Route } from "./+types/app-layout";
import { AppShell } from "~/components/app-shell";
import { getPrincipal } from "~/lib/principal.server";

export const meta: MetaFunction = () => [{ name: "robots", content: "noindex, nofollow" }, { title: "Workspace — Pinhere" }];

export async function loader({ request, params }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) {
    const returnTo = new URL(request.url).pathname + new URL(request.url).search;
    throw redirect(`/${params.locale ?? "zh-CN"}/sign-in?returnTo=${encodeURIComponent(returnTo)}`);
  }
  return { userId: principal.userId };
}

// The user id is session-scoped and every child loader already authorizes its
// own request. Keeping this parent data avoids a duplicate auth database round
// trip on every in-workspace navigation.
export function shouldRevalidate({ formMethod, currentParams, nextParams, defaultShouldRevalidate }: ShouldRevalidateFunctionArgs) {
  if (!formMethod && currentParams.locale === nextParams.locale) return false;
  return defaultShouldRevalidate;
}

export default function AppLayout() {
  const { userId } = useLoaderData<typeof loader>();
  return <AppShell userId={userId}><Outlet /></AppShell>;
}
