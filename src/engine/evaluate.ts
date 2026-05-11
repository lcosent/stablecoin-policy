import type {
  Attestation,
  EvaluatedView,
  Payment,
  Policy,
  Requester,
} from "../types/policy.js";
import { evalCondition } from "./conditions.js";
import { evaluateAllPredicates, getByPath } from "./predicates.js";

export function evaluate(
  policy: Policy,
  payment: Payment,
  requester: Requester,
): EvaluatedView {
  const view = policy.views[requester.role];
  if (!view) {
    return {
      role: requester.role,
      revealed: {},
      attestations: [],
      denied: [],
      applicable: false,
    };
  }

  const predicateValues = evaluateAllPredicates(policy.predicates, payment);

  // `when:` gate
  if (view.when && view.when.trim() !== "") {
    const applicable = evalCondition(view.when, predicateValues);
    if (!applicable) {
      return {
        role: requester.role,
        revealed: {},
        attestations: [],
        denied: [],
        applicable: false,
      };
    }
  }

  // Reveal
  const revealed: Record<string, unknown> = {};
  const denied: string[] = [];

  for (const path of view.reveal) {
    if (path === "*") {
      Object.assign(revealed, payment);
      continue;
    }
    const value = getByPath(payment, path);
    if (value === undefined) {
      denied.push(path);
      continue;
    }
    setByPath(revealed, path, value);
  }

  // Attest
  const attestations: Attestation[] = [];
  for (const predicateName of view.attest) {
    if (!(predicateName in predicateValues)) {
      throw new Error(
        `view '${requester.role}' references unknown predicate '${predicateName}'`,
      );
    }
    attestations.push({
      predicate: predicateName,
      value: predicateValues[predicateName] === true,
    });
  }

  return {
    role: requester.role,
    revealed,
    attestations,
    denied,
    applicable: true,
  };
}

function setByPath(obj: Record<string, unknown>, path: string, value: unknown): void {
  const parts = path.split(".");
  let current: Record<string, unknown> = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i] as string;
    if (typeof current[p] !== "object" || current[p] === null) {
      current[p] = {};
    }
    current = current[p] as Record<string, unknown>;
  }
  const last = parts[parts.length - 1] as string;
  current[last] = value;
}
