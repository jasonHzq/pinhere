export type Rect = { x: number; y: number; width: number; height: number };
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
export type Project = { id: string; name: string };
export type Tokens = { accessToken: string; refreshToken: string; expiresAt: number };
export type Capture = { pageUrl: string; dom: DomContext; project: Project; screenshot: string; crop: Rect };
export type PendingCapture = { tabId?: number; pageUrl: string; dom: DomContext; screenshot: string };
