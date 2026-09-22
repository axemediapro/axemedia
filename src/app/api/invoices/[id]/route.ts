import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const invoice = await prisma.invoice.findUnique({
      where: { id: parseInt(id) },
      include: { client: true, items: true },
    });
    if (!invoice) return NextResponse.json({ error: "Invoice not found" }, { status: 404 });
    return NextResponse.json(invoice);
  } catch {
    return NextResponse.json({ error: "Failed to fetch invoice" }, { status: 500 });
  }
}

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { status, clientId, invoiceNumber, issueDate, items, notes, taxRate } = body;

    // Full edit (from edit page)
    if (items !== undefined) {
      const rate = parseFloat(taxRate) || 0;
      const subtotal = items.reduce((sum: number, item: { quantity: number; unitPrice: number }) =>
        sum + item.quantity * item.unitPrice, 0);
      const tax   = subtotal * (rate / 100);
      const total = subtotal + tax;
      const invoice = await prisma.invoice.update({
        where: { id: parseInt(id) },
        data: {
          clientId:  parseInt(clientId),
          invoiceNumber: invoiceNumber ? String(invoiceNumber).trim() : undefined,
          issueDate: issueDate ? new Date(issueDate) : undefined,
          subtotal, tax, total, notes,
          ...(status !== undefined && { status }),
          items: {
            deleteMany: {},
            create: items.map((item: { description: string; quantity: number; unitPrice: number }) => ({
              description: item.description,
              quantity:    item.quantity,
              unitPrice:   item.unitPrice,
              total:       item.quantity * item.unitPrice,
            })),
          },
        },
        include: { client: true, items: true },
      });
      return NextResponse.json(invoice);
    }

    // Status-only update (from detail page)
    const invoice = await prisma.invoice.update({
      where: { id: parseInt(id) },
      data: { status },
      include: { client: true, items: true },
    });
    return NextResponse.json(invoice);
  } catch (error: unknown) {
    const err = error as { code?: string };
    if (err?.code === "P2002") {
      return NextResponse.json({ error: "Nr. i faturës ekziston tashmë" }, { status: 409 });
    }
    return NextResponse.json({ error: "Failed to update invoice" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.invoice.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete invoice" }, { status: 500 });
  }
}
