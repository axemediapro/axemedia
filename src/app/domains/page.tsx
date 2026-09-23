import { prisma } from "@/lib/prisma";
import DomainsClient from "./domains-client";

export const dynamic = "force-dynamic";


export default async function DomainsPage() {
  const reminders = await prisma.domainReminder.findMany({ orderBy: { nextDueDate: "asc" } });
  const initialReminders = reminders.map((item) => ({
    ...item,
    nextDueDate: item.nextDueDate.toISOString(),
    lastPaidDate: item.lastPaidDate ? item.lastPaidDate.toISOString() : null,
    createdAt: item.createdAt.toISOString(),
    updatedAt: item.updatedAt.toISOString(),
  }));

  return <DomainsClient initialReminders={initialReminders} />;
}
