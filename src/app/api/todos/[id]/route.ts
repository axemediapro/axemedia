import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodoVisibilityWhere, isTodoPriority, isTodoStatus, parseTodoDate } from "@/lib/todos";

type RouteContext = { params: Promise<{ id: string }> };

async function getAuthorizedTask(id: number, userId: number, role: string) {
  return prisma.todoTask.findFirst({
    where: { id, AND: [getTodoVisibilityWhere(userId, role)] },
    include: {
      client: { select: { id: true, name: true } },
      createdBy: { select: { id: true, name: true } },
      assignedTo: { select: { id: true, name: true } },
    },
  });
}

export async function PUT(request: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "client") {
    return NextResponse.json({ error: "Nuk keni leje për të ndryshuar detyra" }, { status: 403 });
  }

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(id) || id < 1 || !Number.isSafeInteger(userId)) {
      return NextResponse.json({ error: "Identifikues detyre i pavlefshëm" }, { status: 400 });
    }

    const current = await getAuthorizedTask(id, userId, session.user.role);
    if (!current) return NextResponse.json({ error: "Detyra nuk u gjet" }, { status: 404 });

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Të dhënat e detyrës janë të pavlefshme" }, { status: 400 });
    }
    const input = body as Record<string, unknown>;
    const data: Record<string, unknown> = {};

    if ("title" in input) {
      if (typeof input.title !== "string" || !input.title.trim() || input.title.trim().length > 200) {
        return NextResponse.json({ error: "Titulli është i detyrueshëm dhe nuk mund të kalojë 200 karaktere" }, { status: 400 });
      }
      data.title = input.title.trim();
    }
    if ("description" in input) {
      if (input.description !== null && typeof input.description !== "string") {
        return NextResponse.json({ error: "Përshkrimi është i pavlefshëm" }, { status: 400 });
      }
      const description = typeof input.description === "string" ? input.description.trim() : "";
      if (description.length > 5000) return NextResponse.json({ error: "Përshkrimi është tepër i gjatë" }, { status: 400 });
      data.description = description || null;
    }
    if ("status" in input) {
      if (!isTodoStatus(input.status)) return NextResponse.json({ error: "Status i pavlefshëm" }, { status: 400 });
      data.status = input.status;
      data.completedAt = input.status === "done" ? current.completedAt ?? new Date() : null;
    }
    if ("priority" in input) {
      if (!isTodoPriority(input.priority)) return NextResponse.json({ error: "Prioritet i pavlefshëm" }, { status: 400 });
      data.priority = input.priority;
    }
    if ("dueDate" in input) {
      const dueDate = parseTodoDate(input.dueDate);
      if (dueDate === undefined) return NextResponse.json({ error: "Afat i pavlefshëm" }, { status: 400 });
      data.dueDate = dueDate;
    }
    if ("clientId" in input) {
      const clientId = input.clientId === null || input.clientId === ""
        ? null
        : typeof input.clientId === "number" || (typeof input.clientId === "string" && /^\d+$/.test(input.clientId))
          ? Number(input.clientId)
          : Number.NaN;
      if (clientId !== null && (!Number.isSafeInteger(clientId) || clientId < 1)) {
        return NextResponse.json({ error: "Klienti i zgjedhur është i pavlefshëm" }, { status: 400 });
      }
      if (clientId !== null && !(await prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }))) {
        return NextResponse.json({ error: "Klienti nuk u gjet" }, { status: 400 });
      }
      data.clientId = clientId;
    }
    if ("category" in input) {
      if (input.category !== null && typeof input.category !== "string") {
        return NextResponse.json({ error: "Kategoria është e pavlefshme" }, { status: 400 });
      }
      if (typeof input.category === "string" && input.category.trim().length > 100) {
        return NextResponse.json({ error: "Kategoria nuk mund të kalojë 100 karaktere" }, { status: 400 });
      }
      data.category = typeof input.category === "string" && input.category.trim() ? input.category.trim() : null;
    }
    if ("assignedToId" in input) {
      const assignedToId = input.assignedToId === null || input.assignedToId === ""
        ? null
        : typeof input.assignedToId === "number" || (typeof input.assignedToId === "string" && /^\d+$/.test(input.assignedToId))
          ? Number(input.assignedToId)
          : Number.NaN;
      if (session.user.role !== "admin" && assignedToId !== userId) {
        return NextResponse.json({ error: "Vetëm administratori mund të ndryshojë caktimin e detyrave" }, { status: 403 });
      }
      if (assignedToId !== null) {
        if (!Number.isSafeInteger(assignedToId) || assignedToId < 1) {
          return NextResponse.json({ error: "Anëtari i zgjedhur është i pavlefshëm" }, { status: 400 });
        }
        const assignee = await prisma.user.findFirst({
          where: { id: assignedToId, active: true, role: { in: ["admin", "staff"] } },
          select: { id: true },
        });
        if (!assignee) return NextResponse.json({ error: "Anëtari i zgjedhur nuk është aktiv ose nuk është i vlefshëm" }, { status: 400 });
      }
      data.assignedToId = assignedToId;
    }

    const updated = await prisma.todoTask.update({
      where: { id },
      data,
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(updated);
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Trupi i kërkesës nuk përmban JSON të vlefshëm" }, { status: 400 });
    }
    console.error("Todo task update failed:", error);
    return NextResponse.json({ error: "Detyra nuk mund të ndryshohej" }, { status: 500 });
  }
}

export async function DELETE(_: Request, { params }: RouteContext) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "client") {
    return NextResponse.json({ error: "Nuk keni leje për të fshirë detyra" }, { status: 403 });
  }
  if (session.user.role !== "admin") {
    return NextResponse.json({ error: "Vetëm administratori mund të fshijë detyra" }, { status: 403 });
  }

  try {
    const { id: rawId } = await params;
    const id = Number(rawId);
    if (!Number.isSafeInteger(id) || id < 1) {
      return NextResponse.json({ error: "Identifikues detyre i pavlefshëm" }, { status: 400 });
    }
    const deleted = await prisma.todoTask.deleteMany({ where: { id } });
    if (deleted.count === 0) return NextResponse.json({ error: "Detyra nuk u gjet" }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error("Todo task deletion failed:", error);
    return NextResponse.json({ error: "Detyra nuk mund të fshihej" }, { status: 500 });
  }
}
