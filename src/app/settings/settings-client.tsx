"use client";

import { useRef, useState } from "react";
import { Save, Upload, X, Building2, CheckCircle } from "lucide-react";
import Image from "next/image";

interface Settings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  website: string;
  bankAccount: string;
  swiftCode: string;
  logoUrl: string;
  stampUrl: string;
  stampSize: number;
  stampPosX: number;
  stampPosY: number;
  stampRotate: number;
  signatureUrl: string;
  invoiceFooter: string;
  offerFooter: string;
  logoSize: number;
  primaryColor: string;
  fontFamily: string;
}

const FONT_OPTIONS = [
  { value: "helvetica", label: "Helvetica", subtitle: "Modern, i pastër", css: "Arial, Helvetica, sans-serif" },
  { value: "times", label: "Times", subtitle: "Elegant, me serifë", css: "'Times New Roman', Times, serif" },
  { value: "courier", label: "Courier", subtitle: "Teknik, çerdhor", css: "'Courier New', Courier, monospace" },
] as const;

export default function SettingsClient({ initialSettings }: { initialSettings: Settings }) {
  const [form, setForm] = useState<Settings>({
    ...initialSettings,
    stampSize: initialSettings.stampSize ?? 55,
    stampPosX: initialSettings.stampPosX ?? 0,
    stampPosY: initialSettings.stampPosY ?? 0,
    stampRotate: initialSettings.stampRotate ?? 0,
  });
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const [uploadingStamp, setUploadingStamp] = useState(false);
  const [uploadingSignature, setUploadingSignature] = useState(false);
  const logoRef = useRef<HTMLInputElement>(null);
  const stampRef = useRef<HTMLInputElement>(null);
  const signatureRef = useRef<HTMLInputElement>(null);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setError("");
    setSaved(false);
    const res = await fetch("/api/settings", {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    });
    if (res.ok) {
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } else {
      const d = await res.json();
      setError(d.error || "Gabim gjatë ruajtjes");
    }
    setSaving(false);
  };

  const handleUpload = async (file: File, type: "logo" | "stamp" | "signature") => {
    if (!file) return;
    const setBusy = type === "logo" ? setUploading : type === "stamp" ? setUploadingStamp : setUploadingSignature;
    setBusy(true);
    setError("");
    const fd = new FormData();
    fd.append(type, file);
    const res = await fetch(`/api/settings/${type}`, { method: "POST", body: fd });
    if (res.ok) {
      const d = await res.json();
      setForm((prev) => ({
        ...prev,
        [type === "logo" ? "logoUrl" : type === "stamp" ? "stampUrl" : "signatureUrl"]: d.url,
      }));
    } else {
      const d = await res.json();
      setError(d.error || "Gabim gjatë ngarkimit");
    }
    setBusy(false);
  };

  const field = (key: keyof Settings, label: string, placeholder = "", type = "text", rows?: number) => (
    <div>
      <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-1.5">{label}</label>
      {rows ? (
        <textarea
          rows={rows}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500 resize-none"
        />
      ) : (
        <input
          type={type}
          value={form[key] as string}
          onChange={(e) => setForm({ ...form, [key]: e.target.value })}
          placeholder={placeholder}
          className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/30 focus:border-indigo-500"
        />
      )}
    </div>
  );

  return (
    <div className="p-4 sm:p-6 lg:p-8 max-w-3xl space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-bold text-slate-900 tracking-tight">Cilësimet e Kompanisë</h1>
        <p className="text-slate-500 text-xs sm:text-sm mt-0.5">Këto të dhëna shfaqen automatikisht në faturat dhe ofertat e gjeneruara</p>
      </div>

      <form onSubmit={handleSave} className="space-y-5">
        {error && <div className="bg-red-50 border border-red-200 text-red-700 rounded-xl px-4 py-3 text-xs sm:text-sm">{error}</div>}
        {saved && <div className="bg-emerald-50 border border-emerald-200 text-emerald-700 rounded-xl px-4 py-3 text-xs sm:text-sm flex items-center gap-2"><CheckCircle className="w-4 h-4" /> Cilësimet u ruajtën me sukses!</div>}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4 text-base">Logo e Kompanisë</h2>
          <div className="flex flex-col sm:flex-row items-center gap-5">
            <div className="w-24 h-24 rounded-2xl border-2 border-dashed border-slate-200 flex items-center justify-center bg-slate-50 overflow-hidden flex-shrink-0">
              {form.logoUrl ? <Image src={form.logoUrl} alt="Logo" width={96} height={96} className="w-full h-full object-contain" /> : <Building2 className="w-8 h-8 text-slate-300" />}
            </div>
            <div className="space-y-2 text-center sm:text-left">
              <input ref={logoRef} type="file" accept="image/jpeg,image/png,image/webp,image/svg+xml" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "logo"); }} />
              <button type="button" onClick={() => logoRef.current?.click()} disabled={uploading} className="inline-flex items-center gap-2 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-100 transition-colors disabled:opacity-60 cursor-pointer"><Upload className="w-4 h-4" />{uploading ? "Duke ngarkuar..." : "Ngarko Logo"}</button>
              {form.logoUrl && <button type="button" onClick={() => setForm({ ...form, logoUrl: "" })} className="flex items-center justify-center sm:justify-start gap-1.5 text-xs sm:text-sm text-red-500 hover:text-red-600 cursor-pointer"><X className="w-3.5 h-3.5" /> Fshij logon</button>}
              <p className="text-xs text-slate-400">JPG, PNG, WEBP ose SVG · Max 5MB</p>
            </div>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6">
          <h2 className="font-bold text-slate-900 mb-4 text-base">Stampë & Nënshkrim</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="space-y-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Stampë</p>
              <div className="w-full h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {form.stampUrl ? <img src={form.stampUrl} alt="Stampë" className="w-full h-full object-contain" /> : <p className="text-xs text-slate-400">Nuk ka stampë</p>}
              </div>
              <input ref={stampRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "stamp"); }} />
              <button type="button" onClick={() => stampRef.current?.click()} disabled={uploadingStamp} className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 disabled:opacity-60 cursor-pointer">{uploadingStamp ? "Duke ngarkuar..." : "Ngarko Stampë"}</button>
            </div>
            <div className="space-y-3 sm:col-span-2">
              <p className="text-xs sm:text-sm font-semibold text-slate-700">Nënshkrim</p>
              <div className="w-full h-28 rounded-xl border border-slate-200 bg-slate-50 overflow-hidden flex items-center justify-center">
                {form.signatureUrl ? <img src={form.signatureUrl} alt="Nënshkrim" className="w-full h-full object-contain" /> : <p className="text-xs text-slate-400">Nuk ka nënshkrim</p>}
              </div>
              <input ref={signatureRef} type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={(e) => { const f = e.target.files?.[0]; if (f) void handleUpload(f, "signature"); }} />
              <button type="button" onClick={() => signatureRef.current?.click()} disabled={uploadingSignature} className="w-full px-3 py-2 bg-slate-100 text-slate-700 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-200 disabled:opacity-60 cursor-pointer">{uploadingSignature ? "Duke ngarkuar..." : "Ngarko Nënshkrim"}</button>
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-3 pt-2">
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Madhësia</label>
                  <input type="range" min={20} max={120} value={form.stampSize} onChange={(e) => setForm({ ...form, stampSize: Number(e.target.value) })} className="w-full accent-indigo-600" />
                  <div className="text-xs text-slate-500 mt-1">{form.stampSize}px</div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pozicioni X</label>
                  <input type="number" value={form.stampPosX} onChange={(e) => setForm({ ...form, stampPosX: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Pozicioni Y</label>
                  <input type="number" value={form.stampPosY} onChange={(e) => setForm({ ...form, stampPosY: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-slate-600 mb-1">Rotate</label>
                  <input type="number" value={form.stampRotate} onChange={(e) => setForm({ ...form, stampRotate: Number(e.target.value) })} className="w-full px-3 py-2 border border-slate-200 rounded-lg text-sm" />
                </div>
              </div>
            </div>
          </div>
        </div>

        {field("name", "Emri i Kompanisë", "AXEmedia")}
        {field("tagline", "Sllogani", "Agjensi Marketingu & Dizajni")}
        {field("address", "Adresa", "Tiranë, Shqipëri")}
        {field("phone", "Telefoni", "+355 69 000 0000")}
        {field("email", "Email", "info@axemedia.al")}
        {field("taxId", "NIPT / Tax ID", "")}
        {field("website", "Website", "www.axemedia.al")}
        {field("bankAccount", "Llogaria Bankare", "IBAN ose numër llogarie")}
        {field("swiftCode", "Swift Code", "SWIFT/BIC")}

        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm p-4 sm:p-6 space-y-4">
          <h2 className="font-bold text-slate-900 text-base">Dizajni & Tema</h2>
          <p className="text-xs sm:text-sm text-slate-500">Ngjyra dhe madhësia e logos në PDF-të e gjeneruara</p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6">
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Ngjyra Kryesore</label>
              <div className="flex items-center gap-3">
                <input type="color" value={form.primaryColor} onChange={(e) => setForm({ ...form, primaryColor: e.target.value })} className="w-12 h-10 rounded-xl cursor-pointer border border-slate-200 p-0.5 bg-white" />
                <span className="text-sm font-mono text-slate-600 font-semibold">{form.primaryColor}</span>
              </div>
            </div>
            <div>
              <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Madhësia e Logos: <span className="font-bold" style={{ color: form.primaryColor }}>{form.logoSize} mm</span></label>
              <input type="range" min={10} max={40} value={form.logoSize} onChange={(e) => setForm({ ...form, logoSize: Number(e.target.value) })} className="w-full accent-indigo-600" />
            </div>
          </div>
          <div>
            <label className="block text-xs sm:text-sm font-semibold text-slate-700 mb-2">Fonti i PDF-ve</label>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3">
              {FONT_OPTIONS.map((font) => (
                <button key={font.value} type="button" onClick={() => setForm({ ...form, fontFamily: font.value })} className={`text-left rounded-xl border p-3 transition-all cursor-pointer ${form.fontFamily === font.value ? "border-indigo-500 bg-indigo-50/80 ring-2 ring-indigo-500/20" : "border-slate-200 bg-white hover:bg-slate-50"}`}>
                  <div className="font-semibold text-slate-900 text-sm" style={{ fontFamily: font.css }}>{font.label}</div>
                  <div className="text-xs text-slate-500 mt-0.5">{font.subtitle}</div>
                </button>
              ))}
            </div>
          </div>
        </div>

        {field("invoiceFooter", "Footer e Faturave", "Faleminderit për bashkëpunimin!", "text", 3)}
        {field("offerFooter", "Footer e Ofertave", "Kjo ofertë nuk është faturë. Pagesa nuk kërkohet deri pas konfirmimit.", "text", 3)}

        <div className="flex flex-col sm:flex-row justify-end gap-2 pt-2">
          <button type="button" onClick={() => setForm(initialSettings)} className="flex-1 sm:flex-none px-4 py-2.5 border border-slate-200 text-slate-600 rounded-xl text-xs sm:text-sm font-semibold hover:bg-slate-50 transition-colors cursor-pointer text-center">Rivendos</button>
          <button type="submit" disabled={saving} className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs sm:text-sm font-semibold hover:bg-indigo-700 transition-colors shadow-sm shadow-indigo-600/20 disabled:opacity-60 cursor-pointer"><Save className="w-4 h-4" />{saving ? "Duke ruajtur..." : "Ruaj Ndryshimet"}</button>
        </div>
      </form>
    </div>
  );
}