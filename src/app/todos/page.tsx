import { getServerSession } from "next-auth";
import { redirect } from "next/navigation";
import { authOptions } from "@/lib/auth";
import { getTodoVisibilityWhere } from "@/lib/todos";
import { prisma } from "@/lib/prisma";
import TodosClient from "./todos-client";

export const dynamic = "force-dynamic";

export default async function TodosPage() {
  const session = await getServerSession(authOptions);
  if (!session?.user?.id || session.user.role === "client") redirect("/invoices");

  const userId = Number(session.user.id);
  const [tasks, clients, teamMembers] = await Promise.all([
    prisma.todoTask.findMany({
      where: getTodoVisibilityWhere(userId, session.user.role),
      include: {
        client: { select: { id: true, name: true } },
        createdBy: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
    prisma.user.findMany({
      where: {
        active: true,
        role: { in: ["admin", "staff"] },
        ...(session.user.role === "admin" ? {} : { id: userId }),
      },
      select: { id: true, name: true, role: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <TodosClient
      initialTasks={tasks.map((task) => ({
        ...task,
        dueDate: task.dueDate?.toISOString() ?? null,
        completedAt: task.completedAt?.toISOString() ?? null,
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
      }))}
      clients={clients}
      teamMembers={teamMembers}
      currentUserId={userId}
      isAdmin={session.user.role === "admin"}
    />
  );
}
