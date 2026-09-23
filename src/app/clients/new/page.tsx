"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";

export default function NewClientPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState({
    name: "", email: "", phone: "", address: "", city: "", businessNumber: "", taxId: "", notes: "",
  });

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
      router.push("/clients");
    } else {
      const data = await res.json();
      setError(data.error || "Gabim gjatë regjistrimit");
    }
    setLoading(false);
  };

  const fields = [
    { key: "name", label: "Emri i Plotë *", type: "text", placeholder: "p.sh. ABC Sh.p.k." },
    { key: "email", label: "Email *", type: "email", placeholder: "klient@example.com" },
    { key: "phone", label: "Telefon", type: "tel", placeholder: "+355 69 123 4567" },
    { key: "businessNumber", label: "Nr. Biznesit", type: "text", placeholder: "L12345678" },
    { key: "taxId", label: "Nr. Fiskal", type: "text", placeholder: "K12345678A" },
    { key: "city", label: "Qyteti", type: "text", placeholder: "Tiranë" },
    { key: "address", label: "Adresa", type: "text", placeholder: "Rruga, Nr." },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href="/clients" className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Klient i Ri</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Regjistro klient të ri në sistem</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {fields.map(({ key, label, type, placeholder }) => (
            <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
              <input
                type={type}
                placeholder={placeholder}
                value={form[key as keyof typeof form]}
                onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                required={key === "name" || key === "email"}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
              />
            </div>
          ))}
        </div>

        <div>
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Shënime</label>
          <textarea
            rows={3}
            placeholder="Shënime shtesë për klientin..."
            value={form.notes}
            onChange={(e) => setForm({ ...form, notes: e.target.value })}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
          <Link href="/clients" className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors">
            Anulo
          </Link>
          <button
            type="submit"
            disabled={loading}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {loading ? "Duke ruajtur..." : "Regjistro Klientin"}
          </button>
        </div>
      </form>
    </div>
  );
}
