"use client";

import { useState } from "react";
import { createPortal } from "react-dom";
import { X, Save, UserPlus } from "lucide-react";

interface Client {
  id: number;
  name: string;
  email: string;
}

interface Props {
  onCreated: (client: Client) => void;
}

export default function NewClientModal({ onCreated }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", businessNumber: "", taxId: "", notes: "",
  });

  const reset = () => {
    setForm({ name: "", email: "", phone: "", address: "", city: "", businessNumber: "", taxId: "", notes: "" });
    setError("");
  };

  const handleOpen = () => { reset(); setOpen(true); };
  const handleClose = () => { setOpen(false); reset(); };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    const res = await fetch("/api/clients", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      const client: Client = await res.json();
      onCreated(client);
      handleClose();
    } else {
      const data = await res.json();
      setError(data.error || "Gabim gjatë regjistrimit");
    }
    setLoading(false);
  };

  const fields = [
    { key: "name",           label: "Emri i Plotë *",   type: "text",  placeholder: "p.sh. ABC Sh.p.k.",   required: true },
    { key: "email",          label: "Email *",           type: "email", placeholder: "klient@example.com",  required: true },
    { key: "phone",          label: "Telefon",           type: "tel",   placeholder: "+355 69 123 4567",    required: false },
    { key: "businessNumber", label: "Nr. Biznesit",     type: "text",  placeholder: "L12345678",           required: false },
    { key: "taxId",          label: "Nr. Fiskal",       type: "text",  placeholder: "K12345678A",          required: false },
    { key: "city",           label: "Qyteti",            type: "text",  placeholder: "Tiranë",              required: false },
    { key: "address",        label: "Adresa",            type: "text",  placeholder: "Rruga, Nr.",          required: false },
  ];

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="flex items-center gap-1.5 px-3 py-2.5 border border-dashed border-indigo-300 text-indigo-600 rounded-lg text-sm font-medium hover:bg-indigo-50 transition-colors whitespace-nowrap"
        title="Shto klient të ri"
      >
        <UserPlus className="w-4 h-4" />
        <span className="hidden sm:inline">Klient i Ri</span>
      </button>      {open && typeof document !== "undefined" && createPortal(
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4">
          {/* Backdrop */}
          <div
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-sm"
            onClick={handleClose}
          />

          {/* Modal */}
          <div className="relative w-full max-w-lg bg-white rounded-2xl shadow-2xl border border-slate-200/80 overflow-hidden max-h-[92vh] flex flex-col z-10">
            {/* Header */}
            <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100 flex-shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-indigo-100 flex items-center justify-center">
                  <UserPlus className="w-4 h-4 text-indigo-600" />
                </div>
                <div>
                  <h2 className="font-bold text-slate-900 text-base">Klient i Ri</h2>
                  <p className="text-xs text-slate-500">Regjistro klient të ri</p>
                </div>
              </div>
              <button
                type="button"
                onClick={handleClose}
                className="p-1.5 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <form onSubmit={handleSubmit} className="p-4 sm:p-6 space-y-4 overflow-y-auto">
              {error && (
                <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">
                  {error}
                </div>
              )}

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {fields.map(({ key, label, type, placeholder, required }) => (
                  <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">{label}</label>
                    <input
                      type={type}
                      placeholder={placeholder}
                      value={form[key as keyof typeof form]}
                      onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                      required={required}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
                    />
                  </div>
                ))}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Shënime</label>
                <textarea
                  rows={2}
                  placeholder="Shënime shtesë..."
                  value={form.notes}
                  onChange={(e) => setForm({ ...form, notes: e.target.value })}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
                />
              </div>

              {/* Footer */}
              <div className="flex flex-col-reverse sm:flex-row justify-end gap-2 sm:gap-3 pt-2">
                <button
                  type="button"
                  onClick={handleClose}
                  className="w-full sm:w-auto px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors text-center"
                >
                  Anulo
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm shadow-indigo-600/20"
                >
                  <Save className="w-4 h-4" />
                  {loading ? "Duke ruajtur..." : "Regjistro"}
                </button>
              </div>
            </form>
          </div>
        </div>
      , document.body)}
    </>
  );
}
