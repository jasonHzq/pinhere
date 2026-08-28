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
    // Let the page paint twice after removing Pinhere's overlay, selector label
    // and hint. The background only captures after receiving this message, so
    // none of the picker UI can leak into the screenshot.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      // Waiting for the background response keeps the service-worker task alive
      // until it has stored the screenshot and opened the editor.
      void chrome.runtime.sendMessage({ type: "pinhere/dom-selected", dom }).catch(() => undefined);
    }));
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

/** Runs in the inspected page and lets the user drag an arbitrary viewport region. */
export function installRegionPicker() {
  const pickerId = "__pinhere_picker__";
  if (document.getElementById(pickerId)) return { started: false, error: "Pinhere 圈选已经开启" };

  const root = document.createElement("div");
  root.id = pickerId;
  Object.assign(root.style, {
    position: "fixed",
    inset: "0",
    zIndex: "2147483647",
    cursor: "crosshair",
    touchAction: "none",
    userSelect: "none",
    background: "rgba(8, 12, 20, .24)"
  });

  const selection = document.createElement("div");
  Object.assign(selection.style, {
    position: "fixed",
    display: "none",
    pointerEvents: "none",
    border: "2px solid #ff5c5c",
    borderRadius: "6px",
    background: "rgba(255, 92, 92, .08)",
    boxShadow: "0 0 0 9999px rgba(8, 12, 20, .46), 0 0 0 1px rgba(255, 255, 255, .8) inset"
  });

  const dimensions = document.createElement("div");
  Object.assign(dimensions.style, {
    position: "fixed",
    display: "none",
    pointerEvents: "none",
    borderRadius: "6px",
    background: "#171916",
    color: "white",
    padding: "5px 8px",
    font: "600 11px ui-monospace, SFMono-Regular, Menlo, monospace",
    boxShadow: "0 8px 24px rgba(0, 0, 0, .24)"
  });

  const hint = document.createElement("div");
  hint.textContent = "Pinhere · 拖动框选截图区域 · Esc 取消";
  Object.assign(hint.style, {
    position: "fixed",
    top: "max(14px, env(safe-area-inset-top))",
    left: "50%",
    transform: "translateX(-50%)",
    pointerEvents: "none",
    border: "1px solid rgba(255, 255, 255, .16)",
    borderRadius: "10px",
    background: "#171916",
    color: "white",
    padding: "10px 14px",
    font: "600 12px ui-sans-serif, system-ui, sans-serif",
    boxShadow: "0 10px 32px rgba(0, 0, 0, .28)"
  });

  root.append(selection, dimensions, hint);
  document.documentElement.append(root);

  let drawing: { pointerId: number; x: number; y: number } | null = null;
  let current = { x: 0, y: 0, width: 0, height: 0 };
  const point = (event: PointerEvent) => ({
    x: Math.max(0, Math.min(window.innerWidth, event.clientX)),
    y: Math.max(0, Math.min(window.innerHeight, event.clientY))
  });
  const update = (clientX: number, clientY: number) => {
    if (!drawing) return;
    current = {
      x: Math.min(drawing.x, clientX),
      y: Math.min(drawing.y, clientY),
      width: Math.abs(clientX - drawing.x),
      height: Math.abs(clientY - drawing.y)
    };
    root.style.background = "transparent";
    selection.style.display = "block";
    selection.style.left = `${current.x}px`;
    selection.style.top = `${current.y}px`;
    selection.style.width = `${current.width}px`;
    selection.style.height = `${current.height}px`;
    dimensions.style.display = "block";
    dimensions.textContent = `${Math.round(current.width)} × ${Math.round(current.height)}`;
    dimensions.style.left = `${Math.max(8, Math.min(window.innerWidth - 96, current.x))}px`;
    dimensions.style.top = `${Math.max(52, current.y - 31)}px`;
  };
  const cleanup = () => {
    root.remove();
    document.removeEventListener("keydown", onKeyDown, true);
  };
  const cancelDrawing = () => {
    drawing = null;
    current = { x: 0, y: 0, width: 0, height: 0 };
    root.style.background = "rgba(8, 12, 20, .24)";
    selection.style.display = "none";
    dimensions.style.display = "none";
    hint.textContent = "请拖动至少 20 × 20 px 的区域 · Esc 取消";
  };
  const onPointerDown = (event: PointerEvent) => {
    if (event.button !== 0) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const start = point(event);
    drawing = { pointerId: event.pointerId, ...start };
    root.setPointerCapture(event.pointerId);
    update(start.x, start.y);
  };
  const onPointerMove = (event: PointerEvent) => {
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = point(event);
    update(next.x, next.y);
  };
  const onPointerUp = (event: PointerEvent) => {
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    const next = point(event);
    update(next.x, next.y);
    if (current.width < 20 || current.height < 20) {
      cancelDrawing();
      return;
    }
    const region = {
      viewport: { width: window.innerWidth, height: window.innerHeight, devicePixelRatio: window.devicePixelRatio },
      boundingRect: current
    };
    cleanup();
    requestAnimationFrame(() => requestAnimationFrame(() => {
      void chrome.runtime.sendMessage({ type: "pinhere/region-selected", region }).catch(() => undefined);
    }));
  };
  const onPointerCancel = (event: PointerEvent) => {
    if (!drawing || drawing.pointerId !== event.pointerId) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cancelDrawing();
  };
  const onKeyDown = (event: KeyboardEvent) => {
    if (event.key !== "Escape") return;
    event.preventDefault();
    event.stopImmediatePropagation();
    cleanup();
    void chrome.runtime.sendMessage({ type: "pinhere/region-picker-cancelled" });
  };

  root.addEventListener("pointerdown", onPointerDown, true);
  root.addEventListener("pointermove", onPointerMove, true);
  root.addEventListener("pointerup", onPointerUp, true);
  root.addEventListener("pointercancel", onPointerCancel, true);
  document.addEventListener("keydown", onKeyDown, true);
  return { started: true };
}
