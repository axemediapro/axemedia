"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Download, Eye, Edit2, Trash2, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";

interface Invoice {
  id: number;
  invoiceNumber: string;
  total: number;
  subtotal: number;
  tax: number;
  status: string;
  issueDate: string;
  createdAt: string;
  client: { id: number; name: string; email: string };
}

interface CompanySettingsPrint {
  name?: string;
  tagline?: string;
  address?: string;
  phone?: string;
  email?: string;
  website?: string;
  taxId?: string;
  bankAccount?: string;
  swiftCode?: string;
  logoUrl?: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700",
  sent: "bg-blue-100 text-blue-700",
  draft: "bg-slate-100 text-slate-600",
  cancelled: "bg-red-100 text-red-700",
};
const statusLabel: Record<string, string> = { paid: "Paguar", sent: "Derguar", draft: "Draft", cancelled: "Anuluar" };

export default function InvoicesClient({ initialInvoices }: { initialInvoices: Invoice[] }) {
  const [invoices, setInvoices] = useState(initialInvoices);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [deletingId, setDeletingId] = useState<number | null>(null);
  const [settings, setSettings] = useState<CompanySettingsPrint>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  const handleDelete = async (invoice: Invoice) => {
    const confirmed = window.confirm(`A deshiron ta fshish faturen ${invoice.invoiceNumber}?`);
    if (!confirmed) return;

    try {
      setDeletingId(invoice.id);
      const res = await fetch(`/api/invoices/${invoice.id}`, { method: "DELETE" });
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        throw new Error(data.error || "Fshirja deshtoi");
      }
      setInvoices((prev) => prev.filter((item) => item.id !== invoice.id));
    } catch (error) {
      const message = error instanceof Error ? error.message : "Fshirja deshtoi";
      window.alert(message);
    } finally {
      setDeletingId(null);
    }
  };

  const filtered = useMemo(
    () =>
      invoices.filter((invoice) => {
        const matchSearch =
          invoice.invoiceNumber.toLowerCase().includes(search.toLowerCase()) ||
          invoice.client.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || invoice.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [invoices, search, filterStatus]
  );

  const totalRevenue = invoices.filter((invoice) => invoice.status === "paid").reduce((sum, invoice) => sum + invoice.total, 0);
  const pending = invoices.filter((invoice) => invoice.status === "sent").reduce((sum, invoice) => sum + invoice.total, 0);

  const handlePrintList = () => {
    const rows = filtered
      .map(
        (invoice) => `
      <tr>
        <td>${invoice.invoiceNumber}</td>
        <td>${invoice.client.name}</td>
        <td>${format(new Date(invoice.issueDate), "d MMM yyyy", { locale: sq })}</td>
        <td>${invoice.total.toFixed(2)} EUR</td>
        <td>${statusLabel[invoice.status] || invoice.status}</td>
      </tr>
    `
      )
      .join("");

    const logoHtml = settings.logoUrl
      ? `<img src="${settings.logoUrl}" alt="Logo" style="max-height:54px;max-width:180px;object-fit:contain" />`
      : "";

    const leftFooter = [settings.name, settings.tagline, settings.address].filter(Boolean).join("<br/>");
    const centerFooter = [
      settings.taxId ? `Nr Unik: ${settings.taxId}` : "",
      settings.bankAccount ? `Reiffeisen Bank: ${settings.bankAccount}` : "",
      settings.swiftCode ? `SWIFT: ${settings.swiftCode}` : "",
    ]
      .filter(Boolean)
      .join("<br/>");
    const rightFooter = [settings.phone, settings.website, settings.email].filter(Boolean).join("<br/>");

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Lista e Faturave</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      h1{margin:0 0 6px;font-size:20px} p{margin:0 0 14px;font-size:12px;color:#64748b}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
      th{background:#f8fafc}
      .footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px;color:#64748b}
      .footer .center{text-align:center}.footer .right{text-align:right}
    </style></head><body>
      <div class="head"><div><h1>Lista e Faturave</h1><p>Gjeneruar: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: sq })}</p></div><div>${logoHtml}</div></div>
      <table><thead><tr><th>Nr. Fature</th><th>Klienti</th><th>Data Leshimit</th><th>Shuma</th><th>Statusi</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer"><div>${leftFooter}</div><div class="center">${centerFooter}</div><div class="right">${rightFooter}</div></div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Faturat</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{invoices.length} fatura gjithsej</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrintList} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" /> Printo Listën
          </button>
          <Link href="/invoices/new" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Faturë e Re
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
        {[
          { label: "Totale", value: invoices.length, color: "text-slate-700" },
          { label: "Të Paguara", value: invoices.filter((invoice) => invoice.status === "paid").length, color: "text-emerald-700" },
          { label: "Të Dërguara", value: invoices.filter((invoice) => invoice.status === "sent").length, color: "text-blue-700" },
          { label: "Draft", value: invoices.filter((invoice) => invoice.status === "draft").length, color: "text-slate-500" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-xs sm:text-sm text-emerald-600 font-semibold">Të Ardhura (Paguar)</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">EUR {totalRevenue.toFixed(2)}</p>
        </div>
        <div className="bg-blue-50 border border-blue-100 rounded-2xl p-4">
          <p className="text-xs sm:text-sm text-blue-600 font-semibold">Në Pritje</p>
          <p className="text-xl sm:text-2xl font-bold text-blue-800 mt-1">EUR {pending.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input type="text" placeholder="Kërko fatura..." value={search} onChange={(e) => setSearch(e.target.value)} className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition" />
        </div>
        <select value={filterStatus} onChange={(e) => setFilterStatus(e.target.value)} className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
          <option value="all">Të gjitha statuset</option>
          <option value="draft">Draft</option>
          <option value="sent">Dërguar</option>
          <option value="paid">Paguar</option>
          <option value="cancelled">Anuluar</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50/75 text-left border-b border-slate-100">
                {["Nr. Fature", "Klienti", "Data Lëshimit", "Shuma", "Statusi", "Veprime"].map((h) => (
                  <th key={h} className="px-5 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-sm">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-xs sm:text-sm">{search || filterStatus !== "all" ? "Nuk u gjetën fatura." : <>Nuk ka fatura. <Link href="/invoices/new" className="text-indigo-600 hover:underline">Krijo faturën e parë</Link></>}</td></tr>
              ) : (
                filtered.map((invoice) => (
                  <tr key={invoice.id} className="hover:bg-slate-50/70 transition-colors">
                    <td className="px-5 py-3.5"><span className="font-mono text-sm font-semibold text-slate-900">{invoice.invoiceNumber}</span></td>
                    <td className="px-5 py-3.5"><Link href={`/clients/${invoice.client.id}`} className="text-sm font-medium text-slate-800 hover:text-indigo-600">{invoice.client.name}</Link></td>
                    <td className="px-5 py-3.5 text-sm text-slate-500">{format(new Date(invoice.issueDate), "d MMM yyyy", { locale: sq })}</td>
                    <td className="px-5 py-3.5 text-sm font-bold text-slate-900">EUR {invoice.total.toFixed(2)}</td>
                    <td className="px-5 py-3.5"><span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${statusColors[invoice.status]}`}>{statusLabel[invoice.status]}</span></td>
                    <td className="px-5 py-3.5">
                      <div className="flex items-center gap-1">
                        <Link href={`/invoices/${invoice.id}`} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Shiko"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/invoices/${invoice.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Ndrysho"><Edit2 className="w-4 h-4" /></Link>
                        <Link href={`/invoices/${invoice.id}?download=pdf`} className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Shkarko PDF"><Download className="w-4 h-4" /></Link>
                        <button type="button" onClick={() => handleDelete(invoice)} disabled={deletingId === invoice.id} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors disabled:opacity-50 cursor-pointer" title="Fshij">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
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
