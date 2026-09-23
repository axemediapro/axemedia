"use client";

import { useState } from "react";
import { Plus, Trash2, Edit2, Check, X, PackageSearch, Sparkles, Clock } from "lucide-react";

export interface Service {
  id: number;
  name: string;
  description?: string | null;
  defaultPrice: number;
  unit?: string | null;
  price1h?: number | null;
  price2to5h?: number | null;
  price5to8h?: number | null;
}

interface ServiceFormState {
  name: string;
  description: string;
  defaultPrice: string;
  unit: string;
  price1h: string;
  price2to5h: string;
  price5to8h: string;
}

export default function ServicesClient({
  initialServices,
  emptyForm,
}: {
  initialServices: Service[];
  emptyForm: ServiceFormState;
}) {
  const [services, setServices] = useState<Service[]>(initialServices);
  const [showAdd, setShowAdd] = useState(false);
  const [editId, setEditId] = useState<number | null>(null);
  const [form, setForm] = useState<ServiceFormState>(emptyForm);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const startEdit = (service: Service) => {
    setEditId(service.id);
    setForm({
      name: service.name,
      description: service.description || "",
      defaultPrice: String(service.defaultPrice ?? ""),
      unit: service.unit || "orë",
      price1h: service.price1h != null ? String(service.price1h) : "",
      price2to5h: service.price2to5h != null ? String(service.price2to5h) : "",
      price5to8h: service.price5to8h != null ? String(service.price5to8h) : "",
    });
    setError("");
  };

  const cancelEdit = () => {
    setEditId(null);
    setForm(emptyForm);
    setError("");
    setShowAdd(false);
  };

  const applyLiftPreset = () => {
    setForm((prev) => ({
      ...prev,
      unit: "orë",
      defaultPrice: "70",
      price1h: "70",
      price2to5h: "60",
      price5to8h: "50",
    }));
  };

  const handleSave = async (id?: number) => {
    if (!form.name.trim()) {
      setError("Emri është i detyrueshëm");
      return;
    }
    setSaving(true);
    setError("");
    const url = id ? `/api/services/${id}` : "/api/services";
    const method = id ? "PUT" : "POST";
    const res = await fetch(url, {
      method,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const saved = await res.json();
      setServices((current) =>
        id ? current.map((service) => (service.id === id ? saved : service)) : [saved, ...current]
      );
      cancelEdit();
    } else {
      const d = await res.json();
      setError(d.error || "Gabim gjatë ruajtjes");
    }
    setSaving(false);
  };

  const handleDelete = async (id: number, name: string) => {
    if (!confirm(`Fshij shërbimin "${name}"?`)) return;
    const res = await fetch(`/api/services/${id}`, { method: "DELETE" });
    if (res.ok) setServices((current) => current.filter((service) => service.id !== id));
  };

  const units = ["orë", "copë", "ditë", "muaj", "faqe", "video", "projekt", "paketë"];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Shërbimet & Produktet / Llifta</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">
            Konfiguro çmimet për çdo lift sipas orëve (1 orë = 70€, 2-5 orë = 60€, 5-8 orë = 50€) ose çmime standarde
          </p>
        </div>
        <button
          onClick={() => {
            cancelEdit();
            setShowAdd(true);
          }}
          className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 cursor-pointer"
        >
          <Plus className="w-4 h-4" /> Shërbim / Lift i Ri
        </button>
      </div>

      {showAdd && (
        <div className="bg-white rounded-2xl border border-indigo-200 shadow-sm p-4 sm:p-5 space-y-4 animate-in fade-in duration-150">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
            <h2 className="font-bold text-slate-900 flex items-center gap-2 text-base">
              <Plus className="w-4 h-4 text-indigo-600" /> Shto Shërbim / Lift të Ri
            </h2>
            <button
              type="button"
              onClick={applyLiftPreset}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors cursor-pointer"
            >
              <Sparkles className="w-3.5 h-3.5 text-amber-600" /> Vendos Çmimet e Liftit (70€ / 60€ / 50€)
            </button>
          </div>

          {error && <p className="text-xs sm:text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{error}</p>}

          <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">Emri * (p.sh. Lifti 1)</label>
              <input
                type="text"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="P.sh. Lifti 1 ose Shërbim me Lift"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">Njësia</label>
              <select
                value={form.unit}
                onChange={(e) => setForm({ ...form, unit: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              >
                {units.map((unit) => (
                  <option key={unit}>{unit}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">Çmimi Default (€)</label>
              <input
                type="number"
                step="0.01"
                min="0"
                value={form.defaultPrice}
                onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            {/* Hourly Tier Configuration */}
            <div className="sm:col-span-4 bg-slate-50 border border-slate-200 rounded-xl p-3.5 sm:p-4 space-y-2">
              <div className="flex items-center gap-2 text-slate-800 font-semibold text-xs uppercase tracking-wide">
                <Clock className="w-4 h-4 text-indigo-600" />
                Shkallëzimi i Çmimit sipas Orëve (Për Llifta)
              </div>
              <p className="text-xs text-slate-500">
                Gjatë krijimit të faturës/ofertës, çmimi për orë do të llogaritet automatikisht sipas orëve të shënuara.
              </p>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 pt-1">
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">1 Orë (€/orë)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="70"
                    value={form.price1h}
                    onChange={(e) => setForm({ ...form, price1h: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">2 - 5 Orë (€/orë)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="60"
                    value={form.price2to5h}
                    onChange={(e) => setForm({ ...form, price2to5h: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">5 - 8 Orë / 5+ Orë (€/orë)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    placeholder="50"
                    value={form.price5to8h}
                    onChange={(e) => setForm({ ...form, price5to8h: e.target.value })}
                    className="w-full px-3 py-2 border border-slate-300 rounded-xl text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500 font-semibold text-slate-800"
                  />
                </div>
              </div>
            </div>

            <div className="sm:col-span-4">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1">Përshkrimi (opsional)</label>
              <input
                type="text"
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>

            <div className="sm:col-span-4 flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={cancelEdit}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 cursor-pointer"
              >
                <X className="w-4 h-4" /> Anulo
              </button>
              <button
                type="button"
                onClick={() => void handleSave()}
                disabled={saving}
                className="flex-1 sm:flex-none flex items-center justify-center gap-1.5 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 shadow-sm shadow-indigo-600/20 disabled:opacity-60 cursor-pointer"
              >
                <Check className="w-4 h-4" /> {saving ? "Duke ruajtur..." : "Ruaj Shërbimin"}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[640px]">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-100 text-left">
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Emri</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Përshkrimi</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Çmimi / Shkallëzimi i Orëve
                </th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Njësia</th>
                <th className="px-6 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Veprime</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {services.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-6 py-16 text-center">
                    <PackageSearch className="w-10 h-10 text-slate-200 mx-auto mb-3" />
                    <p className="text-slate-400 text-sm">Nuk ka shërbime apo llifta të regjistruar.</p>
                    <button onClick={() => setShowAdd(true)} className="mt-2 text-indigo-600 text-sm hover:underline font-medium">
                      Shto shërbimin / liftin e parë
                    </button>
                  </td>
                </tr>
              ) : (
                services.map((service) => {
                  const isEditing = editId === service.id;
                  const hasTiers =
                    (service.price1h != null && service.price1h > 0) ||
                    (service.price2to5h != null && service.price2to5h > 0) ||
                    (service.price5to8h != null && service.price5to8h > 0) ||
                    /lift/i.test(service.name);

                  if (isEditing) {
                    return (
                      <tr key={service.id} className="bg-indigo-50/40">
                        <td colSpan={5} className="p-4">
                          <div className="bg-white border border-indigo-200 rounded-xl p-4 space-y-3">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-bold text-indigo-900 uppercase">Modifiko Shërbimin / Liftin</span>
                              <button
                                type="button"
                                onClick={applyLiftPreset}
                                className="flex items-center gap-1 px-2.5 py-1 bg-amber-50 text-amber-800 rounded text-xs font-medium hover:bg-amber-100"
                              >
                                <Sparkles className="w-3 h-3 text-amber-600" /> Çmimet e Liftit (70/60/50€)
                              </button>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                              <div className="sm:col-span-2">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Emri *</label>
                                <input
                                  type="text"
                                  value={form.name}
                                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-indigo-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Njësia</label>
                                <select
                                  value={form.unit}
                                  onChange={(e) => setForm({ ...form, unit: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                                >
                                  {units.map((u) => (
                                    <option key={u}>{u}</option>
                                  ))}
                                </select>
                              </div>
                              <div>
                                <label className="block text-xs font-medium text-slate-600 mb-1">Çmimi Default (€)</label>
                                <input
                                  type="number"
                                  step="0.01"
                                  min="0"
                                  value={form.defaultPrice}
                                  onChange={(e) => setForm({ ...form, defaultPrice: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                                />
                              </div>

                              <div className="sm:col-span-4 bg-slate-50 border border-slate-200 rounded-lg p-3">
                                <div className="text-xs font-semibold text-slate-700 mb-2 flex items-center gap-1.5">
                                  <Clock className="w-3.5 h-3.5 text-indigo-600" /> Shkallëzimi i Çmimit me Orë (€/orë):
                                </div>
                                <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                                  <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">1 Orë</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="70"
                                      value={form.price1h}
                                      onChange={(e) => setForm({ ...form, price1h: e.target.value })}
                                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-sm bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">2-5 Orë</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="60"
                                      value={form.price2to5h}
                                      onChange={(e) => setForm({ ...form, price2to5h: e.target.value })}
                                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-sm bg-white"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-[11px] text-slate-500 mb-0.5">5-8 Orë / 5+ Orë</label>
                                    <input
                                      type="number"
                                      step="0.01"
                                      min="0"
                                      placeholder="50"
                                      value={form.price5to8h}
                                      onChange={(e) => setForm({ ...form, price5to8h: e.target.value })}
                                      className="w-full px-2.5 py-1 border border-slate-300 rounded text-sm bg-white"
                                    />
                                  </div>
                                </div>
                              </div>

                              <div className="sm:col-span-4">
                                <label className="block text-xs font-medium text-slate-600 mb-1">Përshkrimi</label>
                                <input
                                  type="text"
                                  value={form.description}
                                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                                  className="w-full px-2.5 py-1.5 border border-slate-200 rounded-lg text-sm"
                                />
                              </div>

                              <div className="sm:col-span-4 flex justify-end gap-2">
                                <button
                                  type="button"
                                  onClick={cancelEdit}
                                  className="px-3 py-1.5 border border-slate-200 rounded-lg text-sm text-slate-600 hover:bg-slate-50"
                                >
                                  Anulo
                                </button>
                                <button
                                  type="button"
                                  onClick={() => void handleSave(service.id)}
                                  disabled={saving}
                                  className="px-4 py-1.5 bg-indigo-600 text-white rounded-lg text-sm hover:bg-indigo-700 font-medium"
                                >
                                  Ruaj
                                </button>
                              </div>
                            </div>
                          </div>
                        </td>
                      </tr>
                    );
                  }

                  return (
                    <tr key={service.id} className="hover:bg-slate-50 transition-colors">
                      <td className="px-6 py-4 text-sm font-semibold text-slate-900">{service.name}</td>
                      <td className="px-6 py-4 text-sm text-slate-500">{service.description || "—"}</td>
                      <td className="px-6 py-4 text-sm">
                        {hasTiers ? (
                          <div className="space-y-1">
                            <div className="inline-flex items-center gap-1.5 flex-wrap">
                              <span className="px-2 py-0.5 bg-indigo-50 text-indigo-700 rounded-md text-xs font-semibold border border-indigo-100">
                                1h: €{service.price1h ?? 70}/orë
                              </span>
                              <span className="px-2 py-0.5 bg-emerald-50 text-emerald-700 rounded-md text-xs font-semibold border border-emerald-100">
                                2-5h: €{service.price2to5h ?? 60}/orë
                              </span>
                              <span className="px-2 py-0.5 bg-amber-50 text-amber-700 rounded-md text-xs font-semibold border border-amber-100">
                                5-8h: €{service.price5to8h ?? 50}/orë
                              </span>
                            </div>
                          </div>
                        ) : (
                          <span className="font-bold text-indigo-700">€{service.defaultPrice.toFixed(2)}</span>
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <span className="px-2 py-1 bg-slate-100 text-slate-600 rounded-full text-xs font-medium">
                          /{service.unit || "copë"}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => startEdit(service)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-amber-50 hover:text-amber-600 transition-colors"
                            title="Modifiko"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => void handleDelete(service.id, service.name)}
                            className="p-1.5 rounded-lg text-slate-400 hover:bg-red-50 hover:text-red-600 transition-colors"
                            title="Fshij"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}