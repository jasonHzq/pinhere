import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Select } from "./select";

describe("Select", () => {
  it("renders the shared listbox trigger instead of browser-native select chrome", () => {
    const html = renderToStaticMarkup(
      <Select
        aria-label="Project scope"
        value="all"
        onValueChange={() => undefined}
        options={[{ value: "all", label: "All projects" }]}
      />
    );

    expect(html).toContain('aria-haspopup="listbox"');
    expect(html).not.toContain("<select");
  });
});
