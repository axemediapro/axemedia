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
    <div className="p-6 lg:p-8 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href={`/clients/${id}`} className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Edito Klientin</h1>
          <p className="text-slate-500 text-sm mt-0.5">Ndrysho të dhënat e klientit</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">
            {error}
          </div>
        )}

        {loading ? (
          <div className="text-sm text-slate-500">Duke ngarkuar klientin...</div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {fields.map(({ key, label, type, placeholder }) => (
                <div key={key} className={key === "address" ? "sm:col-span-2" : ""}>
                  <label className="block text-sm font-medium text-slate-700 mb-1.5">{label}</label>
                  <input
                    type={type}
                    placeholder={placeholder}
                    value={form[key]}
                    onChange={(e) => setForm({ ...form, [key]: e.target.value })}
                    required={key === "name" || key === "email"}
                    className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                  />
                </div>
              ))}
            </div>

            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Shënime</label>
              <textarea
                rows={3}
                placeholder="Shënime shtesë për klientin..."
                value={form.notes}
                onChange={(e) => setForm({ ...form, notes: e.target.value })}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
              />
            </div>
          </>
        )}

        <div className="flex justify-end gap-3 pt-2">
          <Link href={`/clients/${id}`} className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">
            Anulo
          </Link>
          <button
            type="submit"
            disabled={loading || saving}
            className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60"
          >
            <Save className="w-4 h-4" />
            {saving ? "Duke ruajtur..." : "Ruaj Ndryshimet"}
          </button>
        </div>
      </form>
    </div>
  );
}
