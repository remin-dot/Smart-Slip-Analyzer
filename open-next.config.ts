import { defineCloudflareConfig } from "@opennextjs/cloudflare";

// Default config: runs Next.js on Cloudflare Workers via OpenNext.
// No incremental-cache backend configured — this app renders dynamically
// (auth-gated pages), so ISR caching isn't needed. Add an R2/KV cache here
// later if static-page revalidation is introduced.
export default defineCloudflareConfig();
