import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

const DEFAULTS = {
  name:          "AXEmedia",
  tagline:       "Agjensi Marketingu & Dizajni",
  address:       "Tiranë, Shqipëri",
  phone:         "+355 69 000 0000",
  email:         "info@axemedia.al",
  taxId:         "",
  website:       "www.axemedia.al",
  bankAccount:   "",
  swiftCode:     "",
  logoUrl:       "",
  stampUrl:      "",
  stampSize:     55,
  stampPosX:     0,
  stampPosY:     0,
  stampRotate:   0,
  signatureUrl:  "",
  invoiceFooter: "Faleminderit për bashkëpunimin!",
  offerFooter:   "Kjo ofertë nuk është faturë. Pagesa nuk kërkohet deri pas konfirmimit.",
  logoSize:      22,
  primaryColor:  "#009ec6",
  fontFamily:    "helvetica",
  domainInvoiceLogoUrl:       "",
  domainInvoiceBackgroundUrl: "",
};

export async function GET() {
  try {
    const settings = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (settings) return NextResponse.json(settings);

    const created = await prisma.companySettings.create({ data: DEFAULTS });
    return NextResponse.json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("GET /api/settings error:", err);
    return NextResponse.json({ error: "Failed to fetch settings" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    let body: any;
    try {
      body = await req.json();
    } catch (parseErr) {
      // eslint-disable-next-line no-console
      console.error('PUT /api/settings invalid JSON body');
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 });
    }

    const { id: _id, updatedAt: _u, ...data } = body;
    void _id; void _u;

    const existing = await prisma.companySettings.findUnique({ where: { id: 1 } });
    if (existing) {
      const updated = await prisma.companySettings.update({ where: { id: 1 }, data });
      return NextResponse.json(updated);
    }

    const created = await prisma.companySettings.create({ data: { ...DEFAULTS, ...data } });
    return NextResponse.json(created);
  } catch (err) {
    // eslint-disable-next-line no-console
    console.error("PUT /api/settings error:", err);
    return NextResponse.json({ error: "Failed to save settings" }, { status: 500 });
  }
}
