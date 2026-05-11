import { parse as parseYaml } from "yaml";
import { PolicySchema, type Policy } from "../types/policy.js";

/**
 * Compile a policy from YAML or JSON source.
 * Throws ZodError if the policy is malformed.
 */
export function compilePolicy(source: string | object): Policy {
  let raw: unknown;
  if (typeof source === "string") {
    const trimmed = source.trimStart();
    if (trimmed.startsWith("{") || trimmed.startsWith("[")) {
      raw = JSON.parse(source);
    } else {
      raw = parseYaml(source);
    }
  } else {
    raw = source;
  }
  return PolicySchema.parse(raw);
}

/** Quick validation without throwing. */
export function validatePolicy(source: string | object): { ok: boolean; error?: string } {
  try {
    compilePolicy(source);
    return { ok: true };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : String(e) };
  }
}
