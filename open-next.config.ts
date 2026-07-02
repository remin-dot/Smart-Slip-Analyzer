import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Runs Next.js on Cloudflare Workers via OpenNext.
// No incremental-cache backend configured — this app renders dynamically
// (auth-gated pages), so ISR caching isn't needed. Add an R2/KV cache here
// later if static-page revalidation is introduced.
const config = defineCloudflareConfig();

// package.json `build` is aliased to `opennextjs-cloudflare build`, so Cloudflare's
// default `npm run build` produces the worker bundle. Point OpenNext's internal
// Next.js build at `next build` directly so it doesn't recurse into `npm run build`.
config.buildCommand = "npx next build";

export default config;
