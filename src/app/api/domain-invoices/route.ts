import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import type { Prisma } from "@prisma/client";

const stringFields = [
  "invoiceNumber", "status", "customer", "customerEmail", "providerName", "serviceType",
  "domainName", "service", "period", "currency", "notes", "mainColor",
  "businessName", "businessAddress", "businessEmail", "businessPhone",
] as const;

function invoiceData(body: Record<string, unknown>): Prisma.DomainInvoiceCreateInput {
  const data: Record<string, unknown> = {
    issueDate: new Date(String(body.issueDate || new Date().toISOString())),
    quantity: Number(body.quantity) || 1,
    amount: Number(body.amount) || 0,
    taxRate: Number(body.taxRate) || 0,
  };
  for (const field of stringFields) data[field] = String(body[field] ?? "");
  return data as Prisma.DomainInvoiceCreateInput;
}

export async function GET() {
  try {
    const invoices = await prisma.domainInvoice.findMany({ orderBy: { updatedAt: "desc" } });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch domain invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const invoice = await prisma.domainInvoice.create({ data: invoiceData(body) });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("POST /api/domain-invoices error:", error);
    return NextResponse.json({ error: "Failed to save domain invoice" }, { status: 500 });
  }
}