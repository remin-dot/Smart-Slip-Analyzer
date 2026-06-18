import { initOpenNextCloudflareForDev } from "@opennextjs/cloudflare";

/** @type {import('next').NextConfig} */
const nextConfig = {
  typedRoutes: true
};

// Lets `next dev` access Cloudflare bindings/env during local development.
initOpenNextCloudflareForDev();

export default nextConfig;
