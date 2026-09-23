"use client";

import { useEffect, useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Save } from "lucide-react";
import Link from "next/link";
import { use } from "react";

interface ClientFormState {
  name: string;
  email: string;
  phone: string;
  address: string;
  city: string;
  businessNumber: string;
  taxId: string;
  notes: string;
}

const emptyForm = (): ClientFormState => ({
  name: "",
  email: "",
  phone: "",
  address: "",
  city: "",
  businessNumber: "",
  taxId: "",
  notes: "",
});

export default function EditClientPage({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter();
  const { id } = use(params);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [form, setForm] = useState<ClientFormState>(emptyForm());

  useEffect(() => {
    let active = true;

    const loadClient = async () => {
      try {
        const res = await fetch(`/api/clients/${id}`);
        const data = await res.json();
        if (!active) return;
        if (!res.ok || !data?.id) {
          setError(data?.error || "Klienti nuk u gjet");
          setLoading(false);
          return;
        }

        setForm({
          name: data.name || "",
          email: data.email || "",
          phone: data.phone || "",
          address: data.address || "",
          city: data.city || "",
          businessNumber: data.businessNumber || "",
          taxId: data.taxId || "",
          notes: data.notes || "",
        });
      } catch {
        if (active) setError("Gabim gjatë ngarkimit të klientit");
      } finally {
        if (active) setLoading(false);
      }
    };

    void loadClient();
    return () => {
      active = false;
    };
  }, [id]);

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setSaving(true);
    setError("");

    const res = await fetch(`/api/clients/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });

    if (res.ok) {
      router.push(`/clients/${id}`);
      return;
    }

    const data = await res.json().catch(() => ({}));
    setError(data.error || "Gabim gjatë ruajtjes së klientit");
    setSaving(false);
  };

  const fields = [
    { key: "name", label: "Emri i Plotë *", type: "text", placeholder: "p.sh. ABC Sh.p.k." },
    { key: "email", label: "Email *", type: "email", placeholder: "klient@example.com" },
    { key: "phone", label: "Telefon", type: "tel", placeholder: "+355 69 123 4567" },
    { key: "businessNumber", label: "Nr. Biznesit", type: "text", placeholder: "L12345678" },
    { key: "taxId", label: "Nr. Fiskal", type: "text", placeholder: "K12345678A" },
    { key: "city", label: "Qyteti", type: "text", placeholder: "Tiranë" },
    { key: "address", label: "Adresa", type: "text", placeholder: "Rruga, Nr." },
  ] as const;

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-2xl space-y-6">
      <div className="flex items-center gap-3">
        <Link href={`/clients/${id}`} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Edito Klientin</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Ndrysho të dhënat e klientit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500 py-8 text-center">Duke ngarkuar klientin...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, type, placeholder }) => (
                <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                  <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
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
          </>
        )}

        <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
          <Link href={`/clients/${id}`} className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors">
            Anulo
          </Link>
          <button
            type="submit"
            disabled={loading || saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm shadow-indigo-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Duke ruajtur..." : "Ruaj Ndryshimet"}
          </button>
        </div>
      </form>
    </div>
  );
}
