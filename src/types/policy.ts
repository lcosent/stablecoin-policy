import { z } from "zod";

// ─────────────────────────────────────────────────────────────────────────
// Predicate schema
// ─────────────────────────────────────────────────────────────────────────

export const PredicateOpSchema = z.enum([
  "eq",
  "neq",
  "lt",
  "lte",
  "gt",
  "gte",
  "in",
  "not_in",
  "contains",
  "starts_with",
]);
export type PredicateOp = z.infer<typeof PredicateOpSchema>;

export const PredicateSchema = z
  .object({
    field: z.string(),
    op: PredicateOpSchema,
    value: z.unknown().optional(),
    field_b: z.string().optional(),
  })
  .refine(
    (p) => p.value !== undefined || p.field_b !== undefined,
    "predicate must define either `value` or `field_b`",
  );
export type Predicate = z.infer<typeof PredicateSchema>;

// ─────────────────────────────────────────────────────────────────────────
// View schema
// ─────────────────────────────────────────────────────────────────────────

export const ViewSchema = z.object({
  when: z.string().optional(),
  reveal: z.array(z.string()).default([]),
  attest: z.array(z.string()).default([]),
});
export type View = z.infer<typeof ViewSchema>;

// ─────────────────────────────────────────────────────────────────────────
// Policy schema
// ─────────────────────────────────────────────────────────────────────────

export const PolicySchema = z.object({
  version: z.literal(1),
  metadata: z
    .object({
      name: z.string(),
      jurisdiction: z.string().optional(),
      description: z.string().optional(),
    })
    .passthrough(),
  predicates: z.record(z.string(), PredicateSchema).default({}),
  views: z.record(z.string(), ViewSchema),
});
export type Policy = z.infer<typeof PolicySchema>;

// ─────────────────────────────────────────────────────────────────────────
// Payment + requester + result
// ─────────────────────────────────────────────────────────────────────────

export type Payment = Record<string, unknown>;

export interface Requester {
  role: string;
}

export interface Attestation {
  predicate: string;
  value: boolean;
}

export interface EvaluatedView {
  role: string;
  revealed: Record<string, unknown>;
  attestations: Attestation[];
  denied: string[];
  applicable: boolean; // false when the view's `when:` clause fails
}
