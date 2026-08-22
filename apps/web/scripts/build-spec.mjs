import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const ref = (name) => ({ $ref: `#/components/schemas/${name}` });
const content = (schema) => ({ schema, content: { "application/json": { schema } } });
const body = (name) => ({ name: "body", in: "body", required: true, ...content(ref(name)) });
const envelope = (description, schema) => ({
  type: "object",
  description,
  required: ["data"],
  properties: { data: { ...schema, description } }
});
const response = (description, schema) => schema ? { description, ...content(schema) } : { description };

export function buildSpec(locale) {
  if (locale !== "zh-CN" && locale !== "en-US") throw new Error(`Unsupported locale: ${locale}`);
  const d = (zh, en) => locale === "zh-CN" ? zh : en;
  const disabled = (zh, en) => ({ execution: { enabled: false, disabledReason: d(zh, en) } });
  const privateRead = disabled(
    "响应包含账号私有资源、缺陷正文、DOM、截图、Token 元数据或投递诊断；Pontx Hub 不代理执行，请仅在受控本地环境中使用调用方自己的凭证。",
    "Responses contain private account resources, issue text, DOM context, screenshots, token metadata, or delivery diagnostics. Pontx Hub does not proxy execution; use caller-owned credentials only in a controlled local environment."
  );
  const persistentMutation = disabled(
    "该接口会产生持久化状态变更；Pontx Hub 不代理执行。CLI 必须先预览，并在显式确认后才可使用调用方自己的凭证执行。",
    "This endpoint creates a persistent state change and is not proxied by Pontx Hub. The CLI must preview first and execute with caller-owned credentials only after explicit confirmation."
  );
  const destructiveMutation = disabled(
    "该接口会删除、撤销或改变持久化资源及其关联数据；Pontx Hub 不代理执行。CLI 必须先预览，并要求显式确认。",
    "This endpoint deletes, revokes, or changes persistent resources and related data and is not proxied by Pontx Hub. The CLI must preview first and require explicit confirmation."
  );
  const secretMutation = disabled(
    "该接口会创建、轮换或返回只显示一次的凭证；Pontx Hub 不代理执行，也不得记录返回值。CLI 必须先预览并要求显式确认。",
    "This endpoint creates, rotates, or returns a one-time credential. Pontx Hub does not proxy it and its result must not be logged. The CLI must preview first and require explicit confirmation."
  );
  const externalMutation = disabled(
    "该接口会向外部 Webhook 发起或重试网络投递；Pontx Hub 不代理执行。CLI 必须先预览并要求显式确认。",
    "This endpoint initiates or retries delivery to an external webhook and is not proxied by Pontx Hub. The CLI must preview first and require explicit confirmation."
  );
  const tokenExchange = disabled(
    "该接口交换并返回 OAuth 访问令牌与刷新令牌；Pontx Hub 不代理执行，凭证只能由调用方环境持有且不得写入日志。",
    "This endpoint exchanges and returns OAuth access and refresh tokens. Pontx Hub does not proxy it; credentials must remain in the caller environment and must not be logged."
  );

  const websiteSession = [{ websiteSession: [] }];
  const patReadProjects = [{ pinherePat: ["projects:read"] }, { websiteSession: [] }, { extensionOAuth: ["projects:read"] }];
  const patReadIssues = [{ pinherePat: ["issues:read"] }, { websiteSession: [] }];
  const patWriteIssues = [{ pinherePat: ["issues:write"] }, { websiteSession: [] }];
  const patWriteAgents = [{ pinherePat: ["agents:write"] }, { websiteSession: [] }];
  const extensionCreateIssue = [{ extensionOAuth: ["issues:create"] }, { websiteSession: [] }];
  const extensionWriteAttachment = [{ extensionOAuth: ["attachments:write"] }, { websiteSession: [] }];
  const errorSchema = ref("ErrorResponse");
  const defaultError = d("标准错误响应。", "Standard error response.");
  const withErrors = (items) => ({ ...items, default: response(defaultError, errorSchema) });
  const requestExample = ({ path = {}, query = {}, headers = {}, body: value, status = "200" } = {}) => ({
    default: {
      request: value === undefined ? { path, query, headers } : { path, query, headers, body: value },
      expectedStatus: status
    }
  });
  const op = ({ id, tag, summary, description, method, path, parameters = [], responses, security, examples, metadata, produces }) => [
    `${tag}/${id}`,
    {
      operationId: id,
      summary: d(...summary),
      description: d(...description),
      method,
      path,
      consumes: parameters.some((item) => item.in === "body" || item.$ref?.endsWith("Body")) ? ["application/json"] : [],
      produces: produces ?? (method === "DELETE" ? [] : ["application/json"]),
      parameters,
      responses: withErrors(responses),
      tags: [tag],
      security,
      requestExamples: requestExample(examples),
      metadata
    }
  ];
  const idPath = {
    project: { projectId: "prj_example" },
    issue: { issueId: "iss_example" },
    attachment: { attachmentId: "att_example" },
    webhook: { webhookId: "whk_example" },
    delivery: { webhookId: "whk_example", deliveryId: "whd_example" },
    token: { tokenId: "pat_example" }
  };
  const exampleDom = {
    cssSelector: "#checkout-button",
    xpath: "//*[@id='checkout-button']",
    tagName: "BUTTON",
    attributes: { id: "checkout-button", type: "submit" },
    text: "Submit order",
    outerHTML: "<button id=\"checkout-button\" type=\"submit\">Submit order</button>",
    viewport: { width: 1440, height: 900, devicePixelRatio: 2 },
    boundingRect: { x: 1040, y: 720, width: 180, height: 44 }
  };

  const schemas = {
    ErrorResponse: {
      title: d("错误响应", "Error response"),
      description: d("所有失败响应使用的稳定错误封装。", "Stable error envelope used by failed requests."),
      type: "object", required: ["error"], properties: {
        error: { type: "object", description: d("错误详情。", "Error details."), required: ["code", "message", "requestId"], properties: {
          code: { type: "string", description: d("机器可读错误码。", "Machine-readable error code."), examples: ["validation_error"] },
          message: { type: "string", description: d("面向调用方的错误说明。", "Caller-facing error message."), examples: ["The request is invalid"] },
          requestId: { type: "string", description: d("用于排障的请求标识。", "Request identifier for troubleshooting."), examples: ["req_example"] }
        } }
      }
    },
    Project: {
      title: d("项目", "Project"), description: d("属于当前账号的 Pinhere 项目。", "A Pinhere project owned by the current account."),
      type: "object", required: ["id", "userId", "name", "description", "createdAt", "updatedAt", "version"], properties: {
        id: { type: "string", description: d("项目 ID。", "Project ID."), examples: ["prj_example"] },
        userId: { type: "string", description: d("项目所有者 ID。", "Project owner ID."), examples: ["usr_example"] },
        name: { type: "string", minLength: 1, maxLength: 100, description: d("项目名称。", "Project name."), examples: ["Checkout"] },
        description: { type: "string", maxLength: 1000, description: d("项目说明。", "Project description."), examples: ["Checkout experience issues"] },
        createdAt: { type: "string", format: "date-time", description: d("创建时间。", "Creation time."), examples: ["2026-08-15T08:00:00.000Z"] },
        updatedAt: { type: "string", format: "date-time", description: d("最后更新时间。", "Last update time."), examples: ["2026-08-15T08:00:00.000Z"] },
        version: { type: "integer", minimum: 1, description: d("用于 ETag 与 If-Match 的资源版本。", "Resource version used by ETag and If-Match."), examples: [1] }
      }
    },
    ProjectWithOrigins: {
      title: d("项目详情", "Project details"), description: d("项目及其标准化 Origin。", "A project and its normalized origins."),
      allOf: [ref("Project"), { type: "object", description: d("项目 Origin 扩展字段。", "Project-origin extension fields."), required: ["origins"], properties: {
        origins: { type: "array", maxItems: 50, description: d("归属于项目的标准化 Origin。", "Normalized origins assigned to the project."), items: { type: "string", format: "uri", description: d("标准化 Origin。", "Normalized origin."), examples: ["https://shop.example.com"] } }
      } }]
    },
    ProjectInput: {
      title: d("创建项目输入", "Create project input"), description: d("创建项目并可同时设置 Origin。", "Creates a project with optional origins."),
      type: "object", required: ["name"], properties: {
        name: { type: "string", minLength: 1, maxLength: 100, description: d("去除首尾空白后的项目名称。", "Project name after trimming surrounding whitespace."), examples: ["Checkout"] },
        description: { type: "string", maxLength: 1000, description: d("项目说明，缺省为空字符串。", "Project description; defaults to an empty string."), examples: ["Checkout experience issues"] },
        origins: { type: "array", maxItems: 50, description: d("要归属于项目的页面 Origin。", "Page origins to assign to the project."), items: { type: "string", format: "uri", description: d("包含协议、域名和可选端口的 URL。", "URL containing scheme, host, and optional port."), examples: ["https://shop.example.com"] } }
      }
    },
    ProjectUpdateInput: {
      title: d("更新项目输入", "Update project input"), description: d("可选更新项目名称或说明。", "Optionally updates a project name or description."), type: "object", properties: {
        name: { type: "string", minLength: 1, maxLength: 100, description: d("新的项目名称。", "New project name."), examples: ["Checkout v2"] },
        description: { type: "string", maxLength: 1000, description: d("新的项目说明。", "New project description."), examples: ["Updated checkout issues"] }
      }
    },
    OriginInput: { title: d("Origin 输入", "Origin input"), description: d("要添加到项目的 Origin。", "Origin to add to a project."), type: "object", required: ["origin"], properties: {
      origin: { type: "string", format: "uri", description: d("将按协议、域名和端口进行标准化的 URL。", "URL normalized by scheme, host, and port."), examples: ["https://shop.example.com/checkout"] }
    } },
    OriginResult: { title: d("Origin 结果", "Origin result"), description: d("已添加 Origin 与新的项目版本。", "Added origin and new project version."), type: "object", required: ["origin", "projectVersion"], properties: {
      origin: { type: "string", format: "uri", description: d("标准化后的 Origin。", "Normalized origin."), examples: ["https://shop.example.com"] },
      projectVersion: { type: "integer", minimum: 1, description: d("添加后的项目版本。", "Project version after the addition."), examples: [2] }
    } },
    ResolveProjectResult: { title: d("项目解析结果", "Project resolution result"), description: d("匹配项目及标准化 Origin。", "Matched project and normalized origin."), type: "object", required: ["project", "origin"], properties: {
      project: { ...ref("Project"), nullable: true, description: d("匹配项目；未匹配时为 null。", "Matched project, or null when no project matches.") },
      origin: { type: "string", format: "uri", description: d("从页面 URL 提取的标准化 Origin。", "Normalized origin extracted from the page URL."), examples: ["https://shop.example.com"] }
    } },
    DomContext: {
      title: d("DOM 上下文", "DOM context"), description: d("浏览器扩展采集并清洗的目标元素上下文。", "Sanitized target-element context captured by the browser extension."),
      type: "object", required: ["cssSelector", "xpath", "tagName", "attributes", "text", "outerHTML", "viewport", "boundingRect"], properties: {
        cssSelector: { type: "string", maxLength: 2000, description: d("目标元素 CSS 选择器。", "CSS selector for the target element."), examples: ["#checkout-button"] },
        xpath: { type: "string", maxLength: 2000, description: d("目标元素 XPath。", "XPath for the target element."), examples: ["//*[@id='checkout-button']"] },
        tagName: { type: "string", maxLength: 100, description: d("大写 HTML 标签名。", "Uppercase HTML tag name."), examples: ["BUTTON"] },
        attributes: { type: "object", description: d("清洗后的元素属性；每个值最多 2000 字符。", "Sanitized element attributes, each limited to 2,000 characters."), additionalProperties: { type: "string", maxLength: 2000, description: d("属性值。", "Attribute value."), examples: ["checkout-button"] } },
        text: { type: "string", maxLength: 5000, description: d("目标元素文本。", "Target element text."), examples: ["Submit order"] },
        outerHTML: { type: "string", maxLength: 30000, description: d("清洗后的目标元素 HTML。", "Sanitized target element HTML."), examples: ["<button id=\"checkout-button\">Submit order</button>"] },
        viewport: { type: "object", description: d("采集时的视口。", "Viewport at capture time."), required: ["width", "height", "devicePixelRatio"], properties: {
          width: { type: "number", exclusiveMinimum: 0, description: d("CSS 像素宽度。", "Width in CSS pixels."), examples: [1440] },
          height: { type: "number", exclusiveMinimum: 0, description: d("CSS 像素高度。", "Height in CSS pixels."), examples: [900] },
          devicePixelRatio: { type: "number", exclusiveMinimum: 0, maximum: 8, description: d("设备像素比。", "Device pixel ratio."), examples: [2] }
        } },
        boundingRect: { type: "object", description: d("元素相对视口的矩形。", "Element rectangle relative to the viewport."), required: ["x", "y", "width", "height"], properties: {
          x: { type: "number", description: d("左侧坐标。", "Left coordinate."), examples: [1040] }, y: { type: "number", description: d("顶部坐标。", "Top coordinate."), examples: [720] },
          width: { type: "number", minimum: 0, description: d("矩形宽度。", "Rectangle width."), examples: [180] }, height: { type: "number", minimum: 0, description: d("矩形高度。", "Rectangle height."), examples: [44] }
        } }
      }
    },
    IssueStatus: { title: d("缺陷状态", "Issue status"), description: d("缺陷状态机的固定状态。", "Fixed states in the issue lifecycle."), type: "string", enum: ["open", "in_progress", "done"], enumValueTitles: { open: d("待处理", "Open"), in_progress: d("处理中", "In progress"), done: d("已完成", "Done") }, examples: ["open"] },
    IssueSource: { title: d("缺陷来源", "Issue source"), description: d("创建缺陷的调用来源。", "Caller source that created the issue."), type: "string", enum: ["extension", "web", "api"], enumValueTitles: { extension: d("浏览器扩展", "Browser extension"), web: d("网站", "Website"), api: "API" }, examples: ["extension"] },
    Issue: {
      title: d("缺陷", "Issue"), description: d("包含页面上下文与处理状态的私有缺陷。", "Private issue containing page context and processing state."), type: "object",
      required: ["id", "userId", "projectId", "title", "description", "pageUrl", "dom", "status", "source", "createdAt", "updatedAt", "version"], properties: {
        id: { type: "string", description: d("缺陷 ID。", "Issue ID."), examples: ["iss_example"] }, userId: { type: "string", description: d("缺陷所有者 ID。", "Issue owner ID."), examples: ["usr_example"] },
        projectId: { type: "string", description: d("所属项目 ID。", "Owning project ID."), examples: ["prj_example"] }, title: { type: "string", minLength: 1, maxLength: 200, description: d("缺陷标题。", "Issue title."), examples: ["Checkout button does not submit"] },
        description: { type: "string", minLength: 1, maxLength: 20000, description: d("缺陷正文。", "Issue description."), examples: ["Clicking the button leaves the page unchanged."] }, pageUrl: { type: "string", format: "uri", description: d("去除敏感查询参数后的页面 URL。", "Page URL after sensitive query parameters are removed."), examples: ["https://shop.example.com/checkout"] },
        dom: ref("DomContext"), status: ref("IssueStatus"), source: ref("IssueSource"), attachmentId: { type: "string", nullable: true, description: d("关联截图 ID。", "Associated screenshot ID."), examples: ["att_example"] },
        claimedByTokenId: { type: "string", nullable: true, description: d("当前领取方的凭证或账号标识。", "Credential or account identifier of the current claimant."), examples: ["pat_example"] }, claimedAt: { type: "string", format: "date-time", nullable: true, description: d("领取时间。", "Claim time."), examples: ["2026-08-15T08:05:00.000Z"] }, claimExpiresAt: { type: "string", format: "date-time", nullable: true, description: d("认领租约过期时间。", "Claim lease expiration time."), examples: ["2026-08-15T12:05:00.000Z"] },
        handoffPrompt: { type: "string", description: d("交给 AI 的 Skill 安装与问题处理提示。", "Skill installation and issue handoff prompt for an AI."), examples: ["请使用 Pinhere Skill 修复问题 iss_example。"] },
        completedAt: { type: "string", format: "date-time", nullable: true, description: d("完成时间。", "Completion time."), examples: ["2026-08-15T09:00:00.000Z"] }, completionSummary: { type: "string", nullable: true, maxLength: 10000, description: d("完成摘要。", "Completion summary."), examples: ["Added a submit handler and regression test."] },
        createdAt: { type: "string", format: "date-time", description: d("创建时间。", "Creation time."), examples: ["2026-08-15T08:00:00.000Z"] }, updatedAt: { type: "string", format: "date-time", description: d("最后更新时间。", "Last update time."), examples: ["2026-08-15T08:05:00.000Z"] },
        version: { type: "integer", minimum: 1, description: d("用于并发控制的资源版本。", "Resource version used for concurrency control."), examples: [2] }
      }
    },
    IssueDetail: { title: d("缺陷详情", "Issue details"), description: d("缺陷、交接提示及鉴权截图下载路径。", "Issue, handoff prompt, and authenticated screenshot download path."), allOf: [ref("Issue"), { type: "object", description: d("缺陷详情扩展字段。", "Issue-detail extension fields."), required: ["screenshotUrl", "handoffPrompt"], properties: {
      screenshotUrl: { type: "string", nullable: true, description: d("关联截图的相对下载路径；无截图时为 null。", "Relative download path for the associated screenshot, or null."), examples: ["/api/v1/attachments/att_example"] }, handoffPrompt: { type: "string", description: d("交给 AI 的 Skill 安装与问题处理提示。", "Skill installation and issue handoff prompt for an AI."), examples: ["请使用 Pinhere Skill 修复问题 iss_example。"] }
    } }] },
    IssueInput: {
      title: d("创建缺陷输入", "Create issue input"), description: d("浏览器、网站或 API 提交的完整缺陷上下文。", "Complete issue context submitted by the extension, website, or API."), type: "object",
      required: ["projectId", "title", "description", "pageUrl", "dom"], properties: {
        projectId: { type: "string", description: d("页面 Origin 已归属的项目 ID。", "Project ID to which the page origin is assigned."), examples: ["prj_example"] }, title: { type: "string", minLength: 1, maxLength: 200, description: d("缺陷标题。", "Issue title."), examples: ["Checkout button does not submit"] },
        description: { type: "string", minLength: 1, maxLength: 20000, description: d("缺陷正文。", "Issue description."), examples: ["Clicking the button leaves the page unchanged."] }, pageUrl: { type: "string", format: "uri", description: d("产生缺陷的页面 URL。", "Page URL where the issue occurred."), examples: ["https://shop.example.com/checkout"] },
        dom: ref("DomContext"), attachmentId: { type: "string", description: d("尚未绑定的私有截图 ID。", "ID of an unbound private screenshot."), examples: ["att_example"] }, source: ref("IssueSource")
      }
    },
    IssueUpdateInput: { title: d("更新缺陷输入", "Update issue input"), description: d("可选更新缺陷标题或正文。", "Optionally updates an issue title or description."), type: "object", properties: {
      title: { type: "string", minLength: 1, maxLength: 200, description: d("新的缺陷标题。", "New issue title."), examples: ["Checkout submit is unresponsive"] }, description: { type: "string", minLength: 1, maxLength: 20000, description: d("新的缺陷正文。", "New issue description."), examples: ["The button remains enabled but no request is sent."] }
    } },
    IssueEvent: { title: d("缺陷事件", "Issue event"), description: d("缺陷状态与内容变化的审计事件。", "Audit event for issue state or content changes."), type: "object", required: ["id", "issueId", "userId", "actorType", "type", "data", "createdAt"], properties: {
      id: { type: "string", description: d("事件 ID。", "Event ID."), examples: ["evt_example"] }, issueId: { type: "string", description: d("缺陷 ID。", "Issue ID."), examples: ["iss_example"] }, userId: { type: "string", description: d("账号 ID。", "Account ID."), examples: ["usr_example"] },
      actorType: { type: "string", description: d("执行方类型。", "Actor type."), enum: ["user", "api_token", "extension"], enumValueTitles: { user: d("网站用户", "Website user"), api_token: "API token", extension: d("浏览器扩展", "Browser extension") }, examples: ["api_token"] }, actorId: { type: "string", nullable: true, description: d("执行方标识。", "Actor identifier."), examples: ["pat_example"] },
      type: { type: "string", description: d("事件类型。", "Event type."), examples: ["issue.claimed"] }, data: { type: "object", description: d("事件特定的非敏感结构化数据。", "Event-specific structured data."), additionalProperties: true }, createdAt: { type: "string", format: "date-time", description: d("事件时间。", "Event time."), examples: ["2026-08-15T08:05:00.000Z"] }
    } },
    ClaimNextInput: { title: d("领取下一条缺陷输入", "Claim-next input"), description: d("限定待领取缺陷所属项目。", "Selects the project from which to claim an issue."), type: "object", required: ["projectId"], properties: { projectId: { type: "string", description: d("项目 ID。", "Project ID."), examples: ["prj_example"] } } },
    ClaimNextResult: { title: d("领取下一条缺陷结果", "Claim-next result"), description: d("原子领取的缺陷；无待处理缺陷时为 null。", "Atomically claimed issue, or null when no open issue remains."), type: "object", required: ["issue"], properties: { issue: { ...ref("Issue"), nullable: true, description: d("已领取缺陷或 null。", "Claimed issue or null.") } } },
    ReleaseInput: { title: d("释放缺陷输入", "Release issue input"), description: d("可选记录释放原因。", "Optionally records why the issue is released."), type: "object", properties: { reason: { type: "string", maxLength: 2000, description: d("释放原因。", "Release reason."), examples: ["Blocked by an unavailable dependency."] } } },
    CompleteInput: { title: d("完成缺陷输入", "Complete issue input"), description: d("记录完成处理的摘要。", "Records a summary of the completed work."), type: "object", required: ["summary"], properties: { summary: { type: "string", minLength: 1, maxLength: 10000, description: d("完成摘要。", "Completion summary."), examples: ["Added a submit handler and regression test."] } } },
    AttachmentInput: { title: d("截图上传输入", "Screenshot upload input"), description: d("最多 2 MiB 的 Base64 PNG、JPEG 或 WebP。", "Base64 PNG, JPEG, or WebP data limited to 2 MiB."), type: "object", required: ["fileName", "contentType", "base64"], properties: {
      fileName: { type: "string", maxLength: 200, description: d("安全显示的文件名。", "Display-safe file name."), examples: ["checkout.webp"] }, contentType: { type: "string", description: d("允许的图片媒体类型。", "Allowed image media type."), enum: ["image/png", "image/jpeg", "image/webp"], enumValueTitles: { "image/png": "PNG", "image/jpeg": "JPEG", "image/webp": "WebP" }, examples: ["image/webp"] }, base64: { type: "string", contentEncoding: "base64", description: d("原始 Base64 或 data URL 形式的图片字节；不得在日志中记录。", "Image bytes as raw Base64 or a data URL; must not be logged."), examples: ["UklGRiQAAABXRUJQ"] }
    } },
    Attachment: { title: d("截图元数据", "Screenshot metadata"), description: d("已私有保存的截图元数据。", "Metadata for a privately stored screenshot."), type: "object", required: ["id", "fileName", "contentType", "byteSize"], properties: {
      id: { type: "string", description: d("截图 ID。", "Screenshot ID."), examples: ["att_example"] }, fileName: { type: "string", description: d("文件名。", "File name."), examples: ["checkout.webp"] }, contentType: { type: "string", description: d("图片媒体类型。", "Image media type."), examples: ["image/webp"] }, byteSize: { type: "integer", minimum: 0, maximum: 2097152, description: d("解码后的字节数。", "Decoded byte count."), examples: [128000] }
    } },
    Webhook: { title: "Webhook", description: d("接收 issue.created 事件的 HTTPS Webhook。", "HTTPS webhook receiving issue.created events."), type: "object", required: ["id", "name", "url", "enabled", "createdAt", "updatedAt", "version"], properties: {
      id: { type: "string", description: "Webhook ID.", examples: ["whk_example"] }, projectId: { type: "string", nullable: true, description: d("可选项目过滤器。", "Optional project filter."), examples: ["prj_example"] }, name: { type: "string", minLength: 1, maxLength: 100, description: d("显示名称。", "Display name."), examples: ["Issue automation"] },
      url: { type: "string", format: "uri", description: d("通过 SSRF 校验的公网 HTTPS URL。", "Public HTTPS URL that passes SSRF validation."), examples: ["https://hooks.example.com/pinhere"] }, enabled: { type: "boolean", description: d("是否接收新投递。", "Whether new deliveries are enabled."), examples: [true] },
      createdAt: { type: "string", format: "date-time", description: d("创建时间。", "Creation time."), examples: ["2026-08-15T08:00:00.000Z"] }, updatedAt: { type: "string", format: "date-time", description: d("最后更新时间。", "Last update time."), examples: ["2026-08-15T08:00:00.000Z"] }, version: { type: "integer", minimum: 1, description: d("用于 If-Match 的资源版本。", "Resource version used by If-Match."), examples: [1] }
    } },
    WebhookInput: { title: d("创建 Webhook 输入", "Create webhook input"), description: d("创建账号级或项目级 Webhook。", "Creates an account-level or project-level webhook."), type: "object", required: ["name", "url"], properties: {
      name: { type: "string", minLength: 1, maxLength: 100, description: d("显示名称。", "Display name."), examples: ["Issue automation"] }, url: { type: "string", format: "uri", description: d("公网 HTTPS 投递 URL。", "Public HTTPS delivery URL."), examples: ["https://hooks.example.com/pinhere"] }, projectId: { type: "string", description: d("可选项目过滤器。", "Optional project filter."), examples: ["prj_example"] }
    } },
    WebhookUpdateInput: { title: d("更新 Webhook 输入", "Update webhook input"), description: d("可选更新名称、URL 或启用状态。", "Optionally updates the name, URL, or enabled state."), type: "object", properties: {
      name: { type: "string", minLength: 1, maxLength: 100, description: d("新的显示名称。", "New display name."), examples: ["Issue automation v2"] }, url: { type: "string", format: "uri", description: d("新的公网 HTTPS URL。", "New public HTTPS URL."), examples: ["https://hooks.example.com/pinhere-v2"] }, enabled: { type: "boolean", description: d("新的启用状态。", "New enabled state."), examples: [false] }
    } },
    WebhookWithSecret: { title: d("Webhook 创建结果", "Webhook creation result"), description: d("新 Webhook 与只显示一次的签名 Secret。", "New webhook and its one-time signing secret."), allOf: [ref("Webhook"), { type: "object", description: d("一次性 Secret 扩展字段。", "One-time secret extension field."), required: ["secret"], properties: { secret: { type: "string", description: d("只显示一次的签名 Secret；不得记录。", "One-time signing secret; must not be logged."), examples: ["redacted-not-a-secret"] } } }] },
    SecretResult: { title: d("Secret 结果", "Secret result"), description: d("只显示一次的新 Webhook Secret。", "New one-time webhook secret."), type: "object", required: ["secret"], properties: { secret: { type: "string", description: d("只显示一次且不得记录的签名 Secret。", "One-time signing secret that must not be logged."), examples: ["redacted-not-a-secret"] } } },
    DeliveryReference: { title: d("投递引用", "Delivery reference"), description: d("已创建或排队的 Webhook 投递。", "Created or queued webhook delivery."), type: "object", required: ["deliveryId"], properties: { deliveryId: { type: "string", description: d("投递 ID。", "Delivery ID."), examples: ["whd_example"] } } },
    WebhookDelivery: { title: d("Webhook 投递", "Webhook delivery"), description: d("Webhook 投递状态与受限诊断信息。", "Webhook delivery state and restricted diagnostics."), type: "object", required: ["id", "webhookId", "eventId", "eventType", "payload", "status", "attempt", "nextAttemptAt", "createdAt", "updatedAt"], properties: {
      id: { type: "string", description: d("投递 ID。", "Delivery ID."), examples: ["whd_example"] }, webhookId: { type: "string", description: "Webhook ID.", examples: ["whk_example"] }, eventId: { type: "string", description: d("事件 ID。", "Event ID."), examples: ["whe_example"] }, eventType: { type: "string", description: d("当前固定为 issue.created。", "Currently fixed to issue.created."), enum: ["issue.created"], enumValueTitles: { "issue.created": d("缺陷已创建", "Issue created") }, examples: ["issue.created"] },
      payload: { type: "object", description: d("投递负载；可能包含私有缺陷标识。", "Delivery payload, which may contain private issue identifiers."), additionalProperties: true }, status: { type: "string", description: d("投递状态。", "Delivery status."), enum: ["pending", "delivered", "failed"], enumValueTitles: { pending: d("待投递", "Pending"), delivered: d("已投递", "Delivered"), failed: d("失败", "Failed") }, examples: ["pending"] }, attempt: { type: "integer", minimum: 0, description: d("已尝试次数。", "Attempt count."), examples: [0] },
      nextAttemptAt: { type: "string", format: "date-time", description: d("下次尝试时间。", "Next attempt time."), examples: ["2026-08-15T08:05:00.000Z"] }, responseStatus: { type: "integer", nullable: true, description: d("目标服务器状态码。", "Target server status code."), examples: [202] }, responseBody: { type: "string", nullable: true, description: d("受限响应摘要。", "Restricted response summary."), examples: ["accepted"] }, lastError: { type: "string", nullable: true, description: d("最后一次错误摘要。", "Last error summary."), examples: ["connection timeout"] }, deliveredAt: { type: "string", format: "date-time", nullable: true, description: d("成功投递时间。", "Successful delivery time."), examples: ["2026-08-15T08:05:03.000Z"] }, createdAt: { type: "string", format: "date-time", description: d("创建时间。", "Creation time."), examples: ["2026-08-15T08:05:00.000Z"] }, updatedAt: { type: "string", format: "date-time", description: d("最后更新时间。", "Last update time."), examples: ["2026-08-15T08:05:03.000Z"] }
    } },
    ApiToken: { title: d("API Token 元数据", "API token metadata"), description: d("不含明文 PAT 的自动化凭证元数据。", "Automation credential metadata without the plaintext PAT."), type: "object", required: ["id", "name", "prefix", "scopes", "createdAt"], properties: {
      id: { type: "string", description: d("Token ID。", "Token ID."), examples: ["pat_example"] }, name: { type: "string", description: d("Token 名称。", "Token name."), examples: ["Checkout repair agent"] }, prefix: { type: "string", description: d("用于识别而非认证的安全前缀。", "Safe identification prefix, not usable for authentication."), examples: ["ph_pat_redacted"] }, scopes: { type: "array", description: d("固定自动化权限。", "Fixed automation scopes."), items: { type: "string", description: d("权限名。", "Scope name."), enum: ["projects:read", "issues:read", "issues:write"], enumValueTitles: { "projects:read": d("读取项目", "Read projects"), "issues:read": d("读取缺陷", "Read issues"), "issues:write": d("处理缺陷", "Process issues") }, examples: ["issues:write"] } },
      lastUsedAt: { type: "string", format: "date-time", nullable: true, description: d("最后使用时间。", "Last use time."), examples: ["2026-08-15T08:05:00.000Z"] }, expiresAt: { type: "string", format: "date-time", nullable: true, description: d("过期时间；null 表示不过期。", "Expiration time, or null for no expiration."), examples: ["2026-09-15T08:00:00.000Z"] }, createdAt: { type: "string", format: "date-time", description: d("创建时间。", "Creation time."), examples: ["2026-08-15T08:00:00.000Z"] }
    } },
    ApiTokenInput: { title: d("创建 API Token 输入", "Create API token input"), description: d("创建具有固定自动化权限的 PAT。", "Creates a PAT with fixed automation scopes."), type: "object", required: ["name"], properties: {
      name: { type: "string", minLength: 1, maxLength: 100, description: d("Token 名称。", "Token name."), examples: ["Checkout repair agent"] }, expiresAt: { type: "string", format: "date-time", description: d("可选过期时间。", "Optional expiration time."), examples: ["2026-09-15T08:00:00.000Z"] }
    } },
    ApiTokenWithSecret: { title: d("API Token 创建结果", "API token creation result"), description: d("Token 元数据与只显示一次的 PAT。", "Token metadata and one-time plaintext PAT."), allOf: [ref("ApiToken"), { type: "object", description: d("一次性 PAT 扩展字段。", "One-time PAT extension field."), required: ["token"], properties: { token: { type: "string", pattern: "^ph_pat_", description: d("只显示一次的 PAT；不得记录。", "One-time PAT; must not be logged."), examples: ["ph_pat_redacted_not_a_credential"] } } }] },
    OAuthAuthorizeInput: { title: d("扩展授权输入", "Extension authorization input"), description: d("网站 Session 为 Chrome 扩展签发一次性 PKCE 授权码。", "Website session issues a one-time PKCE authorization code to a Chrome extension."), type: "object", required: ["redirectUri", "codeChallenge"], properties: {
      redirectUri: { type: "string", format: "uri", description: d("HTTPS chromiumapp.org 扩展回调 URL。", "HTTPS chromiumapp.org extension callback URL."), examples: ["https://example.chromiumapp.org/callback"] }, codeChallenge: { type: "string", minLength: 43, maxLength: 128, description: d("Base64url SHA-256 PKCE challenge。", "Base64url SHA-256 PKCE challenge."), examples: ["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"] }
    } },
    OAuthAuthorizeResult: { title: d("扩展授权结果", "Extension authorization result"), description: d("包含一次性授权码的扩展回调 URL。", "Extension callback URL containing a one-time authorization code."), type: "object", required: ["redirectUrl"], properties: { redirectUrl: { type: "string", format: "uri", description: d("调用方应立即打开且不得记录的回调 URL。", "Callback URL to open immediately and never log."), examples: ["https://example.chromiumapp.org/callback?code=redacted"] } } },
    OAuthTokenInput: { title: d("OAuth Token 交换输入", "OAuth token exchange input"), description: d("使用授权码与 PKCE verifier，或轮换刷新令牌。", "Uses an authorization code with PKCE verifier or rotates a refresh token."), oneOf: [
      { type: "object", description: d("授权码交换。", "Authorization-code exchange."), required: ["grantType", "code", "redirectUri", "codeVerifier"], properties: {
        grantType: { type: "string", const: "authorization_code", description: d("授权码 grant。", "Authorization-code grant."), examples: ["authorization_code"] }, code: { type: "string", description: d("五分钟内有效且只能使用一次的授权码。", "Authorization code valid for five minutes and one use."), examples: ["redacted-example-code"] }, redirectUri: { type: "string", format: "uri", description: d("必须与授权请求完全一致的回调 URL。", "Callback URL that must exactly match the authorization request."), examples: ["https://example.chromiumapp.org/callback"] }, codeVerifier: { type: "string", minLength: 43, maxLength: 128, description: d("与 challenge 匹配的 PKCE verifier。", "PKCE verifier matching the challenge."), examples: ["bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb"] }
      } },
      { type: "object", description: d("刷新令牌轮换。", "Refresh-token rotation."), required: ["grantType", "refreshToken"], properties: {
        grantType: { type: "string", const: "refresh_token", description: d("刷新令牌 grant。", "Refresh-token grant."), examples: ["refresh_token"] }, refreshToken: { type: "string", description: d("有效且未轮换的刷新令牌；不得记录。", "Valid unrotated refresh token; must not be logged."), examples: ["redacted-refresh-token"] }
      } }
    ] },
    AgentPairingInput: { title: d("Agent 配对输入", "Agent pairing input"), type: "object", required: ["name", "platform"], properties: { name: { type: "string", maxLength: 100 }, platform: { type: "string", maxLength: 100 }, harness: { type: "string", enum: ["codex"] } } },
    AgentPairing: { title: d("Agent 配对", "Agent pairing"), type: "object", required: ["deviceCode", "userCode", "verificationUri", "expiresIn", "interval"], properties: { pairingId: { type: "string" }, deviceCode: { type: "string" }, userCode: { type: "string" }, verificationUri: { type: "string", format: "uri" }, expiresIn: { type: "integer" }, interval: { type: "integer" } } },
    AgentPairingTokenInput: { title: d("配对 Token 输入", "Pairing token input"), type: "object", required: ["deviceCode"], properties: { deviceCode: { type: "string" } } },
    AgentPairingTokenResult: { title: d("配对 Token 结果", "Pairing token result"), type: "object", required: ["status"], properties: { status: { type: "string", enum: ["pending", "paired"] }, token: { type: "string" }, tokenType: { type: "string" }, scopes: { type: "array", items: { type: "string" } }, agent: { ...ref("AgentInstance"), nullable: true } } },
    AgentInstance: { title: d("Agent 实例", "Agent instance"), type: "object", required: ["id", "name", "platform", "harness"], properties: { id: { type: "string" }, name: { type: "string" }, platform: { type: "string" }, harness: { type: "string", enum: ["codex"] }, version: { type: "string", nullable: true }, lastSeenAt: { type: "string", format: "date-time", nullable: true } } },
    AgentHeartbeatInput: { title: d("Agent 心跳输入", "Agent heartbeat input"), type: "object", properties: { version: { type: "string", maxLength: 100 } } },
    AgentRun: { title: d("Agent 运行", "Agent run"), type: "object", required: ["id", "issueId", "agentInstanceId", "harness", "status"], properties: { id: { type: "string" }, issueId: { type: "string" }, agentInstanceId: { type: "string" }, harness: { type: "string", enum: ["codex"] }, externalThreadId: { type: "string", nullable: true }, status: { type: "string", enum: ["queued", "running", "waiting", "succeeded", "failed", "cancelled"] }, summary: { type: "string", nullable: true }, error: { type: "string", nullable: true } } },
    AgentRunInput: { title: d("创建 Agent 运行输入", "Create agent run input"), type: "object", required: ["issueId"], properties: { issueId: { type: "string" }, harness: { type: "string", enum: ["codex"] } } },
    AgentRunUpdateInput: { title: d("更新 Agent 运行输入", "Update agent run input"), type: "object", properties: { status: { type: "string", enum: ["queued", "running", "waiting", "succeeded", "failed", "cancelled"] }, externalThreadId: { type: "string", maxLength: 200 }, summary: { type: "string", maxLength: 10000 }, error: { type: "string", maxLength: 10000 } } },
    OAuthTokenResult: { title: d("OAuth Token 结果", "OAuth token result"), description: d("扩展访问与刷新凭证。", "Extension access and refresh credentials."), type: "object", required: ["accessToken", "refreshToken", "expiresIn", "tokenType", "scopes"], properties: {
      accessToken: { type: "string", description: d("15 分钟有效的 Bearer Token；不得记录。", "Bearer token valid for 15 minutes; must not be logged."), examples: ["redacted-access-token"] }, refreshToken: { type: "string", description: d("轮换式刷新令牌；不得记录。", "Rotating refresh token; must not be logged."), examples: ["redacted-refresh-token"] }, expiresIn: { type: "integer", const: 900, description: d("访问令牌有效秒数。", "Access-token lifetime in seconds."), examples: [900] }, tokenType: { type: "string", const: "Bearer", description: d("认证方案。", "Authentication scheme."), examples: ["Bearer"] }, scopes: { type: "array", description: d("扩展固定权限。", "Fixed extension scopes."), items: { type: "string", description: d("权限名。", "Scope name."), enum: ["projects:read", "issues:create", "attachments:write"], enumValueTitles: { "projects:read": d("读取项目", "Read projects"), "issues:create": d("创建缺陷", "Create issues"), "attachments:write": d("上传截图", "Upload screenshots") }, examples: ["issues:create"] } }
    } }
  };

  const parameters = {
    ProjectId: { in: "path", name: "projectId", required: true, schema: { type: "string", description: d("项目 ID。", "Project ID."), examples: ["prj_example"] } },
    IssueId: { in: "path", name: "issueId", required: true, schema: { type: "string", description: d("缺陷 ID。", "Issue ID."), examples: ["iss_example"] } },
    AttachmentId: { in: "path", name: "attachmentId", required: true, schema: { type: "string", description: d("截图 ID。", "Screenshot ID."), examples: ["att_example"] } },
    WebhookId: { in: "path", name: "webhookId", required: true, schema: { type: "string", description: "Webhook ID.", examples: ["whk_example"] } },
    DeliveryId: { in: "path", name: "deliveryId", required: true, schema: { type: "string", description: d("投递 ID。", "Delivery ID."), examples: ["whd_example"] } },
    TokenId: { in: "path", name: "tokenId", required: true, schema: { type: "string", description: d("Token ID。", "Token ID."), examples: ["pat_example"] } },
    UserCode: { in: "path", name: "userCode", required: true, schema: { type: "string", examples: ["ABCD-EFGH"] } },
    RunId: { in: "path", name: "runId", required: true, schema: { type: "string", examples: ["run_example"] } },
    IfMatch: { in: "header", name: "If-Match", required: true, schema: { type: "string", description: d("必须等于资源 version 对应的 ETag。", "Must match the ETag derived from the resource version."), examples: ["1"] } },
    IfNoneMatch: { in: "header", name: "If-None-Match", required: false, schema: { type: "string", description: d("列表缓存 ETag；匹配时返回 304。", "List cache ETag; returns 304 when matched."), examples: ["example-etag"] } },
    IdempotencyKey: { in: "header", name: "Idempotency-Key", required: false, schema: { type: "string", minLength: 8, maxLength: 200, description: d("同一账号与 Endpoint 下保留 24 小时；不同请求复用会返回 409。", "Retained for 24 hours per account and endpoint; reuse with a different request returns 409."), examples: ["example-idempotency-key"] } },
    Cursor: { in: "query", name: "cursor", required: false, schema: { type: "string", description: d("上一页返回的 Base64url 时间游标。", "Base64url time cursor returned by the previous page."), examples: ["MjAyNi0wOC0xNVQwODowMDowMC4wMDBa"] } },
    Limit: { in: "query", name: "limit", required: false, schema: { type: "integer", minimum: 1, maximum: 100, description: d("每页条数，缺省为 50。", "Items per page; defaults to 50."), examples: [50] } }
  };
  const p = (name) => structuredClone(parameters[name]);
  const json = (description, dataSchema) => envelope(description, dataSchema);
  const arr = (item) => ({ type: "array", items: item, description: d("资源列表。", "Resource list.") });
  const apis = Object.fromEntries([
    op({ id: "listProjects", tag: "projects", summary: ["列出项目", "List projects"], description: ["列出当前账号的全部项目。", "Lists all projects owned by the current account."], method: "GET", path: "/projects", responses: { 200: response(d("项目列表。", "Project list."), json(d("项目列表。", "Project list."), arr(ref("Project")))) }, security: patReadProjects, examples: {}, metadata: privateRead }),
    op({ id: "createProject", tag: "projects", summary: ["创建项目", "Create project"], description: ["创建个人项目并可同时设置最多 50 个 Origin。", "Creates a personal project with up to 50 origins."], method: "POST", path: "/projects", parameters: [p("IdempotencyKey"), body("ProjectInput")], responses: { 201: response(d("项目已创建。", "Project created."), json(d("已创建项目。", "Created project."), ref("Project"))), 409: response(d("Origin 已归属于其他项目。", "An origin is already assigned to another project."), errorSchema) }, security: websiteSession, examples: { body: { name: "Checkout", description: "Checkout experience issues", origins: ["https://shop.example.com"] }, headers: { "Idempotency-Key": "example-project-create" }, status: "201" }, metadata: persistentMutation }),
    op({ id: "getProject", tag: "projects", summary: ["获取项目", "Get project"], description: ["获取项目、Origin 和并发控制版本。", "Gets a project, its origins, and concurrency-control version."], method: "GET", path: "/projects/{projectId}", parameters: [p("ProjectId")], responses: { 200: response(d("项目详情。", "Project details."), json(d("项目详情。", "Project details."), ref("ProjectWithOrigins"))), 404: response(d("项目不存在。", "Project not found."), errorSchema) }, security: patReadProjects, examples: { path: idPath.project }, metadata: privateRead }),
    op({ id: "updateProject", tag: "projects", summary: ["更新项目", "Update project"], description: ["使用 If-Match 更新项目名称或说明。", "Updates a project name or description using If-Match."], method: "PATCH", path: "/projects/{projectId}", parameters: [p("ProjectId"), p("IfMatch"), p("IdempotencyKey"), body("ProjectUpdateInput")], responses: { 200: response(d("项目已更新。", "Project updated."), json(d("已更新项目。", "Updated project."), ref("Project"))), 412: response(d("缺少 If-Match 或版本冲突。", "If-Match is missing or the version conflicts."), errorSchema) }, security: websiteSession, examples: { path: idPath.project, headers: { "If-Match": "1", "Idempotency-Key": "example-project-update" }, body: { name: "Checkout v2" } }, metadata: persistentMutation }),
    op({ id: "deleteProject", tag: "projects", summary: ["删除项目", "Delete project"], description: ["删除项目及其缺陷、历史和截图。", "Deletes a project and its issues, history, and screenshots."], method: "DELETE", path: "/projects/{projectId}", parameters: [p("ProjectId"), p("IfMatch")], responses: { 204: response(d("项目已删除。", "Project deleted.")) }, security: websiteSession, examples: { path: idPath.project, headers: { "If-Match": "1" }, status: "204" }, metadata: destructiveMutation }),
    op({ id: "addProjectOrigin", tag: "projects", summary: ["添加 Origin", "Add project origin"], description: ["为项目添加标准化 Origin 并增加项目版本。", "Adds a normalized origin and increments the project version."], method: "POST", path: "/projects/{projectId}/origins", parameters: [p("ProjectId"), p("IdempotencyKey"), body("OriginInput")], responses: { 201: response(d("Origin 已添加。", "Origin added."), json(d("Origin 添加结果。", "Origin addition result."), ref("OriginResult"))), 409: response(d("Origin 已分配。", "Origin already assigned."), errorSchema) }, security: websiteSession, examples: { path: idPath.project, headers: { "Idempotency-Key": "example-origin-add" }, body: { origin: "https://shop.example.com/checkout" }, status: "201" }, metadata: persistentMutation }),
    op({ id: "deleteProjectOrigin", tag: "projects", summary: ["删除 Origin", "Delete project origin"], description: ["从项目删除 URL 编码后的 Origin。", "Removes a URL-encoded origin from a project."], method: "DELETE", path: "/projects/{projectId}/origins/{encodedOrigin}", parameters: [p("ProjectId"), { in: "path", name: "encodedOrigin", required: true, schema: { type: "string", description: d("URL 编码后的标准化 Origin。", "URL-encoded normalized origin."), examples: ["https%3A%2F%2Fshop.example.com"] } }], responses: { 204: response(d("Origin 已删除或原本不存在。", "Origin removed or already absent.")) }, security: websiteSession, examples: { path: { ...idPath.project, encodedOrigin: "https%3A%2F%2Fshop.example.com" }, status: "204" }, metadata: destructiveMutation }),
    op({ id: "resolveProject", tag: "projects", summary: ["按 URL 解析项目", "Resolve project by URL"], description: ["只比较页面 URL 的协议、域名和端口。", "Matches only the page URL scheme, host, and port."], method: "GET", path: "/projects/resolve", parameters: [{ in: "query", name: "url", required: true, schema: { type: "string", format: "uri", description: d("当前页面 URL。", "Current page URL."), examples: ["https://shop.example.com/checkout?step=payment"] } }], responses: { 200: response(d("匹配项目或 null。", "Matched project or null."), json(d("项目解析结果。", "Project resolution result."), ref("ResolveProjectResult"))) }, security: patReadProjects, examples: { query: { url: "https://shop.example.com/checkout?step=payment" } }, metadata: privateRead }),

    op({ id: "listIssues", tag: "issues", summary: ["列出缺陷", "List issues"], description: ["游标分页并支持项目、状态和更新时间过滤，最多返回 100 条。", "Cursor-paginates issues with project, status, and update-time filters, up to 100 items."], method: "GET", path: "/issues", parameters: [p("Cursor"), p("Limit"), { in: "query", name: "projectId", required: false, schema: { type: "string", description: d("按项目过滤。", "Filter by project."), examples: ["prj_example"] } }, { in: "query", name: "status", required: false, schema: ref("IssueStatus") }, { in: "query", name: "updatedAfter", required: false, schema: { type: "string", format: "date-time", description: d("仅返回此时间之后更新的缺陷。", "Return only issues updated after this time."), examples: ["2026-08-15T00:00:00.000Z"] } }, p("IfNoneMatch")], responses: { 200: response(d("缺陷分页结果。", "Issue page."), { type: "object", description: d("缺陷分页响应。", "Paginated issue response."), required: ["data", "meta"], properties: { data: arr(ref("Issue")), meta: { type: "object", description: d("分页元数据。", "Pagination metadata."), required: ["nextCursor"], properties: { nextCursor: { type: "string", nullable: true, description: d("下一页游标；无下一页时为 null。", "Next-page cursor, or null when there is no next page."), examples: ["MjAyNi0wOC0xNVQwODowMDowMC4wMDBa"] } } } } }), 304: response(d("ETag 匹配，内容未变化。", "ETag matched; content not modified.")) }, security: patReadIssues, examples: { query: { projectId: "prj_example", status: "open", limit: 50 } }, metadata: privateRead }),
    op({ id: "createIssue", tag: "issues", summary: ["创建缺陷", "Create issue"], description: ["创建缺陷并在同一事务写入 issue.created Outbox。", "Creates an issue and its issue.created outbox event in one transaction."], method: "POST", path: "/issues", parameters: [p("IdempotencyKey"), body("IssueInput")], responses: { 201: response(d("缺陷已创建。", "Issue created."), json(d("已创建缺陷。", "Created issue."), ref("Issue"))), 409: response(d("页面 Origin 与项目不匹配，或截图已被使用。", "Page origin does not match the project, or the screenshot is already used."), errorSchema) }, security: extensionCreateIssue, examples: { headers: { "Idempotency-Key": "example-issue-create" }, body: { projectId: "prj_example", title: "Checkout button does not submit", description: "Clicking the button leaves the page unchanged.", pageUrl: "https://shop.example.com/checkout", dom: exampleDom, attachmentId: "att_example", source: "extension" }, status: "201" }, metadata: persistentMutation }),
    op({ id: "getIssue", tag: "issues", summary: ["获取缺陷", "Get issue"], description: ["获取 DOM、截图路径、目标与状态上下文。", "Gets DOM, screenshot path, target, and state context."], method: "GET", path: "/issues/{issueId}", parameters: [p("IssueId")], responses: { 200: response(d("缺陷完整上下文。", "Complete issue context."), json(d("缺陷详情。", "Issue details."), ref("IssueDetail"))), 404: response(d("缺陷不存在。", "Issue not found."), errorSchema) }, security: patReadIssues, examples: { path: idPath.issue }, metadata: privateRead }),
    op({ id: "updateIssue", tag: "issues", summary: ["更新缺陷", "Update issue"], description: ["使用 If-Match 更新缺陷标题或正文。", "Updates an issue title or description using If-Match."], method: "PATCH", path: "/issues/{issueId}", parameters: [p("IssueId"), p("IfMatch"), p("IdempotencyKey"), body("IssueUpdateInput")], responses: { 200: response(d("缺陷已更新。", "Issue updated."), json(d("已更新缺陷。", "Updated issue."), ref("Issue"))), 412: response(d("缺少 If-Match 或版本冲突。", "If-Match is missing or the version conflicts."), errorSchema) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "If-Match": "1", "Idempotency-Key": "example-issue-update" }, body: { title: "Checkout submit is unresponsive" } }, metadata: persistentMutation }),
    op({ id: "deleteIssue", tag: "issues", summary: ["删除缺陷", "Delete issue"], description: ["删除缺陷、历史与关联截图。", "Deletes an issue, its history, and its screenshot."], method: "DELETE", path: "/issues/{issueId}", parameters: [p("IssueId"), p("IfMatch")], responses: { 204: response(d("缺陷已删除。", "Issue deleted.")) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "If-Match": "1" }, status: "204" }, metadata: destructiveMutation }),
    op({ id: "listIssueEvents", tag: "issues", summary: ["列出状态历史", "List issue events"], description: ["按时间顺序返回缺陷审计事件。", "Returns issue audit events in chronological order."], method: "GET", path: "/issues/{issueId}/events", parameters: [p("IssueId")], responses: { 200: response(d("状态事件列表。", "Issue event list."), json(d("状态事件列表。", "Issue event list."), arr(ref("IssueEvent")))) }, security: patReadIssues, examples: { path: idPath.issue }, metadata: privateRead }),
    op({ id: "claimIssue", tag: "issues", summary: ["原子认领缺陷", "Claim issue atomically"], description: ["仅 open 缺陷能被一个调用方原子认领。", "Atomically claims an open issue for one caller."], method: "POST", path: "/issues/{issueId}/claim", parameters: [p("IssueId"), p("IdempotencyKey")], responses: { 200: response(d("认领成功。", "Issue claimed."), json(d("已认领缺陷。", "Claimed issue."), ref("Issue"))), 409: response(d("缺陷已被认领。", "Issue is already claimed."), errorSchema) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "Idempotency-Key": "example-issue-claim" } }, metadata: persistentMutation }),
    op({ id: "heartbeatIssue", tag: "issues", summary: ["续期缺陷认领", "Renew issue claim"], description: ["领取方延长 in_progress 缺陷租约。", "The claimant extends an in-progress issue lease."], method: "POST", path: "/issues/{issueId}/heartbeat", parameters: [p("IssueId")], responses: { 200: response(d("租约已续期。", "Lease renewed."), json(d("已续期缺陷。", "Renewed issue."), ref("Issue"))) }, security: patWriteIssues, examples: { path: idPath.issue }, metadata: persistentMutation }),
    op({ id: "claimNextIssue", tag: "issues", summary: ["领取最早缺陷", "Claim next issue"], description: ["原子领取项目中最早的 open 缺陷；没有任务时 issue 为 null。", "Atomically claims the oldest open issue in a project, or returns null."], method: "POST", path: "/issues/claim-next", parameters: [p("IdempotencyKey"), body("ClaimNextInput")], responses: { 200: response(d("已领取缺陷或 null。", "Claimed issue or null."), json(d("领取结果。", "Claim result."), ref("ClaimNextResult"))) }, security: patWriteIssues, examples: { headers: { "Idempotency-Key": "example-claim-next" }, body: { projectId: "prj_example" } }, metadata: persistentMutation }),
    op({ id: "releaseIssue", tag: "issues", summary: ["释放缺陷", "Release issue"], description: ["领取凭证或网站账号将 in_progress 缺陷恢复为 open。", "The claiming credential or website account returns an in-progress issue to open."], method: "POST", path: "/issues/{issueId}/release", parameters: [p("IssueId"), p("IdempotencyKey"), body("ReleaseInput")], responses: { 200: response(d("缺陷已释放。", "Issue released."), json(d("已释放缺陷。", "Released issue."), ref("Issue"))), 403: response(d("调用方不是领取方。", "Caller is not the claimant."), errorSchema), 409: response(d("缺陷状态无效。", "Issue state is invalid."), errorSchema) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "Idempotency-Key": "example-issue-release" }, body: { reason: "Blocked by an unavailable dependency." } }, metadata: persistentMutation }),
    op({ id: "completeIssue", tag: "issues", summary: ["完成缺陷", "Complete issue"], description: ["领取凭证或网站账号写入完成状态与摘要。", "The claiming credential or website account records completion and a summary."], method: "POST", path: "/issues/{issueId}/complete", parameters: [p("IssueId"), p("IdempotencyKey"), body("CompleteInput")], responses: { 200: response(d("缺陷已完成。", "Issue completed."), json(d("已完成缺陷。", "Completed issue."), ref("Issue"))), 403: response(d("调用方不是领取方。", "Caller is not the claimant."), errorSchema), 409: response(d("缺陷状态无效。", "Issue state is invalid."), errorSchema) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "Idempotency-Key": "example-issue-complete" }, body: { summary: "Added a submit handler and regression test." } }, metadata: persistentMutation }),
    op({ id: "reopenIssue", tag: "issues", summary: ["重新打开缺陷", "Reopen issue"], description: ["将 done 缺陷恢复为 open。", "Returns a completed issue to open."], method: "POST", path: "/issues/{issueId}/reopen", parameters: [p("IssueId"), p("IdempotencyKey")], responses: { 200: response(d("缺陷已重新打开。", "Issue reopened."), json(d("已重新打开缺陷。", "Reopened issue."), ref("Issue"))), 409: response(d("仅已完成缺陷可重新打开。", "Only completed issues can be reopened."), errorSchema) }, security: patWriteIssues, examples: { path: idPath.issue, headers: { "Idempotency-Key": "example-issue-reopen" } }, metadata: persistentMutation }),

    op({ id: "createAttachment", tag: "attachments", summary: ["上传截图", "Upload screenshot"], description: ["上传不超过 2 MiB 的 PNG、JPEG 或 WebP 到私有存储。", "Uploads a PNG, JPEG, or WebP up to 2 MiB to private storage."], method: "POST", path: "/attachments", parameters: [p("IdempotencyKey"), body("AttachmentInput")], responses: { 201: response(d("截图已私有保存。", "Screenshot stored privately."), json(d("截图元数据。", "Screenshot metadata."), ref("Attachment"))), 413: response(d("截图超过 2 MiB。", "Screenshot exceeds 2 MiB."), errorSchema) }, security: extensionWriteAttachment, examples: { headers: { "Idempotency-Key": "example-attachment" }, body: { fileName: "checkout.webp", contentType: "image/webp", base64: "UklGRiQAAABXRUJQVlA4IBgAAAAwAQCdASoBAAEAAUAmJaQAA3AA/v89WAAAAA==" }, status: "201" }, metadata: persistentMutation }),
    op({ id: "downloadAttachment", tag: "attachments", summary: ["读取截图", "Download screenshot"], description: ["鉴权后流式读取私有截图。", "Streams a private screenshot after authorization."], method: "GET", path: "/attachments/{attachmentId}", parameters: [p("AttachmentId")], produces: ["image/png", "image/jpeg", "image/webp"], responses: { 200: { description: d("PNG、JPEG 或 WebP 截图字节。", "PNG, JPEG, or WebP screenshot bytes."), schema: { type: "string", format: "binary", description: d("私有截图字节。", "Private screenshot bytes."), examples: ["UklGRiQAAABXRUJQ"] }, content: { "image/png": { schema: { type: "string", format: "binary", description: d("PNG 截图字节。", "PNG screenshot bytes.") } }, "image/jpeg": { schema: { type: "string", format: "binary", description: d("JPEG 截图字节。", "JPEG screenshot bytes.") } }, "image/webp": { schema: { type: "string", format: "binary", description: d("WebP 截图字节。", "WebP screenshot bytes.") } } } }, 404: response(d("截图不存在。", "Screenshot not found."), errorSchema), 503: response(d("截图存储不可用。", "Screenshot storage unavailable."), errorSchema) }, security: patReadIssues, examples: { path: idPath.attachment }, metadata: privateRead }),

    op({ id: "createAgentPairing", tag: "agents", summary: ["创建 Agent 配对", "Create agent pairing"], description: ["创建十分钟有效的一次性设备配对。", "Creates a one-time device pairing valid for ten minutes."], method: "POST", path: "/agent-pairings", parameters: [body("AgentPairingInput")], responses: { 201: response(d("配对已创建。", "Pairing created."), json(d("配对信息。", "Pairing information."), ref("AgentPairing"))) }, security: [], examples: { body: { name: "Mac Agent", platform: "darwin-arm64", harness: "codex" }, status: "201" }, metadata: secretMutation }),
    op({ id: "approveAgentPairing", tag: "agents", summary: ["批准 Agent 配对", "Approve agent pairing"], description: ["网站账号批准一次性用户码。", "A website account approves a one-time user code."], method: "POST", path: "/agent-pairings/{userCode}/approve", parameters: [p("UserCode")], responses: { 200: response(d("配对已批准。", "Pairing approved."), json(d("批准结果。", "Approval result."), { type: "object" })) }, security: websiteSession, examples: { path: { userCode: "ABCD-EFGH" } }, metadata: secretMutation }),
    op({ id: "exchangeAgentPairingToken", tag: "agents", summary: ["交换 Agent Token", "Exchange agent token"], description: ["设备轮询批准状态并一次性取得 Agent Token。", "A device polls approval and receives an agent token once."], method: "POST", path: "/agent-pairings/token", parameters: [body("AgentPairingTokenInput")], responses: { 200: response(d("Agent 已配对。", "Agent paired."), json(d("配对 Token。", "Pairing token."), ref("AgentPairingTokenResult"))), 202: response(d("等待用户批准。", "Awaiting user approval."), json(d("等待状态。", "Pending state."), ref("AgentPairingTokenResult"))) }, security: [], examples: { body: { deviceCode: "ph_dev_redacted" } }, metadata: tokenExchange }),
    op({ id: "listAgents", tag: "agents", summary: ["列出 Agent", "List agents"], description: ["列出当前账号已配对的 Agent。", "Lists paired agents for the current account."], method: "GET", path: "/agents", responses: { 200: response(d("Agent 列表。", "Agent list."), json(d("Agent 列表。", "Agent list."), arr(ref("AgentInstance")))) }, security: patWriteAgents, examples: {}, metadata: privateRead }),
    op({ id: "heartbeatAgent", tag: "agents", summary: ["Agent 心跳", "Agent heartbeat"], description: ["更新 Agent 在线时间和 CLI 版本。", "Updates agent liveness and CLI version."], method: "POST", path: "/agents/heartbeat", parameters: [body("AgentHeartbeatInput")], responses: { 200: response(d("心跳已记录。", "Heartbeat recorded."), json(d("Agent。", "Agent."), ref("AgentInstance"))) }, security: patWriteAgents, examples: { body: { version: "0.1.0" } }, metadata: persistentMutation }),
    op({ id: "createAgentRun", tag: "agents", summary: ["创建 Agent Run", "Create agent run"], description: ["为已由当前 Agent 认领的缺陷创建运行记录。", "Creates a run for an issue claimed by the current agent."], method: "POST", path: "/agent-runs", parameters: [body("AgentRunInput")], responses: { 201: response(d("运行已创建。", "Run created."), json(d("Agent Run。", "Agent run."), ref("AgentRun"))) }, security: patWriteAgents, examples: { body: { issueId: "iss_example", harness: "codex" }, status: "201" }, metadata: persistentMutation }),
    op({ id: "updateAgentRun", tag: "agents", summary: ["更新 Agent Run", "Update agent run"], description: ["更新 Thread ID、运行状态、摘要或错误。", "Updates thread ID, status, summary, or error."], method: "PATCH", path: "/agent-runs/{runId}", parameters: [p("RunId"), body("AgentRunUpdateInput")], responses: { 200: response(d("运行已更新。", "Run updated."), json(d("Agent Run。", "Agent run."), ref("AgentRun"))) }, security: patWriteAgents, examples: { path: { runId: "run_example" }, body: { status: "running", externalThreadId: "thr_example" } }, metadata: persistentMutation }),

    op({ id: "listWebhooks", tag: "webhooks", summary: ["列出 Webhook", "List webhooks"], description: ["列出当前账号的 Webhook，不返回签名 Secret。", "Lists webhooks for the current account without signing secrets."], method: "GET", path: "/webhooks", responses: { 200: response(d("Webhook 列表。", "Webhook list."), json(d("Webhook 列表。", "Webhook list."), arr(ref("Webhook")))) }, security: websiteSession, examples: {}, metadata: privateRead }),
    op({ id: "createWebhook", tag: "webhooks", summary: ["创建 Webhook", "Create webhook"], description: ["创建只接收 issue.created 的公网 HTTPS Webhook。", "Creates a public HTTPS webhook that receives issue.created events."], method: "POST", path: "/webhooks", parameters: [body("WebhookInput")], responses: { 201: response(d("Webhook 与只显示一次的 Secret。", "Webhook and one-time secret."), json(d("Webhook 创建结果。", "Webhook creation result."), ref("WebhookWithSecret"))), 422: response(d("URL 未通过公网 HTTPS/SSRF 校验。", "URL failed public HTTPS/SSRF validation."), errorSchema) }, security: websiteSession, examples: { body: { name: "Issue automation", url: "https://hooks.example.com/pinhere", projectId: "prj_example" }, status: "201" }, metadata: secretMutation }),
    op({ id: "updateWebhook", tag: "webhooks", summary: ["更新 Webhook", "Update webhook"], description: ["使用 If-Match 更新名称、URL 或启用状态。", "Updates a webhook name, URL, or enabled state using If-Match."], method: "PATCH", path: "/webhooks/{webhookId}", parameters: [p("WebhookId"), p("IfMatch"), p("IdempotencyKey"), body("WebhookUpdateInput")], responses: { 200: response(d("Webhook 已更新。", "Webhook updated."), json(d("已更新 Webhook。", "Updated webhook."), ref("Webhook"))), 412: response(d("缺少 If-Match 或版本冲突。", "If-Match is missing or the version conflicts."), errorSchema), 422: response(d("URL 未通过公网 HTTPS/SSRF 校验。", "URL failed public HTTPS/SSRF validation."), errorSchema) }, security: websiteSession, examples: { path: idPath.webhook, headers: { "If-Match": "1", "Idempotency-Key": "example-webhook-update" }, body: { enabled: false } }, metadata: persistentMutation }),
    op({ id: "deleteWebhook", tag: "webhooks", summary: ["删除 Webhook", "Delete webhook"], description: ["删除 Webhook 及其投递记录。", "Deletes a webhook and its delivery records."], method: "DELETE", path: "/webhooks/{webhookId}", parameters: [p("WebhookId"), p("IfMatch")], responses: { 204: response(d("Webhook 已删除。", "Webhook deleted.")) }, security: websiteSession, examples: { path: idPath.webhook, headers: { "If-Match": "1" }, status: "204" }, metadata: destructiveMutation }),
    op({ id: "rotateWebhookSecret", tag: "webhooks", summary: ["轮换 Secret", "Rotate webhook secret"], description: ["立即轮换 Webhook 签名 Secret 并增加资源版本。", "Immediately rotates the webhook signing secret and increments its version."], method: "POST", path: "/webhooks/{webhookId}/rotate-secret", parameters: [p("WebhookId")], responses: { 200: response(d("返回只显示一次的新 Secret。", "Returns a new one-time secret."), json(d("新 Webhook Secret。", "New webhook secret."), ref("SecretResult"))) }, security: websiteSession, examples: { path: idPath.webhook }, metadata: secretMutation }),
    op({ id: "testWebhook", tag: "webhooks", summary: ["测试 Webhook", "Test webhook"], description: ["创建测试投递并立即尝试向外部 URL 发送。", "Creates a test delivery and immediately attempts to send it to the external URL."], method: "POST", path: "/webhooks/{webhookId}/test", parameters: [p("WebhookId")], responses: { 202: response(d("测试投递已创建并尝试。", "Test delivery created and attempted."), json(d("测试投递引用。", "Test delivery reference."), ref("DeliveryReference"))) }, security: websiteSession, examples: { path: idPath.webhook, status: "202" }, metadata: externalMutation }),
    op({ id: "listWebhookDeliveries", tag: "webhooks", summary: ["列出投递记录", "List webhook deliveries"], description: ["返回最近 100 条 Webhook 投递与受限错误诊断。", "Returns the 100 most recent webhook deliveries with restricted error diagnostics."], method: "GET", path: "/webhooks/{webhookId}/deliveries", parameters: [p("WebhookId")], responses: { 200: response(d("投递记录列表。", "Delivery record list."), json(d("投递记录列表。", "Delivery record list."), arr(ref("WebhookDelivery")))) }, security: websiteSession, examples: { path: idPath.webhook }, metadata: privateRead }),
    op({ id: "retryWebhookDelivery", tag: "webhooks", summary: ["重试投递", "Retry webhook delivery"], description: ["将指定投递恢复为 pending 并在后台重试。", "Returns a delivery to pending and retries it in the background."], method: "POST", path: "/webhooks/{webhookId}/deliveries/{deliveryId}/retry", parameters: [p("WebhookId"), p("DeliveryId")], responses: { 202: response(d("投递已排队。", "Delivery queued."), json(d("重试投递引用。", "Retry delivery reference."), ref("DeliveryReference"))), 404: response(d("投递不存在。", "Delivery not found."), errorSchema) }, security: websiteSession, examples: { path: idPath.delivery, status: "202" }, metadata: externalMutation }),

    op({ id: "listApiTokens", tag: "tokens", summary: ["列出 API Token", "List API tokens"], description: ["列出不含明文 PAT 的当前 Token 元数据。", "Lists current token metadata without plaintext PATs."], method: "GET", path: "/tokens", responses: { 200: response(d("Token 元数据列表。", "Token metadata list."), json(d("Token 元数据列表。", "Token metadata list."), arr(ref("ApiToken")))) }, security: websiteSession, examples: {}, metadata: privateRead }),
    op({ id: "createApiToken", tag: "tokens", summary: ["创建 API Token", "Create API token"], description: ["创建 ph_pat_ PAT；明文只返回一次，固定权限为 projects:read、issues:read、issues:write。", "Creates a ph_pat_ PAT returned once with fixed projects:read, issues:read, and issues:write scopes."], method: "POST", path: "/tokens", parameters: [body("ApiTokenInput")], responses: { 201: response(d("Token 元数据与只显示一次的 PAT。", "Token metadata and one-time PAT."), json(d("API Token 创建结果。", "API token creation result."), ref("ApiTokenWithSecret"))) }, security: websiteSession, examples: { body: { name: "Checkout repair agent", expiresAt: "2026-09-15T08:00:00.000Z" }, status: "201" }, metadata: secretMutation }),
    op({ id: "revokeApiToken", tag: "tokens", summary: ["撤销 API Token", "Revoke API token"], description: ["立即撤销指定 PAT。", "Immediately revokes the specified PAT."], method: "DELETE", path: "/tokens/{tokenId}", parameters: [p("TokenId")], responses: { 204: response(d("Token 已撤销或原本不存在。", "Token revoked or already absent.")) }, security: websiteSession, examples: { path: idPath.token, status: "204" }, metadata: destructiveMutation }),

    op({ id: "authorizeExtension", tag: "oauth", summary: ["授权浏览器扩展", "Authorize browser extension"], description: ["网站 Session 为允许的 chromiumapp.org 回调签发五分钟有效的一次性 PKCE 授权码。", "A website session issues a five-minute one-time PKCE code for an allowed chromiumapp.org callback."], method: "POST", path: "/oauth/extension/authorize", parameters: [body("OAuthAuthorizeInput")], responses: { 200: response(d("包含一次性授权码的回调 URL。", "Callback URL containing a one-time authorization code."), json(d("扩展授权结果。", "Extension authorization result."), ref("OAuthAuthorizeResult"))), 422: response(d("回调 URL 不允许。", "Callback URL is not allowed."), errorSchema) }, security: websiteSession, examples: { body: { redirectUri: "https://example.chromiumapp.org/callback", codeChallenge: "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa" } }, metadata: secretMutation }),
    op({ id: "exchangeOAuthToken", tag: "oauth", summary: ["交换 OAuth Token", "Exchange OAuth token"], description: ["使用授权码与 PKCE verifier，或轮换刷新令牌；访问令牌有效 15 分钟，刷新令牌有效 30 天。", "Exchanges an authorization code with PKCE or rotates a refresh token; access tokens last 15 minutes and refresh tokens 30 days."], method: "POST", path: "/oauth/token", parameters: [body("OAuthTokenInput")], responses: { 200: response(d("访问与刷新令牌。", "Access and refresh tokens."), json(d("OAuth Token 结果。", "OAuth token result."), ref("OAuthTokenResult"))), 401: response(d("授权码、verifier 或刷新令牌无效。", "Authorization code, verifier, or refresh token is invalid."), errorSchema) }, security: [], examples: { body: { grantType: "authorization_code", code: "redacted-example-code", redirectUri: "https://example.chromiumapp.org/callback", codeVerifier: "bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb" } }, metadata: tokenExchange })
  ]);

  return {
    pontx: "2.1",
    name: "pinhere",
    style: "RESTFul",
    info: {
      title: "Pinhere API",
      version: "1.0.0",
      description: d(
        "Pinhere 的项目、Origin、缺陷、截图、Agent、Webhook、PAT 与浏览器扩展 OAuth API。全部 Endpoint 都处理私有数据或持久化变更，因此 Pontx Hub 公开代理默认禁用。",
        "Pinhere API for projects, origins, issues, screenshots, agents, webhooks, PATs, and browser-extension OAuth. Every endpoint handles private data or persistent changes, so public Pontx Hub proxy execution is disabled."
      )
    },
    servers: [{ id: "production", url: "https://pinhere.dev/api/v1", description: d("Pinhere 生产 API。", "Pinhere production API.") }],
    tags: [
      { name: "projects", description: d("项目与 Origin 归属。", "Projects and origin assignments.") },
      { name: "issues", description: d("缺陷内容与 AI 处理状态机。", "Issue content and AI processing lifecycle.") },
      { name: "attachments", description: d("私有截图上传与下载。", "Private screenshot upload and download.") },
      { name: "agents", description: d("本地 Agent 配对、心跳与修复运行记录。", "Local agent pairing, heartbeats, and repair run history.") },
      { name: "webhooks", description: d("issue.created Webhook 与投递诊断。", "issue.created webhooks and delivery diagnostics.") },
      { name: "tokens", description: d("网站 Session 管理的自动化 PAT。", "Automation PATs managed by a website session.") },
      { name: "oauth", description: d("Chrome 扩展 OAuth 2.0 PKCE 授权与令牌轮换。", "OAuth 2.0 PKCE authorization and token rotation for the Chrome extension.") }
    ],
    apis,
    components: {
      securitySchemes: {
        websiteSession: { type: "apiKey", in: "header", name: "Cookie", description: d("Pinhere 网站 Session Cookie；仅浏览器同源请求使用，不应复制到 CLI、Hub 或日志。", "Pinhere website session cookie for same-origin browser requests only; never copy it to a CLI, Hub, or logs.") },
        pinherePat: { type: "http", scheme: "bearer", bearerFormat: "ph_pat_*", description: d("调用方环境持有的 Pinhere PAT。常规 PAT 包含项目与缺陷权限；Agent 配对 PAT 额外包含 agents:write。", "Caller-held Pinhere PAT. Regular PATs contain project and issue scopes; paired-agent PATs additionally contain agents:write.") },
        extensionOAuth: { type: "oauth2", description: d("Chrome 扩展 OAuth 2.0 Authorization Code + PKCE。", "OAuth 2.0 Authorization Code + PKCE for the Chrome extension."), flows: { authorizationCode: {
          authorizationUrl: "https://pinhere.dev/extension-authorize",
          tokenUrl: "https://pinhere.dev/api/v1/oauth/token",
          scopes: {
            "projects:read": d("读取项目并按页面 URL 解析项目。", "Read projects and resolve a project by page URL."),
            "issues:create": d("创建缺陷。", "Create issues."),
            "attachments:write": d("上传截图。", "Upload screenshots.")
          }
        } } }
      },
      parameters,
      schemas
    }
  };
}

async function writeSpecs() {
  const targets = [
    [resolve(root, "specs/spec.pontx.json"), buildSpec("zh-CN")],
    [resolve(root, "specs/locales/en-US/spec.pontx.json"), buildSpec("en-US")]
  ];
  for (const [path, spec] of targets) {
    await mkdir(dirname(path), { recursive: true });
    await writeFile(path, `${JSON.stringify(spec, null, 2)}\n`);
  }
  console.info(`Generated ${Object.keys(targets[0][1].apis).length} Pinhere operations in zh-CN and en-US.`);
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await writeSpecs();
