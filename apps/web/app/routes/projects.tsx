import { useState } from "react";
import { ChevronDown, Globe2, LoaderCircle, Pencil, Plus, Trash2, X } from "lucide-react";
import { useLoaderData, useParams, useSearchParams } from "react-router";
import type { Route } from "./+types/projects";
import { Button } from "~/components/ui/button";
import { Card } from "~/components/ui/card";
import { ConfirmDialog, Dialog } from "~/components/ui/dialog";
import { Input, Textarea } from "~/components/ui/input";
import { getDatabase } from "~/db/client.server";
import { projectOrigins, projects } from "~/db/schema";
import { desc, eq } from "drizzle-orm";
import { getPrincipal } from "~/lib/principal.server";

function websiteOrigin(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return "";
  return /^[a-z][a-z\d+.-]*:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`;
}

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
  const [originErrors, setOriginErrors] = useState<Record<string, string>>({});
  const [addingOriginId, setAddingOriginId] = useState<string | null>(null);
  const [editingProject, setEditingProject] = useState<typeof items[number] | null>(null);
  const [editName, setEditName] = useState("");
  const [renameBusy, setRenameBusy] = useState(false);
  const [renameError, setRenameError] = useState("");
  const [deletingProject, setDeletingProject] = useState<typeof items[number] | null>(null);
  const [deleteBusy, setDeleteBusy] = useState(false);
  const [deleteError, setDeleteError] = useState("");
  const [removingOrigin, setRemovingOrigin] = useState("");
  const [showCreate, setShowCreate] = useState(initial.projects.length === 0 || Boolean(search.get("origin")));

  async function createProject(event: React.FormEvent) {
    event.preventDefault();
    const normalizedOrigin = websiteOrigin(origin);
    setBusy(true); setError("");
    try {
      const response = await fetch("/api/v1/projects", { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name, description, origins: normalizedOrigin ? [normalizedOrigin] : [] }) });
      const body = await response.json().catch(() => null);
      if (!response.ok) setError(body?.error?.message ?? (en ? "Project creation failed." : "项目创建失败，请重试。"));
      else { setItems((current) => [{ ...body.data, origins: normalizedOrigin ? [new URL(normalizedOrigin).origin.toLowerCase()] : [] }, ...current]); setName(""); setDescription(""); setOrigin(""); setShowCreate(false); }
    } catch { setError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setBusy(false); }
  }

  async function remove(project: typeof items[number]) {
    if (deleteBusy) return;
    setDeleteBusy(true); setDeleteError("");
    try {
      const response = await fetch(`/api/v1/projects/${project.id}`, { method: "DELETE", headers: { "If-Match": `\"${project.version}\"` } });
      if (response.ok) { setItems((current) => current.filter((item) => item.id !== project.id)); setDeletingProject(null); }
      else { const body = await response.json().catch(() => null); setDeleteError(body?.error?.message ?? (en ? "Project deletion failed." : "项目删除失败，请重试。")); }
    } catch { setDeleteError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setDeleteBusy(false); }
  }

  async function renameProject(event: React.FormEvent) {
    event.preventDefault();
    if (!editingProject) return;
    const nextName = editName.trim();
    if (!nextName || nextName === editingProject.name) { setEditingProject(null); return; }
    if (renameBusy) return;
    setRenameBusy(true); setRenameError("");
    try {
      const patchName = (version: number) => fetch(`/api/v1/projects/${editingProject.id}`, { method: "PATCH", headers: { "content-type": "application/json", "If-Match": `\"${version}\"`, "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ name: nextName }) });
      let response = await patchName(editingProject.version);
      let body = await response.json().catch(() => null);

      if (response.status === 412) {
        const latestResponse = await fetch(`/api/v1/projects/${editingProject.id}`);
        const latestBody = await latestResponse.json().catch(() => null);
        if (!latestResponse.ok || !latestBody?.data) throw new Error("refresh_failed");
        const latestProject = latestBody.data as typeof editingProject;
        setItems((current) => current.map((item) => item.id === latestProject.id ? { ...item, ...latestProject } : item));
        if (latestProject.name === nextName) { setEditingProject(null); return; }
        response = await patchName(latestProject.version);
        body = await response.json().catch(() => null);
      }

      if (response.ok) { setItems((current) => current.map((item) => item.id === editingProject.id ? { ...item, ...body.data } : item)); setEditingProject(null); }
      else if (response.status === 412) setRenameError(en ? "The project changed again. Please try once more." : "项目刚刚又被更新，请再试一次。");
      else setRenameError(body?.error?.message ?? (en ? "Project update failed." : "项目更新失败，请重试。"));
    } catch { setRenameError(en ? "Network error. Try again." : "网络异常，请重试。"); }
    finally { setRenameBusy(false); }
  }

  async function addOrigin(project: typeof items[number]) {
    const value = websiteOrigin(originDrafts[project.id] ?? "");
    if (!value) {
      setOriginErrors((current) => ({ ...current, [project.id]: en ? "Enter a domain or website URL." : "请输入域名或站点网址。" }));
      return;
    }
    setAddingOriginId(project.id);
    setOriginErrors((current) => ({ ...current, [project.id]: "" }));
    try {
      const response = await fetch(`/api/v1/projects/${project.id}/origins`, { method: "POST", headers: { "content-type": "application/json", "Idempotency-Key": crypto.randomUUID() }, body: JSON.stringify({ origin: value }) });
      const body = await response.json().catch(() => null);
      if (response.ok) {
        setItems((current) => current.map((item) => item.id === project.id ? { ...item, version: body.data.projectVersion, origins: [...item.origins, body.data.origin] } : item));
        setOriginDrafts((current) => ({ ...current, [project.id]: "" }));
      } else {
        setOriginErrors((current) => ({ ...current, [project.id]: body?.error?.message ?? (en ? "Could not add this website." : "无法添加该站点，请检查后重试。") }));
      }
    } catch {
      setOriginErrors((current) => ({ ...current, [project.id]: en ? "Network error. Try again." : "网络异常，请重试。" }));
    } finally {
      setAddingOriginId(null);
    }
  }

  async function removeOrigin(project: typeof items[number], value: string) {
    const actionKey = `${project.id}:${value}`;
    if (removingOrigin === actionKey) return;
    setRemovingOrigin(actionKey); setOriginErrors((current) => ({ ...current, [project.id]: "" }));
    try {
      const response = await fetch(`/api/v1/projects/${project.id}/origins/${encodeURIComponent(value)}`, { method: "DELETE" });
      if (response.ok) setItems((current) => current.map((item) => item.id === project.id ? { ...item, version: item.version + 1, origins: item.origins.filter((origin) => origin !== value) } : item));
      else { const body = await response.json().catch(() => null); setOriginErrors((current) => ({ ...current, [project.id]: body?.error?.message ?? (en ? "Could not remove this website." : "无法移除该站点，请重试。") })); }
    } catch { setOriginErrors((current) => ({ ...current, [project.id]: en ? "Network error. Try again." : "网络异常，请重试。" })); }
    finally { setRemovingOrigin(""); }
  }

  return <><main className="page-shell min-h-screen"><header className="page-header"><div className="page-kicker"><Globe2 size={13} />Origin routing</div><h1 className="page-title">{en ? "Projects & sites" : "项目与站点"}</h1><p className="page-description">{en ? "Connect each website to one project. Paths and query parameters are ignored." : "把每个网站连接到唯一项目；路径和查询参数不会影响匹配。"}</p></header>
    <div className="grid gap-6 xl:grid-cols-[380px_1fr]"><Card className="h-fit p-4 sm:p-6 xl:sticky xl:top-8"><button type="button" aria-expanded={showCreate} className="focus-ring flex w-full items-center justify-between rounded-xl text-left" onClick={() => setShowCreate((value) => !value)}><h2 className="flex items-center gap-2 text-base font-bold"><span className="grid size-8 place-items-center rounded-xl bg-[#e7edf2] text-[#4f6878]"><Plus size={16} /></span>{en ? "New project" : "新建项目"}</h2><span className="flex items-center gap-2"><span className="hidden font-mono text-[9px] uppercase tracking-[.12em] text-[#7d8790] sm:inline">01 / setup</span><ChevronDown size={17} className={`transition-transform xl:hidden ${showCreate ? "rotate-180" : ""}`} /></span></button><form className={`${showCreate ? "mt-4 block" : "hidden"} space-y-3.5 border-t border-[#dbe1e6] pt-4 xl:mt-5 xl:block`} onSubmit={createProject}><label className="block text-xs font-semibold">{en ? "Project name" : "项目名称"}<Input className="mt-1.5" value={name} onChange={(e) => setName(e.target.value)} required /></label><label className="block text-xs font-semibold">{en ? "Description · optional" : "说明 · 可选"}<Textarea className="mt-1.5 min-h-20" value={description} onChange={(e) => setDescription(e.target.value)} /></label><label className="block text-xs font-semibold">{en ? "Website origin · optional" : "站点网址 · 可选"}<Input className="mt-1.5 font-mono" value={origin} onChange={(e) => setOrigin(e.target.value)} placeholder="app.example.com" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} /></label>{error && <p role="alert" className="rounded-xl bg-[#f7e9e9] px-3 py-2 text-xs text-[#a33f3f]">{error}</p>}<Button className="w-full" disabled={busy}>{busy ? "…" : en ? "Create project" : "创建项目"}</Button></form></Card>
    <section className="space-y-3">{items.map((project, index) => <Card key={project.id} className="p-5 transition-shadow hover:shadow-[0_16px_38px_rgba(35,45,54,.09)] sm:p-6"><div className="flex items-start justify-between gap-4"><div className="flex min-w-0 gap-3"><span className="mt-1 font-mono text-[10px] text-[#4f7184]">{String(index + 1).padStart(2, "0")}</span><div className="min-w-0"><h2 className="text-lg font-bold tracking-[-.025em] text-[#20252a]">{project.name}</h2><p className="mt-1 text-xs leading-5 text-[#737d86]">{project.description || (en ? "No description" : "暂无说明")}</p></div></div><div className="flex"><button title={en ? "Rename" : "重命名"} aria-label={en ? "Rename" : "重命名"} className="focus-ring icon-button text-[#707b84] hover:bg-[#e8edf1] hover:text-[#20252a]" onClick={() => { setRenameError(""); setEditingProject(project); setEditName(project.name); }}><Pencil size={15} /></button><button title={en ? "Delete" : "删除"} aria-label={en ? "Delete" : "删除"} className="focus-ring icon-button text-[#919aa2] hover:bg-[#f5e8e8] hover:text-[#a93e3e]" onClick={() => { setDeleteError(""); setDeletingProject(project); }}><Trash2 size={16} /></button></div></div><div className="mt-5 space-y-2 border-t border-[#e0e5e9] pt-4">{project.origins.map((value) => { const removalKey = `${project.id}:${value}`; return <div key={value} className="flex min-h-11 items-center gap-2 rounded-xl border border-[#d8dee4] bg-[#f1f4f6] px-3 font-mono text-[11px]"><Globe2 size={13} className="shrink-0 text-[#506b7a]" /><span className="min-w-0 flex-1 truncate">{value}</span><button title={en ? "Remove origin" : "删除 Origin"} aria-label={en ? "Remove origin" : "删除 Origin"} disabled={removingOrigin === removalKey} className="focus-ring grid size-8 shrink-0 place-items-center rounded-lg text-[#929ca4] hover:bg-[#f5e8e8] hover:text-[#a93e3e] disabled:opacity-45" onClick={() => void removeOrigin(project, value)}>{removingOrigin === removalKey ? <LoaderCircle size={13} className="animate-spin" /> : <X size={13} />}</button></div>; })}{project.origins.length === 0 && <div className="soft-empty px-3 py-3 text-xs">{en ? "No origin assigned — add one below." : "尚未配置 Origin，可在下方添加。"}</div>}<form className="flex gap-2 pt-1" onSubmit={(event) => { event.preventDefault(); void addOrigin(project); }}><Input aria-label={en ? "New origin" : "新 Origin"} className="font-mono" value={originDrafts[project.id] ?? ""} onChange={(event) => { setOriginDrafts((current) => ({ ...current, [project.id]: event.target.value })); setOriginErrors((current) => ({ ...current, [project.id]: "" })); }} placeholder="app.example.com" type="text" inputMode="url" autoCapitalize="none" autoCorrect="off" spellCheck={false} /><Button aria-label={en ? "Add origin" : "添加 Origin"} title={en ? "Add website" : "添加站点"} type="submit" variant="outline" disabled={addingOriginId === project.id}>{addingOriginId === project.id ? <LoaderCircle size={15} className="animate-spin" /> : <Plus size={15} />}</Button></form>{originErrors[project.id] && <p role="alert" className="rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{originErrors[project.id]}</p>}</div></Card>)}{!items.length && <div className="soft-empty p-12 text-center text-sm">{en ? "No projects yet. Create your first one to get started." : "还没有项目，从左侧创建第一个吧。"}</div>}</section></div></main>
    <Dialog open={Boolean(editingProject)} title={en ? "Rename project" : "重命名项目"} description={en ? "Use a short name your team can recognize at a glance." : "使用团队一眼就能认出的简短名称。"} onClose={() => { if (!renameBusy) setEditingProject(null); }}><form onSubmit={renameProject} className="space-y-4"><label className="block text-xs font-semibold">{en ? "Project name" : "项目名称"}<Input className="mt-2" value={editName} onChange={(event) => { setEditName(event.target.value); setRenameError(""); }} autoFocus required /></label>{renameError && <p role="alert" className="rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{renameError}</p>}<div className="flex justify-end gap-2"><Button type="button" variant="outline" disabled={renameBusy} onClick={() => setEditingProject(null)}>{en ? "Cancel" : "取消"}</Button><Button type="submit" disabled={renameBusy}>{renameBusy ? "…" : en ? "Save" : "保存"}</Button></div></form></Dialog>
    <ConfirmDialog open={Boolean(deletingProject)} title={en ? "Delete this project?" : "删除这个项目？"} description={deletingProject ? (en ? `${deletingProject.name} and all of its issues will be permanently removed.` : `「${deletingProject.name}」及其全部缺陷将被永久删除。`) : ""} confirmLabel={en ? "Delete project" : "确认删除"} cancelLabel={en ? "Cancel" : "取消"} busy={deleteBusy} error={deleteError} onClose={() => { if (!deleteBusy) setDeletingProject(null); }} onConfirm={() => { if (deletingProject) void remove(deletingProject); }} />
  </>;
}
