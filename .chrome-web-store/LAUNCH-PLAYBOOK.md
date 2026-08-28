# Pinhere launch playbook

Use this after the Chrome Web Store item is approved. Replace every
`CHROME_WEB_STORE_URL` placeholder before publishing.

## Positioning

Pinhere turns a visual webpage bug into an agent-ready issue: select the exact
DOM element, keep the screenshot and browser context together, and hand it to
an AI coding agent to claim, fix, and report back.

Primary audience:

- Independent developers using AI coding agents
- Product, design, QA, and frontend teams reviewing web interfaces
- Teams losing time translating screenshots and vague visual feedback into code changes

Primary call to action: install from the Chrome Web Store and create the first
structured issue.

## Trackable links

Keep the Chrome Web Store URL as the final destination for install-focused
posts. Use the website URL for educational posts that need more context.

| Channel | Website URL |
| --- | --- |
| Chrome Web Store listing | `https://pinhere.dev/en?utm_source=chrome_web_store&utm_medium=referral&utm_campaign=cws_launch` |
| GitHub | `https://pinhere.dev/en?utm_source=github&utm_medium=referral&utm_campaign=cws_launch` |
| X | `https://pinhere.dev/en?utm_source=x&utm_medium=social&utm_campaign=cws_launch` |
| Hacker News | `https://pinhere.dev/en?utm_source=hacker_news&utm_medium=community&utm_campaign=cws_launch` |
| Reddit | `https://pinhere.dev/en?utm_source=reddit&utm_medium=community&utm_campaign=cws_launch` |
| Product Hunt | `https://pinhere.dev/en?utm_source=product_hunt&utm_medium=launch&utm_campaign=cws_launch` |
| Chinese communities | `https://pinhere.dev/zh-CN?utm_source=cn_community&utm_medium=community&utm_campaign=cws_launch` |

## English launch post

### X / LinkedIn

I built Pinhere because “the button in the top right looks wrong” is not an
actionable bug report.

Pinhere lets you select the exact DOM element, capture and annotate the visible
page, and create a structured issue that an AI coding agent can claim, fix, and
report back on.

- Exact DOM context, not just pixels
- Screenshot and reproduction context stay together
- Private issue workspace
- CLI/API handoff for coding agents

Install: CHROME_WEB_STORE_URL

### Hacker News title

Show HN: Pinhere – turn a selected DOM element into an issue for an AI coding agent

### Hacker News body

I kept losing time translating visual feedback into something a coding agent
could act on. Screenshots show the symptom but lose the DOM location, page
context, and workflow state.

Pinhere is a Chrome extension and small issue workspace. You activate it on a
page, select the exact element, optionally crop or annotate the visible
screenshot, and submit a structured issue containing the page URL, limited DOM
context, selector information, viewport, and description. A coding agent can
then claim the issue through the CLI/API and write the status back.

The extension only reads the current page after explicit activation. It does
not read browser history, cookies, passwords, or form values.

I would especially value feedback on the browser-to-agent handoff and what
context is still missing for real frontend repairs.

Demo and install: `https://pinhere.dev/en?utm_source=hacker_news&utm_medium=community&utm_campaign=cws_launch`

### Reddit opening

I built a Chrome extension for turning visual frontend feedback into structured
issues an AI coding agent can actually use. Instead of sending a screenshot and
“look near the header,” you select the DOM element and preserve its page URL,
selector context, screenshot, and issue state together.

I am looking for feedback from frontend developers and teams already using AI
coding agents in review or QA workflows. The useful question is not “do you
like it?” but “what context would your agent still need before it could fix the
issue without another round trip?”

## Chinese launch post

做 Pinhere 的原因很简单：

“右上角那个按钮看起来不对”不是一条可执行的缺陷。

Pinhere 允许你在网页上直接圈选具体 DOM 元素，把页面 URL、元素定位、
可编辑截图和问题描述放进同一条结构化 Issue，再交给 AI Coding Agent
领取、修复并回写结果。

- 不只保存截图，也保存准确的 DOM 现场
- 截图、复现上下文和处理状态不会散落在不同工具里
- 私有项目工作区
- 通过 Skill、CLI 和 API 交给 Coding Agent

安装：CHROME_WEB_STORE_URL

产品介绍：`https://pinhere.dev/zh-CN?utm_source=cn_community&utm_medium=community&utm_campaign=cws_launch`

## Launch order

1. Publish the Chrome Web Store listing and verify the install flow.
2. Replace the manual ZIP CTA on `pinhere.dev` with the store URL, retaining a
   secondary manual-download option only for development users.
3. Create a GitHub release for v0.1.9 and update the repository README with the
   store badge.
4. Publish the X/LinkedIn post and the Chinese community post.
5. Post to Hacker News only when someone can reply to technical questions for
   the next two hours.
6. Publish to relevant Reddit communities after adapting the post to each
   community's rules; do not cross-post identical copy in bulk.
7. Use Product Hunt after early users have produced several real testimonials
   and the onboarding funnel is stable.

## First-week metrics

Use one daily note rather than reacting to hourly noise.

| Funnel stage | Signal | Existing measurement |
| --- | --- | --- |
| Landing interest | Install-section clicks | GA4 `install_cta_click` by `placement` |
| Download intent | Manual extension downloads | GA4 `extension_download` |
| Account intent | Sign-in clicks | GA4 `sign_in_click` and `sign_in_method_click` |
| Activation | First project and first issue | Product database; add an activation event after store approval |
| Agent value | First claimed issue and first completed issue | Issue status transitions |

Review after seven days:

- Landing → install click-through rate
- Install → authenticated workspace rate
- Authenticated workspace → first issue rate
- First issue → agent claim rate
- Agent claim → completed issue rate
- Qualitative reasons users stopped before their first issue

Do not optimize for raw store impressions. The useful north-star for the first
release is the number of users who create an issue that an agent successfully
claims and completes.

## Approval-day checklist

- [ ] Insert the final Chrome Web Store URL in this file
- [ ] Test installation in a clean Chrome profile
- [ ] Confirm sign-in, page activation, DOM selection, screenshot editing, and issue creation
- [ ] Confirm privacy and support links from the store listing
- [ ] Replace the website's primary manual ZIP CTA with the store URL
- [ ] Tag and publish GitHub release v0.1.9
- [ ] Publish the first two launch posts
- [ ] Check GA4 traffic source and install CTA events after 24 hours
- [ ] Ask activated users for honest feedback without requesting a specific rating
