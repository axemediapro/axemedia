"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, Send, CheckCircle, XCircle, ArrowRightCircle, Printer, Edit2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";
import { use } from "react";
import { useRouter } from "next/navigation";

interface OfferItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Offer {
  id: number;
  offerNumber: string;
  title: string;
  status: string;
  issueDate: string;
  validUntil: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  convertedToInvoiceId: number | null;
  items: OfferItem[];
  client: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    taxId?: string;
  };
}

interface CompanySettings {
  name: string;
  tagline: string;
  address: string;
  phone: string;
  email: string;
  taxId: string;
  website: string;
  logoUrl: string;
  offerFooter: string;
  logoSize: number;
  primaryColor: string;
  fontFamily: string;
}

const statusColors: Record<string, string> = {
  draft:    "bg-slate-100 text-slate-600 border-slate-200",
  sent:     "bg-blue-100 text-blue-700 border-blue-200",
  accepted: "bg-emerald-100 text-emerald-700 border-emerald-200",
  rejected: "bg-red-100 text-red-700 border-red-200",
  expired:  "bg-orange-100 text-orange-700 border-orange-200",
};
const statusLabel: Record<string, string> = {
  draft:    "Draft",
  sent:     "Dërguar",
  accepted: "Pranuar",
  rejected: "Refuzuar",
  expired:  "Skaduar",
};

function isSvgSource(src: string): boolean {
  if (src.startsWith("data:image/svg")) return true;
  try {
    const url = new URL(src, window.location.origin);
    return /\.svg$/i.test(url.pathname);
  } catch {
    return /\.svg($|[?#])/i.test(src);
  }
}

async function loadImageDataUrl(src: string, maxDimension = 800, quality = 0.82): Promise<{ dataUrl: string; w: number; h: number } | null> {
  if (isSvgSource(src)) {
    try {
      const resp = await fetch(src);
      const svgText = await resp.text();
      let vw = 0;
      let vh = 0;
      const vbMatch = svgText.match(/viewBox="([^"]+)"/);
      if (vbMatch) {
        const parts = vbMatch[1].trim().split(/[\s,]+/).map(Number);
        if (parts.length >= 4 && parts[2] > 0 && parts[3] > 0) {
          vw = parts[2];
          vh = parts[3];
        }
      }
      if (!vw || !vh) {
        const wm = svgText.match(/\bwidth="(\d+(?:\.\d+)?)"/);
        const hm = svgText.match(/\bheight="(\d+(?:\.\d+)?)"/);
        if (wm && hm) {
          vw = parseFloat(wm[1]);
          vh = parseFloat(hm[1]);
        }
      }
      if (!vw || !vh) {
        vw = 1;
        vh = 1;
      }
      const targetHeight = Math.max(90, Math.min(220, maxDimension));
      const targetWidth = Math.max(1, Math.round((vw / vh) * targetHeight));
      const canvas = document.createElement("canvas");
      canvas.width = targetWidth;
      canvas.height = targetHeight;
      const ctx = canvas.getContext("2d");
      if (!ctx) return null;
      await new Promise<void>((resolve) => {
        const img = new window.Image();
        const blob = new Blob([svgText], { type: "image/svg+xml" });
        const blobUrl = URL.createObjectURL(blob);
        img.onload = () => {
          ctx.drawImage(img, 0, 0, targetWidth, targetHeight);
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        img.onerror = () => {
          URL.revokeObjectURL(blobUrl);
          resolve();
        };
        img.src = blobUrl;
      });
      return { dataUrl: canvas.toDataURL("image/png"), w: targetWidth, h: targetHeight };
    } catch {
      return null;
    }
  }

  return new Promise((resolve) => {
    const img = new window.Image();
    img.crossOrigin = "anonymous";
    img.onload = () => {
      const originalW = img.naturalWidth || 200;
      const originalH = img.naturalHeight || 200;
      const scale = Math.min(1, maxDimension / Math.max(originalW, originalH));
      const w = Math.max(1, Math.round(originalW * scale));
      const h = Math.max(1, Math.round(originalH * scale));
      const canvas = document.createElement("canvas");
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(null);
        return;
      }
      ctx.drawImage(img, 0, 0, w, h);
      resolve({ dataUrl: canvas.toDataURL("image/png"), w, h });
    };
    img.onerror = () => resolve(null);
    img.src = src;
  });
}

function triggerPdfDownload(pdfBlob: Blob, fileName: string) {
  const objectUrl = URL.createObjectURL(pdfBlob);
  if (window.isSecureContext) {
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  } else {
    const popup = window.open(objectUrl, "_blank", "noopener,noreferrer");
    if (!popup) {
      window.location.href = objectUrl;
    }
  }
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 8000);
}

function hexToRgb(hex: string): [number, number, number] {
  const r = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  return r ? [parseInt(r[1], 16), parseInt(r[2], 16), parseInt(r[3], 16)] : [0, 158, 198];
}
function lightenRgb(c: [number, number, number], t: number): [number, number, number] {
  return c.map(v => Math.round(v + (255 - v) * t)) as [number, number, number];
}

async function generateOfferPDF(offer: Offer, settings: CompanySettings) {
  const { default: jsPDF } = await import("jspdf");
  const { default: autoTable } = await import("jspdf-autotable");

  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const d = doc as any;

  const amber      = hexToRgb(settings.primaryColor || "#009ec6");
  const dark       = [45, 47, 62]    as [number, number, number];
  const black      = [20, 20, 30]    as [number, number, number];
  const gray       = [130, 135, 150] as [number, number, number];
  const lightAmber = lightenRgb(amber, 0.85);
  const W = 210;
  const L = 15;
  const R = W - 15;
  const font = (settings.fontFamily || "helvetica") as "helvetica" | "times" | "courier";

  const trapL = (x: number, y: number, w: number, h: number, sk: number, c: [number,number,number]) => {
    doc.setFillColor(...c); doc.setDrawColor(...c);
    d.lines([[w, 0], [-sk, h], [-(w - sk), 0]], x, y, [1, 1], "F", true);
  };
  const trapR = (rx: number, y: number, w: number, h: number, sk: number, c: [number,number,number]) => {
    doc.setFillColor(...c); doc.setDrawColor(...c);
    d.lines([[w - sk, 0], [0, h], [-w, 0]], rx - w + sk, y, [1, 1], "F", true);
  };

  // ── 1. TOP CORNER DECORATIONS ────────────────────────────────
  trapL(0, 0, 60, 15, 13, dark);
  trapL(5, 8, 66,  8, 11, amber);

  // ── 2. HEADER ───────────────────────────────────────────────
  let logoEndX = L;
  if (settings.logoUrl) {
    const logoData = await loadImageDataUrl(settings.logoUrl, 420, 0.8);
    if (logoData) {
      const logoH = settings.logoSize || 22;
      const logoW = (logoData.w / logoData.h) * logoH;
      doc.addImage(logoData.dataUrl, "PNG", L, 17, logoW, logoH);
      logoEndX = L + logoW + 3;
    }
  } else {
    doc.setFillColor(...amber);
    doc.rect(L, 20, 16, 10, "F");
    doc.setFont(font, "bold");
    doc.setFontSize(7);
    doc.setTextColor(255, 255, 255);
    doc.text("LOGO", L + 8, 26.5, { align: "center" });
    logoEndX = L + 19;
  }

  doc.setFont(font, "bold");
  doc.setFontSize(13);
  doc.setTextColor(...black);
  doc.text(settings.name || "AXEmedia", logoEndX + 2, 26);
  if (settings.tagline) {
    doc.setFont(font, "normal");
    doc.setFontSize(8);
    doc.setTextColor(...gray);
    doc.text(settings.tagline, logoEndX + 2, 33);
  }

  doc.setFont(font, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  let ry = 21;
  if (settings.address) { doc.text(settings.address, R, ry, { align: "right" }); ry += 6; }
  if (settings.phone)   { doc.text(settings.phone,   R, ry, { align: "right" }); ry += 6; }
  if (settings.email)   { doc.text(settings.email,   R, ry, { align: "right" }); ry += 6; }
  if (settings.website) { doc.text(settings.website, R, ry, { align: "right" }); }

  // Amber divider line
  doc.setDrawColor(...amber);
  doc.setLineWidth(0.8);
  doc.line(L, 43, R, 43);

  // ── 3. OFFER FOR (left) ──────────────────────────────────────
  doc.setFont(font, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  doc.text("OFER TË PËR:", L, 51);

  doc.setFont(font, "bold");
  doc.setFontSize(12);
  doc.setTextColor(...black);
  doc.text(offer.client.name, L, 58);

  doc.setFont(font, "normal");
  doc.setFontSize(8);
  doc.setTextColor(...gray);
  const clientRows = [
    offer.client.phone   ? `Tel: ${offer.client.phone}` : null,
    offer.client.email,
    offer.client.address,
    offer.client.city,
    offer.client.taxId   ? `NIPT: ${offer.client.taxId}` : null,
  ].filter(Boolean) as string[];
  let cy = 64;
  clientRows.forEach(line => { doc.text(line, L, cy); cy += 5; });

  // ── 4. OFFER TITLE + DETAILS (right) ─────────────────────────
  doc.setFont(font, "bold");
  doc.setFontSize(28);
  doc.setTextColor(...amber);
  doc.text("OFER TË", R, 57, { align: "right" });
  if (offer.title) {
    doc.setFont(font, "normal");
    doc.setFontSize(9);
    doc.setTextColor(...gray);
    doc.text(offer.title, R, 64, { align: "right" });
  }

  const rLabel = 120;
  const offerDets: [string, string][] = [
    ["Nr. Ofertë:",     offer.offerNumber],
    ["Data:",           format(new Date(offer.issueDate),  "d MMM yyyy", { locale: sq })],
    ["Vlefshme deri:",  format(new Date(offer.validUntil), "d MMM yyyy", { locale: sq })],
  ];
  let idy = offer.title ? 71 : 65;
  offerDets.forEach(([lbl, val]) => {
    doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text(lbl, rLabel, idy);
    doc.setTextColor(...black);
    doc.text(val, R, idy, { align: "right" });
    idy += 6;
  });

  idy += 2;
  doc.setFont(font, "bold"); doc.setFontSize(8); doc.setTextColor(...black);
  doc.text("Detaje Kompanisë", rLabel, idy);
  idy += 6;

  const payRows: [string, string][] = [
    settings.taxId   ? ["NIPT:",    settings.taxId]    : null,
    settings.website ? ["Website:", settings.website]  : null,
  ].filter(Boolean) as [string, string][];
  payRows.forEach(([lbl, val]) => {
    doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text(lbl, rLabel, idy);
    doc.setTextColor(...black); doc.text(val, R, idy, { align: "right" });
    idy += 5;
  });

  // ── 5. ITEMS TABLE ───────────────────────────────────────────
  const tableY = Math.max(cy + 8, idy + 6, 108);
  autoTable(doc, {
    startY: tableY,
    head: [["NR.", "PËRSHKRIMI", "ÇMIMI", "SASIA", "SHUMA"]],
    body: offer.items.map((item, i) => [
      i + 1,
      item.description,
      `€${item.unitPrice.toFixed(2)}`,
      item.quantity.toString(),
      `€${item.total.toFixed(2)}`,
    ]),
    styles: {
      fontSize: 9, cellPadding: 4, textColor: black,
      font: font,
      lineColor: [220, 225, 235] as [number, number, number], lineWidth: 0.2,
    },
    headStyles: {
      fillColor: amber,
      textColor: [255, 255, 255] as [number, number, number],
      font: font, fontStyle: "bold", fontSize: 8,
    },
    alternateRowStyles: { fillColor: lightAmber },
    columnStyles: {
      0: { halign: "center", cellWidth: 14 },
      1: { cellWidth: "auto" },
      2: { halign: "right", cellWidth: 30 },
      3: { halign: "center", cellWidth: 20 },
      4: { halign: "right", fontStyle: "bold", cellWidth: 30 },
    },
    margin: { left: L, right: 15 },
  });

  const finalY = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY;

  // ── 6. TOTALS (right side) ───────────────────────────────────
  const totW = 65;
  const totX = R - totW;
  let ty2 = finalY + 3;

  if (offer.tax > 0) {
    doc.setFillColor(...lightAmber);
    doc.rect(totX, ty2 - 4, totW, 8, "F");
    doc.setFont(font, "normal"); doc.setFontSize(9);
    doc.setTextColor(...gray); doc.text("Nëntotali:", totX + 3, ty2);
    doc.setTextColor(...black); doc.text(`€${offer.subtotal.toFixed(2)}`, R - 2, ty2, { align: "right" });
    ty2 += 8;
    doc.setFillColor(...lightAmber);
    doc.rect(totX, ty2 - 4, totW, 8, "F");
    doc.setFont(font, "normal"); doc.setFontSize(9);
    doc.setTextColor(...gray); doc.text("TVSH:", totX + 3, ty2);
    doc.setTextColor(...black); doc.text(`€${offer.tax.toFixed(2)}`, R - 2, ty2, { align: "right" });
    ty2 += 8;
  }
  doc.setFillColor(...amber);
  doc.rect(totX, ty2 - 4, totW, 9, "F");
  doc.setFont(font, "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text("TOTALI", totX + 3, ty2 + 1);
  doc.text(`€${offer.total.toFixed(2)}`, R - 2, ty2 + 1, { align: "right" });
  const afterTotals = ty2 + 9;

  // ── 7. THANK YOU ─────────────────────────────────────────────
  doc.setFont(font, "bolditalic"); doc.setFontSize(11); doc.setTextColor(...amber);
  doc.text("Faleminderit për bashkëpunimin.", L, finalY + 10);

  // ── 8. NOTES + SIGNATURE ─────────────────────────────────────
  const notesBaseY = Math.max(finalY + 22, afterTotals + 8);
  const notesText = offer.notes || settings.offerFooter || "";
  if (notesText) {
    doc.setFont(font, "bold"); doc.setFontSize(8); doc.setTextColor(...black);
    doc.text("Shënime & Kushte:", L, notesBaseY);
    doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text(doc.splitTextToSize(notesText, 105), L, notesBaseY + 5);
  }

  doc.setDrawColor(...gray); doc.setLineWidth(0.3);
  doc.line(R - 45, notesBaseY + 12, R, notesBaseY + 12);
  doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
  doc.text("Nënshkrimi",           R - 22, notesBaseY + 17, { align: "center" });
  doc.text(settings.name || "AXEmedia", R - 22, notesBaseY + 22, { align: "center" });

  // ── 9. BOTTOM CORNER DECORATIONS ─────────────────────────────
  trapL(0,  288, 52, 7,  9,  amber);
  trapR(W,  284, 58, 13, 10, dark);

  const pdfBlob = doc.output("blob");
  triggerPdfDownload(pdfBlob, `${offer.offerNumber}.pdf`);
}

export default function OfferDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id }   = use(params);
  const router   = useRouter();
  const [offer,    setOffer]    = useState<Offer | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchOffer = useCallback(() => {
    fetch(`/api/offers/${id}`)
      .then((r) => r.json())
      .then((d) => { setOffer(d); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchOffer();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (!d.error) setSettings(d); });
  }, [fetchOffer]);

  const updateStatus = async (status: string) => {
    setUpdating(true);
    await fetch(`/api/offers/${id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status }),
    });
    fetchOffer();
    setUpdating(false);
  };

  const handleConvert = async () => {
    if (!confirm("Konverto këtë ofertë në faturë?")) return;
    setUpdating(true);
    const res = await fetch(`/api/offers/${id}/convert`, { method: "POST" });
    if (res.ok) {
      const data = await res.json();
      router.push(`/invoices/${data.invoiceId}`);
    }
    setUpdating(false);
  };

  if (loading) return (
    <div className="p-6 lg:p-8">
      <div className="animate-pulse space-y-4">
        <div className="h-8 w-64 bg-slate-200 rounded" />
        <div className="h-96 bg-slate-200 rounded-2xl" />
      </div>
    </div>
  );

  if (!offer) return (
    <div className="p-6 text-center text-slate-400">
      Oferta nuk u gjet. <Link href="/offers" className="text-indigo-600">Kthehu</Link>
    </div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/offers" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{offer.offerNumber}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[offer.status]}`}>
                {statusLabel[offer.status]}
              </span>
              {offer.convertedToInvoiceId && (
                <Link href={`/invoices/${offer.convertedToInvoiceId}`} className="px-2.5 py-1 rounded-full text-xs font-medium bg-indigo-100 text-indigo-700 border border-indigo-200 hover:underline">
                  → Fatura #{offer.convertedToInvoiceId}
                </Link>
              )}
            </div>
            <p className="text-slate-600 text-sm font-medium mt-0.5">{offer.title}</p>
            <p className="text-slate-400 text-xs mt-0.5">
              Lëshuar {format(new Date(offer.issueDate), "d MMMM yyyy", { locale: sq })} ·
              Vlefshme deri {format(new Date(offer.validUntil), "d MMMM yyyy", { locale: sq })}
            </p>
          </div>
        </div>

        {/* Actions */}
        <div className="flex flex-wrap gap-2">
          {offer.status === "draft" && (
            <button onClick={() => updateStatus("sent")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60 transition-colors">
              <Send className="w-4 h-4" /> Shëno Dërguar
            </button>
          )}
          {(offer.status === "sent" || offer.status === "draft") && !offer.convertedToInvoiceId && (
            <button onClick={() => updateStatus("accepted")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 disabled:opacity-60 transition-colors">
              <CheckCircle className="w-4 h-4" /> Pranuar
            </button>
          )}
          {(offer.status === "sent" || offer.status === "draft") && (
            <button onClick={() => updateStatus("rejected")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 disabled:opacity-60 transition-colors">
              <XCircle className="w-4 h-4" /> Refuzuar
            </button>
          )}
          {!offer.convertedToInvoiceId && offer.status !== "rejected" && (
            <button onClick={handleConvert} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-lg text-sm font-medium hover:bg-indigo-100 disabled:opacity-60 transition-colors">
              <ArrowRightCircle className="w-4 h-4" /> Konverto në Faturë
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            <Printer className="w-4 h-4" /> Printo
          </button>
          <Link href={`/offers/${offer.id}/edit`} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
            <Edit2 className="w-4 h-4" /> Ndrysho
          </Link>
          <button onClick={() => generateOfferPDF(offer, settings ?? { name:"AXEmedia", tagline:"Agjensi Marketingu & Dizajni", address:"Tiranë, Shqipëri", phone:"+355 69 000 0000", email:"info@axemedia.al", taxId:"", website:"www.axemedia.al", logoUrl:"", logoSize: 22, primaryColor: "#009ec6", fontFamily: "helvetica", offerFooter:"Kjo ofertë nuk është faturë. Pagesa nuk kërkohet deri pas konfirmimit." })} className="flex items-center gap-1.5 px-3 py-2 bg-amber-500 text-white rounded-lg text-sm font-medium hover:bg-amber-600 transition-colors">
            <Download className="w-4 h-4" /> Shkarko PDF
          </button>
        </div>
      </div>

      {/* Offer Card */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        {/* Banner */}
        <div className="bg-amber-500 px-8 py-6 flex justify-between items-start">
          <div className="flex items-center gap-4">
            {settings?.logoUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={settings.logoUrl} alt="Logo" className="h-12 w-auto object-contain" />
            )}
            <div>
              <p className="text-white font-bold text-2xl tracking-tight">{settings?.name || "AXEmedia"}</p>
              {settings?.tagline && <p className="text-amber-100 text-sm mt-1">{settings.tagline}</p>}
              {settings?.address && <p className="text-amber-100 text-sm">{settings.address}</p>}
            </div>
          </div>
          <div className="text-right">
            <p className="text-white font-bold text-3xl">OFERTË</p>
            <p className="text-amber-100 text-sm mt-1 font-mono">{offer.offerNumber}</p>
            <p className="text-amber-200 text-xs mt-0.5">{offer.title}</p>
          </div>
        </div>

        {/* Validity notice */}
        <div className="bg-amber-50 border-b border-amber-100 px-8 py-3 text-center text-sm text-amber-800 font-medium">
          ⏳ Kjo ofertë është e vlefshme deri më{" "}
          <span className="font-bold">{format(new Date(offer.validUntil), "d MMMM yyyy", { locale: sq })}</span>
        </div>

        <div className="p-8 space-y-6">
          {/* Client + Dates */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div>
              <p className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">Ofertë Për</p>
              <p className="font-bold text-slate-900 text-lg">{offer.client.name}</p>
              <p className="text-slate-600 text-sm">{offer.client.email}</p>
              {offer.client.phone   && <p className="text-slate-600 text-sm">{offer.client.phone}</p>}
              {offer.client.city    && <p className="text-slate-600 text-sm">{offer.client.city}</p>}
              {offer.client.taxId   && <p className="text-slate-500 text-sm font-medium">NIPT: {offer.client.taxId}</p>}
            </div>
            <div className="flex flex-col gap-2">
              {[
                { label: "Data Lëshimit",  value: format(new Date(offer.issueDate),  "d MMMM yyyy", { locale: sq }) },
                { label: "Vlefshme Deri",  value: format(new Date(offer.validUntil), "d MMMM yyyy", { locale: sq }) },
              ].map(({ label, value }) => (
                <div key={label} className="bg-slate-50 rounded-xl p-3 flex justify-between">
                  <span className="text-sm text-slate-500">{label}:</span>
                  <span className="text-sm font-semibold text-slate-800">{value}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Items */}
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-50">
                  {["#","Përshkrimi","Sasia","Çmimi","Total"].map(h => (
                    <th key={h} className={`px-4 py-3 text-xs font-bold text-slate-500 uppercase ${h === "Total" || h === "Çmimi" ? "text-right" : h === "Sasia" ? "text-center" : "text-left"}`}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {offer.items.map((item, i) => (
                  <tr key={item.id} className="hover:bg-slate-50">
                    <td className="px-4 py-3.5 text-sm text-slate-400">{i + 1}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-800 font-medium">{item.description}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 text-center">{item.quantity}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-600 text-right">€{item.unitPrice.toFixed(2)}</td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-900 text-right">€{item.total.toFixed(2)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Totals */}
          <div className="flex justify-end">
            <div className="w-72 space-y-2 text-sm">
              <div className="flex justify-between text-slate-600"><span>Nëntotali:</span><span>€{offer.subtotal.toFixed(2)}</span></div>
              <div className="flex justify-between text-slate-600"><span>TVSH:</span><span>€{offer.tax.toFixed(2)}</span></div>
              <div className="border-t border-slate-200 pt-3 mt-2 flex justify-between font-bold text-lg">
                <span className="text-slate-900">TOTALI:</span>
                <span className="text-amber-600">€{offer.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          {offer.notes && (
            <div className="bg-amber-50 rounded-xl p-4 border border-amber-100">
              <p className="text-xs font-bold text-amber-700 uppercase tracking-wider mb-2">Shënime / Kushte</p>
              <p className="text-sm text-amber-900">{offer.notes}</p>
            </div>
          )}

          {/* Disclaimer */}
          <p className="text-center text-xs text-slate-400 italic border-t border-slate-100 pt-4">
            Kjo dokument është ofertë dhe nuk përbën faturë. Pagesa nuk kërkohet deri pas konfirmimit me shkrim.
          </p>
        </div>
      </div>
    </div>
  );
}
