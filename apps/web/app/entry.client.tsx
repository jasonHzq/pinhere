import { startTransition, StrictMode } from "react";
import { hydrateRoot } from "react-dom/client";
import { HydratedRouter } from "react-router/dom";

function hydrate() {
  startTransition(() => {
    hydrateRoot(
      document,
      <StrictMode>
        <HydratedRouter />
      </StrictMode>,
      {
        onRecoverableError(error) {
          const message = error instanceof Error ? error.message : String(error);
          // React 19 can report #418 on Vercel even when the response HTML and
          // browser-parsed DOM are byte-for-byte equivalent. React already
          // recovers this tree; keep genuine recoverable errors visible.
          if (message.includes("Minified React error #418") || message.startsWith("Hydration failed because")) return;
          console.error(error);
        }
      }
    );
  });
}

if (document.readyState === "loading") {
  document.addEventListener("DOMContentLoaded", hydrate, { once: true });
} else {
  hydrate();
}
