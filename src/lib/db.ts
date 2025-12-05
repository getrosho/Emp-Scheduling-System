import { PrismaClient } from "@/generated/prisma/client";
import { Pool } from "pg";
import { PrismaPg } from "@prisma/adapter-pg";

declare global {
  // eslint-disable-next-line no-var
  var prisma: PrismaClient | undefined;
  // eslint-disable-next-line no-var
  var pgPool: Pool | undefined;
}

/**
 * Get DATABASE_URL with safe fallback for build-time Prisma client generation
 * In production/runtime, DATABASE_URL must be set or this will throw
 */
function getDatabaseUrl(): string {
  const url = process.env.DATABASE_URL;
  
  // During build (Prisma client generation), allow a dummy URL
  if (!url && process.env.NODE_ENV === "production") {
    throw new Error(
      "DATABASE_URL environment variable is required in production. " +
      "Please set it in your environment variables."
    );
  }
  
  // For build-time client generation, use a dummy URL if not set
  // This allows `prisma generate` to work without a real database connection
  if (!url) {
    const fallbackUrl = "postgresql://dummy:dummy@localhost:5432/dummy";
    if (process.env.NODE_ENV !== "production") {
      console.warn(
        "⚠️  DATABASE_URL not set. Using fallback URL for Prisma client generation. " +
        "This should only happen during build. Set DATABASE_URL for runtime."
      );
    }
    return fallbackUrl;
  }
  
  return url;
}

// Create PostgreSQL connection pool
const pool =
  global.pgPool ??
  new Pool({
    connectionString: getDatabaseUrl(),
  });

if (process.env.NODE_ENV !== "production") {
  global.pgPool = pool;
}

// Create Prisma adapter
const adapter = new PrismaPg(pool);

// Initialize PrismaClient with adapter
export const prisma =
  global.prisma ??
  new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  global.prisma = prisma;
}

