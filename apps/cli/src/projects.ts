import type { PinhereApi } from "./api.js";
import type { Binding } from "./config.js";

export type Project = {
  id: string;
  identifier: string;
  name: string;
  description?: string;
};

const projectIdentifierPattern = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function requireProjectIdentifier(value: string | undefined) {
  if (!value) throw new Error("--project <identifier> is required");
  if (value.startsWith("prj_")) {
    throw new Error("Use the project identifier, not its internal ID. Run: pinhere projects list");
  }
  if (!projectIdentifierPattern.test(value)) {
    throw new Error("Project identifier must use lowercase letters, numbers, and single dashes");
  }
  return value;
}

export async function listProjects(api: PinhereApi) {
  return api.get<Project[]>("/projects");
}

export async function resolveProject(api: PinhereApi, identifier: string) {
  const projects = await listProjects(api);
  const project = projects.find((candidate) => candidate.identifier === identifier);
  if (!project) {
    const available = projects.map((candidate) => candidate.identifier).join(", ");
    throw new Error(`Project '${identifier}' was not found${available ? `. Available projects: ${available}` : ""}`);
  }
  return { project, projects };
}

export function publicProject(project: Project) {
  return {
    identifier: project.identifier,
    name: project.name,
    description: project.description ?? ""
  };
}

export function publicBinding(binding: Binding, projects: Project[] = []) {
  const identifier = binding.projectIdentifier
    ?? projects.find((project) => project.id === binding.projectId)?.identifier
    ?? "unknown-project";
  return {
    project: identifier,
    path: binding.path,
    harness: binding.harness,
    mode: binding.mode,
    status: binding.paused ? "paused" : "active"
  };
}

export function exposeProjectIdentifiers(value: unknown, projects: Project[]): unknown {
  if (Array.isArray(value)) return value.map((item) => exposeProjectIdentifiers(item, projects));
  if (!value || typeof value !== "object") return value;

  const exposed: Record<string, unknown> = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === "projectId") {
      exposed.projectIdentifier = projects.find((project) => project.id === item)?.identifier ?? null;
      continue;
    }
    exposed[key] = exposeProjectIdentifiers(item, projects);
  }
  return exposed;
}
