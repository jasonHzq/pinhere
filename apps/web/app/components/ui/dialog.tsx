import { useEffect, useRef } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

export function Dialog({ open, title, description, children, onClose }: {
  open: boolean;
  title: string;
  description?: string;
  children: React.ReactNode;
  onClose: () => void;
}) {
  const panelRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (!open) return;
    const previous = document.activeElement as HTMLElement | null;
    const onKeyDown = (event: KeyboardEvent) => { if (event.key === "Escape") onCloseRef.current(); };
    document.addEventListener("keydown", onKeyDown);
    document.body.style.overflow = "hidden";
    const focusFrame = requestAnimationFrame(() => {
      const initialFocus = panelRef.current?.querySelector<HTMLElement>("[autofocus]");
      (initialFocus ?? panelRef.current)?.focus();
    });
    return () => {
      cancelAnimationFrame(focusFrame);
      document.removeEventListener("keydown", onKeyDown);
      document.body.style.overflow = "";
      previous?.focus();
    };
  }, [open]);

  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[100] grid place-items-center bg-[#1c252d]/45 p-4 backdrop-blur-sm" onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
      <div ref={panelRef} role="dialog" aria-modal="true" aria-labelledby="dialog-title" tabIndex={-1} className="warm-panel w-full max-w-md rounded-2xl p-5 outline-none animate-rise sm:p-6">
        <div className="flex items-start justify-between gap-5">
          <div><h2 id="dialog-title" className="font-display text-2xl font-bold tracking-[-.035em]">{title}</h2>{description && <p className="mt-2 text-sm leading-6 text-[#69737c]">{description}</p>}</div>
          <button type="button" aria-label="Close" className="focus-ring grid size-10 shrink-0 place-items-center rounded-xl text-[#75808a] hover:bg-[#e8edf1]" onClick={onClose}><X size={17} /></button>
        </div>
        <div className="mt-6">{children}</div>
      </div>
    </div>
  );
}

export function ConfirmDialog({ open, title, description, confirmLabel, cancelLabel, busy = false, error, onConfirm, onClose }: {
  open: boolean;
  title: string;
  description: string;
  confirmLabel: string;
  cancelLabel: string;
  busy?: boolean;
  error?: string;
  onConfirm: () => void;
  onClose: () => void;
}) {
  return <Dialog open={open} title={title} description={description} onClose={onClose}>{error && <p role="alert" className="mb-4 rounded-xl bg-[#f8eaea] px-3 py-2 text-xs text-[#a33f3f]">{error}</p>}<div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><Button type="button" variant="outline" disabled={busy} onClick={onClose}>{cancelLabel}</Button><Button type="button" variant="danger" disabled={busy} onClick={onConfirm}>{busy ? "…" : confirmLabel}</Button></div></Dialog>;
}
