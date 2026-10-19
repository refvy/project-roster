/**
 * Vercel preview builds can share the production database.
 * Apply migrations only when migrationDecision says so.
 */
import { execSync } from "node:child_process";
import { migrationDecision } from "./migrate-gate.mjs";

const decision = migrationDecision(process.env);
console.log(decision.log);
if (!decision.run) {
  process.exit(0);
}

execSync("prisma migrate deploy", {
  stdio: "inherit",
  env: process.env,
});
