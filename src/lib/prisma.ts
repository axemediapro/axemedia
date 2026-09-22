import { PrismaClient } from "@prisma/client";

const dbPath = `file:${process.cwd().replace(/\\/g, "/")}/prisma/axemedia.db`;

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

async function createPrismaClientAsync() {
  const rawConnectionString = process.env.DATABASE_URL ?? `file:${dbPath}`;
  const connectionString = rawConnectionString.includes("dev.db") ? `file:${dbPath}` : rawConnectionString;

  if (typeof window !== "undefined") {
    throw new Error("Prisma client can only be used on the server.");
  }

  const { PrismaBetterSqlite3 } = await import("@prisma/adapter-better-sqlite3");
  const adapter = new PrismaBetterSqlite3({ url: connectionString });
  return new PrismaClient({ adapter } as ConstructorParameters<typeof PrismaClient>[0]);
}

const cachedPrisma = globalForPrisma.prisma as (PrismaClient & {
  domainReminder?: unknown;
  todoTask?: unknown;
  domainInvoice?: unknown;
}) | undefined;

// During dev HMR, an older Prisma client instance can stay in global scope.
// If it predates newly added Prisma models, recreate it to avoid undefined delegate errors.
if (
  cachedPrisma &&
  (typeof cachedPrisma.domainReminder === "undefined" ||
    typeof cachedPrisma.todoTask === "undefined" ||
    typeof cachedPrisma.domainInvoice === "undefined")
) {
  await cachedPrisma.$disconnect().catch(() => undefined);
  globalForPrisma.prisma = undefined;
}

export const prisma = globalForPrisma.prisma ?? (globalForPrisma.prisma = await createPrismaClientAsync());

if (process.env.NODE_ENV !== "production") globalForPrisma.prisma = prisma;
