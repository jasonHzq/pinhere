export async function captureAndOpenEditor(
  openEditor: () => Promise<boolean>,
  storeCapture: () => Promise<void>,
  openFallback: () => Promise<void>
) {
  // Start the side-panel request before the first await so Chrome still sees
  // it as part of the user's element-selection gesture.
  const editorResult = openEditor();
  await storeCapture();
  if (!(await editorResult)) await openFallback();
}
