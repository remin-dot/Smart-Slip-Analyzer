import { neonConfig } from "@neondatabase/serverless";
import { PrismaNeon } from "@prisma/adapter-neon";
import { PrismaClient } from "@prisma/client";

// Route pooled queries over HTTP fetch instead of WebSockets. This makes the
// same Neon adapter work in Node (local dev) and on Cloudflare Workers without
// a `ws` polyfill or edge WebSocket setup.
// ponytail: HTTP mode is fine for this app's flat queries; switch to the
// WebSocket pool only if interactive transactions are ever needed.
neonConfig.poolQueryViaFetch = true;

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

function createPrisma() {
  const adapter = new PrismaNeon({ connectionString: process.env.DATABASE_URL });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? createPrisma();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
