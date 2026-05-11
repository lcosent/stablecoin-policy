import { readFileSync } from "node:fs";

import { compilePolicy, evaluate } from "../src/index.js";

const policy = compilePolicy(readFileSync("policies/retail_payment.yaml", "utf8"));
const payment = JSON.parse(readFileSync("examples/payment_under_ctr.json", "utf8"));

for (const role of ["merchant", "aml_regulator", "settlement_agent", "public_chain"]) {
  const view = evaluate(policy, payment, { role });
  console.log(`\n=== role: ${role} ===`);
  console.log(JSON.stringify(view, null, 2));
}
