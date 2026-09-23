"use client";

import { useEffect, useState } from "react";
import { ArrowLeft, FileText, Plus } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";
import { use } from "react";

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  address?: string;
  businessNumber?: string;
  taxId?: string;
  notes?: string;
  createdAt: string;
  _count: { invoices: number; posts: number };
  invoices: { id: number; invoiceNumber: string; total: number; status: string; createdAt: string }[];
}

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = { paid: "Paguar", sent: "Dërguar", draft: "Draft", cancelled: "Anuluar" };

export default function ClientDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [client, setClient] = useState<Client | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetch(`/api/clients/${id}`)
      .then((r) => r.json())
      .then((data) => { setClient(data?.id ? data : null); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return (
    <div className="p-6 lg:p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-48 bg-slate-200 rounded" />
        <div className="h-40 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );

  if (!client) return (
    <div className="p-6 lg:p-8 text-center text-slate-400">
      Klienti nuk u gjet. <Link href="/clients" className="text-indigo-600 hover:underline">Kthehu</Link>
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/clients" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div className="w-11 h-11 sm:w-12 sm:h-12 rounded-2xl bg-indigo-100 text-indigo-700 font-bold text-lg flex items-center justify-center shadow-sm">
            {client.name.charAt(0).toUpperCase()}
          </div>
          <div>
            <h1 className="text-xl sm:text-2xl font-bold text-slate-900">{client.name}</h1>
            <p className="text-slate-500 text-xs sm:text-sm">Klient që nga {format(new Date(client.createdAt), "MMMM yyyy", { locale: sq })}</p>
          </div>
        </div>
        <div className="flex gap-2">
          <Link href={`/clients/${id}/edit`} className="flex-1 sm:flex-none text-center px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors">
            Edito
          </Link>
          <Link href={`/invoices/new?clientId=${id}`} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20">
            <Plus className="w-4 h-4" /> Faturë e Re
          </Link>
        </div>
      </div>

      {/* Info Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Informacion i Klientit</h2>
          <dl className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
            {[
              { label: "Email", value: client.email },
              { label: "Telefon", value: client.phone || "—" },
              { label: "Nr. Biznesit", value: client.businessNumber || "—" },
              { label: "Nr. Fiskal", value: client.taxId || "—" },
              { label: "Qyteti", value: client.city || "—" },
              { label: "Adresa", value: client.address || "—", full: true },
              { label: "Shënime", value: client.notes || "—", full: true },
            ].map(({ label, value, full }) => (
              <div key={label} className={full ? "sm:col-span-2" : ""}>
                <dt className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">{label}</dt>
                <dd className="text-slate-800 font-semibold break-words">{value}</dd>
              </div>
            ))}
          </dl>
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-1 gap-4">
          <div className="bg-indigo-50/80 rounded-2xl border border-indigo-100 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-indigo-700">{client._count.invoices}</p>
            <p className="text-xs sm:text-sm font-semibold text-indigo-600 mt-1">Fatura Totale</p>
          </div>
          <div className="bg-emerald-50/80 rounded-2xl border border-emerald-100 p-4 sm:p-5 text-center">
            <p className="text-2xl sm:text-3xl font-extrabold text-emerald-700">{client._count.posts}</p>
            <p className="text-xs sm:text-sm font-semibold text-emerald-600 mt-1">Postime</p>
          </div>
        </div>
      </div>

      {/* Invoices */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="flex items-center justify-between px-4 sm:px-6 py-4 border-b border-slate-100">
          <h2 className="font-semibold text-slate-900 text-sm sm:text-base flex items-center gap-2"><FileText className="w-4 h-4 text-slate-500" /> Faturat e Klientit</h2>
          <Link href={`/invoices/new?clientId=${id}`} className="text-xs sm:text-sm text-indigo-600 hover:text-indigo-700 font-semibold">+ Faturë e Re</Link>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[520px]">
            <thead>
              <tr className="bg-slate-50/90 border-b border-slate-200">
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Nr. Faturë</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Data</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Shuma</th>
                <th className="px-4 sm:px-6 py-3 text-xs font-bold text-slate-500 uppercase tracking-wider text-left">Statusi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {client.invoices.length === 0 ? (
                <tr><td colSpan={4} className="px-6 py-8 text-center text-slate-400 text-xs sm:text-sm">Nuk ka fatura për këtë klient.</td></tr>
              ) : (
                client.invoices.map((inv) => (
                  <tr key={inv.id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="px-4 sm:px-6 py-3.5">
                      <Link href={`/invoices/${inv.id}`} className="font-mono text-xs sm:text-sm font-semibold text-indigo-600 hover:underline">{inv.invoiceNumber}</Link>
                    </td>
                    <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm text-slate-500">{format(new Date(inv.createdAt), "d MMM yyyy", { locale: sq })}</td>
                    <td className="px-4 sm:px-6 py-3.5 text-xs sm:text-sm font-bold text-slate-900">€{inv.total.toFixed(2)}</td>
                    <td className="px-4 sm:px-6 py-3.5">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-semibold ${statusColors[inv.status]}`}>{statusLabel[inv.status]}</span>
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
