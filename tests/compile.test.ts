import { describe, expect, it } from "vitest";

import { compilePolicy, validatePolicy } from "../src/index.js";

describe("compile", () => {
  it("compiles a minimal policy", () => {
    const policy = compilePolicy({
      version: 1,
      metadata: { name: "test" },
      predicates: { p1: { field: "amount", op: "lt", value: 100 } },
      views: { merchant: { reveal: ["amount"], attest: ["p1"] } },
    });
    expect(policy.metadata.name).toBe("test");
    expect(policy.predicates.p1.op).toBe("lt");
  });

  it("rejects a predicate without value or field_b", () => {
    expect(() =>
      compilePolicy({
        version: 1,
        metadata: { name: "broken" },
        predicates: { p1: { field: "amount", op: "lt" } },
        views: { merchant: { reveal: [] } },
      }),
    ).toThrow();
  });

  it("validates returns ok=false for malformed policy", () => {
    const result = validatePolicy("not yaml: :: bad");
    expect(result.ok).toBe(false);
    expect(result.error).toBeTruthy();
  });

  it("parses YAML and JSON equivalently", () => {
    const yaml = `version: 1
metadata: { name: ab }
predicates:
  p1: { field: amount, op: lt, value: 5 }
views:
  m: { reveal: [amount], attest: [p1] }`;
    const json = JSON.stringify({
      version: 1,
      metadata: { name: "ab" },
      predicates: { p1: { field: "amount", op: "lt", value: 5 } },
      views: { m: { reveal: ["amount"], attest: ["p1"] } },
    });
    const fromYaml = compilePolicy(yaml);
    const fromJson = compilePolicy(json);
    expect(fromYaml).toEqual(fromJson);
  });
});
