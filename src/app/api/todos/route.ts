import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    const tasks = await prisma.todoTask.findMany({
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      include: { client: { select: { id: true, name: true } } },
    });
    return NextResponse.json(tasks);
  } catch {
    return NextResponse.json({ error: "Failed to fetch todo tasks" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { title, description, priority, status, dueDate, clientId } = body;

    if (!title || !String(title).trim()) {
      return NextResponse.json({ error: "Titulli është i detyrueshëm" }, { status: 400 });
    }

    const task = await prisma.todoTask.create({
      data: {
        title: String(title).trim(),
        description: description ? String(description).trim() : null,
        priority: priority === "high" || priority === "low" ? priority : "medium",
        status: status === "done" ? "done" : "open",
        dueDate: dueDate ? new Date(dueDate) : null,
        clientId: clientId ? Number(clientId) : null,
      },
      include: { client: { select: { id: true, name: true } } },
    });

    return NextResponse.json(task, { status: 201 });
  } catch {
    return NextResponse.json({ error: "Failed to create todo task" }, { status: 500 });
  }
}
