import { prisma } from "@/lib/prisma";
import ServicesClient from "./services-client";

export const dynamic = "force-dynamic";


const emptyForm = {
  name: "",
  description: "",
  defaultPrice: "70",
  unit: "orë",
  price1h: "70",
  price2to5h: "60",
  price5to8h: "50",
};

export default async function ServicesPage() {
  const services = await prisma.service.findMany({ orderBy: { name: "asc" } });
  const initialServices = services.map((service) => ({ ...service }));

  return <ServicesClient initialServices={initialServices} emptyForm={emptyForm} />;
}
