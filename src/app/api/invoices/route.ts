import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

async function generateInvoiceNumber(): Promise<string> {
  const invoices = await prisma.invoice.findMany({
    select: { invoiceNumber: true },
  });

  // Keep an auto sequence based on numeric invoice numbers only, starting from 51.
  const numericValues = invoices
    .map((item) => item.invoiceNumber.trim())
    .filter((nr) => /^\d+$/.test(nr))
    .map((nr) => Number(nr));

  const nextNumber = numericValues.length ? Math.max(...numericValues) + 1 : 51;
  return String(nextNumber);
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Client role: only show their own invoices
    const where =
      session?.user?.role === "client" && session.user.clientId
        ? { clientId: Number(session.user.clientId) }
        : {};

    const invoices = await prisma.invoice.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: { client: { select: { id: true, name: true, email: true } }, items: true },
    });
    return NextResponse.json(invoices);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoices" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { clientId, items, notes, taxRate = 18 } = body;
    if (!clientId || !items?.length) {
      return NextResponse.json({ error: "Klienti dhe artikujt janë të detyrueshëm" }, { status: 400 });
    }
    const subtotal = items.reduce(
      (sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice,
      0
    );
    const tax = subtotal * (taxRate / 100);
    const total = subtotal + tax;
    const invoiceNumber = await generateInvoiceNumber();

    const invoice = await prisma.invoice.create({
      data: {
        invoiceNumber,
        clientId: parseInt(clientId),
        subtotal,
        tax,
        total,
        notes,
        items: {
          create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
            description: item.description,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            total: item.quantity * item.unitPrice,
          })),
        },
      },
      include: { client: true, items: true },
    });
    return NextResponse.json(invoice, { status: 201 });
  } catch (error) {
    console.error("Invoice creation failed:", error);
    return NextResponse.json({ error: "Failed to create invoice" }, { status: 500 });
  }
}
