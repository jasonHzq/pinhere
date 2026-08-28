export type AgentAccessMode = "autopilot" | "on-demand" | "custom";

type AgentPromptOptions = {
  en: boolean;
  mode: AgentAccessMode;
  origin: string;
  projectIdentifier?: string;
};

function projectValue(projectIdentifier?: string) {
  return projectIdentifier?.trim() || "<project-identifier>";
}

export function buildAgentAccessPrompt({ en, mode, origin, projectIdentifier }: AgentPromptOptions) {
  const project = projectValue(projectIdentifier);

  if (en && mode === "autopilot") return `Connect this repository to Pinhere so my coding agent can automatically receive and repair browser-reported issues.

1. Read ${origin}/.well-known/pinhere-skill-install.md first and follow its latest instructions.
2. Verify Node.js 22 or newer, then install or upgrade the CLI with: npm install --global pinhere
3. Install the Pinhere skill with: pinhere skill install --agent auto
4. Run pinhere auth login. When the pairing page opens, pause and let me approve it in the browser.
5. Run pinhere projects list, then bind project "${project}" to this repository with unattended mode: pinhere agent bind --project ${project} --path "$(pwd)" --mode yolo
6. Run pinhere agent doctor. If it passes, install and start the background service with: pinhere agent service install
7. Verify with pinhere agent status and pinhere agent service status.

Never ask me to paste or expose a token, and never write credentials into the repository. When interaction is required, only ask me to complete it in the browser. Finish with a concise status report and any blocker that still needs me.`;

  if (en && mode === "on-demand") return `Set up Pinhere in this repository for on-demand, human-supervised repairs.

1. Read ${origin}/.well-known/pinhere-skill-install.md and follow the latest instructions.
2. Verify Node.js 22 or newer, install or upgrade the CLI with npm install --global pinhere, then run pinhere skill install --agent auto.
3. Run pinhere auth login and pause while I approve the pairing in the browser.
4. Run pinhere projects list, then bind project "${project}" to the current repository with: pinhere agent bind --project ${project} --path "$(pwd)" --mode workspace
5. Run pinhere agent doctor and pinhere issues list --project ${project} to verify access.

Do not install a background service. Do not ask me to paste a token or store credentials in the repository. Explain how I can later ask the agent to inspect or repair one Pinhere issue, then report the final setup status.`;

  if (en) return `Help me connect the agent workflow in this repository to Pinhere through its API and webhooks.

1. Read ${origin}/.well-known/pontx.json and ${origin}/.well-known/pinhere-skill.md. Use only documented endpoints and event fields.
2. Inspect the current repository and propose the smallest integration for: issue.created -> claim -> heartbeat while working -> complete or release.
3. Ask me to create an access token and webhook from ${origin}/en/app/settings when needed. Never ask me to paste secrets into chat or commit them; use environment variables and the project's existing secret-management pattern.
4. Implement signature verification, idempotent event handling, useful error logging, and tests using the repository's conventions.
5. Verify the integration locally and give me a concise checklist for enabling it.

Use project "${project}" when a project scope is required. Stop and ask before any external deployment or irreversible change.`;

  if (mode === "autopilot") return `请在当前代码仓库接入 Pinhere，让 Coding Agent 能自动接收并修复浏览器上报的问题。

1. 先阅读 ${origin}/.well-known/pinhere-skill-install.md，并遵循其中的最新说明。
2. 检查 Node.js 是否为 22 或更高版本，然后安装或升级 CLI：npm install --global pinhere
3. 安装 Pinhere Skill：pinhere skill install --agent auto
4. 运行 pinhere auth login。打开配对页后先暂停，等我在浏览器中批准。
5. 运行 pinhere projects list，然后把项目「${project}」以无人值守模式绑定到当前仓库：pinhere agent bind --project ${project} --path "$(pwd)" --mode yolo
6. 运行 pinhere agent doctor；通过后用 pinhere agent service install 安装并启动常驻服务。
7. 用 pinhere agent status 和 pinhere agent service status 完成验证。

不要要求我粘贴或暴露 Token，也不要把凭证写入仓库；需要交互授权时，只提示我在浏览器完成。最后简洁汇报每一项状态，以及仍需我处理的阻塞。`;

  if (mode === "on-demand") return `请在当前代码仓库以“按需协作”方式接入 Pinhere，由我发起任务、Agent 在工作区权限内处理。

1. 阅读 ${origin}/.well-known/pinhere-skill-install.md，并遵循最新说明。
2. 检查 Node.js 是否为 22 或更高版本，安装或升级 CLI：npm install --global pinhere；然后运行 pinhere skill install --agent auto。
3. 运行 pinhere auth login，打开配对页后暂停，等我在浏览器中批准。
4. 运行 pinhere projects list，然后绑定项目「${project}」：pinhere agent bind --project ${project} --path "$(pwd)" --mode workspace
5. 运行 pinhere agent doctor 和 pinhere issues list --project ${project} 验证接入。

不要安装后台常驻服务，不要要求我粘贴 Token，也不要把凭证写入仓库。最后说明以后我应该如何让 Agent 查看或修复某一条 Pinhere 缺陷，并汇报接入状态。`;

  return `请帮我把当前仓库里的 Agent 工作流通过 API 和 Webhook 接入 Pinhere。

1. 先阅读 ${origin}/.well-known/pontx.json 和 ${origin}/.well-known/pinhere-skill.md，只使用文档中存在的端点与事件字段。
2. 检查当前仓库，提出最小接入方案：issue.created -> claim -> 处理中持续 heartbeat -> complete 或 release。
3. 需要时让我到 ${origin}/zh-CN/app/settings 创建访问令牌和 Webhook。不要让我把 Secret 粘贴到对话或提交进仓库；请使用环境变量和项目现有的密钥管理方式。
4. 按仓库规范实现签名校验、幂等事件处理、可排查的错误日志和自动化测试。
5. 在本地验证接入，并给我一份简短的启用清单。

需要项目范围时使用项目「${project}」。任何外部部署或不可逆操作前先停下来询问我。`;
}
