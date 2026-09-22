"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Trash2, TrendingDown, TrendingUp, Edit2, Check, X, Printer } from "lucide-react";
import { format } from "date-fns";
import { sq } from "date-fns/locale";

interface Expense {
  id: number;
  title: string;
  amount: number;
  category: string;
  date: string;
  notes?: string | null;
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

const categoryColors: Record<string, string> = {
  Qira: "bg-violet-100 text-violet-700",
  Utilities: "bg-blue-100 text-blue-700",
  Software: "bg-indigo-100 text-indigo-700",
  Marketing: "bg-pink-100 text-pink-700",
  Pagat: "bg-amber-100 text-amber-700",
  Transport: "bg-cyan-100 text-cyan-700",
  Pajisje: "bg-orange-100 text-orange-700",
  Tjeter: "bg-slate-100 text-slate-600",
};

export default function ExpensesClient({ initialExpenses, categories }: { initialExpenses: Expense[]; categories: string[] }) {
  const [expenses, setExpenses] = useState(initialExpenses);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [filterCategory, setFilterCategory] = useState("all");
  const [form, setForm] = useState({ title: "", amount: "", category: categories[0], date: new Date().toISOString().split("T")[0], notes: "" });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [settings, setSettings] = useState<CompanySettingsPrint>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  const resetForm = () => {
    setForm({ title: "", amount: "", category: categories[0], date: new Date().toISOString().split("T")[0], notes: "" });
    setEditId(null);
    setError("");
    setShowForm(false);
  };

  const handleEdit = (expense: Expense) => {
    setForm({ title: expense.title, amount: String(expense.amount), category: expense.category, date: expense.date.split("T")[0], notes: expense.notes || "" });
    setEditId(expense.id);
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    const url = editId ? `/api/expenses/${editId}` : "/api/expenses";
    const method = editId ? "PUT" : "POST";
    const res = await fetch(url, { method, headers: { "Content-Type": "application/json" }, body: JSON.stringify(form) });
    if (res.ok) {
      const saved = await res.json();
      const normalized = { ...saved, date: saved.date ? new Date(saved.date).toISOString() : new Date().toISOString() };
      setExpenses((current) => (editId ? current.map((item) => (item.id === editId ? normalized : item)) : [normalized, ...current]));
      resetForm();
    } else {
      const d = await res.json();
      setError(d.error || "Gabim");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Fshij shpenzimin "${title}"?`)) return;
    const res = await fetch(`/api/expenses/${id}`, { method: "DELETE" });
    if (res.ok) setExpenses((current) => current.filter((expense) => expense.id !== id));
  };

  const filtered = useMemo(() => expenses.filter((expense) => filterCategory === "all" || expense.category === filterCategory), [expenses, filterCategory]);
  const totalThisMonth = expenses.filter((expense) => {
    const date = new Date(expense.date);
    const now = new Date();
    return date.getMonth() === now.getMonth() && date.getFullYear() === now.getFullYear();
  }).reduce((sum, expense) => sum + expense.amount, 0);
  const totalAll = expenses.reduce((sum, expense) => sum + expense.amount, 0);

  const handlePrintList = () => {
    const rows = filtered.map((expense) => `
      <tr>
        <td>${format(new Date(expense.date), "d MMM yyyy", { locale: sq })}</td>
        <td>${expense.title}</td>
        <td>${expense.category}</td>
        <td>${expense.amount.toFixed(2)} EUR</td>
        <td>${expense.notes || "-"}</td>
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
    win.document.write(`<!doctype html><html><head><meta charset="utf-8" /><title>Lista e Shpenzimeve</title><style>
      body{font-family:Arial,sans-serif;margin:24px;color:#0f172a}
      .head{display:flex;justify-content:space-between;align-items:flex-start;gap:16px;margin-bottom:14px}
      h1{margin:0 0 6px;font-size:20px} p{margin:0 0 14px;font-size:12px;color:#64748b}
      table{border-collapse:collapse;width:100%;font-size:12px}
      th,td{border:1px solid #cbd5e1;padding:8px;text-align:left}
      th{background:#f8fafc}
      .footer{margin-top:18px;border-top:1px solid #e2e8f0;padding-top:10px;display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;font-size:11px;color:#64748b}
      .footer .center{text-align:center}.footer .right{text-align:right}
    </style></head><body>
      <div class="head"><div><h1>Lista e Shpenzimeve</h1><p>Gjeneruar: ${format(new Date(), "dd MMM yyyy HH:mm", { locale: sq })}</p></div><div>${logoHtml}</div></div>
      <table><thead><tr><th>Data</th><th>Titulli</th><th>Kategoria</th><th>Shuma</th><th>Shenime</th></tr></thead><tbody>${rows}</tbody></table>
      <div class="footer"><div>${leftFooter}</div><div class="center">${centerFooter}</div><div class="right">${rightFooter}</div></div>
    </body></html>`);
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Shpenzimet</h1>
          <p className="text-slate-500 text-sm mt-1">{expenses.length} shpenzime te regjistruara</p>
        </div>
        <div className="flex items-center gap-2 self-start">
          <button onClick={handlePrintList} className="flex items-center gap-2 px-4 py-2 bg-slate-100 text-slate-700 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors shadow-sm">
            <Printer className="w-4 h-4" /> Printo Listen
          </button>
          <button onClick={() => { resetForm(); setShowForm(true); }} className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors shadow-sm">
            <Plus className="w-4 h-4" /> Shto Shpenzim
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="flex items-center gap-3"><div className="bg-rose-100 rounded-xl p-3"><TrendingDown className="w-5 h-5 text-rose-600" /></div><div><p className="text-xs text-slate-500 font-medium">Ky Muaj</p><p className="text-xl font-bold text-slate-900">EUR {totalThisMonth.toFixed(2)}</p></div></div></div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="flex items-center gap-3"><div className="bg-slate-100 rounded-xl p-3"><TrendingUp className="w-5 h-5 text-slate-600" /></div><div><p className="text-xs text-slate-500 font-medium">Gjithsej</p><p className="text-xl font-bold text-slate-900">EUR {totalAll.toFixed(2)}</p></div></div></div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5"><div className="flex items-center gap-3"><div className="bg-indigo-100 rounded-xl p-3"><TrendingDown className="w-5 h-5 text-indigo-600" /></div><div><p className="text-xs text-slate-500 font-medium">Mesatare/Muaj</p><p className="text-xl font-bold text-slate-900">EUR {expenses.length ? (totalAll / Math.max(1, new Set(expenses.map((expense) => expense.date.slice(0, 7))).size)).toFixed(2) : "0.00"}</p></div></div></div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">{editId ? "Edito Shpenzimin" : "Shto Shpenzim te Ri"}</h2>
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}
          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Titulli *</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} required className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Shuma (EUR) *</label>
              <input type="number" step="0.01" min="0" value={form.amount} onChange={(e) => setForm({ ...form, amount: e.target.value })} required className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Kategoria *</label>
              <select value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white">{categories.map((category) => <option key={category}>{category}</option>)}</select>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Data</label>
              <input type="date" value={form.date} onChange={(e) => setForm({ ...form, date: e.target.value })} className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="sm:col-span-2 lg:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Shenime</label>
              <input type="text" value={form.notes} onChange={(e) => setForm({ ...form, notes: e.target.value })} placeholder="Opsionale..." className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500" />
            </div>
            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2">
              <button type="button" onClick={resetForm} className="flex items-center gap-1.5 px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm hover:bg-slate-50 transition-colors"><X className="w-4 h-4" /> Anulo</button>
              <button type="submit" disabled={saving} className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 transition-colors disabled:opacity-60"><Check className="w-4 h-4" />{saving ? "Duke ruajtur..." : editId ? "Ruaj Ndryshimet" : "Shto Shpenzimin"}</button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        <button onClick={() => setFilterCategory("all")} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === "all" ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"}`}>Te gjitha</button>
        {categories.map((category) => <button key={category} onClick={() => setFilterCategory(category)} className={`px-3 py-1.5 rounded-full text-xs font-medium transition-colors ${filterCategory === category ? "bg-indigo-600 text-white" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"}`}>{category}</button>)}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                {["Data", "Titulli", "Kategoria", "Shuma", "Shenime", "Veprime"].map((h) => <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">{h}</th>)}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr><td colSpan={6} className="px-6 py-12 text-center text-slate-400 text-sm">{filterCategory !== "all" ? `Nuk ka shpenzime ne kategorine "${filterCategory}".` : "Nuk ka shpenzime ende."}</td></tr>
              ) : filtered.map((expense) => (
                <tr key={expense.id} className="hover:bg-slate-50 transition-colors">
                  <td className="px-6 py-4 text-sm text-slate-500">{format(new Date(expense.date), "d MMM yyyy", { locale: sq })}</td>
                  <td className="px-6 py-4 text-sm font-semibold text-slate-900">{expense.title}</td>
                  <td className="px-6 py-4"><span className={`px-2.5 py-1 rounded-full text-xs font-medium ${categoryColors[expense.category] || "bg-slate-100 text-slate-600"}`}>{expense.category}</span></td>
                  <td className="px-6 py-4 text-sm font-bold text-rose-600">EUR {expense.amount.toFixed(2)}</td>
                  <td className="px-6 py-4 text-sm text-slate-500">{expense.notes || "-"}</td>
                  <td className="px-6 py-4"><div className="flex items-center gap-1"><button onClick={() => handleEdit(expense)} className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"><Edit2 className="w-4 h-4" /></button><button onClick={() => handleDelete(expense.id, expense.title)} className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"><Trash2 className="w-4 h-4" /></button></div></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
