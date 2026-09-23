import { prisma } from "@/lib/prisma";
import OffersClient from "./offers-client";

export const dynamic = "force-dynamic";


export default async function OffersPage() {
  const offers = await prisma.offer.findMany({
    orderBy: { issueDate: "desc" },
    include: { client: { select: { id: true, name: true, email: true } } },
  });

  const initialOffers = offers.map((offer) => ({
    ...offer,
    issueDate: offer.issueDate.toISOString(),
    validUntil: offer.validUntil.toISOString(),
    client: {
      id: offer.client.id,
      name: offer.client.name,
      email: offer.client.email,
    },
  }));

  return <OffersClient initialOffers={initialOffers} />;
}
