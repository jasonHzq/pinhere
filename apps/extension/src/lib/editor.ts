export async function captureAndOpenEditor(
  openEditor: () => Promise<boolean>,
  storeCapture: () => Promise<void>,
  openFallback: () => Promise<void>,
  openTimeoutMs = 400
) {
  // Start the side-panel request before the first await so Chrome still sees
  // it as part of the user's element-selection gesture.
  const editorResult = openEditor().catch(() => false);
  let timeout: ReturnType<typeof setTimeout> | undefined;
  const editorOpened = Promise.race([
    editorResult,
    new Promise<boolean>((resolve) => {
      timeout = setTimeout(() => resolve(false), openTimeoutMs);
    })
  ]).finally(() => {
    if (timeout) clearTimeout(timeout);
  });

  await storeCapture();
  if (!(await editorOpened)) await openFallback();
}
