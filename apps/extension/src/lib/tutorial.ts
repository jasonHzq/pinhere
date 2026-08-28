export const CAPTURE_TUTORIAL_DISMISSED_KEY = "pinhere_capture_tutorial_dismissed";

export function shouldShowCaptureTutorial(value: unknown) {
  return value !== true;
}

export async function readCaptureTutorialVisibility() {
  const stored = await chrome.storage.local.get(CAPTURE_TUTORIAL_DISMISSED_KEY);
  return shouldShowCaptureTutorial(stored[CAPTURE_TUTORIAL_DISMISSED_KEY]);
}

export async function dismissCaptureTutorial() {
  await chrome.storage.local.set({ [CAPTURE_TUTORIAL_DISMISSED_KEY]: true });
}
