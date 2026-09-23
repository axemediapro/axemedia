import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import DashboardClient from "./dashboard-client";

export const dynamic = "force-dynamic";


interface Stats {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  totalExpenses: number;
  todoOpen: number;
  todoDone: number;
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

  const todoDelegate = (prisma as unknown as { todoTask?: { count: (args: { where: { status: string } }) => Promise<number> } }).todoTask;

  const todoOpenPromise = todoDelegate
    ? todoDelegate.count({ where: { status: "open" } }).catch(() => 0)
    : Promise.resolve(0);

  const todoDonePromise = todoDelegate
    ? todoDelegate.count({ where: { status: "done" } }).catch(() => 0)
    : Promise.resolve(0);

  const [totalClients, totalInvoices, totalRevenue, totalExpenses, todoOpen, todoDone, recentInvoices] = await Promise.all([
    prisma.client.count(),
    prisma.invoice.count(),
    prisma.invoice.aggregate({ _sum: { total: true } }),
    prisma.expense.aggregate({ _sum: { amount: true } }),
    todoOpenPromise,
    todoDonePromise,
    prisma.invoice.findMany({ orderBy: { createdAt: "desc" }, take: 5, include: { client: { select: { name: true } } } }),
  ]);

  const stats: Stats = {
    totalClients,
    totalInvoices,
    totalRevenue: totalRevenue._sum.total ?? 0,
    totalExpenses: totalExpenses._sum.amount ?? 0,
    todoOpen,
    todoDone,
    recentInvoices: recentInvoices.map((invoice) => ({ ...invoice, createdAt: invoice.createdAt.toISOString() })),
  };

  return <DashboardClient stats={stats} />;
}
