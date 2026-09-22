import { prisma } from "@/lib/prisma";
import InvoicesClient from "./invoices-client";

export default async function InvoicesPage() {
  const invoices = await prisma.invoice.findMany({
    orderBy: { createdAt: "desc" },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  const initialInvoices = invoices.map((invoice) => ({
    ...invoice,
    issueDate: invoice.issueDate.toISOString(),
    createdAt: invoice.createdAt.toISOString(),
    client: { id: invoice.client.id, name: invoice.client.name, email: invoice.client.email },
  }));

  return <InvoicesClient initialInvoices={initialInvoices} />;
}
