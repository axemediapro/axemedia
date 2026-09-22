import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const { name, description, defaultPrice, unit, price1h, price2to5h, price5to8h } = await req.json();
    const service = await prisma.service.update({
      where: { id: parseInt(id) },
      data: {
        name,
        description,
        defaultPrice: parseFloat(defaultPrice) || 0,
        unit,
        price1h: price1h !== undefined ? (price1h === "" || price1h === null ? null : parseFloat(price1h)) : undefined,
        price2to5h: price2to5h !== undefined ? (price2to5h === "" || price2to5h === null ? null : parseFloat(price2to5h)) : undefined,
        price5to8h: price5to8h !== undefined ? (price5to8h === "" || price5to8h === null ? null : parseFloat(price5to8h)) : undefined,
      },
    });
    return NextResponse.json(service);
  } catch {
    return NextResponse.json({ error: "Failed to update service" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.service.delete({ where: { id: parseInt(id) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete service" }, { status: 500 });
  }
}
