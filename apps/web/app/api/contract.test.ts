import { describe, expect, it } from "vitest";
import spec from "../../specs/spec.pontx.json";
import { IMPLEMENTED_OPERATION_IDS } from "./operations";

describe("Pinhere API contract", () => {
  it("has one Hono implementation for every Pontx operation", () => {
    expect([...IMPLEMENTED_OPERATION_IDS].sort()).toEqual(Object.values(spec.apis).map((operation) => operation.operationId).sort());
  });

  it("keeps operationId equal to the final hierarchy segment", () => {
    for (const [key, operation] of Object.entries(spec.apis)) expect(operation.operationId).toBe(key.split("/").at(-1));
  });
});
