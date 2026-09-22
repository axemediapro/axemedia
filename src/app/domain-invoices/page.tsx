import { prisma } from "@/lib/prisma";
import type { DomainInvoice } from "@prisma/client";
import DomainInvoicesClient from "./domain-invoices-client";

export default async function DomainInvoicesPage() {
  const domainInvoiceDelegate = (prisma as typeof prisma & {
    domainInvoice?: { findMany: (args: { orderBy: { updatedAt: "desc" } }) => Promise<DomainInvoice[]> };
  }).domainInvoice;
  const [reminders, settings, invoices] = await Promise.all([
    prisma.domainReminder.findMany({ orderBy: { nextDueDate: "asc" } }),
    prisma.companySettings.findUnique({ where: { id: 1 } }),
    domainInvoiceDelegate?.findMany({ orderBy: { updatedAt: "desc" } }) ?? Promise.resolve([]),
  ]);

  return (
    <DomainInvoicesClient
      initialReminders={reminders.map((item) => ({
        id: item.id,
        domain: item.domain,
        provider: item.provider,
        billingCycle: item.billingCycle,
        amount: item.amount,
        currency: item.currency,
        nextDueDate: item.nextDueDate.toISOString(),
      }))}
      initialInvoices={invoices.map((invoice) => ({ ...invoice, issueDate: invoice.issueDate.toISOString(), createdAt: invoice.createdAt.toISOString(), updatedAt: invoice.updatedAt.toISOString() }))}
      initialSettings={settings ?? {
        name: "AXEmedia",
        address: "Tiranë, Shqipëri",
        email: "info@axemedia.al",
        phone: "+355 69 000 0000",
        website: "www.axemedia.al",
        taxId: "",
        domainInvoiceLogoUrl: "",
        domainInvoiceBackgroundUrl: "",
      }}
    />
  );
}
