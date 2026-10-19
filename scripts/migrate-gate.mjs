/**
 * Fail closed. Migrate only for a production deploy, or a local/CI build
 * where Vercel has not marked the process (VERCEL unset and VERCEL_ENV unset).
 * VERCEL=1 with VERCEL_ENV missing skips, so a preview cannot migrate by accident.
 *
 * @param {NodeJS.ProcessEnv} [env]
 * @returns {{ run: boolean, log: string }}
 */
export function migrationDecision(env = process.env) {
  const vercelEnv =
    typeof env.VERCEL_ENV === "string" ? env.VERCEL_ENV.trim() : "";
  const vercel = typeof env.VERCEL === "string" ? env.VERCEL.trim() : "";

  if (vercelEnv === "production") {
    return {
      run: true,
      log: "[migrate] VERCEL_ENV=production — applying migrations",
    };
  }

  if (!vercel && !vercelEnv) {
    return {
      run: true,
      log: "[migrate] VERCEL is unset — local or CI build, applying migrations",
    };
  }

  const why =
    vercel && !vercelEnv
      ? "VERCEL is set and VERCEL_ENV is missing"
      : `VERCEL_ENV=${vercelEnv}`;
  return {
    run: false,
    log: `[migrate] skipped (${why}). Migrations run only when VERCEL_ENV is production, or when VERCEL is unset (local or CI).`,
  };
}
