import type { DomContext } from "@/types";

/**
 * Runs in the inspected page's isolated world. It intentionally returns
 * immediately, then sends the chosen DOM snapshot back to the service worker.
 * This lets the action popup close naturally while the user makes a selection.
 */
export function installDomPicker() {
  const existing = document.getElementById("__pinhere_picker__");
  if (existing) return { started: false, error: "Pinhere 圈选已经开启" };

  const overlay = document.createElement("div");
  overlay.id = "__pinhere_picker__";
  Object.assign(overlay.style, {
    position: "fixed", pointerEvents: "none", zIndex: "2147483647", border: "2px solid #4c7cff",
    background: "rgba(22,77,216,.12)", boxShadow: "0 0 0 9999px rgba(8,12,20,.28)",
    borderRadius: "5px", transition: "all 45ms linear"
  });

  const label = document.createElement("div");
  Object.assign(label.style, {
    position: "fixed", pointerEvents: "none", zIndex: "2147483647", background: "#164dd8", color: "white",
    font: "500 11px ui-monospace, monospace", padding: "5px 8px", borderRadius: "5px", maxWidth: "70vw",
    overflow: "hidden", whiteSpace: "nowrap"
  });

  const hint = document.createElement("div");
  const coarsePointer = window.matchMedia("(pointer: coarse)").matches;
  hint.textContent = coarsePointer ? "Pinhere · 触摸并松开选择元素" : "Pinhere · 点击选择元素 · Esc 取消";
  Object.assign(hint.style, {
    position: "fixed", pointerEvents: "none", top: "max(14px, env(safe-area-inset-top))", left: "50%", transform: "translateX(-50%)", zIndex: "2147483647",
    background: "#171916", color: "white", font: "600 12px sans-serif", padding: "9px 13px", borderRadius: "8px",
    boxShadow: "0 8px 30px rgba(0,0,0,.25)"
  });
  document.documentElement.append(overlay, label, hint);

  let target: Element | null = null;
  const sensitive = /(^|[-_:])(value|password|secret|token|key|code|session|auth|jwt)($|[-_:])/i;
  const cssSelector = (element: Element) => {
    if (element.id) return `#${CSS.escape(element.id)}`;
    const parts: string[] = [];
    let node: Element | null = element;
    while (node && node !== document.documentElement && parts.length < 8) {
      let part = node.tagName.toLowerCase();
      const stable = [...node.classList].filter((value) => !/^(active|hover|focus|selected|css-|jsx-|[a-z0-9]{8,})$/i.test(value)).slice(0, 2);
      if (stable.length) part += stable.map((value) => `.${CSS.escape(value)}`).join("");
      const parent: Element | null = node.parentElement;
      if (parent) {
        const siblings = [...parent.children].filter((child) => child.tagName === node!.tagName);
        if (siblings.length > 1) part += `:nth-of-type(${siblings.indexOf(node) + 1})`;
      }
      parts.unshift(part);
      node = parent;
    }
    return parts.join(" > ");
  };
  const xpath = (element: Element) => {
    const parts: string[] = [];
    let node: Element | null = element;
    while (node?.nodeType === Node.ELEMENT_NODE) {
      const parent: Element | null = node.parentElement;
      const tag = node.tagName.toLowerCase();
      const siblings = parent ? [...parent.children].filter((child) => child.tagName === node!.tagName) : [];
      parts.unshift(`${tag}${siblings.length > 1 ? `[${siblings.indexOf(node) + 1}]` : ""}`);
      node = parent;
    }
    return `/${parts.join("/")}`;
  };
  const snapshot = (element: Element): DomContext => {
    const rect = element.getBoundingClientRect();
    const attributes: Record<string, string> = {};
    for (const attribute of [...element.attributes]) {
      if (attribute.name.startsWith("on") || attribute.name === "srcdoc" || sensitive.test(attribute.name)) continue;
      attributes[attribute.name] = attribute.value.slice(0, 2_000);
    }
    const clone = element.cloneNode(true) as Element;
    for (const item of [clone, ...clone.querySelectorAll("*")]) {
      for (const attribute of [...item.attributes]) {
        if (attribute.name.startsWith("on") || attribute.name === "srcdoc" || sensitive.test(attribute.name)) item.removeAttribute(attribute.name);
      }
      if (item instanceof HTMLInputElement) {
        item.removeAttribute("value");
        item.value = "";
      }
      if (item instanceof HTMLTextAreaElement) {
        item.removeAttribute("value");
        item.value = "";
        item.textContent = "";
      }
      if (item instanceof HTMLSelectElement) {
        item.selectedIndex = -1;
        for (const option of [...item.options]) option.removeAttribute("selected");
      }
    }
    return {
      cssSelector: cssSelector(element), xpath: xpath(element), tagName: element.tagName.toLowerCase(), attributes,
      text: (element.textContent ?? "").replace(/\s+/g, " ").trim().slice(0, 5_000), outerHTML: clone.outerHTML.slice(0, 30_000),
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      boundingRect: { x: rect.x, y: rect.y, width: rect.width, height: rect.height }
    };
  };
  const cleanup = () => {
    overlay.remove();
    label.remove();
    hint.remove();
    document.removeEventListener("mousemove", move, true);
    document.removeEventListener("click", click, true);
    document.removeEventListener("keydown", key, true);
    document.removeEventListener("touchstart", touchStart, true);
    document.removeEventListener("touchmove", touchMove, true);
    document.removeEventListener("touchend", touchEnd, true);
  };
  const highlight = (clientX: number, clientY: number) => {
    const element = document.elementFromPoint(clientX, clientY);
    if (!element || element === overlay || element === label || element === hint) return;
    target = element;
    const rect = element.getBoundingClientRect();
    Object.assign(overlay.style, { left: `${rect.left}px`, top: `${rect.top}px`, width: `${rect.width}px`, height: `${rect.height}px` });
    label.textContent = cssSelector(element);
    label.style.left = `${Math.max(8, rect.left)}px`;
    label.style.top = `${Math.max(8, rect.top - 29)}px`;
  };
  const move = (event: MouseEvent) => highlight(event.clientX, event.clientY);
  const choose = () => {
    if (!target) return;
    const dom = snapshot(target);
    cleanup();
    // Waiting for the background response keeps the service-worker task alive
    // until it has stored the screenshot and opened the editor.
    void chrome.runtime.sendMessage({ type: "pinhere/dom-selected", dom }).catch(() => undefined);
  };
  const click = (event: MouseEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    highlight(event.clientX, event.clientY);
    choose();
  };
  const touchStart = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    highlight(touch.clientX, touch.clientY);
  };
  const touchMove = (event: TouchEvent) => {
    const touch = event.touches[0];
    if (!touch) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    highlight(touch.clientX, touch.clientY);
  };
  const touchEnd = (event: TouchEvent) => {
    event.preventDefault();
    event.stopImmediatePropagation();
    const touch = event.changedTouches[0];
    if (touch) highlight(touch.clientX, touch.clientY);
    choose();
  };
  const key = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    cleanup();
    void chrome.runtime.sendMessage({ type: "pinhere/dom-picker-cancelled" });
  };
  document.addEventListener("mousemove", move, true);
  document.addEventListener("click", click, true);
  document.addEventListener("keydown", key, true);
  document.addEventListener("touchstart", touchStart, { capture: true, passive: false });
  document.addEventListener("touchmove", touchMove, { capture: true, passive: false });
  document.addEventListener("touchend", touchEnd, { capture: true, passive: false });
  return { started: true };
}
