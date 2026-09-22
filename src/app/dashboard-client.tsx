"use client";

import { Users, FileText, TrendingUp, TrendingDown, Plus, ArrowUpRight, ListTodo, CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";

interface Stats {
  totalClients: number;
  totalInvoices: number;
  totalRevenue: number;
  totalExpenses: number;
  todoOpen: number;
  todoDone: number;
  recentInvoices: { id: number; invoiceNumber: string; total: number; status: string; createdAt: string; client: { name: string } }[];
}

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};

const statusLabel: Record<string, string> = {
  paid: "Paguar",
  sent: "Derguar",
  draft: "Draft",
  cancelled: "Anuluar",
};

export default function DashboardClient({ stats }: { stats: Stats }) {
  const cards = [
    { title: "Kliente Total", value: stats.totalClients, icon: Users, color: "bg-indigo-500", href: "/clients" },
    { title: "Fatura Total", value: stats.totalInvoices, icon: FileText, color: "bg-violet-500", href: "/invoices" },
    { title: "Te Ardhura", value: `${stats.totalRevenue.toFixed(2)} EUR`, icon: TrendingUp, color: "bg-emerald-500", href: "/invoices" },
    { title: "Shpenzime", value: `${stats.totalExpenses.toFixed(2)} EUR`, icon: TrendingDown, color: "bg-rose-500", href: "/expenses" },
    { title: "TO DO Open", value: stats.todoOpen, icon: ListTodo, color: "bg-amber-500", href: "/todos" },
    { title: "TO DO Done", value: stats.todoDone, icon: CheckCircle2, color: "bg-teal-500", href: "/todos" },
  ];

  return (
    <div className="p-6 lg:p-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">
            Mire se vini, <span className="text-indigo-600">AXEmedia</span>
          </h1>
          <p className="text-slate-500 text-sm mt-1">{format(new Date(), "EEEE, d MMMM yyyy", { locale: sq })}</p>
        </div>
        <div className="flex gap-2 flex-wrap">
          <Link href="/clients/new" className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Klient i Ri
          </Link>
          <Link href="/invoices/new" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Fature e Re
          </Link>
          <Link href="/todos" className="flex items-center gap-2 px-4 py-2 bg-white border border-slate-200 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> TO DO
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
        {cards.map(({ title, value, icon: Icon, color, href }) => (
          <Link key={title} href={href} className="bg-white rounded-2xl p-5 border border-slate-100 shadow-sm hover:shadow-md hover:-translate-y-0.5 transition-all duration-200 group">
            <div className="flex items-start justify-between">
              <div>
                <p className="text-sm text-slate-500 font-medium">{title}</p>
                <p className="text-2xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <div className={`${color} rounded-xl p-3 opacity-90`}>
                <Icon className="w-5 h-5 text-white" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-indigo-600 opacity-0 group-hover:opacity-100 transition-opacity">
              <span>Shiko detajet</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900">Faturat e Fundit</h2>
          <Link href="/invoices" className="text-sm text-indigo-600 hover:text-indigo-700 font-medium">
            Shiko te gjitha
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Nr Fature</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Klienti</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Shuma</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Statusi</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-10 text-center text-sm text-slate-400">
                    Nuk ka fatura ende.
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-800">{invoice.invoiceNumber}</td>
                    <td className="px-6 py-4 text-sm text-slate-700">{invoice.client.name}</td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{invoice.total.toFixed(2)} EUR</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[invoice.status] || "bg-slate-100 text-slate-600"}`}>
                        {statusLabel[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(invoice.createdAt), "d MMM yyyy", { locale: sq })}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
