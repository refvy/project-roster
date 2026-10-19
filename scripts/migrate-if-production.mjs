/**
 * Vercel preview builds can share the production database.
 * `prisma migrate deploy` runs only for production deploys and for local
 * builds (no VERCEL_ENV). Preview and other Vercel environments never migrate.
 */
import { execSync } from "node:child_process";

const vercelEnv = process.env.VERCEL_ENV?.trim();

if (vercelEnv && vercelEnv !== "production") {
  console.log(
    `[migrate] skipped (VERCEL_ENV=${vercelEnv}). Migrations run only when VERCEL_ENV is production, or when it is unset (local build).`,
  );
  process.exit(0);
}

if (vercelEnv === "production") {
  console.log("[migrate] VERCEL_ENV=production — applying migrations");
} else {
  console.log(
    "[migrate] no VERCEL_ENV — local build, applying migrations",
  );
}

execSync("prisma migrate deploy", {
  stdio: "inherit",
  env: process.env,
});
