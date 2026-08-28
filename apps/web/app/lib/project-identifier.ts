export const PROJECT_IDENTIFIER_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

export function normalizeProjectIdentifier(value: string) {
  return value
    .normalize("NFKD")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 32)
    .replace(/-+$/g, "");
}

export function isProjectIdentifier(value: string) {
  return value.length >= 3 && value.length <= 32 && PROJECT_IDENTIFIER_PATTERN.test(value);
}
