# stablecoin-policy

A **selective-disclosure policy engine** for stablecoin payments. Different counterparties see different fields based on a declarative, signed policy. Built for the regulated-payments case where **full privacy is illegal but plaintext on chain is irresponsible**.

```ts
import { compilePolicy, evaluate } from "stablecoin-policy";
import { readFileSync } from "node:fs";

const policy = compilePolicy(readFileSync("policies/retail_payment.yaml", "utf8"));

const payment = {
  amount: 8500,
  currency: "USDC",
  memo: "invoice 42",
  payer: { id: "did:p:alice", display_name: "Acme Inc.", kyc_tier: 3, jurisdiction: "US" },
  counterparty: { id: "did:p:bob", display_name: "Beta LLC", sanctions_hits: 0, jurisdiction: "US" },
};

const merchantView = evaluate(policy, payment, { role: "merchant" });
// {
//   role: "merchant",
//   revealed: { amount: 8500, currency: "USDC", memo: "invoice 42",
//               payer: { display_name: "Acme Inc." } },
//   attestations: [
//     { predicate: "payer_kyc_at_least_tier2", value: true },
//     { predicate: "counterparty_not_sanctioned", value: true },
//   ],
//   denied: [],
// }

const chainView = evaluate(policy, payment, { role: "public_chain" });
// {
//   role: "public_chain",
//   revealed: {},
//   attestations: [
//     { predicate: "amount_under_ctr", value: true },
//     { predicate: "payer_kyc_at_least_tier2", value: true },
//     { predicate: "counterparty_not_sanctioned", value: true },
//   ],
//   denied: [],
// }
```

## Why this exists

Stablecoin payments have a privacy trilemma. **Plaintext on-chain** leaks customer relationships and amounts to anyone, forever. **Full zero-knowledge privacy** (Tornado Cash, Aztec, Iron Fish-style) makes regulated entities unable to comply with travel rule, OFAC screening, and AML reporting. Most jurisdictions are landing on **selective disclosure** as the middle ground.

`stablecoin-policy` is the middle ground in code. A payment carries (or references) a **policy** that declaratively states:

- **Who gets to see what** — merchant sees amount + memo, regulator sees counterparties only above CTR threshold, public chain sees nothing
- **What can be *attested* without being revealed** — "amount is under $10k" as a boolean, without leaking the amount
- **Conditions** — what triggers a view at all

This is not zero-knowledge. The engine assumes a trusted execution path (TEE, oracle, or off-chain settlement agent) that can read the full payment and return per-role views.

Conceptually adjacent to [Oasis Protocol](https://oasisprotocol.org)'s confidential-compute policy model, [W3C Verifiable Credentials](https://www.w3.org/TR/vc-data-model-2.0/) selective disclosure, and stablecoin-issuer-side compliance modules. Different scope: this is **just the policy engine** — no settlement, no chain integration, no TEE primitive.

## How it works

```
    payment ──┐
              │
   policy ────┼──▶  predicate evaluation
              │         │
   requester ─┘         ▼
   (role)         view assembly
                        │
                        ▼
                ┌──────────────┐
                │  revealed    │   the fields this role can see
                │  attestations│   booleans for predicates declared as `attest`
                │  denied      │   fields requested but blocked by policy
                └──────────────┘
```

The compiler turns a YAML or JSON policy into a typed runtime object. The evaluator takes a policy + payment + requester role and returns a `View`. Predicates are evaluated once per payment and reused across views — no double work.

## Policy language

A policy has three parts: **metadata**, **predicates**, **views**.

```yaml
version: 1
metadata:
  name: retail_payment_v1
  jurisdiction: US

predicates:
  amount_under_ctr:
    field: amount
    op: lt
    value: 10000
  payer_kyc_at_least_tier2:
    field: payer.kyc_tier
    op: gte
    value: 2
  counterparty_not_sanctioned:
    field: counterparty.sanctions_hits
    op: eq
    value: 0
  same_jurisdiction:
    field: payer.jurisdiction
    op: eq
    field_b: counterparty.jurisdiction

views:
  merchant:
    reveal: [amount, currency, memo, payer.display_name]
    attest: [payer_kyc_at_least_tier2, counterparty_not_sanctioned]

  aml_regulator:
    when: not(amount_under_ctr)
    reveal: [amount, currency, payer.id, counterparty.id, payer.jurisdiction, counterparty.jurisdiction]

  settlement_agent:
    reveal: ["*"]

  public_chain:
    reveal: []
    attest: [amount_under_ctr, payer_kyc_at_least_tier2, counterparty_not_sanctioned]
```

**Operators**: `eq`, `neq`, `lt`, `lte`, `gt`, `gte`, `in`, `not_in`, `contains`, `starts_with`.

**Boolean composition for `when:`**: `and(...)`, `or(...)`, `not(...)`, or a single predicate name.

**Reveal paths** support dotted fields (`payer.display_name`) and the wildcard `"*"`.

## Quickstart

```bash
npm install
npm run build

# evaluate a payment against a policy
npx stablecoin-policy evaluate \
  --policy policies/retail_payment.yaml \
  --payment examples/payment_under_ctr.json \
  --role merchant

# validate a policy file
npx stablecoin-policy validate --policy policies/retail_payment.yaml

# explain a policy (which role sees what)
npx stablecoin-policy explain --policy policies/retail_payment.yaml

# run tests
npm test
```

## What this is not

- **Not zero-knowledge.** No SNARKs, no STARKs, no Bulletproofs. Selective disclosure assumes a trusted reader (TEE, oracle, or compliant settlement agent).
- **Not a chain.** Pure compute over typed objects. Plug into your own settlement layer.
- **Not a sanctions screener.** The `counterparty.sanctions_hits` field is assumed to come from upstream OFAC/EU screening.
- **Not legal advice.** Policy templates here illustrate a design pattern, not a compliance program. Your compliance team writes the actual policies.

## Comparison

| Approach | Privacy from public | Privacy from regulator | Compliance fit |
|---|---|---|---|
| Plaintext on-chain | none | none | broken |
| Tornado Cash / full ZK | strong | strong | hostile |
| **Selective disclosure (this repo)** | strong | role-gated | designed for it |
| Off-chain ledger + reports | strong | discretionary | typical bank model |

## License

MIT.
