import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import captureEditorHtml from "../capture-editor.html?raw";
import popupHtml from "../popup.html?raw";

const styles = readFileSync(new URL("./styles.css", import.meta.url), "utf8");
const app = readFileSync(new URL("./app.tsx", import.meta.url), "utf8");
const background = readFileSync(new URL("./background.ts", import.meta.url), "utf8");
const editor = readFileSync(new URL("./lib/editor.ts", import.meta.url), "utf8");

describe("extension surface layout", () => {
  it("keeps the action panel compact and content-sized", () => {
    expect(popupHtml).toContain('class="pinhere-panel-page"');
    expect(captureEditorHtml).not.toContain("pinhere-panel-page");
    expect(captureEditorHtml).toContain('src="/src/main.tsx"');
    expect(styles).toMatch(/html\.pinhere-panel-page[\s\S]*?width: 320px;[\s\S]*?min-width: 320px;[\s\S]*?min-height: 0;/);
    expect(styles).toMatch(/html\.pinhere-panel-page body \{ max-height: 560px; \}/);
    expect(styles).not.toMatch(/\.pinhere-popup\s*\{[^}]*min-height:\s*100vh/);
    expect(background).toContain("installCaptureEditorModal");
    expect(background).not.toContain('chrome.runtime.getURL("popup.html")');
    expect(background).not.toContain("chrome.sidePanel.open");
    expect(background).not.toContain("chrome.tabs.create({ url: editorUrl");
    expect(background).not.toMatch(/chrome\.windows\.create\([\s\S]*capture-editor/);
    expect(editor).toContain('document.createElement("dialog")');
    expect(editor).toContain("dialog.show()");
    expect(editor).not.toContain("dialog.showModal()");
    expect(editor).toContain("pointer-events: none");
  });

  it("does not make background readable-ID generation look blocking", () => {
    expect(app).not.toContain("正在生成可读 ID");
    expect(app).toContain("visibleIssueId &&");
  });
});
