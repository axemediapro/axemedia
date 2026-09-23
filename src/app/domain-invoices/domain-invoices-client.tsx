"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Check, CloudUpload, Copy, FileDown, Image as ImageIcon, Plus, ReceiptText, Save, Sparkles, Trash2, X } from "lucide-react";
import { format } from "date-fns";
import { enUS } from "date-fns/locale";

type Reminder = {
  id: number;
  domain: string;
  provider?: string | null;
  billingCycle: string;
  amount: number;
  currency: string;
  nextDueDate: string;
};

type Settings = {
  name: string;
  address: string;
  email: string;
  phone: string;
  website: string;
  taxId: string;
  domainInvoiceLogoUrl: string;
  domainInvoiceBackgroundUrl: string;
};

type SavedInvoice = {
  id: number;
  invoiceNumber: string;
  issueDate: string;
  status: string;
  customer: string;
  customerEmail: string;
  providerName: string;
  serviceType: string;
  domainName: string;
  service: string;
  period: string;
  quantity: number;
  amount: number;
  taxRate: number;
  currency: string;
  notes: string;
  mainColor: string;
  businessName: string;
  businessAddress: string;
  businessEmail: string;
  businessPhone: string;
  createdAt: string;
  updatedAt: string;
};

const emptyForm = {
  reminderId: "",
  customer: "",
  customerEmail: "",
  invoiceNumber: `HOST-${new Date().getFullYear()}-001`,
  issueDate: new Date().toISOString().split("T")[0],
  status: "unpaid",
  providerName: "",
  serviceType: "hosting",
  domainName: "",
  service: "Managed hosting",
  period: "12 months",
  quantity: "1",
  amount: "",
  currency: "EUR",
  taxRate: "0",
  notes: "Thank you for your business.",
  mainColor: "#06B6D4",
  businessName: "AXEmedia",
  businessAddress: "Tiranë, Shqipëri",
  businessEmail: "info@axemedia.al",
  businessPhone: "+355 69 000 0000",
};

const emptyDomain = {
  domain: "",
  provider: "",
  billingCycle: "yearly",
  amount: "",
  currency: "EUR",
  nextDueDate: new Date().toISOString().split("T")[0],
};

export default function DomainInvoicesClient({ initialReminders, initialInvoices, initialSettings }: { initialReminders: Reminder[]; initialInvoices: SavedInvoice[]; initialSettings: Settings }) {
  const [reminders, setReminders] = useState(initialReminders);
  const [settings, setSettings] = useState(initialSettings);
  const [logoLibrary, setLogoLibrary] = useState<string[]>([]);
  const [form, setForm] = useState({
    ...emptyForm,
    businessName: initialSettings.name || emptyForm.businessName,
    businessAddress: initialSettings.address || emptyForm.businessAddress,
    businessEmail: initialSettings.email || emptyForm.businessEmail,
    businessPhone: initialSettings.phone || emptyForm.businessPhone,
  });
  const [savedInvoices, setSavedInvoices] = useState(initialInvoices);
  const [savedInvoiceId, setSavedInvoiceId] = useState<number | null>(null);
  const [showHistory, setShowHistory] = useState(false);
  const [savingInvoice, setSavingInvoice] = useState(false);
  const [newDomain, setNewDomain] = useState(emptyDomain);
  const [showNewDomain, setShowNewDomain] = useState(false);
  const [savingDomain, setSavingDomain] = useState(false);
  const [uploading, setUploading] = useState<"logo" | "background" | null>(null);
  const logoRef = useRef<HTMLInputElement>(null);
  const backgroundRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/settings/domain-branding")
      .then((response) => response.json())
      .then((data) => setLogoLibrary(Array.isArray(data.logos) ? data.logos : []))
      .catch(() => setLogoLibrary([]));
  }, []);

  const selectedReminder = useMemo(
    () => reminders.find((item) => String(item.id) === form.reminderId),
    [reminders, form.reminderId]
  );

  const updateForm = (key: keyof typeof emptyForm, value: string) => setForm((current) => ({ ...current, [key]: value }));

  const saveInvoice = async () => {
    setSavingInvoice(true);
    const response = await fetch(savedInvoiceId ? `/api/domain-invoices/${savedInvoiceId}` : "/api/domain-invoices", {
      method: savedInvoiceId ? "PUT" : "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    const result = await response.json();
    if (response.ok) {
      const saved = { ...result, issueDate: new Date(result.issueDate).toISOString(), createdAt: new Date(result.createdAt).toISOString(), updatedAt: new Date(result.updatedAt).toISOString() } as SavedInvoice;
      setSavedInvoiceId(saved.id);
      setSavedInvoices((current) => [saved, ...current.filter((item) => item.id !== saved.id)]);
    } else {
      window.alert(result.error || "Could not save the invoice");
    }
    setSavingInvoice(false);
  };

  const duplicateInvoice = async () => {
    if (!savedInvoiceId) return;
    setSavingInvoice(true);
    const baseNumber = form.invoiceNumber || "INVOICE";
    const existingNumbers = new Set(savedInvoices.map((invoice) => invoice.invoiceNumber));
    let copyNumber = `${baseNumber}-COPY`;
    let copyIndex = 2;
    while (existingNumbers.has(copyNumber)) {
      copyNumber = `${baseNumber}-COPY-${copyIndex}`;
      copyIndex += 1;
    }

    const response = await fetch("/api/domain-invoices", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ ...form, invoiceNumber: copyNumber }),
    });
    const result = await response.json();
    if (response.ok) {
      const duplicate = { ...result, issueDate: new Date(result.issueDate).toISOString(), createdAt: new Date(result.createdAt).toISOString(), updatedAt: new Date(result.updatedAt).toISOString() } as SavedInvoice;
      setSavedInvoiceId(duplicate.id);
      setForm((current) => ({ ...current, invoiceNumber: duplicate.invoiceNumber }));
      setSavedInvoices((current) => [duplicate, ...current]);
    } else {
      window.alert(result.error || "Could not duplicate the invoice");
    }
    setSavingInvoice(false);
  };

  const loadInvoice = (invoice: SavedInvoice) => {
    setSavedInvoiceId(invoice.id);
    setForm({ ...emptyForm, ...invoice, status: invoice.status ?? "unpaid", quantity: String(invoice.quantity ?? 1), amount: String(invoice.amount), taxRate: String(invoice.taxRate ?? 0), issueDate: invoice.issueDate.split("T")[0] });
    setShowHistory(false);
  };

  const chooseReminder = (value: string) => {
    const reminder = reminders.find((item) => String(item.id) === value);
    setForm((current) => ({
      ...current,
      reminderId: value,
      providerName: reminder?.provider || current.providerName,
      domainName: reminder?.domain || current.domainName,
      amount: reminder ? String(reminder.amount) : current.amount,
      currency: reminder?.currency || current.currency,
      period: reminder?.billingCycle === "monthly" ? "1 month" : "12 months",
      service: reminder?.provider ? `${reminder.domain} · ${reminder.provider}` : reminder ? reminder.domain : current.service,
    }));
  };

  const addDomain = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!newDomain.domain.trim() || !newDomain.nextDueDate) return;
    setSavingDomain(true);
    const response = await fetch("/api/domains", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...newDomain,
        domain: newDomain.domain.trim(),
        amount: Number(newDomain.amount) || 0,
        remindDaysBefore: 7,
        autoRenew: true,
        status: "active",
      }),
    });
    const result = await response.json();
    if (response.ok) {
      const created: Reminder = { ...result, nextDueDate: new Date(result.nextDueDate).toISOString() };
      setReminders((current) => [...current, created]);
      setForm((current) => ({
        ...current,
        reminderId: String(created.id),
        providerName: created.provider || current.providerName,
        domainName: created.domain,
        amount: String(created.amount),
        currency: created.currency,
        period: created.billingCycle === "monthly" ? "1 month" : "12 months",
        service: created.provider ? `${created.domain} · ${created.provider}` : created.domain,
      }));
      setNewDomain(emptyDomain);
      setShowNewDomain(false);
    } else {
      window.alert(result.error || "Could not add the domain");
    }
    setSavingDomain(false);
  };

  const uploadBranding = async (file: File, type: "logo" | "background") => {
    setUploading(type);
    const data = new FormData();
    data.append("type", type);
    data.append("file", file);
    const response = await fetch("/api/settings/domain-branding", { method: "POST", body: data });
    const result = await response.json();
    if (response.ok) {
      if (type === "logo") setLogoLibrary((current) => [result.url, ...current.filter((url) => url !== result.url)]);
      setSettings((current) => ({ ...current, ...(type === "logo" ? { domainInvoiceLogoUrl: result.url } : { domainInvoiceBackgroundUrl: result.url }) }));
    } else {
      window.alert(result.error || "Upload failed");
    }
    setUploading(null);
  };

  const selectLogo = async (url: string) => {
    setSettings((current) => ({ ...current, domainInvoiceLogoUrl: url }));
    const response = await fetch("/api/settings/domain-branding", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url }),
    });
    if (!response.ok) window.alert("Could not select logo");
  };

  const printInvoice = () => {
    const previousTitle = document.title;
    document.title = `${form.invoiceNumber || "invoice"}.pdf`;
    window.print();
    window.setTimeout(() => { document.title = previousTitle; }, 1000);
  };
  const mainColor = /^#[0-9A-Fa-f]{6}$/.test(form.mainColor) ? form.mainColor : "#06B6D4";
  const quantity = Math.max(0, Number(form.quantity) || 0);
  const unitPrice = Math.max(0, Number(form.amount) || 0);
  const taxRate = Math.max(0, Number(form.taxRate) || 0);
  const subtotal = quantity * unitPrice;
  const taxAmount = subtotal * taxRate / 100;
  const total = subtotal + taxAmount;
  const invoiceStyle = { "--invoice-accent": mainColor } as React.CSSProperties;

  return (
    <div className="domain-invoice-shell min-h-full bg-[#eef4f7] p-3 sm:p-5 lg:p-8">
      <div className="mx-auto max-w-[1500px] space-y-5 sm:space-y-6">
        <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <div className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-[0.22em]" style={{ color: mainColor }}><ReceiptText className="h-4 w-4" /> Billing studio</div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-950">Domain & Hosting Invoice</h1>
            <p className="mt-1 text-xs sm:text-sm text-slate-500">Create a dedicated invoice for domains, hosting and web infrastructure.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button onClick={() => void saveInvoice()} disabled={savingInvoice} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-emerald-600 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-lg transition hover:bg-emerald-700 disabled:opacity-60 cursor-pointer">
              <Save className="h-4 w-4" /> {savingInvoice ? "Saving..." : savedInvoiceId ? "Update invoice" : "Save invoice"}
            </button>
            {savedInvoiceId && (
              <button onClick={() => void duplicateInvoice()} disabled={savingInvoice} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-3.5 sm:px-4 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-slate-700 shadow-sm transition hover:border-cyan-400 hover:text-cyan-700 disabled:opacity-60 cursor-pointer">
                <Copy className="h-4 w-4" /> Duplicate
              </button>
            )}
            <button onClick={printInvoice} className="flex-1 sm:flex-none flex items-center justify-center gap-2 rounded-xl bg-slate-950 px-4 sm:px-5 py-2.5 sm:py-3 text-xs sm:text-sm font-bold text-white shadow-lg shadow-slate-900/15 transition hover:bg-cyan-800 cursor-pointer">
              <FileDown className="h-4 w-4" /> Save as PDF
            </button>
          </div>
        </header>

        <div className="grid gap-6 xl:grid-cols-[390px_minmax(0,1fr)]">
          <aside className="space-y-5 print:hidden">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><Sparkles className="h-4 w-4 text-cyan-600" /><h2 className="font-bold text-slate-900">Invoice details</h2></div>
              <div className="space-y-3">
                <div className="flex items-end gap-2"><label className="block min-w-0 flex-1 text-xs font-bold uppercase tracking-wide text-slate-500">Saved domains</label><button type="button" onClick={() => setShowNewDomain((current) => !current)} className="flex items-center gap-1 rounded-lg bg-cyan-50 px-2.5 py-1.5 text-xs font-bold text-cyan-700 hover:bg-cyan-100 cursor-pointer"><Plus className="h-3.5 w-3.5" /> Add new</button></div>
                <select value={form.reminderId ?? ""} onChange={(event) => chooseReminder(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100">
                  <option value="">Select a saved domain</option>
                  {reminders.map((item) => <option key={item.id} value={item.id}>{item.domain} · {item.amount.toFixed(2)} {item.currency}</option>)}
                </select>
                {showNewDomain && <form onSubmit={addDomain} className="space-y-3 rounded-xl border border-cyan-100 bg-cyan-50/60 p-3"><div className="flex items-center justify-between"><p className="text-xs font-bold text-cyan-900">Add a new domain</p><button type="button" onClick={() => setShowNewDomain(false)} className="text-cyan-700"><X className="h-4 w-4" /></button></div><Field label="Domain name" value={newDomain.domain} onChange={(value) => setNewDomain((current) => ({ ...current, domain: value }))} placeholder="example.com" /><div className="grid grid-cols-2 gap-2"><Field label="Provider" value={newDomain.provider} onChange={(value) => setNewDomain((current) => ({ ...current, provider: value }))} placeholder="Cloudflare" /><Field label="Amount" value={newDomain.amount} onChange={(value) => setNewDomain((current) => ({ ...current, amount: value }))} type="number" /></div><div className="grid grid-cols-2 gap-2"><Field label="Renewal date" value={newDomain.nextDueDate} onChange={(value) => setNewDomain((current) => ({ ...current, nextDueDate: value }))} type="date" /><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Billing cycle</span><select value={newDomain.billingCycle} onChange={(event) => setNewDomain((current) => ({ ...current, billingCycle: event.target.value }))} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="yearly">Yearly</option><option value="monthly">Monthly</option></select></label></div><button type="submit" disabled={savingDomain} className="w-full rounded-lg bg-cyan-700 px-3 py-2 text-xs font-bold text-white hover:bg-cyan-800 disabled:opacity-60">{savingDomain ? "Adding..." : "Add domain"}</button></form>}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3"><label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Service type</span><select value={form.serviceType ?? "hosting"} onChange={(event) => { const serviceType = event.target.value; setForm((current) => ({ ...current, serviceType, service: serviceType === "domain" ? "Domain renewal" : serviceType === "all" ? "Domain & hosting renewal" : "Managed hosting" })); }} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="domain">Domain</option><option value="hosting">Hosting</option><option value="all">All (Domain & Hosting)</option></select></label><Field label="Domain / service name" value={form.domainName} onChange={(value) => updateForm("domainName", value)} placeholder="example.com" /></div>
                <Field label="Provider name" value={form.providerName} onChange={(value) => updateForm("providerName", value)} placeholder="Your provider name" />
                <Field label="Customer" value={form.customer} onChange={(value) => updateForm("customer", value)} placeholder="Customer name" />
                <Field label="Customer email" value={form.customerEmail} onChange={(value) => updateForm("customerEmail", value)} placeholder="client@email.com" type="email" />
                <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Payment status</span><select value={form.status ?? "unpaid"} onChange={(event) => updateForm("status", event.target.value)} className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm"><option value="unpaid">Unpaid</option><option value="paid">Paid</option></select></label>
                <div className="grid grid-cols-2 gap-3"><Field label="Invoice number" value={form.invoiceNumber} onChange={(value) => updateForm("invoiceNumber", value)} /><Field label="Date" value={form.issueDate} onChange={(value) => updateForm("issueDate", value)} type="date" /></div>
                <Field label="Description" value={form.service} onChange={(value) => updateForm("service", value)} placeholder="Managed hosting" />
                <div className="grid grid-cols-3 gap-2 sm:gap-3"><Field label="Period" value={form.period} onChange={(value) => updateForm("period", value)} /><Field label="Quantity" value={form.quantity} onChange={(value) => updateForm("quantity", value)} type="number" /><Field label="Unit price" value={form.amount} onChange={(value) => updateForm("amount", value)} type="number" /></div>
                <Field label="Tax (%)" value={form.taxRate} onChange={(value) => updateForm("taxRate", value)} type="number" />
                <Field label="Note" value={form.notes} onChange={(value) => updateForm("notes", value)} />
                <div className="border-t border-slate-100 pt-3"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Business Information</p><div className="space-y-2"><Field label="Business name" value={form.businessName} onChange={(value) => updateForm("businessName", value)} /><Field label="Business address" value={form.businessAddress} onChange={(value) => updateForm("businessAddress", value)} /><Field label="Business email" value={form.businessEmail} onChange={(value) => updateForm("businessEmail", value)} type="email" /><Field label="Business phone" value={form.businessPhone} onChange={(value) => updateForm("businessPhone", value)} /></div></div>
                <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">Main color (HEX)</span><div className="flex gap-2"><input type="color" value={mainColor} onChange={(event) => updateForm("mainColor", event.target.value.toUpperCase())} className="h-11 w-12 cursor-pointer rounded-xl border border-slate-200 bg-white p-1" /><input type="text" value={form.mainColor ?? ""} onChange={(event) => updateForm("mainColor", event.target.value.toUpperCase())} placeholder="#06B6D4" maxLength={7} className="min-w-0 flex-1 rounded-xl border border-slate-200 px-3 py-2.5 font-mono text-sm uppercase outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></div></label>
              </div>
            </section>

            <button type="button" onClick={() => setShowHistory(true)} className="flex w-full items-center justify-between rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 text-left shadow-sm transition hover:border-cyan-300 hover:shadow-md cursor-pointer">
              <span><span className="block font-bold text-slate-900">Billing history</span><span className="mt-1 block text-xs sm:text-sm text-slate-500">Open and edit all saved invoices</span></span>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-600">{savedInvoices.length}</span>
            </button>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 sm:p-5 shadow-sm">
              <div className="mb-4 flex items-center gap-2"><ImageIcon className="h-4 w-4 text-cyan-600" /><h2 className="font-bold text-slate-900">Visual identity</h2></div>
              <BrandingUpload label="Invoice logo" url={settings.domainInvoiceLogoUrl} busy={uploading === "logo"} inputRef={logoRef} onPick={(file) => void uploadBranding(file, "logo")} onClear={() => setSettings((current) => ({ ...current, domainInvoiceLogoUrl: "" }))} />
              {logoLibrary.length > 0 && <div className="mt-4"><p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">Logo library</p><div className="grid grid-cols-4 gap-2">{logoLibrary.map((url) => <button key={url} type="button" onClick={() => void selectLogo(url)} className={`flex h-14 items-center justify-center overflow-hidden rounded-lg border bg-slate-50 p-1 transition ${settings.domainInvoiceLogoUrl === url ? "border-cyan-500 ring-2 ring-cyan-100" : "border-slate-200 hover:border-cyan-300"}`} title="Use logo"><img src={url} alt="Saved logo" className="max-h-full max-w-full object-contain" /></button>)}</div></div>}
              <BrandingUpload label="Invoice background" url={settings.domainInvoiceBackgroundUrl} busy={uploading === "background"} inputRef={backgroundRef} onPick={(file) => void uploadBranding(file, "background")} onClear={() => setSettings((current) => ({ ...current, domainInvoiceBackgroundUrl: "" }))} />
              <p className="mt-3 text-xs leading-5 text-slate-400">PNG, JPG, WEBP or SVG · up to 8MB. The background is used as a subtle decorative image.</p>
            </section>
          </aside>

          <main className="min-w-0">
            <div className="domain-invoice-document overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-xl print:rounded-none print:border-0 print:shadow-none">
              <article className="relative min-h-[920px] overflow-hidden p-5 sm:p-8 md:p-12 print:min-h-0" style={{ ...invoiceStyle, ...(settings.domainInvoiceBackgroundUrl ? { backgroundImage: `linear-gradient(rgba(255,255,255,.93),rgba(255,255,255,.93)), url(${settings.domainInvoiceBackgroundUrl})`, backgroundSize: "cover", backgroundPosition: "center" } : {}) }}>
                <div className="absolute right-0 top-0 h-3 w-2/5" style={{ backgroundColor: mainColor }} /><div className="absolute right-0 top-3 h-1 w-1/4 bg-slate-950" />
                <div className="relative">
                  <div className="flex flex-col justify-between gap-6 sm:gap-8 sm:flex-row"><div><EditableText value={form.providerName || "Service provider"} onChange={(value) => updateForm("providerName", value)} className="text-xs font-black uppercase tracking-[0.24em]" style={{ color: mainColor }} /><h2 className="mt-3 text-3xl sm:text-4xl font-black leading-[0.85] tracking-tight text-slate-950"><EditableText value={form.serviceType === "domain" ? "DOMAIN" : form.serviceType === "all" ? "DOMAIN & HOSTING" : "HOSTING"} onChange={(value) => updateForm("serviceType", value.toLowerCase().includes("domain") && value.toLowerCase().includes("hosting") ? "all" : value.toLowerCase() === "domain" ? "domain" : "hosting")} /><br /><EditableText value="RENEWAL" onChange={() => undefined} className="mt-0" style={{ color: mainColor }} /></h2></div>{settings.domainInvoiceLogoUrl ? <img src={settings.domainInvoiceLogoUrl} alt="Logo" className="h-16 sm:h-20 max-w-[180px] sm:max-w-[220px] object-contain object-left sm:object-right" /> : <div className="flex h-16 sm:h-20 w-32 sm:w-40 items-center justify-center border border-dashed border-slate-300 text-xs font-bold uppercase tracking-widest text-slate-300">Logo</div>}</div>
                  <div className="mt-8 sm:mt-12 grid gap-3 sm:grid-cols-3"><Info label="Invoice number" value={form.invoiceNumber} /><Info label="Issue date" value={format(new Date(form.issueDate), "dd MMM yyyy", { locale: enUS })} /><Info label="Status" value={(form.status ?? "unpaid") === "paid" ? "PAID" : "UNPAID"} accentColor={(form.status ?? "unpaid") === "paid" ? "#16A34A" : "#DC2626"} /></div>
                  <div className="mt-8 sm:mt-12 grid gap-6 sm:gap-8 border-y border-slate-200 py-5 sm:py-7 sm:grid-cols-2"><div><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Billed to</p><EditableText value={form.customer || "Customer name"} onChange={(value) => updateForm("customer", value)} className="mt-2 text-base sm:text-lg font-black text-slate-950" /><EditableText value={form.customerEmail || "email@customer.com"} onChange={(value) => updateForm("customerEmail", value)} className="mt-1 text-xs sm:text-sm text-slate-500" /></div><div className="sm:text-right"><p className="text-[11px] font-bold uppercase tracking-[0.18em] text-slate-400">Service details</p><EditableText value={form.domainName || form.service || "Domain or hosting service"} onChange={(value) => updateForm("domainName", value)} className="mt-2 sm:ml-auto text-base sm:text-lg font-black text-slate-950" /><div className="mt-1 flex sm:justify-end text-xs sm:text-sm text-slate-500"><span>Period:&nbsp;</span><EditableText value={form.period || "12 months"} onChange={(value) => updateForm("period", value)} />{selectedReminder?.nextDueDate && <span>&nbsp;· renewal {format(new Date(selectedReminder.nextDueDate), "dd MMM yyyy", { locale: enUS })}</span>}</div></div></div>
                  <div className="mt-8 sm:mt-10 overflow-x-auto"><div className="min-w-[400px]"><div className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_110px_150px] gap-4 sm:gap-7 border-b border-slate-950 pb-3 text-[11px] font-black uppercase tracking-[0.16em] text-slate-500"><span>Description</span><span className="text-center">Quantity</span><span className="text-right">Amount</span></div><div className="grid grid-cols-[1fr_80px_120px] sm:grid-cols-[1fr_110px_150px] items-center gap-4 sm:gap-7 border-b border-slate-200 py-4 sm:py-6"><div><p className="font-bold text-slate-950 text-sm sm:text-base">{form.service || (form.serviceType === "domain" ? "Domain renewal" : form.serviceType === "all" ? "Domain & hosting renewal" : "Managed hosting")}</p><p className="mt-1 text-xs sm:text-sm text-slate-500">{form.domainName || "Domain or service name"} · {form.period || "12 months"}</p></div><p className="text-center font-bold text-slate-950 text-sm">{quantity}</p><p className="text-right font-black text-slate-950 text-sm sm:text-base">{subtotal.toFixed(2)} {form.currency}</p></div></div></div>
                  <div className="ml-auto mt-6 sm:mt-8 max-w-sm space-y-2 sm:space-y-3"><div className="flex justify-between text-xs sm:text-sm text-slate-500"><span>Subtotal</span><span>{subtotal.toFixed(2)} {form.currency}</span></div><div className="flex justify-between text-xs sm:text-sm text-slate-500"><span>Tax ({taxRate}%)</span><span>{taxAmount.toFixed(2)} {form.currency}</span></div><div className="flex justify-between border-t border-slate-950 pt-3 sm:pt-4 text-lg sm:text-xl font-black text-slate-950"><span>Total due</span><span style={{ color: mainColor }}>{total.toFixed(2)} {form.currency}</span></div></div>
                  <div className="mt-12 sm:mt-20 grid gap-6 sm:gap-8 border-t border-slate-200 pt-6 text-xs text-slate-500 sm:grid-cols-2"><div><EditableText value="Business Information" onChange={() => undefined} className="font-black uppercase tracking-widest text-slate-950" /><EditableText value={form.businessName || "Business name"} onChange={(value) => updateForm("businessName", value)} className="mt-2" /><EditableText value={form.businessAddress || "Business address"} onChange={(value) => updateForm("businessAddress", value)} /><EditableText value={form.businessEmail || "business@email.com"} onChange={(value) => updateForm("businessEmail", value)} /><EditableText value={form.businessPhone || "Business phone"} onChange={(value) => updateForm("businessPhone", value)} /></div><div className="sm:text-right"><EditableText value="Note" onChange={() => undefined} className="sm:ml-auto font-black uppercase tracking-widest text-slate-950" /><EditableText value={form.notes || "-"} onChange={(value) => updateForm("notes", value)} className="mt-2 sm:ml-auto leading-5" /></div></div>
                </div>
              </article>
            </div>
          </main>
        </div>
      </div>

      {showHistory && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4 print:hidden" role="dialog" aria-modal="true" aria-labelledby="billing-history-title" onMouseDown={(event) => { if (event.target === event.currentTarget) setShowHistory(false); }}>
          <div className="flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-5"><div><h2 id="billing-history-title" className="text-xl font-black text-slate-950">Billing history</h2><p className="mt-1 text-sm text-slate-500">{savedInvoices.length} saved invoice{savedInvoices.length === 1 ? "" : "s"}. Select one to edit it.</p></div><button type="button" onClick={() => setShowHistory(false)} className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700" title="Close billing history"><X className="h-5 w-5" /></button></div>
            <div className="overflow-y-auto p-6">{savedInvoices.length === 0 ? <div className="rounded-xl border border-dashed border-slate-300 px-6 py-16 text-center text-sm text-slate-500">No saved invoices yet.</div> : <div className="grid gap-3 sm:grid-cols-2">{savedInvoices.map((invoice) => <button key={invoice.id} type="button" onClick={() => loadInvoice(invoice)} className={`flex min-h-28 items-center justify-between rounded-xl border p-4 text-left transition ${savedInvoiceId === invoice.id ? "border-cyan-400 bg-cyan-50" : "border-slate-200 hover:border-cyan-300 hover:bg-slate-50"}`}><span><span className="block text-base font-black text-slate-950">{invoice.invoiceNumber}</span><span className="mt-1 block text-sm font-semibold text-slate-700">{invoice.domainName || invoice.service || "Invoice"}</span><span className="mt-2 block text-xs text-slate-500">{invoice.providerName || "Service provider"} · {invoice.customer || "Customer"}</span></span><span className="text-right text-xs text-slate-500"><span className="block">Updated {format(new Date(invoice.updatedAt), "dd MMM yyyy", { locale: enUS })}</span><span className="mt-2 block text-sm font-black text-slate-950">{invoice.amount.toFixed(2)} {invoice.currency}</span></span></button>)}</div>}</div>
          </div>
        </div>
      )}
    </div>
  );
}

function Field({ label, value, onChange, placeholder, type = "text" }: { label: string; value: string; onChange: (value: string) => void; placeholder?: string; type?: string }) {
  return <label className="block"><span className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">{label}</span><input type={type} value={value ?? ""} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100" /></label>;
}

function EditableText({ value, onChange, className = "", style }: { value: string; onChange: (value: string) => void; className?: string; style?: React.CSSProperties }) {
  return <span contentEditable suppressContentEditableWarning onBlur={(event) => onChange(event.currentTarget.textContent || "")} className={`block w-fit min-w-[1em] cursor-text rounded-sm outline-none hover:bg-cyan-50 focus:bg-cyan-50 focus:ring-1 focus:ring-cyan-300 ${className}`} style={style}>{value}</span>;
}

function Info({ label, value, accentColor }: { label: string; value: string; accentColor?: string }) {
  return <div className="rounded-xl bg-slate-50 p-4"><p className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{label}</p><p className="mt-2 text-sm font-black" style={accentColor ? { color: accentColor } : undefined}>{value}</p></div>;
}

function BrandingUpload({ label, url, busy, inputRef, onPick, onClear }: { label: string; url: string; busy: boolean; inputRef: React.RefObject<HTMLInputElement | null>; onPick: (file: File) => void; onClear: () => void }) {
  return <div className="mb-4"><p className="mb-2 text-xs font-bold text-slate-600">{label}</p><div className="flex items-center gap-3"><div className="flex h-16 w-20 items-center justify-center overflow-hidden rounded-lg border border-slate-200 bg-slate-50">{url ? <img src={url} alt={label} className="h-full w-full object-contain" /> : <ImageIcon className="h-5 w-5 text-slate-300" />}</div><div className="flex gap-2"><input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(event) => { const file = event.target.files?.[0]; if (file) onPick(file); }} /><button type="button" onClick={() => inputRef.current?.click()} disabled={busy} className="flex items-center gap-1.5 rounded-lg bg-cyan-50 px-3 py-2 text-xs font-bold text-cyan-700 hover:bg-cyan-100 disabled:opacity-60"><CloudUpload className="h-3.5 w-3.5" />{busy ? "Uploading..." : "Upload"}</button>{url && <button type="button" onClick={onClear} className="rounded-lg p-2 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Remove"><Trash2 className="h-4 w-4" /></button>}</div></div></div>;
}
