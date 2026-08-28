import { z } from "zod";

const editableIssueFields = {
  title: z.string().trim().min(1).max(200),
  description: z.string().trim().min(1).max(20_000)
};

const domSchema = z.object({
  cssSelector: z.string().max(2_000),
  xpath: z.string().max(2_000),
  tagName: z.string().max(100),
  attributes: z.record(z.string(), z.string().max(2_000)),
  text: z.string().max(5_000),
  outerHTML: z.string().max(30_000),
  viewport: z.object({
    width: z.number().positive(),
    height: z.number().positive(),
    devicePixelRatio: z.number().positive().max(8)
  }),
  boundingRect: z.object({
    x: z.number(),
    y: z.number(),
    width: z.number().nonnegative(),
    height: z.number().nonnegative()
  })
});

export const attachmentInput = z.object({
  fileName: z.string().max(200),
  contentType: z.enum(["image/png", "image/jpeg", "image/webp"]),
  base64: z.string()
});

export const issueInput = z.object({
  projectId: z.string(),
  ...editableIssueFields,
  pageUrl: z.string().url(),
  dom: domSchema,
  attachmentId: z.string().optional(),
  screenshot: attachmentInput.optional(),
  source: z.enum(["extension", "web", "api"]).default("extension")
}).refine((value) => !(value.attachmentId && value.screenshot), {
  message: "Use attachmentId or screenshot, not both"
});

// Keep the edit schema independent from issueInput's cross-field refinement.
// Zod 4 deliberately rejects pick/omit on refined object schemas at runtime.
export const issueUpdateInput = z.object(editableIssueFields).partial();
