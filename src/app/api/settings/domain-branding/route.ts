import { NextResponse } from "next/server";
import { mkdir, readdir, writeFile } from "fs/promises";
import path from "path";
import { prisma } from "@/lib/prisma";

const FIELD_NAMES = {
  logo: "domainInvoiceLogoUrl",
  background: "domainInvoiceBackgroundUrl",
} as const;

export async function GET() {
  try {
    const uploadDir = path.join(process.cwd(), "public", "uploads", "domain-invoice");
    await mkdir(uploadDir, { recursive: true });
    const files = await readdir(uploadDir);
    const logos = files
      .filter((file) => file.startsWith("domain-invoice-logo-") && /\.(jpe?g|png|webp|svg)$/i.test(file))
      .sort()
      .reverse()
      .map((file) => `/uploads/domain-invoice/${file}`);
    return NextResponse.json({ logos });
  } catch (error) {
    console.error("GET /api/settings/domain-branding error:", error);
    return NextResponse.json({ logos: [] });
  }
}

export async function POST(req: Request) {
  try {
    const formData = await req.formData();
    const type = formData.get("type");
    const file = formData.get("file") as File | null;

    if ((type !== "logo" && type !== "background") || !file) {
      return NextResponse.json({ error: "Skedari ose lloji është i pavlefshëm" }, { status: 400 });
    }
    if (!["image/jpeg", "image/png", "image/webp", "image/svg+xml"].includes(file.type)) {
      return NextResponse.json({ error: "Lejohen JPG, PNG, WEBP ose SVG" }, { status: 400 });
    }
    if (file.size > 8 * 1024 * 1024) {
      return NextResponse.json({ error: "Skedari është shumë i madh (max 8MB)" }, { status: 400 });
    }

    const extension = file.name.split(".").pop()?.toLowerCase() || "png";
    const filename = `domain-invoice-${type}-${Date.now()}.${extension}`;
    const uploadDir = path.join(process.cwd(), "public", "uploads", "domain-invoice");
    await mkdir(uploadDir, { recursive: true });
    await writeFile(path.join(uploadDir, filename), Buffer.from(await file.arrayBuffer()));

    const url = `/uploads/domain-invoice/${filename}`;
    const field = FIELD_NAMES[type];
    const existing = await prisma.companySettings.findUnique({ where: { id: 1 } });
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: 1 }, data: { [field]: url } })
      : await prisma.companySettings.create({ data: { [field]: url } });

    return NextResponse.json({ url, settings });
  } catch (error) {
    console.error("POST /api/settings/domain-branding error:", error);
    return NextResponse.json({ error: "Gabim gjatë ngarkimit" }, { status: 500 });
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json() as { url?: string };
    const url = String(body.url || "");
    if (!url.startsWith("/uploads/domain-invoice/domain-invoice-logo-")) {
      return NextResponse.json({ error: "Invalid logo selection" }, { status: 400 });
    }
    const existing = await prisma.companySettings.findUnique({ where: { id: 1 } });
    const settings = existing
      ? await prisma.companySettings.update({ where: { id: 1 }, data: { domainInvoiceLogoUrl: url } })
      : await prisma.companySettings.create({ data: { domainInvoiceLogoUrl: url } });
    return NextResponse.json({ url, settings });
  } catch (error) {
    console.error("PUT /api/settings/domain-branding error:", error);
    return NextResponse.json({ error: "Could not select logo" }, { status: 500 });
  }
}