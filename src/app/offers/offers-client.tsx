"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Search, Eye, Trash2, ArrowRightCircle, Edit2, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";
import { useRouter } from "next/navigation";

interface Offer {
  id: number;
  offerNumber: string;
  title: string;
  total: number;
  status: string;
  issueDate: string;
  validUntil: string;
  convertedToInvoiceId: number | null;
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
  draft: "bg-slate-100 text-slate-600",
  sent: "bg-blue-100 text-blue-700",
  accepted: "bg-emerald-100 text-emerald-700",
  rejected: "bg-red-100 text-red-700",
  expired: "bg-orange-100 text-orange-700",
};
const statusLabel: Record<string, string> = {
  draft: "Draft",
  sent: "Derguar",
  accepted: "Pranuar",
  rejected: "Refuzuar",
  expired: "Skaduar",
};

export default function OffersClient({ initialOffers }: { initialOffers: Offer[] }) {
  const router = useRouter();
  const [offers, setOffers] = useState<Offer[]>(initialOffers);
  const [search, setSearch] = useState("");
  const [filterStatus, setFilterStatus] = useState("all");
  const [settings, setSettings] = useState<CompanySettingsPrint>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  const filtered = useMemo(
    () =>
      offers.filter((offer) => {
        const matchSearch =
          offer.offerNumber.toLowerCase().includes(search.toLowerCase()) ||
          offer.title.toLowerCase().includes(search.toLowerCase()) ||
          offer.client.name.toLowerCase().includes(search.toLowerCase());
        const matchStatus = filterStatus === "all" || offer.status === filterStatus;
        return matchSearch && matchStatus;
      }),
    [offers, search, filterStatus]
  );

  const handleDelete = async (id: number, num: string) => {
    if (!confirm(`Fshij oferten "${num}"?`)) return;
    const response = await fetch(`/api/offers/${id}`, { method: "DELETE" });
    if (response.ok) {
      setOffers((current) => current.filter((offer) => offer.id !== id));
      router.refresh();
    }
  };

  const handleConvert = async (id: number) => {
    if (!confirm("Konverto kete oferte ne fature?")) return;
    const res = await fetch(`/api/offers/${id}/convert`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.invoiceId}`);
    }
  };

  const totalValue = offers.reduce((sum, offer) => sum + offer.total, 0);
  const acceptedValue = offers.filter((offer) => offer.status === "accepted").reduce((sum, offer) => sum + offer.total, 0);

  const handlePrintList = () => {
    const rows = filtered.map((offer) => `
      <tr>
        <td>${offer.offerNumber}</td>
        <td>${offer.title}</td>
        <td>${offer.client.name}</td>
        <td>${format(new Date(offer.issueDate), "d MMM yyyy", { locale: sq })}</td>
        <td>${format(new Date(offer.validUntil), "d MMM yyyy", { locale: sq })}</td>
        <td>${offer.total.toFixed(2)} EUR</td>
        <td>${statusLabel[offer.status] || offer.status}</td>
      </tr>
    `).join("");

    const logoHtml = settings.logoUrl
      ? `<img src="${settings.logoUrl}" alt="Logo" style="max-height:54px;max-width:180px;object-fit:contain" />`
      : "";
    const leftFooter = [settings.name, settings.tagline, settings.address].filter(Boolean).join("<br/>");
    const centerFooter = [
      settings.taxId ? `Nr Unik: ${settings.taxId}` : "",
      settings.bankAccount ? `Reiffeisen Bank: ${settings.bankAccount}` : "",
      settings.swiftCode ? `SWIFT: ${settings.swiftCode}` : "",
    ].filter(Boolean).join("<br/>");
    const rightFooter = [settings.phone, settings.website, settings.email].filter(Boolean).join("<br/>");

    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Lista e Ofertave</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      h1{margin:0 0 6px;font-size:20px} p{margin:0 0 14px;font-size:12px;color:#64748b}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
      th{background:#f8fafc}
      .footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px;color:#64748b}
      .footer .center{text-align:center}.footer .right{text-align:right}
    </style></head><body>
      <div class="head"><div><h1>Lista e Ofertave</h1><p>Gjeneruar: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: sq })}</p></div><div>${logoHtml}</div></div>
      <table><thead><tr><th>Nr. Oferte</th><th>Titulli</th><th>Klienti</th><th>Data</th><th>Vlefshme deri</th><th>Shuma</th><th>Statusi</th></tr></thead><tbody>${rows}</tbody></table>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Ofertat</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{offers.length} oferta gjithsej</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={handlePrintList} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" /> Printo Listën
          </button>
          <Link href="/offers/new" className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Ofertë e Re
          </Link>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
        {[
          { label: "Totale", value: offers.length, color: "text-slate-700" },
          { label: "Draft", value: offers.filter((offer) => offer.status === "draft").length, color: "text-slate-500" },
          { label: "Dërguar", value: offers.filter((offer) => offer.status === "sent").length, color: "text-blue-700" },
          { label: "Pranuar", value: offers.filter((offer) => offer.status === "accepted").length, color: "text-emerald-700" },
          { label: "Refuzuar", value: offers.filter((offer) => offer.status === "rejected").length, color: "text-red-700" },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-white rounded-2xl border border-slate-200/80 p-4 shadow-sm">
            <p className="text-xs text-slate-500">{label}</p>
            <p className={`text-xl sm:text-2xl font-bold mt-1 ${color}`}>{value}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4">
          <p className="text-xs sm:text-sm text-indigo-600 font-semibold">Vlera Totale e Ofertave</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-800 mt-1">EUR {totalValue.toFixed(2)}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4">
          <p className="text-xs sm:text-sm text-emerald-600 font-semibold">Oferta të Pranuara</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">EUR {acceptedValue.toFixed(2)}</p>
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-2.5 sm:gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
          <input
            type="text"
            placeholder="Kërko oferta sipas numrit, titullit ose klientit..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
          />
        </div>
        <select
          value={filterStatus}
          onChange={(e) => setFilterStatus(e.target.value)}
          className="px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        >
          <option value="all">Të gjitha statuset</option>
          <option value="draft">Draft</option>
          <option value="sent">Dërguar</option>
          <option value="accepted">Pranuar</option>
          <option value="rejected">Refuzuar</option>
          <option value="expired">Skaduar</option>
        </select>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[700px]">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                {["Nr. Oferte", "Titulli", "Klienti", "Data", "Vlefshme deri", "Shuma", "Statusi", "Veprime"].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {search || filterStatus !== "all" ? "Nuk u gjeten oferta." : <><span>Nuk ka oferta ende. </span><Link href="/offers/new" className="text-indigo-600 hover:underline">Krijo oferten e pare</Link></>}
                  </td>
                </tr>
              ) : (
                filtered.map((offer) => (
                  <tr key={offer.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4"><span className="font-mono text-sm font-semibold text-slate-700">{offer.offerNumber}</span></td>
                    <td className="px-6 py-4 text-sm font-medium text-slate-900 max-w-[180px] truncate">{offer.title}</td>
                    <td className="px-6 py-4"><Link href={`/clients/${offer.client.id}`} className="text-sm text-slate-700 hover:text-indigo-600 font-medium">{offer.client.name}</Link></td>
                    <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(offer.issueDate), "d MMM yyyy", { locale: sq })}</td>
                    <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(offer.validUntil), "d MMM yyyy", { locale: sq })}</td>
                    <td className="px-6 py-4 text-sm font-bold text-slate-900">EUR {offer.total.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${statusColors[offer.status]}`}>{statusLabel[offer.status]}</span>
                      {offer.convertedToInvoiceId && <Link href={`/invoices/${offer.convertedToInvoiceId}`} className="ml-2 text-xs text-indigo-600 hover:underline">{"-> Fature"}</Link>}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/offers/${offer.id}`} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Shiko"><Eye className="w-4 h-4" /></Link>
                        <Link href={`/offers/${offer.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Ndrysho"><Edit2 className="w-4 h-4" /></Link>
                        {!offer.convertedToInvoiceId && offer.status !== "rejected" && (
                          <button onClick={() => handleConvert(offer.id)} className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors" title="Konverto ne Fature"><ArrowRightCircle className="w-4 h-4" /></button>
                        )}
                        <button onClick={() => handleDelete(offer.id, offer.offerNumber)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Fshij"><Trash2 className="w-4 h-4" /></button>
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
