import { useState } from "react";
import { Globe2, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLoaderData, useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/projects";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { Input, Textarea } from "~/components/ui/input";
import { getDatabase } from "~/db/client.server";
import { projectOrigins, projects } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPrincipal } from "~/lib/principal.server";

export async function loader({ request }: Route.LoaderArgs) {
  const principal = await getPrincipal(request);
  if (!principal) throw new Response("Unauthorized", { status: 401 });
  const db = getDatabase();
  const [projectRows, originRows] = await Promise.all([
    db.select().from(projects).where(eq(projects.userId, principal.userId)).orderBy(desc(projects.createdAt)),
    db.select().from(projectOrigins).where(eq(projectOrigins.userId, principal.userId))
  ]);
  return { projects: projectRows.map((project) => ({ ...project, origins: originRows.filter((item) => item.projectId === project.id).map((item) => item.origin) })) };
}

export default function Projects() {
  const initial = useLoaderData<typeof loader>();
  const { locale = "zh-CN" } = useParams();
  const [search] = useSearchParams();
  const en = locale === "en";
  const [items, setItems] = useState(initial.projects);
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [origin, setOrigin] = useState(search.get("origin") ?? "");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [originDrafts, setOriginDrafts] = useState<Record<string, string>>({});

  async function createProject(event: React.FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    const response = await fetch("/api/v1/projects", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ name, description, origins: origin ? [origin] : [] }) });
    const body = await response.json();
    if (!response.ok) setError(body.error?.message ?? "Failed");
    else { setItems([{ ...body.data, origins: origin ? [new URL(origin).origin.toLowerCase()] : [] }, ...items]); setName(""); setDescription(""); setOrigin(""); }
    setBusy(false);
  }

  async function remove(project: typeof items[number]) {
    if (!confirm(en ? `Delete ${project.name}?` : `确认删除「${project.name}」及其全部缺陷？`)) return;
    const response = await fetch(`/api/v1/projects/${project.id}`, { method: "DELETE", headers: { "If-Match": `\"${project.version}\"` } });
    if (response.ok) setItems(items.filter((item) => item.id !== project.id));
  }

  async function edit(project: typeof items[number]) {
    const nextName = prompt(en ? "Project name" : "项目名称", project.name)?.trim();
    if (!nextName || nextName === project.name) return;
    const response = await fetch(`/api/v1/projects/${project.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${project.version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: nextName }) });
    const body = await response.json();
    if (response.ok) setItems(items.map((item) => item.id === project.id ? { ...item, ...body.data } : item));
    else setError(body.error?.message ?? "Update failed");
  }

  async function addOrigin(project: typeof items[number]) {
    const value = originDrafts[project.id]?.trim(); if (!value) return;
    const response = await fetch(`/api/v1/projects/${project.id}/origins`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ origin: value }) });
    const body = await response.json();
    if (response.ok) {
      setItems(items.map((item) => item.id === project.id ? { ...item, version: body.data.projectVersion, origins: [...item.origins, body.data.origin] } : item));
      setOriginDrafts({ ...originDrafts, [project.id]: "" });
    } else setError(body.error?.message ?? "Origin update failed");
  }

  async function removeOrigin(project: typeof items[number], value: string) {
    const response = await fetch(`/api/v1/projects/${project.id}/origins/${encodeURIComponent(value)}`, { method: "DELETE" });
    if (response.ok) setItems(items.map((item) => item.id === project.id ? { ...item, version: item.version + 1, origins: item.origins.filter((origin) => origin !== value) } : item));
  }

  return <main className="min-h-screen p-5 md:p-8 xl:p-10"><header className="mb-8"><div className="font-mono text-[10px] uppercase tracking-[.16em] text-[#164dd8]">Origin routing</div><h1 className="mt-2 text-4xl font-extrabold tracking-[-.06em]">{en ? "Projects" : "项目与网址归属"}</h1><p className="mt-2 text-sm text-[#696d67]">{en ? "An origin can belong to only one of your projects." : "同一 Origin 只能归属你的一个项目；路径、查询参数和 Hash 不参与匹配。"}</p></header>
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit p-6"><h2 className="mb-5 flex items-center gap-2 text-lg font-bold"><Plus size={18} className="text-[#164dd8]" />{en ? "New project" : "新建项目"}</h2><form className="space-y-4" onSubmit={createProject}><label className="block text-xs font-bold">{en ? "Project name" : "项目名称"}<Input className="mt-2" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="block text-xs font-bold">{en ? "Description" : "说明"}<Textarea className="mt-2 min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} /></label><label className="block text-xs font-bold">Origin<Input className="mt-2 font-mono text-xs" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="https://app.example.com" type="url" /></label>{error && <p className="text-xs text-[#bb2d3b]">{error}</p>}<Button className="w-full" disabled={busy}>{busy ? "…" : en ? "Create project" : "创建项目"}</Button></form></Card>
    <section className="space-y-3">{items.map((project) => <Card key={project.id} className="p-5"><div className="flex items-start justify-between gap-4"><div><h2 className="text-lg font-extrabold tracking-[-.025em]">{project.name}</h2><p className="mt-1 text-xs text-[#777a73]">{project.description || (en ? "No description" : "暂无说明")}</p></div><div className="flex"><button title={en ? "Rename" : "重命名"} className="focus-ring rounded-lg p-2 text-[#777a73] hover:bg-[#e8efff] hover:text-[#164dd8]" onClick={() => void edit(project)}><Pencil size={15} /></button><button title={en ? "Delete" : "删除"} className="focus-ring rounded-lg p-2 text-[#999b95] hover:bg-[#fee8e8] hover:text-[#bb2d3b]" onClick={() => void remove(project)}><Trash2 size={16} /></button></div></div><div className="mt-5 space-y-2">{project.origins.map((value) => <div key={value} className="flex items-center gap-2 rounded-lg border border-[#deddd7] bg-white px-3 py-2 font-mono text-[11px]"><Globe2 size={13} className="shrink-0 text-[#164dd8]" /><span className="min-w-0 flex-1 truncate">{value}</span><button title={en ? "Remove origin" : "删除 Origin"} className="rounded p-1 text-[#aaa] hover:bg-[#fee8e8] hover:text-[#bb2d3b]" onClick={() => void removeOrigin(project, value)}><X size={13} /></button></div>)}{project.origins.length === 0 && <div className="rounded-lg border border-dashed border-[#d2d1ca] px-3 py-3 text-xs text-[#8b8e87]">{en ? "No origin assigned" : "尚未配置 Origin"}</div>}<div className="flex gap-2 pt-1"><Input className="font-mono text-xs" value={originDrafts[project.id] ?? ""} onChange={(event) => setOriginDrafts({ ...originDrafts, [project.id]: event.target.value })} placeholder="https://app.example.com" type="url" /><Button type="button" variant="outline" onClick={() => void addOrigin(project)}><Plus size={15} /></Button></div></div></Card>)}{!items.length && <div className="rounded-[17px] border border-dashed border-[#bbb9b2] p-12 text-center text-sm text-[#777a73]">{en ? "No projects yet." : "还没有项目。"}</div>}</section></div></main>;
}
