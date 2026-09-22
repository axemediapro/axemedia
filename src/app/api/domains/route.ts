import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = (searchParams.get("q") || "").trim();
    const sortByParam = searchParams.get("sortBy");
    const sortDirParam = searchParams.get("sortDir");

    const sortBy = sortByParam === "amount" || sortByParam === "status" ? sortByParam : "nextDueDate";
    const sortDir = sortDirParam === "desc" ? "desc" : "asc";

    const reminders = await prisma.domainReminder.findMany({
      where: q
        ? {
            OR: [
              { domain: { contains: q } },
              { provider: { contains: q } },
              { status: { contains: q } },
              { currency: { contains: q } },
            ],
          }
        : undefined,
      orderBy: { [sortBy]: sortDir },
    });

    return NextResponse.json(reminders);
  } catch {
    return NextResponse.json({ error: "Failed to fetch domain reminders" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
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

    if (!domain || !nextDueDate) {
      return NextResponse.json({ error: "Domain dhe data e pagesës janë të detyrueshme" }, { status: 400 });
    }

    const reminder = await prisma.domainReminder.create({
      data: {
        domain: String(domain).trim().toLowerCase(),
        provider: provider ? String(provider).trim() : null,
        billingCycle: billingCycle === "monthly" ? "monthly" : "yearly",
        amount: parseFloat(amount ?? "0") || 0,
        currency: currency ? String(currency).toUpperCase() : "EUR",
        nextDueDate: new Date(nextDueDate),
        remindDaysBefore: Number.isFinite(Number(remindDaysBefore)) ? Math.max(0, parseInt(String(remindDaysBefore), 10)) : 7,
        autoRenew: Boolean(autoRenew),
        status: status === "inactive" ? "inactive" : "active",
        lastPaidDate: lastPaidDate ? new Date(lastPaidDate) : null,
        notes: notes ? String(notes) : null,
      },
    });

    return NextResponse.json(reminder, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create domain reminder" }, { status: 500 });
  }
}
