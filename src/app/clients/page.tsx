import { prisma } from "@/lib/prisma";
import ClientsClient from "./clients-client";

export const dynamic = "force-dynamic";


type ClientViewModel = {
  id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  businessNumber?: string;
  taxId?: string;
  createdAt: string;
  _count: { invoices: number };
};

export default async function ClientsPage() {
  const clients = await prisma.client.findMany({
    orderBy: { createdAt: "desc" },
    include: { _count: { select: { invoices: true } } },
  });

  const initialClients: ClientViewModel[] = clients.map((client) => ({
    id: client.id,
    name: client.name,
    email: client.email,
    phone: client.phone ?? undefined,
    city: client.city ?? undefined,
    businessNumber: client.businessNumber ?? undefined,
    taxId: client.taxId ?? undefined,
    createdAt: client.createdAt.toISOString(),
    _count: { invoices: client._count.invoices },
  }));

  return <ClientsClient initialClients={initialClients} />;
}
