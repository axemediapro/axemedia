CREATE TABLE "DomainReminder" (
    "id" INTEGER NOT NULL PRIMARY KEY AUTOINCREMENT,
    "domain" TEXT NOT NULL,
    "provider" TEXT,
    "billingCycle" TEXT NOT NULL DEFAULT 'yearly',
    "amount" REAL NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'EUR',
    "nextDueDate" DATETIME NOT NULL,
    "remindDaysBefore" INTEGER NOT NULL DEFAULT 7,
    "autoRenew" BOOLEAN NOT NULL DEFAULT true,
    "status" TEXT NOT NULL DEFAULT 'active',
    "lastPaidDate" DATETIME,
    "notes" TEXT,
    "createdAt" DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" DATETIME NOT NULL
);

CREATE UNIQUE INDEX "DomainReminder_domain_key" ON "DomainReminder"("domain");
