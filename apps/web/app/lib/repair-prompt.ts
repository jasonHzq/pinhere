export const PINHERE_SKILL_URL = process.env.PINHERE_SKILL_URL ?? "https://pinhere.dev/.well-known/pinhere-skill.md";

export function repairPrompt(issueId: string) {
  return `请使用 Pinhere Skill 修复问题 ${issueId}。\n如果尚未安装 Pinhere Skill，请先从 ${PINHERE_SKILL_URL} 安装，然后使用 Pinhere CLI 获取、认领、修复、验证并回写这个问题。`;
}

