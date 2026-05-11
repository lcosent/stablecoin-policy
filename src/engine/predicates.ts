import type { Payment, Predicate, PredicateOp } from "../types/policy.js";

/** Get a value from a payment by dotted path, e.g. "payer.kyc_tier". */
export function getByPath(obj: Payment, path: string): unknown {
  if (path === "*") return obj;
  const parts = path.split(".");
  let current: unknown = obj;
  for (const p of parts) {
    if (current === null || current === undefined || typeof current !== "object") return undefined;
    current = (current as Record<string, unknown>)[p];
  }
  return current;
}

const COMPARATORS: Record<PredicateOp, (a: unknown, b: unknown) => boolean> = {
  eq: (a, b) => a === b,
  neq: (a, b) => a !== b,
  lt: (a, b) => typeof a === "number" && typeof b === "number" && a < b,
  lte: (a, b) => typeof a === "number" && typeof b === "number" && a <= b,
  gt: (a, b) => typeof a === "number" && typeof b === "number" && a > b,
  gte: (a, b) => typeof a === "number" && typeof b === "number" && a >= b,
  in: (a, b) => Array.isArray(b) && b.includes(a),
  not_in: (a, b) => Array.isArray(b) && !b.includes(a),
  contains: (a, b) => typeof a === "string" && typeof b === "string" && a.includes(b),
  starts_with: (a, b) => typeof a === "string" && typeof b === "string" && a.startsWith(b),
};

export function evaluatePredicate(predicate: Predicate, payment: Payment): boolean {
  const left = getByPath(payment, predicate.field);
  const right =
    predicate.field_b !== undefined ? getByPath(payment, predicate.field_b) : predicate.value;
  const comparator = COMPARATORS[predicate.op];
  return comparator(left, right);
}

export function evaluateAllPredicates(
  predicates: Record<string, Predicate>,
  payment: Payment,
): Record<string, boolean> {
  const result: Record<string, boolean> = {};
  for (const [name, pred] of Object.entries(predicates)) {
    result[name] = evaluatePredicate(pred, payment);
  }
  return result;
}
