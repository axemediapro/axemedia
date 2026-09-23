"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Plus, BellRing, Trash2, Edit2, Check, X, Printer, ArrowUpDown } from "lucide-react";
import { format, addDays, differenceInCalendarDays } from "date-fns";
import { sq } from "date-fns/locale";

interface DomainReminder {
  id: number;
  domain: string;
  provider?: string | null;
  billingCycle: string;
  amount: number;
  currency: string;
  nextDueDate: string;
  remindDaysBefore: number;
  autoRenew: boolean;
  status: string;
  lastPaidDate?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
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

const emptyForm = {
  domain: "",
  provider: "",
  billingCycle: "yearly",
  amount: "",
  currency: "EUR",
  nextDueDate: new Date().toISOString().split("T")[0],
  remindDaysBefore: "7",
  autoRenew: true,
  status: "active",
  lastPaidDate: "",
  notes: "",
};

export default function DomainsClient({ initialReminders }: { initialReminders: DomainReminder[] }) {
  const [reminders, setReminders] = useState(initialReminders);
  const [query, setQuery] = useState("");
  const [sortBy, setSortBy] = useState<"nextDueDate" | "amount" | "status">("nextDueDate");
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [loadingTable, setLoadingTable] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState<CompanySettingsPrint>({});

  const fetchReminders = useCallback(async (q: string, sb: "nextDueDate" | "amount" | "status", sd: "asc" | "desc") => {
    setLoadingTable(true);
    try {
      const params = new URLSearchParams();
      if (q.trim()) params.set("q", q.trim());
      params.set("sortBy", sb);
      params.set("sortDir", sd);
      const res = await fetch(`/api/domains?${params.toString()}`);
      if (!res.ok) return;
      const data = await res.json();
      setReminders(Array.isArray(data) ? data : []);
    } finally {
      setLoadingTable(false);
    }
  }, []);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchReminders(query, sortBy, sortDir);
    }, 250);
    return () => clearTimeout(timer);
  }, [query, sortBy, sortDir, fetchReminders]);

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  const dueSoonCount = useMemo(
    () => reminders.filter((item) => item.status === "active" && differenceInCalendarDays(new Date(item.nextDueDate), new Date()) <= item.remindDaysBefore).length,
    [reminders]
  );

  const monthlyCount = useMemo(() => reminders.filter((item) => item.billingCycle === "monthly").length, [reminders]);
  const yearlyCount = reminders.length - monthlyCount;

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setError("");
    setShowForm(false);
  };

  const openEdit = (item: DomainReminder) => {
    setEditId(item.id);
    setForm({
      domain: item.domain,
      provider: item.provider || "",
      billingCycle: item.billingCycle,
      amount: String(item.amount),
      currency: item.currency,
      nextDueDate: item.nextDueDate.split("T")[0],
      remindDaysBefore: String(item.remindDaysBefore),
      autoRenew: item.autoRenew,
      status: item.status,
      lastPaidDate: item.lastPaidDate ? item.lastPaidDate.split("T")[0] : "",
      notes: item.notes || "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.domain.trim()) {
      setError("Domain është i detyrueshëm");
      return;
    }
    if (!form.nextDueDate) {
      setError("Data e pagesës është e detyrueshme");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ...form,
      autoRenew: Boolean(form.autoRenew),
    };

    const url = editId ? `/api/domains/${editId}` : "/api/domains";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      await fetchReminders(query, sortBy, sortDir);
      resetForm();
    } else {
      const data = await res.json();
      setError(data.error || "Gabim gjatë ruajtjes");
    }

    setSaving(false);
  };

  const handleDelete = async (id: number, domain: string) => {
    if (!confirm(`Fshij reminder për ${domain}?`)) return;
    const res = await fetch(`/api/domains/${id}`, { method: "DELETE" });
    if (res.ok) await fetchReminders(query, sortBy, sortDir);
  };

  const handleSort = (column: "amount" | "status") => {
    if (sortBy === column) {
      setSortDir((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }
    setSortBy(column);
    setSortDir("asc");
  };

  const printHtml = (title: string, rows: DomainReminder[]) => {
    const rowsHtml = rows.map((item) => {
      const cycle = item.billingCycle === "monthly" ? "Mujor" : "Vjetor";
      const dueDate = format(new Date(item.nextDueDate), "d MMM yyyy", { locale: sq });
      const dueLabel = getDueLabel(item);
      const status = item.status === "active" ? "Active" : "Inactive";
      return `<tr>
        <td>${item.domain}</td>
        <td>${item.provider || "-"}</td>
        <td>${cycle}</td>
        <td>${dueDate}</td>
        <td>${dueLabel}</td>
        <td>${item.amount.toFixed(2)} ${item.currency}</td>
        <td>${status}</td>
      </tr>`;
    }).join("");

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

    return `<!doctype html>
<html>
<head>
  <meta charset="utf-8" />
  <title>${title}</title>
  <style>
    body { font-family: Arial, sans-serif; margin: 24px; color: #0f172a; }
    .head { display:flex; justify-content:space-between; align-items:flex-start; gap:16px; margin-bottom:14px; }
    h1 { margin: 0 0 6px; font-size: 20px; }
    p { margin: 0 0 16px; font-size: 12px; color: #64748b; }
    table { border-collapse: collapse; width: 100%; font-size: 12px; }
    th, td { border: 1px solid #cbd5e1; padding: 8px; text-align: left; }
    th { background: #f8fafc; font-weight: 700; }
    .footer { margin-top: 18px; border-top:1px solid #e2e8f0; padding-top:10px; display:grid; grid-template-columns:1fr 1fr 1fr; gap:12px; font-size:11px; color:#64748b; }
    .footer .center { text-align:center; }
    .footer .right { text-align:right; }
  </style>
</head>
<body>
  <div class="head">
    <div>
      <h1>${title}</h1>
      <p>Gjeneruar: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: sq })}</p>
    </div>
    <div>${logoHtml}</div>
  </div>
  <table>
    <thead>
      <tr>
        <th>Domain</th><th>Provider</th><th>Cycle</th><th>Due Date</th><th>Reminder</th><th>Shuma</th><th>Status</th>
      </tr>
    </thead>
    <tbody>${rowsHtml}</tbody>
  </table>
  <div class="footer">
    <div>${leftFooter}</div>
    <div class="center">${centerFooter}</div>
    <div class="right">${rightFooter}</div>
  </div>
</body>
</html>`;
  };

  const printList = () => {
    const win = window.open("", "_blank", "width=1000,height=700");
    if (!win) return;
    win.document.write(printHtml("Domain Reminders", reminders));
    win.document.close();
    win.focus();
    win.print();
  };

  const printSingle = (item: DomainReminder) => {
    const win = window.open("", "_blank", "width=900,height=650");
    if (!win) return;
    win.document.write(printHtml(`Domain Reminder - ${item.domain}`, [item]));
    win.document.close();
    win.focus();
    win.print();
  };

  const getDueBadge = (item: DomainReminder) => {
    if (item.status !== "active") return "bg-slate-100 text-slate-600";
    const days = differenceInCalendarDays(new Date(item.nextDueDate), new Date());
    if (days < 0) return "bg-red-100 text-red-700";
    if (days <= item.remindDaysBefore) return "bg-amber-100 text-amber-700";
    return "bg-emerald-100 text-emerald-700";
  };

  const getDueLabel = (item: DomainReminder) => {
    if (item.status !== "active") return "Inactive";
    const days = differenceInCalendarDays(new Date(item.nextDueDate), new Date());
    if (days < 0) return `Kaluar ${Math.abs(days)} ditë`;
    if (days === 0) return "Sot";
    return `${days} ditë`;
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Domain Reminder</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Kujtesa për pagesa mujore dhe vjetore të domain-eve</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button onClick={printList} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm cursor-pointer">
            <Printer className="w-4 h-4" /> Printo Listën
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer">
            <Plus className="w-4 h-4" /> Shto Domain
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-3 sm:p-4">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Kërko domain / provider / status..."
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 transition"
        />
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
          <p className="text-xs text-slate-500 font-medium">Gjithsej Domain</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{reminders.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-amber-600 font-medium">Due Soon</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">{dueSoonCount}</p>
        </div>
        <div className="bg-indigo-50 border border-indigo-100 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-indigo-600 font-medium">Mujor / Vjetor</p>
          <p className="text-xl sm:text-2xl font-bold text-indigo-800 mt-1">{monthlyCount} / {yearlyCount}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 sm:p-6 animate-in fade-in duration-150">
          <h2 className="font-bold text-slate-900 mb-4 text-base sm:text-lg">{editId ? "Ndrysho Domain Reminder" : "Shto Domain Reminder të Ri"}</h2>
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Domain *</label>
              <input type="text" value={form.domain} onChange={(e) => setForm({ ...form, domain: e.target.value })} placeholder="example.com" required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Provider</label>
              <input type="text" value={form.provider} onChange={(e) => setForm({ ...form, provider: e.target.value })} placeholder="Namecheap, Cloudflare..." className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Cycle</label>
              <select value={form.billingCycle} onChange={(e) => setForm({ ...form, billingCycle: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                <option value="monthly">Mujor</option>
                <option value="yearly">Vjetor</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Shuma</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Monedha</label>
              <input type="text" value={form.currency} onChange={(e) => setForm({ ...form, currency: e.target.value.toUpperCase() })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Next Due Date *</label>
              <input type="date" value={form.nextDueDate} onChange={(e) => setForm({ ...form, nextDueDate: e.target.value })} required className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Reminder para (ditë)</label>
              <input type="number" min="0" value={form.remindDaysBefore} onChange={(e) => setForm({ ...form, remindDaysBefore: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Last Paid</label>
              <input type="date" value={form.lastPaidDate} onChange={(e) => setForm({ ...form, lastPaidDate: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Status</label>
              <select value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500">
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Shënime</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex flex-col sm:flex-row sm:items-center justify-between gap-3 pt-2">
              <label className="inline-flex items-center gap-2 text-sm text-slate-700 cursor-pointer">
                <input type="checkbox" checked={form.autoRenew} onChange={(e) => setForm({ ...form, autoRenew: e.target.checked })} className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500" />
                Auto renew
              </label>
              <div className="flex gap-2">
                <button type="button" onClick={resetForm} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"><X className="w-4 h-4" /> Anulo</button>
                <button type="submit" disabled={saving} className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-60"><Check className="w-4 h-4" /> {saving ? "Duke ruajtur..." : editId ? "Ruaj Ndryshimet" : "Shto Reminder"}</button>
              </div>
            </div>
          </form>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px]">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Domain</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Provider</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Cycle</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Due Date</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Reminder</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <button type="button" onClick={() => handleSort("amount")} className="inline-flex items-center gap-1 hover:text-slate-700">
                    Shuma <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <button type="button" onClick={() => handleSort("status")} className="inline-flex items-center gap-1 hover:text-slate-700">
                    Status <ArrowUpDown className="w-3.5 h-3.5" />
                  </button>
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {loadingTable ? (
                <tr>
                  <td colSpan={8} className="px-6 py-8 text-center text-slate-400 text-sm">Duke ngarkuar...</td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-6 py-12 text-center text-slate-400 text-sm">Nuk ka domain reminders ende.</td>
                </tr>
              ) : (
                reminders.map((item) => (
                  <tr key={item.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-2 text-sm font-semibold text-slate-900">
                        <BellRing className="w-4 h-4 text-indigo-500" />
                        {item.domain}
                      </div>
                      {item.autoRenew && <p className="text-xs text-emerald-600 mt-1">Auto renew</p>}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.provider || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{item.billingCycle === "monthly" ? "Mujor" : "Vjetor"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{format(new Date(item.nextDueDate), "d MMM yyyy", { locale: sq })}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getDueBadge(item)}`}>{getDueLabel(item)}</span>
                    </td>
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{item.currency} {item.amount.toFixed(2)}</td>
                    <td className="px-6 py-4">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${item.status === "active" ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>{item.status === "active" ? "Active" : "Inactive"}</span>
                    </td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button onClick={() => printSingle(item)} className="p-1.5 rounded-lg text-slate-400 hover:bg-indigo-50 hover:text-indigo-600 transition-colors" title="Printo"><Printer className="w-4 h-4" /></button>
                        <button onClick={() => openEdit(item)} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors" title="Edito"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => handleDelete(item.id, item.domain)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors" title="Fshij"><Trash2 className="w-4 h-4" /></button>
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
