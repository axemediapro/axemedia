import { prisma } from "@/lib/prisma";
import SettingsClient from "./settings-client";

export const dynamic = "force-dynamic";


interface Settings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  website: string;
  bankAccount: string;
  swiftCode: string;
  logoUrl: string;
  stampUrl: string;
  stampSize: number;
  stampPosX: number;
  stampPosY: number;
  stampRotate: number;
  signatureUrl: string;
  invoiceFooter: string;
  offerFooter: string;
  logoSize: number;
  primaryColor: string;
  fontFamily: string;
}

const emptySettings: Settings = {
  name: "",
  tagline: "",
  address: "",
  phone: "",
  email: "",
  taxId: "",
  website: "",
  bankAccount: "",
  swiftCode: "",
  logoUrl: "",
  stampUrl: "",
  stampSize: 55,
  stampPosX: 0,
  stampPosY: 0,
  stampRotate: 0,
  signatureUrl: "",
  invoiceFooter: "",
  offerFooter: "",
  logoSize: 22,
  primaryColor: "#009ec6",
  fontFamily: "helvetica",
};

export default async function SettingsPage() {
  const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
  const initialSettings = settings ? { ...settings } : emptySettings;

  return <SettingsClient initialSettings={initialSettings} />;
}
