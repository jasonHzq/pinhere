import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { Tabs, TabsList, TabsTrigger } from "./tabs";

describe("Tabs", () => {
  it("renders segment tabs as compact rounded rectangles instead of pills", () => {
    const html = renderToStaticMarkup(
      <Tabs defaultValue="all" variant="segment">
        <TabsList>
          <TabsTrigger value="all">All</TabsTrigger>
        </TabsList>
      </Tabs>
    );

    expect(html).toContain('role="tablist" class="inline-flex items-center gap-0 rounded-lg');
    expect(html).toMatch(/<button[^>]*class="[^"]*rounded-md[^"]*"/);
    expect(html).toContain('style="border-radius:6px"');
    expect(html).not.toMatch(/<button[^>]*class="[^"]*rounded-full[^"]*"/);
  });
});
