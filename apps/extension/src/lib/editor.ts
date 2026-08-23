export async function captureAndOpenEditor(
  storeCapture: () => Promise<void>,
  openEditorPopup: () => Promise<void>
) {
  await storeCapture();
  await openEditorPopup();
}
