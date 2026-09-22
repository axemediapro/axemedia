import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, context: { params: Promise<{ id: string }> }) {
  try {
    const body = await req.json() as Record<string, unknown>;
    const id = Number((await context.params).id);
    const data: Record<string, unknown> = {
      issueDate: new Date(String(body.issueDate || new Date().toISOString())),
      quantity: Number(body.quantity) || 1,
      amount: Number(body.amount) || 0,
      taxRate: Number(body.taxRate) || 0,
    };
    for (const field of ["invoiceNumber", "status", "customer", "customerEmail", "providerName", "serviceType", "domainName", "service", "period", "currency", "notes", "mainColor", "businessName", "businessAddress", "businessEmail", "businessPhone"]) data[field] = String(body[field] ?? "");
    const invoice = await prisma.domainInvoice.update({ where: { id }, data });
    return NextResponse.json(invoice);
  } catch (error) {
    console.error("PUT /api/domain-invoices error:", error);
    return NextResponse.json({ error: "Failed to update domain invoice" }, { status: 500 });
  }
}