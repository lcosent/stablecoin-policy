import { describe, expect, it } from "vitest";

import { evalCondition } from "../src/engine/conditions.js";

const ctx = { a: true, b: false, c: true, d: false };

describe("evalCondition", () => {
  it("returns the bare predicate value", () => {
    expect(evalCondition("a", ctx)).toBe(true);
    expect(evalCondition("b", ctx)).toBe(false);
  });

  it("evaluates not()", () => {
    expect(evalCondition("not(a)", ctx)).toBe(false);
    expect(evalCondition("not(b)", ctx)).toBe(true);
  });

  it("evaluates and()", () => {
    expect(evalCondition("and(a, c)", ctx)).toBe(true);
    expect(evalCondition("and(a, b)", ctx)).toBe(false);
  });

  it("evaluates or()", () => {
    expect(evalCondition("or(a, b)", ctx)).toBe(true);
    expect(evalCondition("or(b, d)", ctx)).toBe(false);
  });

  it("evaluates nested expressions", () => {
    expect(evalCondition("and(a, not(b))", ctx)).toBe(true);
    expect(evalCondition("or(not(a), and(b, c))", ctx)).toBe(false);
  });

  it("throws on unknown predicate", () => {
    expect(() => evalCondition("unknown_pred", ctx)).toThrow();
  });
});
