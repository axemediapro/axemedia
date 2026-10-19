import { PrismaClient } from "@prisma/client";
import { PrismaBetterSqlite3 } from "@prisma/adapter-better-sqlite3";
import path from "path";

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

function createPrismaClient() {
  const dbPath = path.join(process.cwd(), "prisma", "axemedia.db");
  const connectionUrl = process.env.DATABASE_URL?.startsWith("file:")
    ? process.env.DATABASE_URL
    : `file:${dbPath}`;

  const adapter = new PrismaBetterSqlite3({ url: connectionUrl });
  return new PrismaClient({
    adapter,
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });
}

export const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = createPrismaClient());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;



