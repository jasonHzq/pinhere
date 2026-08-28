export type Rect = { x: number; y: number; width: number; height: number };
export type CaptureMode = "dom" | "region";
export type DomContext = {
  cssSelector: string;
  xpath: string;
  tagName: string;
  attributes: Record<string, string>;
  text: string;
  outerHTML: string;
  viewport: { width: number; height: number; devicePixelRatio: number };
  boundingRect: Rect;
};
export type Project = { id: string; name: string; identifier: string };
export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };
export type Capture = { mode: CaptureMode; pageUrl: string; dom: DomContext; project: Project; screenshot: string; crop: Rect; highlight?: Rect };
export type PendingCapture = { mode?: CaptureMode; tabId?: number; pageUrl: string; dom: DomContext; screenshot: string };
