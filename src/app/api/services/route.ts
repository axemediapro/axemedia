import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get("q");
    const services = await prisma.service.findMany({
      where: q ? { name: { contains: q } } : undefined,
      orderBy: { name: "asc" },
    });
    return NextResponse.json(services);
  } catch {
    return NextResponse.json({ error: "Failed to fetch services" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const { name, description, defaultPrice, unit, price1h, price2to5h, price5to8h } = await req.json();
    if (!name) return NextResponse.json({ error: "Emri është i detyrueshëm" }, { status: 400 });
    const service = await prisma.service.create({
      data: {
        name,
        description,
        defaultPrice: parseFloat(defaultPrice) || 0,
        unit: unit || "copë",
        price1h: price1h !== undefined && price1h !== "" && price1h !== null ? parseFloat(price1h) : null,
        price2to5h: price2to5h !== undefined && price2to5h !== "" && price2to5h !== null ? parseFloat(price2to5h) : null,
        price5to8h: price5to8h !== undefined && price5to8h !== "" && price5to8h !== null ? parseFloat(price5to8h) : null,
      },
    });
    return NextResponse.json(service, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create service" }, { status: 500 });
  }
}
