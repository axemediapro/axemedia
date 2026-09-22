import { prisma } from "@/lib/prisma";
import TodosClient from "./todos-client";

export default async function TodosPage() {
  const todoDelegate = (prisma as unknown as {
    todoTask?: {
      findMany: (args: {
        include?: { client: { select: { id: true; name: true } } };
        orderBy: Array<{ status?: "asc" | "desc"; dueDate?: "asc" | "desc"; createdAt?: "asc" | "desc" }>;
      }) => Promise<
        Array<{
          id: number;
          title: string;
          description: string | null;
          priority: string;
          status: string;
          clientId: number | null;
          client?: { id: number; name: string } | null;
          dueDate: Date | null;
          createdAt: Date;
          updatedAt: Date;
        }>
      >;
    };
  }).todoTask;

  const tasks = todoDelegate
    ? await todoDelegate
        .findMany({
          include: { client: { select: { id: true, name: true } } },
          orderBy: [{ status: "asc" }, { dueDate: "asc" }, { createdAt: "desc" }],
        })
        .catch(() => [])
    : [];

  const clients = await prisma.client.findMany({
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  const initialTasks = tasks.map((task) => ({
    ...task,
    dueDate: task.dueDate ? task.dueDate.toISOString() : null,
    createdAt: task.createdAt.toISOString(),
    updatedAt: task.updatedAt.toISOString(),
  }));

  return <TodosClient initialTasks={initialTasks} clients={clients} />;
}
