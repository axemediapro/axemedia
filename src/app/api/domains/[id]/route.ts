import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const {
      domain,
      provider,
      billingCycle,
      amount,
      currency,
      nextDueDate,
      remindDaysBefore,
      autoRenew,
      status,
      lastPaidDate,
      notes,
    } = body;

    const reminder = await prisma.domainReminder.update({
      where: { id: parseInt(id, 10) },
      data: {
        domain: domain ? String(domain).trim().toLowerCase() : undefined,
        provider: provider !== undefined ? (provider ? String(provider).trim() : null) : undefined,
        billingCycle: billingCycle === "monthly" ? "monthly" : "yearly",
        amount: amount !== undefined ? parseFloat(String(amount)) || 0 : undefined,
        currency: currency ? String(currency).toUpperCase() : undefined,
        nextDueDate: nextDueDate ? new Date(nextDueDate) : undefined,
        remindDaysBefore: remindDaysBefore !== undefined ? Math.max(0, parseInt(String(remindDaysBefore), 10) || 0) : undefined,
        autoRenew: autoRenew !== undefined ? Boolean(autoRenew) : undefined,
        status: status === "inactive" ? "inactive" : "active",
        lastPaidDate: lastPaidDate !== undefined ? (lastPaidDate ? new Date(lastPaidDate) : null) : undefined,
        notes: notes !== undefined ? (notes ? String(notes) : null) : undefined,
      },
    });

    return NextResponse.json(reminder);
  } catch {
    return NextResponse.json({ error: "Failed to update domain reminder" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.domainReminder.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete domain reminder" }, { status: 500 });
  }
}
