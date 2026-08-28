import { describe, expect, it } from "vitest";
import { buttonVariants } from "./button";

describe("buttonVariants", () => {
  it("keeps button content on one line without shrinking in flex layouts", () => {
    const classes = buttonVariants();

    expect(classes).toContain("shrink-0");
    expect(classes).toContain("whitespace-nowrap");
  });

  it("gives pointer presses immediate tactile feedback", () => {
    expect(buttonVariants()).toContain("active:scale-[.98]");
    expect(buttonVariants({ variant: "outline" })).toContain("active:bg-[#eff6ff]");
  });
});
