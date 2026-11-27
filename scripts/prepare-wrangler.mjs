#!/usr/bin/env node
/**
 * Write wrangler.jsonc for deploy.
 *
 * Local: if wrangler.jsonc already exists and env is incomplete, keep it.
 * Workers Builds: set WRANGLER_* env vars on the build trigger (not in Git).
 */
import { existsSync, writeFileSync } from "node:fs";

const required = [
  "WRANGLER_D1_DATABASE_ID",
  "WRANGLER_KV_CONFIG_ID",
  "WRANGLER_KV_MAIL_ID",
];

const missing = required.filter((key) => !process.env[key]?.trim());
if (missing.length) {
  if (existsSync("wrangler.jsonc")) {
    console.log("prepare-wrangler: using existing wrangler.jsonc");
    process.exit(0);
  }
  console.error(
    `prepare-wrangler: missing ${missing.join(", ")}. Copy wrangler.example.jsonc or set Builds env vars.`,
  );
  process.exit(1);
}

const domain = process.env.WRANGLER_CUSTOM_DOMAIN?.trim() || "";
const vapidPublic = process.env.WRANGLER_VAPID_PUBLIC_KEY?.trim() || "";
const vapidSubject =
  process.env.WRANGLER_VAPID_SUBJECT?.trim() ||
  (domain ? `https://${domain}` : "");

/** @type {Record<string, unknown>} */
const config = {
  $schema: "./node_modules/wrangler/config-schema.json",
  name: "git-identity-hub",
  main: "src/index.ts",
  build: {
    command: "npm run build:client",
  },
  assets: {
    directory: "./dist/client",
    binding: "ASSETS",
    not_found_handling: "single-page-application",
    run_worker_first: true,
  },
  compatibility_date: "2026-11-25",
  compatibility_flags: ["nodejs_compat"],
  upload_source_maps: true,
  keep_vars: true,
  workers_dev: true,
  observability: {
    enabled: true,
    traces: {
      enabled: true,
    },
  },
  d1_databases: [
    {
      binding: "DB",
      database_name: "git-identity-hub",
      database_id: process.env.WRANGLER_D1_DATABASE_ID.trim(),
    },
  ],
  kv_namespaces: [
    {
      binding: "CONFIG",
      id: process.env.WRANGLER_KV_CONFIG_ID.trim(),
    },
    {
      binding: "MAIL",
      id: process.env.WRANGLER_KV_MAIL_ID.trim(),
    },
  ],
};

if (domain) {
  config.routes = [{ pattern: domain, custom_domain: true }];
}

/** @type {Record<string, string>} */
const vars = {};
if (vapidPublic) vars.VAPID_PUBLIC_KEY = vapidPublic;
if (vapidSubject) vars.VAPID_SUBJECT = vapidSubject;
if (Object.keys(vars).length) config.vars = vars;

writeFileSync("wrangler.jsonc", `${JSON.stringify(config, null, 2)}\n`);
console.log("prepare-wrangler: wrote wrangler.jsonc from environment");
