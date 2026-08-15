import type { MetaFunction } from "react-router";
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

export default function AppLayout() {
  const { userId } = useLoaderData<typeof loader>();
  return <AppShell userId={userId}><Outlet /></AppShell>;
}
