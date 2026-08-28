export function installCaptureEditorModal(editorUrl: string) {
  const hostId = "__pinhere_capture_editor__";
  const existing = document.getElementById(hostId);
  if (existing) {
    const iframe = existing.shadowRoot?.querySelector("iframe");
    iframe?.focus();
    return { opened: false, alreadyOpen: true };
  }

  const host = document.createElement("div");
  host.id = hostId;
  const shadow = host.attachShadow({ mode: "open" });
  const style = document.createElement("style");
  style.textContent = `
    :host {
      all: initial;
      position: fixed;
      inset: 0;
      z-index: 2147483647;
      pointer-events: none;
    }
    dialog {
      position: fixed;
      inset: 0;
      display: grid;
      width: 100vw;
      max-width: none;
      height: 100vh;
      height: 100dvh;
      max-height: none;
      margin: 0;
      place-items: center;
      border: 0;
      background: transparent;
      padding: 20px;
      box-sizing: border-box;
      font-family: ui-sans-serif, system-ui, sans-serif;
      pointer-events: none;
    }
    dialog:not([open]) { display: none; }
    .panel {
      position: relative;
      width: min(720px, calc(100vw - 40px));
      height: min(860px, calc(100dvh - 40px));
      overflow: visible;
      border: 1px solid rgba(255, 255, 255, .72);
      border-radius: 22px;
      background: #fffdfa;
      box-shadow: 0 30px 90px rgba(3, 8, 20, .35);
      pointer-events: auto;
    }
    iframe {
      display: block;
      width: 100%;
      height: 100%;
      border: 0;
      border-radius: inherit;
      background: #fffdfa;
    }
    button {
      position: absolute;
      z-index: 2;
      top: -13px;
      right: -13px;
      display: grid;
      width: 38px;
      height: 38px;
      place-items: center;
      border: 2px solid white;
      border-radius: 999px;
      background: #172033;
      color: white;
      box-shadow: 0 8px 24px rgba(3, 8, 20, .26);
      cursor: pointer;
      font: 700 22px/1 ui-sans-serif, system-ui, sans-serif;
    }
    button:hover { background: #315efb; }
    button:focus-visible { outline: 3px solid rgba(93, 128, 255, .55); outline-offset: 3px; }
    @media (max-width: 520px) {
      dialog { padding: 8px; }
      .panel { width: calc(100vw - 16px); height: calc(100dvh - 16px); border-radius: 16px; }
      button { top: 8px; right: 8px; width: 36px; height: 36px; border-width: 1px; }
    }
  `;

  const dialog = document.createElement("dialog");
  dialog.setAttribute("aria-label", "Pinhere 缺陷编辑器");
  const panel = document.createElement("div");
  panel.className = "panel";
  const iframe = document.createElement("iframe");
  iframe.src = editorUrl;
  iframe.title = "Pinhere 缺陷编辑器";
  iframe.allow = "clipboard-write";
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "关闭缺陷编辑器");
  close.title = "关闭缺陷编辑器";
  close.textContent = "×";
  panel.append(iframe, close);
  dialog.append(panel);
  shadow.append(style, dialog);
  document.documentElement.append(host);

  const cleanup = () => host.remove();
  close.addEventListener("click", () => dialog.close());
  dialog.addEventListener("cancel", (event) => {
    event.preventDefault();
    dialog.close();
  });
  dialog.addEventListener("close", cleanup, { once: true });
  dialog.show();
  iframe.focus();
  return { opened: true, alreadyOpen: false };
}

export function dismissCaptureEditorModal() {
  document.getElementById("__pinhere_capture_editor__")?.remove();
}

export async function openEditorSurface(openModal: () => Promise<void>) {
  await openModal();
}

export async function captureAndOpenEditor(
  storeCapture: () => Promise<void>,
  openEditor: () => Promise<void>
) {
  // Opening the extension iframe and persisting a multi-megabyte screenshot are
  // independent. Start both immediately so the editor shell can paint while the
  // capture is still being written; its storage listener hydrates the image when
  // the write finishes.
  await Promise.all([storeCapture(), openEditor()]);
}
