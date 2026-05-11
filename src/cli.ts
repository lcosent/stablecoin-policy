#!/usr/bin/env node
import { readFileSync } from "node:fs";

import { Command } from "commander";

import { compilePolicy, validatePolicy } from "./engine/compile.js";
import { evaluate } from "./engine/evaluate.js";

const program = new Command();
program.name("stablecoin-policy").description("Selective-disclosure policy engine CLI");

program
  .command("evaluate")
  .description("Evaluate a payment against a policy for a given role")
  .requiredOption("--policy <path>", "policy YAML or JSON file")
  .requiredOption("--payment <path>", "payment JSON file")
  .requiredOption("--role <name>", "requester role name")
  .action((opts: { policy: string; payment: string; role: string }) => {
    const policy = compilePolicy(readFileSync(opts.policy, "utf8"));
    const payment = JSON.parse(readFileSync(opts.payment, "utf8"));
    const view = evaluate(policy, payment, { role: opts.role });
    console.log(JSON.stringify(view, null, 2));
  });

program
  .command("validate")
  .description("Validate that a policy file is well-formed")
  .requiredOption("--policy <path>", "policy YAML or JSON file")
  .action((opts: { policy: string }) => {
    const result = validatePolicy(readFileSync(opts.policy, "utf8"));
    if (result.ok) {
      console.log("ok");
      return;
    }
    console.error(`invalid policy:\n${result.error}`);
    process.exit(1);
  });

program
  .command("explain")
  .description("Summarize a policy: predicates, views, and what each role sees")
  .requiredOption("--policy <path>", "policy YAML or JSON file")
  .action((opts: { policy: string }) => {
    const policy = compilePolicy(readFileSync(opts.policy, "utf8"));
    console.log(`policy: ${policy.metadata.name}`);
    if (policy.metadata.jurisdiction) {
      console.log(`jurisdiction: ${policy.metadata.jurisdiction}`);
    }
    console.log("\nPREDICATES");
    for (const [name, pred] of Object.entries(policy.predicates)) {
      const rhs = pred.field_b !== undefined ? pred.field_b : JSON.stringify(pred.value);
      console.log(`  ${name}: ${pred.field} ${pred.op} ${rhs}`);
    }
    console.log("\nVIEWS");
    for (const [name, view] of Object.entries(policy.views)) {
      const reveal = view.reveal.length ? view.reveal.join(", ") : "(nothing)";
      const attest = view.attest.length ? view.attest.join(", ") : "(nothing)";
      const when = view.when ? ` when ${view.when}` : "";
      console.log(`  ${name}${when}`);
      console.log(`    reveal: ${reveal}`);
      console.log(`    attest: ${attest}`);
    }
  });

program.parse();
