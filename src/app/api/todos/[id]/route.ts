import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function PUT(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    const body = await req.json();
    const { title, description, priority, status, dueDate, clientId } = body;

    const task = await prisma.todoTask.update({
      where: { id: parseInt(id, 10) },
      data: {
        title: title !== undefined ? String(title).trim() : undefined,
        description: description !== undefined ? (description ? String(description).trim() : null) : undefined,
        priority: priority !== undefined ? (priority === "high" || priority === "low" ? priority : "medium") : undefined,
        status: status !== undefined ? (status === "done" ? "done" : "open") : undefined,
        dueDate: dueDate !== undefined ? (dueDate ? new Date(dueDate) : null) : undefined,
        clientId: clientId !== undefined ? (clientId ? Number(clientId) : null) : undefined,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json(task);
  } catch {
    return NextResponse.json({ error: "Failed to update todo task" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { id } = await params;
    await prisma.todoTask.delete({ where: { id: parseInt(id, 10) } });
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: "Failed to delete todo task" }, { status: 500 });
  }
}
