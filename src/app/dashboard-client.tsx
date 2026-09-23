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
  sent: "Dërguar",
  draft: "Draft",
  cancelled: "Anuluar",
};

export default function DashboardClient({ stats }: { stats: Stats }) {
  const cards = [
    { title: "Klientë Total", value: stats.totalClients, icon: Users, color: "bg-indigo-500", href: "/clients" },
    { title: "Fatura Total", value: stats.totalInvoices, icon: FileText, color: "bg-violet-500", href: "/invoices" },
    { title: "Të Ardhura", value: `${stats.totalRevenue.toFixed(2)} EUR`, icon: TrendingUp, color: "bg-emerald-500", href: "/invoices" },
    { title: "Shpenzime", value: `${stats.totalExpenses.toFixed(2)} EUR`, icon: TrendingDown, color: "bg-rose-500", href: "/expenses" },
    { title: "TO DO Open", value: stats.todoOpen, icon: ListTodo, color: "bg-amber-500", href: "/todos" },
    { title: "TO DO Done", value: stats.todoDone, icon: CheckCircle2, color: "bg-teal-500", href: "/todos" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 sm:space-y-8">
      {/* Welcome Header & Quick Actions */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">
            Mirë se vini, <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-cyan-600 font-extrabold">AXEmedia</span>
          </h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5 capitalize">{format(new Date(), "EEEE, d MMMM yyyy", { locale: sq })}</p>
        </div>

        {/* Action buttons */}
        <div className="grid grid-cols-2 sm:flex sm:items-center gap-2">
          <Link
            href="/invoices/new"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Faturë e Re</span>
          </Link>
          <Link
            href="/clients/new"
            className="flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>Klient i Ri</span>
          </Link>
          <Link
            href="/todos"
            className="col-span-2 sm:col-span-1 flex items-center justify-center gap-1.5 px-3.5 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-medium hover:bg-slate-50 transition-colors shadow-sm active:scale-95"
          >
            <Plus className="w-4 h-4" />
            <span>TO DO</span>
          </Link>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
        {cards.map(({ title, value, icon: Icon, color, href }) => (
          <Link
            key={title}
            href={href}
            className="bg-white rounded-2xl p-4 sm:p-5 border border-slate-200/80 shadow-sm hover:shadow-md hover:border-slate-300 transition-all duration-200 group active:scale-[0.99]"
          >
            <div className="flex items-start justify-between">
              <div>
                <p className="text-xs sm:text-sm text-slate-500 font-medium">{title}</p>
                <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{value}</p>
              </div>
              <div className={`${color} rounded-xl p-2.5 sm:p-3 shadow-md shadow-slate-200 text-white`}>
                <Icon className="w-5 h-5" />
              </div>
            </div>
            <div className="flex items-center gap-1 mt-3 text-xs text-indigo-600 opacity-90 group-hover:opacity-100 transition-opacity font-medium">
              <span>Shiko detajet</span>
              <ArrowUpRight className="w-3 h-3" />
            </div>
          </Link>
        ))}
      </div>

      {/* Recent Invoices Card & Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="font-bold text-sm sm:text-base text-slate-900">Faturat e Fundit</h2>
          <Link href="/invoices" className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-semibold">
            Shiko të gjitha &rarr;
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-left">
            <thead>
              <tr className="bg-slate-50/75 border-b border-slate-100 text-xs font-semibold uppercase tracking-wider text-slate-500">
                <th className="py-3 px-4 sm:px-6">Nr Faturë</th>
                <th className="py-3 px-4 sm:px-6">Klienti</th>
                <th className="py-3 px-4 sm:px-6">Shuma</th>
                <th className="py-3 px-4 sm:px-6">Statusi</th>
                <th className="py-3 px-4 sm:px-6 text-right">Data</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {stats.recentInvoices.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-12 px-6 text-center text-slate-400 text-xs sm:text-sm">
                    Nuk ka fatura ende.
                  </td>
                </tr>
              ) : (
                stats.recentInvoices.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="py-3.5 px-4 sm:px-6 font-mono font-semibold text-slate-900">
                      <Link href={`/invoices/${invoice.id}`} className="hover:text-indigo-600 transition-colors">
                        {invoice.invoiceNumber}
                      </Link>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 font-medium text-slate-800">{invoice.client.name}</td>
                    <td className="py-3.5 px-4 sm:px-6 font-bold text-slate-900">{invoice.total.toFixed(2)} EUR</td>
                    <td className="py-3.5 px-4 sm:px-6">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[invoice.status] || "bg-slate-100 text-slate-600"}`}>
                        {statusLabel[invoice.status] || invoice.status}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 sm:px-6 text-slate-500 text-xs sm:text-sm text-right">
                      {format(new Date(invoice.createdAt), "d MMM yyyy", { locale: sq })}
                    </td>
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
