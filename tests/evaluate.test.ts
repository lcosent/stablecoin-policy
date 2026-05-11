import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { compilePolicy, evaluate } from "../src/index.js";

const policy = compilePolicy(readFileSync("policies/retail_payment.yaml", "utf8"));
const paymentSmall = JSON.parse(readFileSync("examples/payment_under_ctr.json", "utf8"));
const paymentLarge = JSON.parse(readFileSync("examples/payment_above_ctr.json", "utf8"));

describe("evaluate", () => {
  it("merchant sees amount and memo, plus attestations", () => {
    const view = evaluate(policy, paymentSmall, { role: "merchant" });
    expect(view.applicable).toBe(true);
    expect(view.revealed).toMatchObject({
      amount: 8500,
      currency: "USDC",
      memo: "invoice 42",
      payer: { display_name: "Acme Inc." },
    });
    // merchant should NOT see payer.id
    expect((view.revealed.payer as Record<string, unknown>).id).toBeUndefined();
    expect(view.attestations).toContainEqual({
      predicate: "payer_kyc_at_least_tier2",
      value: true,
    });
    expect(view.attestations).toContainEqual({
      predicate: "counterparty_not_sanctioned",
      value: true,
    });
  });

  it("aml_regulator view is gated by amount_under_ctr predicate", () => {
    const viewSmall = evaluate(policy, paymentSmall, { role: "aml_regulator" });
    expect(viewSmall.applicable).toBe(false);
    expect(viewSmall.revealed).toEqual({});

    const viewLarge = evaluate(policy, paymentLarge, { role: "aml_regulator" });
    expect(viewLarge.applicable).toBe(true);
    expect(viewLarge.revealed.amount).toBe(25000);
    expect((viewLarge.revealed.payer as Record<string, unknown>).id).toBe("did:p:gamma");
  });

  it("settlement_agent gets everything via wildcard", () => {
    const view = evaluate(policy, paymentSmall, { role: "settlement_agent" });
    expect(view.applicable).toBe(true);
    expect(view.revealed.amount).toBe(8500);
    expect((view.revealed.payer as Record<string, unknown>).id).toBe("did:p:alice");
  });

  it("public_chain reveals nothing but emits attestations", () => {
    const view = evaluate(policy, paymentSmall, { role: "public_chain" });
    expect(view.revealed).toEqual({});
    expect(view.attestations).toHaveLength(3);
    expect(view.attestations.every((a) => a.value === true)).toBe(true);
  });

  it("unknown role returns inapplicable view", () => {
    const view = evaluate(policy, paymentSmall, { role: "stranger" });
    expect(view.applicable).toBe(false);
    expect(view.revealed).toEqual({});
  });
});
