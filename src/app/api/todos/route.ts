import { NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { getTodoVisibilityWhere, isTodoPriority, isTodoStatus, parseTodoDate } from "@/lib/todos";
import type { Prisma } from "@prisma/client";

export async function GET(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "client") {
    return NextResponse.json({ error: "Nuk keni leje për detyrat" }, { status: 403 });
  }

  try {
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId)) {
      return NextResponse.json({ error: "Sesioni i përdoruesit është i pavlefshëm" }, { status: 401 });
    }

    const params = new URL(request.url).searchParams;
    const filters: Prisma.TodoTaskWhereInput = {};
    const status = params.get("status");
    const priority = params.get("priority");
    const clientId = params.get("clientId");
    const assigneeId = params.get("assigneeId");
    const search = params.get("search")?.trim();
    const clauses: Prisma.TodoTaskWhereInput[] = [getTodoVisibilityWhere(userId, session.user.role), filters];

    if (status && status !== "all") {
      if (!isTodoStatus(status)) return NextResponse.json({ error: "Status filtri i pavlefshëm" }, { status: 400 });
      filters.status = status;
    }
    if (priority && priority !== "all") {
      if (!isTodoPriority(priority)) return NextResponse.json({ error: "Prioritet filtri i pavlefshëm" }, { status: 400 });
      filters.priority = priority;
    }
    if (clientId && clientId !== "all") {
      if (!/^\d+$/.test(clientId) || Number(clientId) < 1) {
        return NextResponse.json({ error: "Klient filtri i pavlefshëm" }, { status: 400 });
      }
      filters.clientId = Number(clientId);
    }
    if (assigneeId && /^\d+$/.test(assigneeId) && session.user.role === "admin") {
      filters.assignedToId = Number(assigneeId);
    }
    if (params.has("category")) filters.category = params.get("category") || null;
    const dueFrom = params.get("dueFrom");
    const dueTo = params.get("dueTo");
    const createdFrom = params.get("createdFrom");
    const createdTo = params.get("createdTo");
    if ((dueFrom && Number.isNaN(Date.parse(dueFrom))) || (dueTo && Number.isNaN(Date.parse(dueTo)))) {
      return NextResponse.json({ error: "Intervali i afatit është i pavlefshëm" }, { status: 400 });
    }
    if ((createdFrom && Number.isNaN(Date.parse(createdFrom))) || (createdTo && Number.isNaN(Date.parse(createdTo)))) {
      return NextResponse.json({ error: "Intervali i krijimit është i pavlefshëm" }, { status: 400 });
    }
    if (dueFrom || dueTo) {
      filters.dueDate = {
        ...(dueFrom ? { gte: new Date(`${dueFrom}T00:00:00`) } : {}),
        ...(dueTo ? { lt: new Date(new Date(`${dueTo}T00:00:00`).getTime() + 86_400_000) } : {}),
      };
    }
    if (createdFrom || createdTo) {
      filters.createdAt = {
        ...(createdFrom ? { gte: new Date(`${createdFrom}T00:00:00`) } : {}),
        ...(createdTo ? { lt: new Date(new Date(`${createdTo}T00:00:00`).getTime() + 86_400_000) } : {}),
      };
    }
    if (params.get("overdue") === "true") {
      clauses.push({
        dueDate: { lt: new Date(new Date().setHours(0, 0, 0, 0)) },
        status: { not: "done" },
      });
    }
    if (search) {
      filters.OR = [
        { title: { contains: search } },
        { description: { contains: search } },
      ];
    }

    const tasks = await prisma.todoTask.findMany({
      where: { AND: clauses },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
      take: 500,
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });
    return NextResponse.json(tasks);
  } catch (error) {
    console.error("Todo task fetch failed:", error);
    return NextResponse.json({ error: "Detyrat nuk mund të ngarkoheshin" }, { status: 500 });
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "client") {
    return NextResponse.json({ error: "Nuk keni leje për të krijuar detyra" }, { status: 403 });
  }

  try {
    const userId = Number(session.user.id);
    if (!Number.isSafeInteger(userId)) {
      return NextResponse.json({ error: "Sesioni i përdoruesit është i pavlefshëm" }, { status: 401 });
    }

    const body: unknown = await request.json();
    if (!body || typeof body !== "object" || Array.isArray(body)) {
      return NextResponse.json({ error: "Të dhënat e detyrës janë të pavlefshme" }, { status: 400 });
    }

    const input = body as Record<string, unknown>;
    const title = typeof input.title === "string" ? input.title.trim() : "";
    const description = typeof input.description === "string" ? input.description.trim() : "";
    const priority = input.priority ?? "medium";
    const status = input.status ?? "open";
    const dueDate = parseTodoDate(input.dueDate);
    const clientId = input.clientId === null || input.clientId === undefined || input.clientId === ""
      ? null
      : typeof input.clientId === "number" || (typeof input.clientId === "string" && /^\d+$/.test(input.clientId))
        ? Number(input.clientId)
        : Number.NaN;
    const requestedAssignee = input.assignedToId === null || input.assignedToId === undefined || input.assignedToId === ""
      ? userId
      : typeof input.assignedToId === "number" || (typeof input.assignedToId === "string" && /^\d+$/.test(input.assignedToId))
        ? Number(input.assignedToId)
        : Number.NaN;

    if (!title || title.length > 200) {
      return NextResponse.json({ error: "Titulli është i detyrueshëm dhe nuk mund të kalojë 200 karaktere" }, { status: 400 });
    }
    if (description.length > 5000) {
      return NextResponse.json({ error: "Përshkrimi nuk mund të kalojë 5000 karaktere" }, { status: 400 });
    }
    if (input.category !== undefined && input.category !== null && (typeof input.category !== "string" || input.category.trim().length > 100)) {
      return NextResponse.json({ error: "Kategoria nuk mund të kalojë 100 karaktere" }, { status: 400 });
    }
    if (!isTodoPriority(priority) || !isTodoStatus(status) || dueDate === undefined) {
      return NextResponse.json({ error: "Prioriteti, statusi ose afati nuk është i vlefshëm" }, { status: 400 });
    }
    if (clientId !== null && (!Number.isSafeInteger(clientId) || clientId < 1)) {
      return NextResponse.json({ error: "Klienti i zgjedhur nuk është i vlefshëm" }, { status: 400 });
    }
    if (session.user.role !== "admin" && requestedAssignee !== userId) {
      return NextResponse.json({ error: "Vetëm administratori mund t'ua caktojë detyrat anëtarëve të tjerë" }, { status: 403 });
    }

    const [client, assignee] = await Promise.all([
      clientId ? prisma.client.findUnique({ where: { id: clientId }, select: { id: true } }) : null,
      prisma.user.findFirst({
        where: { id: requestedAssignee, active: true, role: { in: ["admin", "staff"] } },
        select: { id: true },
      }),
    ]);
    if (clientId && !client) return NextResponse.json({ error: "Klienti nuk u gjet" }, { status: 400 });
    if (!assignee) return NextResponse.json({ error: "Anëtari i zgjedhur nuk është aktiv ose nuk është i vlefshëm" }, { status: 400 });

    const task = await prisma.todoTask.create({
      data: {
        title,
        description: description || null,
        priority,
        status,
        dueDate,
        clientId,
        createdById: userId,
        assignedToId: requestedAssignee,
        completedAt: status === "done" ? new Date() : null,
        category: typeof input.category === "string" && input.category.trim() ? input.category.trim() : null,
      },
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
    });

    return NextResponse.json(task, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Trupi i kërkesës nuk përmban JSON të vlefshëm" }, { status: 400 });
    }
    console.error("Todo task creation failed:", error);
    return NextResponse.json({ error: "Detyra nuk mund të ruhej" }, { status: 500 });
  }
}
