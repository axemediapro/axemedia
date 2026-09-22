"use client";

import { useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowLeft, Plus, Trash2, Save } from "lucide-react";
import Link from "next/link";
import { Suspense } from "react";
import ServiceAutocomplete from "@/components/ServiceAutocomplete";
import NewClientModal from "@/components/NewClientModal";

interface Client {
  id: number;
  name: string;
  email: string;
  taxId?: string;
  address?: string;
  city?: string;
}

interface Service {
  id: number;
  name: string;
  defaultPrice: number;
  unit?: string;
}

import { calculateServiceUnitPrice, ServiceTierConfig } from "@/lib/service-pricing";

interface LineItem {
  description: string;
  quantity: number;
  unitPrice: number;
}

function NewInvoiceForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const preselectedClient = searchParams.get("clientId");

  const [clients,  setClients]  = useState<Client[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [clientId, setClientId] = useState(preselectedClient || "");

  const handleClientCreated = (client: { id: number; name: string; email: string }) => {
    setClients((prev) => [client, ...prev]);
    setClientId(String(client.id));
  };
  const [taxRate, setTaxRate] = useState(18);
  const [notes, setNotes] = useState("");
  const [items, setItems] = useState<LineItem[]>([{ description: "", quantity: 1, unitPrice: 0 }]);

  useEffect(() => {
    fetch("/api/clients").then((r) => r.json()).then(setClients);
    fetch("/api/services").then((r) => r.json()).then((d) => setServices(Array.isArray(d) ? d : []));
  }, []);

  const addItem = () => setItems([...items, { description: "", quantity: 1, unitPrice: 0 }]);
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
  const tax = subtotal * (taxRate / 100);
  const total = subtotal + tax;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!clientId) { setError("Zgjidh një klient"); return; }
    if (items.some(i => !i.description || i.quantity <= 0)) {
      setError("Plotëso të gjithë artikujt saktë"); return;
    }
    setLoading(true);
    setError("");
    const res = await fetch("/api/invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ clientId, items, notes, taxRate }),
    });
    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.id}`);
    } else {
      const data = await res.json();
      setError(data.error || "Gabim gjatë krijimit");
    }
    setLoading(false);
  };

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      <div className="flex items-center gap-3">
        <Link href="/invoices" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
          <ArrowLeft className="w-5 h-5" />
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Faturë e Re</h1>
          <p className="text-slate-500 text-sm mt-0.5">Gjenero faturë automatikisht</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-lg px-4 py-3 text-sm">{error}</div>}

        {/* Client & Date */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="font-semibold text-slate-900 mb-4">Detajet e Faturës</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className="block text-sm font-medium text-slate-700 mb-1.5">Klienti *</label>
              <div className="flex gap-2">
                <select value={clientId} onChange={(e) => setClientId(e.target.value)} required
                  className="flex-1 px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 bg-white"
                >
                  <option value="">— Zgjidh klientin —</option>
                  {clients.map((c) => <option key={c.id} value={c.id}>{c.name} ({c.email})</option>)}
                </select>
                <NewClientModal onCreated={handleClientCreated} />
              </div>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1.5">TVSH (%)</label>
              <input type="number" value={taxRate} onChange={(e) => setTaxRate(parseFloat(e.target.value))} min={0} max={100}
                className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            </div>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-slate-900">Artikujt</h2>
            <button type="button" onClick={addItem} className="flex items-center gap-1.5 text-sm text-indigo-600 hover:text-indigo-700 font-medium">
              <Plus className="w-4 h-4" /> Shto Rresht
            </button>
          </div>

          <div className="space-y-3">
            <div className="grid grid-cols-12 gap-2 text-xs font-semibold text-slate-500 uppercase px-2">
              <div className="col-span-5">Përshkrimi</div>
              <div className="col-span-2">Sasia</div>
              <div className="col-span-2">Çmimi (€)</div>
              <div className="col-span-2 text-right">Total</div>
              <div className="col-span-1" />
            </div>
            {items.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-center bg-slate-50 rounded-lg p-2">
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
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2">
                  <input type="number" min={0} step="0.01" value={item.unitPrice}
                    onChange={(e) => updateItem(i, "unitPrice", parseFloat(e.target.value) || 0)} required
                    className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
                  />
                </div>
                <div className="col-span-2 text-right text-sm font-semibold text-slate-700 pr-2">
                  €{(item.quantity * item.unitPrice).toFixed(2)}
                </div>
                <div className="col-span-1 flex justify-end">
                  {items.length > 1 && (
                    <button type="button" onClick={() => removeItem(i)} className="p-1 text-slate-400 hover:text-red-500 transition-colors">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Totals */}
          <div className="mt-5 pt-4 border-t border-slate-100 flex justify-end">
            <div className="w-64 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Nëntotali:</span><span>€{subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>TVSH ({taxRate}%):</span><span>€{tax.toFixed(2)}</span></div>
              <div className="flex justify-between font-bold text-slate-900 text-base border-t border-slate-200 pt-2 mt-2">
                <span>TOTALI:</span><span className="text-indigo-700">€{total.toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Notes */}
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <label className="block text-sm font-medium text-slate-700 mb-1.5">Shënime</label>
          <textarea rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Shënime apo kushte pagese..."
            className="w-full px-3.5 py-2.5 border border-slate-200 rounded-lg text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
          />
        </div>

        <div className="flex justify-end gap-3">
          <Link href="/invoices" className="px-4 py-2 border border-slate-200 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-50 transition-colors">Anulo</Link>
          <button type="submit" disabled={loading} className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors disabled:opacity-60 shadow-sm">
            <Save className="w-4 h-4" />{loading ? "Duke krijuar..." : "Krijo Faturën"}
          </button>
        </div>
      </form>
    </div>
  );
}

export default function NewInvoicePage() {
  return (
    <Suspense>
      <NewInvoiceForm />
    </Suspense>
  );
}
