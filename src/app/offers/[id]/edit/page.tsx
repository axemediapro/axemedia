"use client";

import { useEffect, useState } from "react";
import { useRouter, useParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save, Loader2 } from "lucide-react";
import Link from "next/link";
import ServiceAutocomplete from "@/components/ServiceAutocomplete";

interface Client {
  id: number;
  name: string;
  email: string;
}

import { calculateServiceUnitPrice, ServiceTierConfig } from "@/lib/service-pricing";

type Service = ServiceTierConfig & {
  id: number;
  description?: string | null;
};

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

const toDateInput = (v: string | Date | null | undefined) => {
  if (!v) return "";
  const d = new Date(v);
  return isNaN(d.getTime()) ? "" : d.toISOString().split("T")[0];
};

export default function EditOfferPage() {
  const router = useRouter();
  const params = useParams<{ id: string }>();
  const id     = params.id;

  const [clients,  setClients]  = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [fetching, setFetching] = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [error,    setError]    = useState("");

  // Form state
  const [clientId,   setClientId]   = useState("");
  const [title,      setTitle]      = useState("");
  const [issueDate,  setIssueDate]  = useState("");
  const [validUntil, setValidUntil] = useState("");
  const [taxRate,    setTaxRate]    = useState(18);
  const [notes,      setNotes]      = useState("");
  const [status,     setStatus]     = useState("draft");
  const [items,      setItems]      = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  useEffect(() => {
    Promise.all([
      fetch(`/api/offers/${id}`).then((r) => r.json()),
      fetch("/api/clients").then((r) => r.json()),
      fetch("/api/services").then((r) => r.json()),
    ]).then(([offer, cls, svcs]) => {
      setClients(Array.isArray(cls) ? cls : []);
      setServices(Array.isArray(svcs) ? svcs : []);
      if (offer && !offer.error) {
        setClientId(String(offer.clientId));
        setTitle(offer.title || "");
        setIssueDate(toDateInput(offer.issueDate));
        setValidUntil(toDateInput(offer.validUntil));
        setStatus(offer.status);
        setNotes(offer.notes || "");
        const rate = offer.subtotal > 0 ? Math.round((offer.tax / offer.subtotal) * 100) : 18;
        setTaxRate(rate);
        setItems(
          offer.items.length > 0
            ? offer.items.map((it: { description: string; quantity: number; unitPrice: number }) => ({
                description: it.description,
                quantity:    it.quantity,
                unitPrice:   it.unitPrice,
              }))
            : [{ description: "", quantity: 1, unitPrice: 0 }]
        );
      } else {
        setError("Oferta nuk u gjet");
      }
      setFetching(false);
    }).catch(() => { setError("Gabim gjatë ngarkimit"); setFetching(false); });
  }, [id]);

  const addItem    = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
  const removeItem = (i: number) => setItems(items.filter((_, idx) => idx !== i));
  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setItems((prev) =>
      prev.map((item, idx) => {
        if (idx !== i) return item;
        const updated = { ...item, [field]: value };
        if (field === "quantity") {
          const matchingService = services.find(
            (s) => s.name.toLowerCase() === updated.description.trim().toLowerCase()
          );
          if (matchingService) {
            updated.unitPrice = calculateServiceUnitPrice(matchingService, Number(value));
          }
        }
        return updated;
      })
    );
  };

  const subtotal = items.reduce((s, i) => s + i.quantity * i.unitPrice, 0);
  const tax      = subtotal * (taxRate / 100);
  const total    = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError("Zgjidh një klient"); return; }
    if (!title.trim()) { setError("Titulli është i detyrueshëm"); return; }
    if (items.some((i) => !i.description || i.quantity <= 0)) {
      setError("Plotëso të gjithë artikujt saktë"); return;
    }
    setSaving(true); setError("");
    const res = await fetch(`/api/offers/${id}`, {
      method:  "PUT",
      headers: { "Content-Type": "application/json" },
      body:    JSON.stringify({ clientId, title, issueDate, validUntil, taxRate, notes, status, items }),
    });
    if (res.ok) {
      router.push(`/offers/${id}`);
    } else {
      const d = await res.json();
      setError(d.error || "Gabim gjatë ruajtjes");
    }
    setSaving(false);
  };

  if (fetching) {
    return (
      <div className="p-8 flex items-center justify-center min-h-64">
        <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
      </div>
    );
  }

  const statusOptions = [
    { value: "draft",    label: "Draft" },
    { value: "sent",     label: "Dërguar" },
    { value: "accepted", label: "Pranuar" },
    { value: "rejected", label: "Refuzuar" },
    { value: "expired",  label: "Skaduar" },
  ];

  return (
    <div className="p-4 sm:p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex items-center gap-3">
        <Link href={`/offers/${id}`} className="p-2 rounded-xl text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-slate-900">Ndrysho Ofertën</h1>
          <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Edito të gjitha të dhënat e ofertës</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-sm">{error}</div>}

        {/* Details */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <h2 className="font-semibold text-slate-900 mb-4 text-sm sm:text-base">Detajet e Ofertës</h2>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Titulli *</label>
              <input type="text" value={title} onChange={(e) => setTitle(e.target.value)} required
                placeholder="p.sh. Ofertë Menaxhim Media Sociale"
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Statusi</label>
              <select value={status} onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                {statusOptions.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
              </select>
            </div>
            <div className="sm:col-span-2">
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Klienti *</label>
              <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              >
                <option value="">— Zgjidh klientin —</option>
                {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">TVSH (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value) || 0)}
                min={0} max={100}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Data e Lëshimit</label>
              <input type="date" value={issueDate} onChange={(e) => setIssueDate(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Vlefshme Deri *</label>
              <input type="date" value={validUntil} onChange={(e) => setValidUntil(e.target.value)} required
                className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h2 className="font-semibold text-slate-900 text-sm sm:text-base">Artikujt</h2>
              <p className="text-xs text-slate-500">Përditëso artikujt dhe çmimet</p>
            </div>
            <button type="button" onClick={addItem}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-amber-50 text-amber-700 hover:bg-amber-100 rounded-lg text-xs font-semibold transition-colors cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" /> Shto Rresht
            </button>
          </div>
          <div className="space-y-3">
            {/* Desktop Header */}
            <div className="hidden sm:grid grid-cols-12 gap-2 text-xs font-semibold text-slate-400 uppercase tracking-wider px-2">
              <div className="col-span-5">Përshkrimi</div>
              <div className="col-span-2">Sasia</div>
              <div className="col-span-2">Çmimi (€)</div>
              <div className="col-span-2 text-right">Totali</div>
              <div className="col-span-1" />
            </div>

            {items.map((item, i) => (
              <div key={i}>
                {/* Mobile View */}
                <div className="sm:hidden p-3.5 bg-slate-50/90 rounded-xl border border-slate-200/70 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-xs font-bold text-slate-500">Artikulli #{i + 1}</span>
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-slate-600 mb-1">Përshkrimi</label>
                    <ServiceAutocomplete
                      value={item.description}
                      onChange={(v) => updateItem(i, "description", v)}
                      onSelect={(name, price, svc) => {
                        setItems((prev) =>
                          prev.map((it, idx) => {
                            if (idx !== i) return it;
                            const matchingSvc = svc || services.find((s) => s.name.toLowerCase() === name.toLowerCase());
                            const unitPrice = matchingSvc ? calculateServiceUnitPrice(matchingSvc, it.quantity) : price;
                            return { ...it, description: name, unitPrice };
                          })
                        );
                      }}
                      services={services}
                      placeholder="Shërbimi / Produkti"
                      required
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Sasia</label>
                      <input type="number" min={0.01} step="0.01" value={item.quantity}
                        onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-slate-600 mb-1">Çmimi (€)</label>
                      <input type="number" min={0} step="0.01" value={item.unitPrice}
                        onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} required
                        className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between pt-1 border-t border-slate-200/60 text-xs">
                    <span className="text-slate-500">Nëntotali rreshtit:</span>
                    <span className="font-bold text-slate-900 text-sm">€{(item.quantity * item.unitPrice).toFixed(2)}</span>
                  </div>
                </div>

                {/* Desktop View */}
                <div className="hidden sm:grid grid-cols-12 gap-2 items-center bg-slate-50/80 rounded-xl p-2 border border-slate-200/60">
                  <div className="col-span-5">
                    <ServiceAutocomplete
                      value={item.description}
                      onChange={(v) => updateItem(i, "description", v)}
                      onSelect={(name, price, svc) => {
                        setItems((prev) =>
                          prev.map((it, idx) => {
                            if (idx !== i) return it;
                            const matchingSvc = svc || services.find((s) => s.name.toLowerCase() === name.toLowerCase());
                            const unitPrice = matchingSvc ? calculateServiceUnitPrice(matchingSvc, it.quantity) : price;
                            return { ...it, description: name, unitPrice };
                          })
                        );
                      }}
                      services={services}
                      placeholder="Shërbimi / Produkti"
                      required
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={0.01} step="0.01" value={item.quantity}
                      onChange={(e) => updateItem(i, "quantity", parseFloat(e.target.value) || 0)} required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="col-span-2">
                    <input type="number" min={0} step="0.01" value={item.unitPrice}
                      onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} required
                      className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-amber-500"
                    />
                  </div>
                  <div className="col-span-2 text-right text-sm font-semibold text-slate-700 pr-2">
                    €{(item.quantity * item.unitPrice).toFixed(2)}
                  </div>
                  <div className="col-span-1 flex justify-end">
                    {items.length > 1 && (
                      <button type="button" onClick={() => removeItem(i)}
                        className="p-1 text-slate-400 hover:text-red-500 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-full sm:w-64 space-y-2 text-sm bg-slate-50 sm:bg-transparent p-3 sm:p-0 rounded-xl">
              <div className="flex justify-between text-slate-600"><span>Nëntotali:</span><span className="font-semibold">€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>TVSH ({taxRate}%):</span><span className="font-semibold">€{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-2">
                <span>TOTALI:</span><span className="text-amber-700 font-extrabold">€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">Shënime</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)}
            placeholder="Kushtet e ofertës, termat e pagesës..."
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-amber-500/30 focus:border-amber-500 resize-none"
          />
        </div>

        <div className="flex flex-col sm:flex-row justify-end gap-2.5 sm:gap-3 pt-2">
          <Link href={`/offers/${id}`}
            className="flex-1 sm:flex-none text-center px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors"
          >
            Anulo
          </Link>
          <button type="submit" disabled={saving}
            className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-amber-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-amber-700 transition-colors disabled:opacity-60 shadow-sm shadow-amber-600/20 cursor-pointer"
          >
            <Save className="w-4 h-4" />
            {saving ? "Duke ruajtur..." : "Ruaj Ndryshimet"}
          </button>
        </div>
      </form>
    </div>
  );
}
