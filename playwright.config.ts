import { defineConfig } from "@playwright/test";

const baseURL = process.env.APP_URL || "http://localhost:3000";

export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  forbidOnly: Boolean(process.env.CI),
  retries: process.env.CI ? 2 : 0,
  workers: 1,
  reporter: process.env.CI ? "github" : "list",
  use: {
    baseURL,
    trace: "on-first-retry",
  },
  webServer: {
    command: "npx prisma migrate deploy && npm run dev -- --hostname localhost --port 3000",
    url: baseURL,
    reuseExistingServer: !process.env.CI,
    timeout: 120_000,
    env: {
      ...process.env,
      DATABASE_URL:
        process.env.DATABASE_URL ||
        "postgresql://roster:roster@127.0.0.1:5432/roster",
      AUTH_SECRET:
        process.env.AUTH_SECRET || "playwright-auth-secret-32chars-min",
      APP_URL: baseURL,
      AUTH_DEBUG: "true",
      // Never send live Resend mail from Playwright (local .env must not leak).
      RESEND_API_KEY: "",
      // Analytics stays a no-op in the suite — key present would hit PostHog.
      NEXT_PUBLIC_POSTHOG_KEY: "",
      NEXT_PUBLIC_POSTHOG_HOST: "",
    },
  },
});
