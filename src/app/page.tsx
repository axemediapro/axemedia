import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getTodoVisibilityWhere } from "@/lib/todos";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";


interface Stats {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  totalExpenses: number;
  todoOpen: number;
  todoDone: number;
  todos: {
    id: number;
    title: string;
    description: string | null;
    priority: string;
    status: string;
    clientId: number | null;
    client: { id: number; name: string } | null;
    assignedTo: { id: number; name: string } | null;
    dueDate: string | null;
    createdAt: string;
    updatedAt: string;
  }[];
  todoTotalToday: number;
  todoCompletedToday: number;
  clients: { id: number; name: string }[];
  recentInvoices: {
    id: number;
    invoiceNumber: string;
    total: number;
    status: string;
    createdAt: string;
    client: { name: string };
  }[];
}

export default async function Dashboard() {
  const session = await getServerSession(authOptions);
  if (!session) {
    redirect("/login");
  }

  if (session.user.role === "client") {
    redirect("/invoices");
  }

  const visibility = getTodoVisibilityWhere(Number(session.user.id), session.user.role);
  const myTasksWhere = {
    OR: [
      { createdById: Number(session.user.id) },
      { assignedToId: Number(session.user.id) },
    ],
  };
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const [totalClients, totalInvoices, totalRevenue, totalExpenses, todoOpen, todoDone, recentInvoices, todos, todoTotalToday, todoCompletedToday, clients] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    prisma.todoTask.count({ where: { AND: [visibility, { status: { not: "done" } }] } }),
    prisma.todoTask.count({ where: { AND: [visibility, { status: "done" }] } }),
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { client: { select: { name: true } } } }),
    prisma.todoTask.findMany({
      where: {
        AND: [
          myTasksWhere,
          {
            OR: [
              { dueDate: { gte: today, lt: tomorrow } },
              { dueDate: { lt: today }, status: { not: "done" } },
            ],
          },
        ],
      },
      include: {
        client: { select: { id: true, name: true } },
        assignedTo: { select: { id: true, name: true } },
      },
      orderBy: [{ dueDate: "desc" }, { priority: "desc" }],
      take: 8,
    }),
    prisma.todoTask.count({
      where: { AND: [myTasksWhere, { dueDate: { gte: today, lt: tomorrow } }] },
    }),
    prisma.todoTask.count({
      where: { AND: [myTasksWhere, { dueDate: { gte: today, lt: tomorrow }, status: "done" }] },
    }),
    prisma.client.findMany({ select: { id: true, name: true }, orderBy: { name: "asc" } }),
  ]);

  const stats: Stats = {
    totalClients,
    totalInvoices,
    totalRevenue: totalRevenue._sum.total ?? 0,
    totalExpenses: totalExpenses._sum.amount ?? 0,
    todoOpen,
    todoDone,
    todos: todos.map((task) => ({
      ...task,
      dueDate: task.dueDate?.toISOString() ?? null,
      createdAt: task.createdAt.toISOString(),
      updatedAt: task.updatedAt.toISOString(),
    })),
    todoTotalToday,
    todoCompletedToday,
    clients,
    recentInvoices: recentInvoices.map((invoice) => ({ ...invoice, createdAt: invoice.createdAt.toISOString() })),
  };

  return <DashboardClient stats={stats} />;
}
