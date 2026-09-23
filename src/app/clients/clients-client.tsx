"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { Plus, Search, Mail, Phone, MapPin, Trash2, Edit, Eye, Printer } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";

interface Client {
  id: number;
  name: string;
  email: string;
  phone?: string;
  city?: string;
  businessNumber?: string;
  taxId?: string;
  createdAt: string;
  _count: { invoices: number };
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

export default function ClientsClient({ initialClients }: { initialClients: Client[] }) {
  const router = useRouter();
  const [clients, setClients] = useState(initialClients);
  const [search, setSearch] = useState("");
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
      clients.filter(
        (client) =>
          client.name.toLowerCase().includes(search.toLowerCase()) ||
          client.email.toLowerCase().includes(search.toLowerCase()) ||
          (client.city || "").toLowerCase().includes(search.toLowerCase())
      ),
    [clients, search]
  );

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Jeni i sigurt qe doni te fshini klientin "${name}"?`)) return;

    const response = await fetch(`/api/clients/${id}`, { method: "DELETE" });
    if (response.ok) {
      setClients((current) => current.filter((client) => client.id !== id));
      router.refresh();
    }
  };

  const handlePrintList = () => {
    const rows = filtered.map((client) => `
      <tr>
        <td>${client.name}</td>
        <td>${client.email}</td>
        <td>${client.phone || "-"}</td>
        <td>${client.city || "-"}</td>
        <td>${client._count.invoices}</td>
        <td>${format(new Date(client.createdAt), "d MMM yyyy", { locale: sq })}</td>
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
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Lista e Klienteve</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      h1{margin:0 0 6px;font-size:20px} p{margin:0 0 14px;font-size:12px;color:#64748b}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
      th{background:#f8fafc}
      .footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px;color:#64748b}
      .footer .center{text-align:center}.footer .right{text-align:right}
    </style></head><body>
      <div class="head"><div><h1>Lista e Klienteve</h1><p>Gjeneruar: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: sq })}</p></div><div>${logoHtml}</div></div>
      <table><thead><tr><th>Klienti</th><th>Email</th><th>Telefon</th><th>Qyteti</th><th>Fatura</th><th>Data Regj.</th></tr></thead><tbody>${rows}</tbody></table>
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
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Klientët</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">{clients.length} klientë të regjistruar</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={handlePrintList}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Printo Listën
          </button>
          <Link
            href="/clients/new"
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Klient i Ri
          </Link>
        </div>
      </div>

      <div className="relative">
        <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
        <input
          type="text"
          placeholder="Kërko klientë sipas emrit, emailit ose qytetit..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-10 pr-4 py-2.5 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px]">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Klienti</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Kontakt</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Qyteti</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Fatura</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Data Regj.</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">
                    {search ? (
                      "Nuk u gjet asnje klient."
                    ) : (
                      <>
                        Nuk ka kliente ende. <Link href="/clients/new" className="text-indigo-600 hover:underline">Shto klientin e pare</Link>
                      </>
                    )}
                  </td>
                </tr>
              ) : (
                filtered.map((client) => (
                  <tr key={client.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 font-bold text-sm flex items-center justify-center flex-shrink-0">
                          {client.name.charAt(0).toUpperCase()}
                        </div>
                        <div>
                          <p className="text-sm font-semibold text-slate-900">{client.name}</p>
                          {client.taxId && <p className="text-xs text-slate-400">NIPT: {client.taxId}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      <div className="space-y-0.5">
                        <a href={`mailto:${client.email}`} className="flex items-center gap-1.5 text-sm text-slate-600 hover:text-indigo-600">
                          <Mail className="w-3.5 h-3.5" />{client.email}
                        </a>
                        {client.phone && (
                          <a href={`tel:${client.phone}`} className="flex items-center gap-1.5 text-sm text-slate-500 hover:text-indigo-600">
                            <Phone className="w-3.5 h-3.5" />{client.phone}
                          </a>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4">
                      {client.city && (
                        <span className="flex items-center gap-1.5 text-sm text-slate-500">
                          <MapPin className="w-3.5 h-3.5" />{client.city}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-50 text-indigo-700">
                        {client._count.invoices} fatura
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">
                      {format(new Date(client.createdAt), "d MMM yyyy", { locale: sq })}
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <Link href={`/clients/${client.id}`} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Shiko">
                          <Eye className="w-4 h-4" />
                        </Link>
                        <Link href={`/clients/${client.id}/edit`} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Edito">
                          <Edit className="w-4 h-4" />
                        </Link>
                        <button onClick={() => handleDelete(client.id, client.name)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Fshij">
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
