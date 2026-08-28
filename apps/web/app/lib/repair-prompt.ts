export const PINHERE_SKILL_URL = process.env.PINHERE_SKILL_URL ?? "https://pinhere.dev/.well-known/pinhere-skill.md";
export const PINHERE_SKILL_INSTALL_URL = process.env.PINHERE_SKILL_INSTALL_URL ?? "https://pinhere.dev/.well-known/pinhere-skill-install.md";

export function repairPrompt(issueId: string) {
  return `请使用 Pinhere Skill 修复问题 ${issueId}。\n如果 Pinhere Skill 尚未安装或当前不可用，请先阅读并执行安装说明：${PINHERE_SKILL_INSTALL_URL}\n安装完成后立即读取安装命令返回的本地 SKILL.md 并继续当前任务，不要等待 Agent 刷新，也不要让我重新发送问题。若当前环境无法安装，则读取 ${PINHERE_SKILL_URL} 并仅在本次会话使用。然后使用 Pinhere CLI 获取、认领、修复、验证并回写这个问题。`;
}
