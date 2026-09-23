"use client";

import { useEffect, useMemo, useState } from "react";
import { Plus, Check, X, Trash2, Edit2, CheckCircle2, Circle, Printer } from "lucide-react";
import { format } from "date-fns";
import { sq } from "date-fns/locale";

interface TodoTask {
  id: number;
  title: string;
  description?: string | null;
  priority: string;
  status: string;
  clientId?: number | null;
  client?: { id: number; name: string } | null;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
}

interface ClientOption {
  id: number;
  name: string;
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
  title: "",
  description: "",
  priority: "medium",
  status: "open",
  clientId: "",
  dueDate: "",
};

export default function TodosClient({ initialTasks, clients }: { initialTasks: TodoTask[]; clients: ClientOption[] }) {
  const [tasks, setTasks] = useState(initialTasks);
  const [showForm, setShowForm] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [saving, setSaving] = useState(false);
  const [filterStatus, setFilterStatus] = useState("all");
  const [error, setError] = useState("");
  const [form, setForm] = useState(emptyForm);
  const [settings, setSettings] = useState<CompanySettingsPrint>({});

  useEffect(() => {
    fetch("/api/settings")
      .then((res) => res.json())
      .then((data) => {
        if (!data?.error) setSettings(data);
      })
      .catch(() => undefined);
  }, []);

  const openCount = useMemo(() => tasks.filter((task) => task.status === "open").length, [tasks]);
  const doneCount = tasks.length - openCount;

  const filtered = useMemo(
    () => tasks.filter((task) => (filterStatus === "all" ? true : task.status === filterStatus)),
    [tasks, filterStatus]
  );

  const resetForm = () => {
    setForm(emptyForm);
    setEditId(null);
    setError("");
    setShowForm(false);
  };

  const openEdit = (task: TodoTask) => {
    setEditId(task.id);
    setForm({
      title: task.title,
      description: task.description || "",
      priority: task.priority || "medium",
      status: task.status || "open",
      clientId: task.clientId ? String(task.clientId) : "",
      dueDate: task.dueDate ? task.dueDate.split("T")[0] : "",
    });
    setShowForm(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.title.trim()) {
      setError("Titulli është i detyrueshëm");
      return;
    }

    setSaving(true);
    setError("");

    const payload = {
      ...form,
      clientId: form.clientId ? Number(form.clientId) : null,
      dueDate: form.dueDate || null,
    };

    const url = editId ? `/api/todos/${editId}` : "/api/todos";
    const method = editId ? "PUT" : "POST";

    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (res.ok) {
      const saved = await res.json();
      const normalized = {
        ...saved,
        dueDate: saved.dueDate ? new Date(saved.dueDate).toISOString() : null,
        createdAt: saved.createdAt ? new Date(saved.createdAt).toISOString() : new Date().toISOString(),
        updatedAt: saved.updatedAt ? new Date(saved.updatedAt).toISOString() : new Date().toISOString(),
      } as TodoTask;

      setTasks((current) =>
        editId ? current.map((task) => (task.id === editId ? normalized : task)) : [normalized, ...current]
      );
      resetForm();
    } else {
      const data = await res.json();
      setError(data.error || "Gabim gjatë ruajtjes");
    }

    setSaving(false);
  };

  const handleDelete = async (id: number, title: string) => {
    if (!confirm(`Fshij task-un "${title}"?`)) return;
    const res = await fetch(`/api/todos/${id}`, { method: "DELETE" });
    if (res.ok) setTasks((current) => current.filter((task) => task.id !== id));
  };

  const toggleDone = async (task: TodoTask) => {
    const nextStatus = task.status === "done" ? "open" : "done";
    const res = await fetch(`/api/todos/${task.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: nextStatus }),
    });

    if (res.ok) {
      const updated = await res.json();
      setTasks((current) =>
        current.map((item) =>
          item.id === task.id
            ? {
                ...item,
                ...updated,
                dueDate: updated.dueDate ? new Date(updated.dueDate).toISOString() : null,
                createdAt: updated.createdAt ? new Date(updated.createdAt).toISOString() : item.createdAt,
                updatedAt: updated.updatedAt ? new Date(updated.updatedAt).toISOString() : item.updatedAt,
              }
            : item
        )
      );
    }
  };

  const printHtml = (title: string, rows: TodoTask[]) => {
    const rowsHtml = rows
      .map((task) => {
        const priority = task.priority === "high" ? "I larte" : task.priority === "low" ? "I ulet" : "Mesatar";
        const status = task.status === "done" ? "Done" : "Open";
        const dueDate = task.dueDate ? format(new Date(task.dueDate), "d MMM yyyy", { locale: sq }) : "-";
        const clientName = task.client?.name || "-";
        return `<tr>
          <td>${task.title}</td>
          <td>${clientName}</td>
          <td>${priority}</td>
          <td>${status}</td>
          <td>${dueDate}</td>
          <td>${task.description || "-"}</td>
        </tr>`;
      })
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
        <th>Task</th><th>Klienti</th><th>Prioriteti</th><th>Statusi</th><th>Due Date</th><th>Pershkrimi</th>
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
    win.document.write(printHtml("TO DO Lista", filtered));
    win.document.close();
    win.focus();
    win.print();
  };

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">TO DO</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Menaxho detyrat e tua ditore</p>
        </div>
        <div className="flex items-center gap-2 flex-wrap">
          <button
            onClick={printList}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 transition-colors shadow-sm cursor-pointer"
          >
            <Printer className="w-4 h-4" /> Printo Listën
          </button>
          <button
            onClick={() => {
              resetForm();
              setShowForm(true);
            }}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3.5 py-2 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" /> Shto Task
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 sm:gap-4">
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-5">
          <p className="text-xs text-slate-500 font-medium">Gjithsej</p>
          <p className="text-xl sm:text-2xl font-bold text-slate-900 mt-1">{tasks.length}</p>
        </div>
        <div className="bg-amber-50 border border-amber-100 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-amber-600 font-medium">Open</p>
          <p className="text-xl sm:text-2xl font-bold text-amber-800 mt-1">{openCount}</p>
        </div>
        <div className="bg-emerald-50 border border-emerald-100 rounded-2xl p-4 sm:p-5">
          <p className="text-xs text-emerald-600 font-medium">Done</p>
          <p className="text-xl sm:text-2xl font-bold text-emerald-800 mt-1">{doneCount}</p>
        </div>
      </div>

      {showForm && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 sm:p-6 animate-in fade-in duration-150">
          <h2 className="font-bold text-slate-900 mb-4 text-base sm:text-lg">{editId ? "Ndrysho Task" : "Shto Task të Ri"}</h2>
          {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">{error}</div>}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5 sm:gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Titulli *</label>
              <input
                type="text"
                value={form.title}
                onChange={(e) => setForm({ ...form, title: e.target.value })}
                required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Prioriteti</label>
              <select
                value={form.priority}
                onChange={(e) => setForm({ ...form, priority: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="low">I ulët</option>
                <option value="medium">Mesatar</option>
                <option value="high">I lartë</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Statusi</label>
              <select
                value={form.status}
                onChange={(e) => setForm({ ...form, status: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="open">Open</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Klienti</label>
              <select
                value={form.clientId}
                onChange={(e) => setForm({ ...form, clientId: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                <option value="">Pa klient</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Due Date</label>
              <input
                type="date"
                value={form.dueDate}
                onChange={(e) => setForm({ ...form, dueDate: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-3">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Përshkrimi</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Shënime për detyrën..."
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-2 lg:col-span-3 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={resetForm}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
              >
                <X className="w-4 h-4" /> Anulo
              </button>
              <button
                type="submit"
                disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-60"
              >
                <Check className="w-4 h-4" /> {saving ? "Duke ruajtur..." : editId ? "Ruaj Ndryshimet" : "Shto Task"}
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="flex flex-wrap gap-1.5 sm:gap-2">
        <button
          onClick={() => setFilterStatus("all")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "all" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
          }`}
        >
          Të gjitha
        </button>
        <button
          onClick={() => setFilterStatus("open")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "open" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
          }`}
        >
          Open
        </button>
        <button
          onClick={() => setFilterStatus("done")}
          className={`px-3.5 py-1.5 rounded-full text-xs font-semibold transition-colors cursor-pointer ${
            filterStatus === "done" ? "bg-indigo-600 text-white shadow-sm" : "bg-white border border-slate-200 text-slate-600 hover:border-indigo-300"
          }`}
        >
          Done
        </button>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 text-left border-b border-slate-100">
                {[
                  "Task",
                  "Klienti",
                  "Prioriteti",
                  "Statusi",
                  "Due Date",
                  "Përshkrimi",
                  "Veprime",
                ].map((h) => (
                  <th key={h} className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                    {h}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-6 py-12 text-center text-slate-400 text-sm">
                    Nuk ka task-e.
                  </td>
                </tr>
              ) : (
                filtered.map((task) => (
                  <tr key={task.id} className="hover:bg-slate-50 transition-colors">
                    <td className="px-6 py-4 text-sm font-semibold text-slate-900">{task.title}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{task.client?.name || "—"}</td>
                    <td className="px-6 py-4 text-sm text-slate-600">{task.priority === "high" ? "I lartë" : task.priority === "low" ? "I ulët" : "Mesatar"}</td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-2.5 py-1 rounded-full text-xs font-medium ${
                          task.status === "done" ? "bg-emerald-100 text-emerald-700" : "bg-amber-100 text-amber-700"
                        }`}
                      >
                        {task.status === "done" ? "Done" : "Open"}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-600">
                      {task.dueDate ? format(new Date(task.dueDate), "d MMM yyyy", { locale: sq }) : "—"}
                    </td>
                    <td className="px-6 py-4 text-sm text-slate-500">{task.description || "—"}</td>
                    <td className="px-6 py-4">
                      <div className="flex items-center gap-1">
                        <button
                          onClick={() => toggleDone(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-emerald-50 hover:text-emerald-600 transition-colors"
                          title="Toggle done"
                        >
                          {task.status === "done" ? <Circle className="w-4 h-4" /> : <CheckCircle2 className="w-4 h-4" />}
                        </button>
                        <button
                          onClick={() => openEdit(task)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                          title="Edito"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(task.id, task.title)}
                          className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                          title="Fshij"
                        >
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

