"use client";

import { useEffect, useState, useCallback } from "react";
import { ArrowLeft, Download, CheckCircle, Send, XCircle, Printer, Edit2 } from "lucide-react";
import Link from "next/link";
import { format } from "date-fns";
import { sq } from "date-fns/locale";
import { use } from "react";

interface InvoiceItem {
  id: number;
  description: string;
  quantity: number;
  unitPrice: number;
  total: number;
}

interface Invoice {
  id: number;
  invoiceNumber: string;
  status: string;
  issueDate: string;
  dueDate?: string;
  subtotal: number;
  tax: number;
  total: number;
  notes?: string;
  items: InvoiceItem[];
  client: {
    id: number;
    name: string;
    email: string;
    phone?: string;
    address?: string;
    city?: string;
    businessNumber?: string;
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
  logoSize: number;
  primaryColor: string;
  fontFamily: string;
}

const statusColors: Record<string, string> = {
  paid: "bg-emerald-100 text-emerald-700 border-emerald-200",
  sent: "bg-blue-100 text-blue-700 border-blue-200",
  draft: "bg-slate-100 text-slate-600 border-slate-200",
  cancelled: "bg-red-100 text-red-700 border-red-200",
};
const statusLabel: Record<string, string> = { paid: "Paguar", sent: "Dërguar", draft: "Draft", cancelled: "Anuluar" };

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

async function generatePDF(invoice: Invoice, settings: CompanySettings) {
  const { default: jsPDF } = await import("jspdf");
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });

  const blue      = hexToRgb(settings.primaryColor || "#009ec6");
  const dark      = [30, 35, 45]    as [number, number, number];
  const black     = [20, 20, 30]    as [number, number, number];
  const gray      = [110, 118, 138] as [number, number, number];
  const lightGray = [245, 247, 249] as [number, number, number];
  const cardBg    = [250, 251, 253] as [number, number, number];
  const W = 210;
  const L = 15;
  const R = W - 15;
  const font = (settings.fontFamily || "helvetica") as "helvetica" | "times" | "courier";

  doc.setFont(font, "bold");
  doc.setFontSize(24);
  doc.setTextColor(...black);
  doc.text(`FATURË/INVOICE #${invoice.invoiceNumber}`, L, 28);

  if (settings.logoUrl) {
    const logoData = await loadImageDataUrl(settings.logoUrl, 420, 0.8);
    if (logoData) {
      const maxLogoWidth = 42;
      const maxLogoHeight = 18;
      const logoRatio = logoData.w / logoData.h;
      const logoW = Math.min(maxLogoWidth, Math.round(maxLogoHeight * logoRatio));
      const logoH = Math.round(Math.min(maxLogoHeight, logoW / Math.max(logoRatio, 0.01)));
      doc.addImage(logoData.dataUrl, "PNG", R - logoW, 10, logoW, logoH);
    }
  }

  const cardGap = 6;
  const cardW = ((R - L) - 2 * cardGap) / 3;
  const cardY = 40;
  const cardX = [L, L + cardW + cardGap, L + 2 * (cardW + cardGap)];

  cardX.forEach((x) => {
    doc.setFillColor(...cardBg);
    doc.roundedRect(x, cardY, cardW, 44, 5, 5, "F");
    doc.setDrawColor(220, 225, 235);
    doc.setLineWidth(0.3);
    doc.roundedRect(x, cardY, cardW, 44, 5, 5, "S");
  });

  doc.setFont(font, "bold"); doc.setFontSize(9); doc.setTextColor(...blue);
  doc.text("Detajet e Kompanisë", cardX[0] + 4, cardY + 10);
  doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...black);
  const companyLines = [
    settings.name,
    settings.tagline,
    settings.taxId ? `Nr Unik: ${settings.taxId}` : null,
    settings.bankAccount ? `Reiffeisen Bank: ${settings.bankAccount}` : null,
    settings.swiftCode ? `SWIFT: ${settings.swiftCode}` : null,
  ].filter(Boolean) as string[];
  let currentY = cardY + 16;
  companyLines.forEach((line) => { doc.text(line, cardX[0] + 4, currentY); currentY += 4.8; });

  doc.setFont(font, "bold"); doc.setFontSize(9); doc.setTextColor(...blue);
  doc.text("Detajet e Klientit", cardX[1] + 4, cardY + 10);
  doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...black);
  const clientLines = [
    invoice.client.name,
    invoice.client.email,
    invoice.client.phone ? invoice.client.phone : null,
    invoice.client.address ? invoice.client.address : null,
    invoice.client.city ? invoice.client.city : null,
    invoice.client.businessNumber ? `Nr Biznesit: ${invoice.client.businessNumber}` : null,
    invoice.client.taxId ? `Nr Fiskal: ${invoice.client.taxId}` : null,
  ].filter(Boolean) as string[];
  currentY = cardY + 16;
  clientLines.forEach((line) => { doc.text(line, cardX[1] + 4, currentY); currentY += 4.8; });

  doc.setFont(font, "bold"); doc.setFontSize(9); doc.setTextColor(...blue);
  doc.text("Detajet e Faturës", cardX[2] + 4, cardY + 10);
  doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...black);
  const invoiceLines = [
    `Nr Faturës: ${invoice.invoiceNumber}`,
    `Data: ${format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: sq })}`,
    `Statusi: ${statusLabel[invoice.status] || invoice.status}`,
  ];
  currentY = cardY + 16;
  invoiceLines.forEach((line) => { doc.text(line, cardX[2] + 4, currentY); currentY += 4.8; });

  const itemsTop = cardY + 55;
  doc.setFont(font, "bold"); doc.setFontSize(11); doc.setTextColor(...black);
  doc.text("Shërbimi/Produkti", L, itemsTop);
  doc.text("Çmimi", R - 66, itemsTop, { align: "right" });
  doc.text("Sasia", R - 38, itemsTop, { align: "right" });
  doc.text("Totali", R, itemsTop, { align: "right" });
  doc.setDrawColor(...dark);
  doc.setLineWidth(0.8);
  doc.line(L, itemsTop + 3.5, R, itemsTop + 3.5);

  let itemY = itemsTop + 10;
  const rowHeight = 15;
  invoice.items.forEach((item) => {
    doc.setFillColor(...lightGray);
    doc.roundedRect(L, itemY - 4, R - L, rowHeight, 6, 6, "F");
    doc.setFont(font, "normal"); doc.setFontSize(9); doc.setTextColor(...black);
    doc.text(item.description, L + 5, itemY + 5);
    doc.text(`${item.unitPrice.toFixed(2)} €`, R - 66, itemY + 5, { align: "right" });
    doc.text(String(item.quantity), R - 38, itemY + 5, { align: "right" });
    doc.text(`${item.total.toFixed(2)} €`, R - 5, itemY + 5, { align: "right" });
    itemY += rowHeight + 6;
  });

  const summaryW = 86;
  const summaryX = R - summaryW;
  const summaryRowHeight = 9;

  doc.setFillColor(...lightGray);
  doc.roundedRect(summaryX, itemY - 2, summaryW, summaryRowHeight * 2 + 7, 5, 5, "F");

  doc.setFont(font, "normal"); doc.setFontSize(9); doc.setTextColor(...black);
  doc.text("Nëntotali", summaryX + 4, itemY + 4);
  doc.text(`${invoice.subtotal.toFixed(2)} €`, R - 4, itemY + 4, { align: "right" });
  itemY += summaryRowHeight + 2;

  doc.text("TVSH", summaryX + 4, itemY + 4);
  doc.text(`${invoice.tax.toFixed(2)} €`, R - 4, itemY + 4, { align: "right" });
  itemY += summaryRowHeight + 8;

  doc.setFillColor(132, 204, 22);
  doc.roundedRect(summaryX, itemY - 3, summaryW, rowHeight, 6, 6, "F");
  doc.setFont(font, "bold"); doc.setFontSize(10); doc.setTextColor(255, 255, 255);
  doc.text("TOTALI", summaryX + 4, itemY + 6);
  doc.text(`${invoice.total.toFixed(2)} €`, R - 4, itemY + 6, { align: "right" });
  itemY += rowHeight + 12;

  const signAreaTop = itemY;
  const signWidth = 55;
  const signRightX = R - 60; // right area for Pranoi

  // Draw signature on the left (above the Dorëzoi line)
  let leftBottom = signAreaTop;
  const leftSigX = L;
  let dorëzoiLineY = signAreaTop + 30;
  if (settings.signatureUrl) {
    const signatureData = await loadImageDataUrl(settings.signatureUrl, 280, 0.75);
    if (signatureData) {
      const sigW = 55;
      const sigH = Math.min(30, (signatureData.h / signatureData.w) * sigW);
      const signatureY = signAreaTop + 6;
      doc.addImage(signatureData.dataUrl, "PNG", leftSigX, signatureY, sigW, sigH);
      leftBottom = Math.max(leftBottom, signatureY + sigH);
      dorëzoiLineY = signatureY + sigH + 4; // place line closer to signature
    }
  }

  // Draw stamp centered between left and right sign areas
  if (settings.stampUrl) {
    const stampData = await loadImageDataUrl(settings.stampUrl, 240, 0.75);
    if (stampData) {
      const stampW = Math.max(10, settings.stampSize || 55);
      const stampH = Math.max(10, (stampData.h / stampData.w) * stampW);
      const stampX = L + (settings.stampPosX || 0);
      const stampY = signAreaTop + (settings.stampPosY || 0);
      doc.addImage(stampData.dataUrl, "PNG", stampX, stampY, stampW, stampH, undefined, "NONE", settings.stampRotate || 0);
      leftBottom = Math.max(leftBottom, stampY + stampH);
    }
  }

  // Draw Dorëzoi line and label (left)
  doc.setDrawColor(...gray); doc.setLineWidth(0.3);
  doc.line(L, dorëzoiLineY, L + signWidth, dorëzoiLineY);
  doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
  doc.text("Dorëzoi", L + signWidth / 2, dorëzoiLineY + 8, { align: "center" });

  // Draw Pranoi line and label (right)
  const pranoiLineY = dorëzoiLineY; // align horizontally
  doc.line(signRightX, pranoiLineY, signRightX + signWidth, pranoiLineY);
  doc.text("Pranoi", signRightX + signWidth / 2, pranoiLineY + 8, { align: "center" });
  doc.text(format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: sq }), signRightX + signWidth / 2, pranoiLineY + 16, { align: "center" });

  if (invoice.notes?.trim()) {
    const projectY = Math.max(leftBottom + 20, pranoiLineY + 30);
    doc.setFont(font, "bold"); doc.setFontSize(12); doc.setTextColor(...black);
    doc.text("Shënime", L, projectY);
    const projectLines = doc.splitTextToSize(invoice.notes.trim(), R - L);
    doc.setFont(font, "normal"); doc.setFontSize(8); doc.setTextColor(...gray);
    doc.text(projectLines, L, projectY + 6);
  }

  const footerY = 280;
  const centerX = (L + R) / 2;
  doc.setFont(font, "normal"); doc.setFontSize(7.5); doc.setTextColor(...gray);
  doc.text([
    settings.name || "",
    settings.tagline || "",
    settings.address || "",
  ].filter(Boolean), L, footerY);
  doc.text([
    settings.taxId ? `Nr Unik: ${settings.taxId}` : "",
    settings.bankAccount ? `Reiffeisen Bank: ${settings.bankAccount}` : "",
    settings.swiftCode ? `SWIFT: ${settings.swiftCode}` : "",
  ].filter(Boolean), centerX, footerY, { align: "center" });
  doc.text([
    settings.phone || "",
    settings.website || "",
    settings.email || "",
  ].filter(Boolean), R, footerY, { align: "right" });

  const pdfBlob = doc.output("blob");
  triggerPdfDownload(pdfBlob, `${invoice.invoiceNumber}.pdf`);
}

export default function InvoiceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const [invoice,  setInvoice]  = useState<Invoice | null>(null);
  const [settings, setSettings] = useState<CompanySettings | null>(null);
  const [loading,  setLoading]  = useState(true);
  const [updating, setUpdating] = useState(false);

  const fetchInvoice = useCallback(() => {
    fetch(`/api/invoices/${id}`)
      .then((r) => r.json())
      .then((data) => { setInvoice(data); setLoading(false); })
      .catch(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    fetchInvoice();
    fetch("/api/settings").then((r) => r.json()).then((d) => { if (!d.error) setSettings(d); });
  }, [fetchInvoice]);

  const updateStatus = async (status: string) => {
    if (!invoice) return;
    setUpdating(true);
    await fetch(`/api/invoices/${id}`, { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status }) });
    fetchInvoice();
    setUpdating(false);
  };

  const notesText = invoice?.notes?.trim() || "";

  if (loading) return (
    <div className="p-6 lg:p-8"><div className="animate-pulse space-y-4"><div className="h-8 w-64 bg-slate-200 rounded" /><div className="h-96 bg-slate-200 rounded-2xl" /></div></div>
  );
  if (!invoice) return (
    <div className="p-6 text-center text-slate-400">Fatura nuk u gjet. <Link href="/invoices" className="text-indigo-600">Kthehu</Link></div>
  );

  return (
    <div className="p-6 lg:p-8 space-y-6 max-w-4xl">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <Link href="/invoices" className="p-2 rounded-lg text-slate-400 hover:bg-slate-100 transition-colors"><ArrowLeft className="w-5 h-5" /></Link>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl font-bold text-slate-900 font-mono">{invoice.invoiceNumber}</h1>
              <span className={`px-2.5 py-1 rounded-full text-xs font-medium border ${statusColors[invoice.status]}`}>{statusLabel[invoice.status]}</span>
            </div>
            <p className="text-slate-500 text-sm mt-0.5">Lëshuar {format(new Date(invoice.issueDate), "d MMMM yyyy", { locale: sq })}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          {invoice.status === "draft" && (
            <button onClick={() => updateStatus("sent")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-60">
              <Send className="w-4 h-4" /> Shëno Dërguar
            </button>
          )}
          {invoice.status === "sent" && (
            <button onClick={() => updateStatus("paid")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-60">
              <CheckCircle className="w-4 h-4" /> Shëno Paguar
            </button>
          )}
          {(invoice.status === "draft" || invoice.status === "sent") && (
            <button onClick={() => updateStatus("cancelled")} disabled={updating} className="flex items-center gap-1.5 px-3 py-2 bg-red-50 text-red-600 border border-red-200 rounded-lg text-sm font-medium hover:bg-red-100 transition-colors disabled:opacity-60">
              <XCircle className="w-4 h-4" /> Anulo
            </button>
          )}
          <button onClick={() => window.print()} className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 text-slate-600 rounded-lg text-sm font-medium hover:bg-slate-200 transition-colors">
            <Printer className="w-4 h-4" /> Printo
          </button>
          <Link href={`/invoices/${invoice.id}/edit`} className="flex items-center gap-1.5 px-3 py-2 bg-amber-50 text-amber-700 border border-amber-200 rounded-lg text-sm font-medium hover:bg-amber-100 transition-colors">
            <Edit2 className="w-4 h-4" /> Ndrysho
          </Link>
          <button onClick={() => generatePDF(invoice, settings ?? { name:"AXEmedia", tagline:"Agjensi Marketingu & Dizajni", address:"Tiranë, Shqipëri", phone:"+355 69 000 0000", email:"info@axemedia.al", taxId:"", website:"www.axemedia.al", bankAccount:"", swiftCode:"", logoUrl:"", stampUrl:"", stampSize: 55, stampPosX: 0, stampPosY: 0, stampRotate: 0, signatureUrl:"", invoiceFooter:"Faleminderit për bashkëpunimin!", logoSize: 22, primaryColor: "#009ec6", fontFamily: "helvetica" })} className="flex items-center gap-1.5 px-3 py-2 bg-indigo-600 text-white rounded-lg text-sm font-medium hover:bg-indigo-700 transition-colors">
            <Download className="w-4 h-4" /> Shkarko PDF
          </button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden" id="invoice-print">
        <div className="p-8">
          <div className="flex flex-col sm:flex-row sm:justify-between gap-4">
            <div>
              <p className="text-slate-900 text-3xl font-bold">FATURË/INVOICE #{invoice.invoiceNumber}</p>
            </div>
            <div className="flex items-end justify-end">
              {settings?.logoUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={settings.logoUrl} alt="Logo" className="h-14 w-auto object-contain" />
              ) : null}
            </div>
          </div>

          <div className="mt-8 grid gap-4 sm:grid-cols-3 sm:pr-5">
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-100">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em] mb-4">Detajet e Kompanisë</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{settings?.name}</p>
                {settings?.tagline && <p>{settings.tagline}</p>}
                {settings?.taxId && <p>Nr Unik: {settings.taxId}</p>}
                {settings?.bankAccount && <p>Reiffeisen Bank: {settings.bankAccount}</p>}
                {settings?.swiftCode && <p>SWIFT: {settings.swiftCode}</p>}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-100">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em] mb-4">Detajet e Klientit</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">{invoice.client.name}</p>
                <p>{invoice.client.email}</p>
                {invoice.client.phone && <p>{invoice.client.phone}</p>}
                {invoice.client.address && <p>{invoice.client.address}</p>}
                {invoice.client.city && <p>{invoice.client.city}</p>}
                {invoice.client.businessNumber && <p>Nr Biznesit: {invoice.client.businessNumber}</p>}
                {invoice.client.taxId && <p>Nr Fiskal: {invoice.client.taxId}</p>}
              </div>
            </div>
            <div className="rounded-3xl bg-slate-50 p-5 shadow-sm border border-slate-100">
              <p className="text-sm font-semibold text-slate-900 uppercase tracking-[0.12em] mb-4 whitespace-nowrap">Detajet e Faturës</p>
              <div className="space-y-1 text-sm text-slate-600">
                <p className="font-semibold text-slate-900">Nr Faturës: {invoice.invoiceNumber}</p>
                <p>Data: {format(new Date(invoice.issueDate), "d MMMM yyyy", { locale: sq })}</p>
                <p>Statusi: {statusLabel[invoice.status] || invoice.status}</p>
              </div>
            </div>
          </div>

          <div className="mt-8 border-t border-slate-200 pt-8 sm:pr-5">
            <div className="grid grid-cols-12 gap-4 mb-5 pb-3 border-b border-slate-300 text-sm font-semibold text-slate-900">
              <p className="col-span-6">Shërbimi/Produkti</p>
              <p className="col-span-2 text-right">Çmimi</p>
              <p className="col-span-2 text-right">Sasia</p>
              <p className="col-span-2 text-right">Totali</p>
            </div>
            <div className="space-y-4">
              {invoice.items.map((item) => (
                <div key={item.id} className="rounded-3xl bg-slate-50 p-5 grid grid-cols-12 gap-4 items-center text-sm text-slate-700 shadow-sm">
                  <span className="col-span-6">{item.description}</span>
                  <span className="col-span-2 text-right">{item.unitPrice.toFixed(2)} €</span>
                  <span className="col-span-2 text-right">{item.quantity}</span>
                  <span className="col-span-2 text-right font-semibold text-slate-900">{item.total.toFixed(2)} €</span>
                </div>
              ))}
            </div>
              <div className="mt-5 ml-auto w-full max-w-md rounded-3xl bg-slate-100 p-5 text-sm text-slate-700">
                <div className="flex items-center justify-between border-b border-slate-200 pb-3 mb-3">
                  <span>Nëntotali</span>
                  <span className="font-semibold tabular-nums">{invoice.subtotal.toFixed(2)} €</span>
                </div>
                <div className="flex items-center justify-between">
                  <span>TVSH</span>
                  <span className="font-semibold tabular-nums">{invoice.tax.toFixed(2)} €</span>
                </div>
              </div>
              <div className="mt-5 ml-auto w-full max-w-md rounded-2xl bg-lime-500 p-5 flex items-center justify-between font-bold text-white text-base shadow-md">
                <span>TOTALI</span>
                <span className="tabular-nums">{invoice.total.toFixed(2)} €</span>
              </div>
            </div>

          <div className="mt-10">
            <div className="grid gap-4 sm:grid-cols-2 items-start">
              <div>
                <div className="mb-2 text-xs text-slate-500">Dorëzoi - Give</div>
                <div className="relative rounded-3xl bg-white p-4 border border-slate-200 shadow-sm h-32 overflow-hidden">
                  {settings?.stampUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={settings.stampUrl}
                      alt="Stampë"
                      className="absolute object-contain"
                      style={{
                        left: `${settings.stampPosX || 0}px`,
                        top: `${settings.stampPosY || 0}px`,
                        width: `${settings.stampSize || 55}px`,
                        transform: `rotate(${settings.stampRotate || 0}deg)`,
                      }}
                    />
                  ) : (
                    <span className="text-slate-300">Stampë</span>
                  )}
                </div>
              </div>
              <div>
                <div className="mb-2 text-xs text-slate-500 text-center">Pranoi - Accept</div>
                <div className="rounded-3xl bg-white p-4 border border-slate-200 shadow-sm h-32 overflow-hidden flex items-center justify-center">
                  {settings?.signatureUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={settings.signatureUrl} alt="Nënshkrim" className="max-h-20 object-contain" />
                  ) : (
                    <div className="h-10" />
                  )}
                </div>
              </div>
            </div>
            <div className="mt-3 grid gap-4 sm:grid-cols-2 text-slate-600 text-sm">
              <div className="border-t border-slate-300 pt-2 text-center">Dorëzoi</div>
              <div className="border-t border-slate-300 pt-2 text-center">
                <p>Pranoi</p>
                <p className="mt-1">{format(new Date(invoice.issueDate), "dd MMM yyyy", { locale: sq })}</p>
              </div>
            </div>
          </div>

          {notesText && (
            <div className="mt-10">
              <p className="text-lg font-bold text-slate-900">Shënime</p>
              <p className="mt-3 text-sm text-slate-600 leading-6 whitespace-pre-line">{notesText}</p>
            </div>
          )}

          <div className="mt-10 grid gap-4 sm:grid-cols-3 text-[11px] text-slate-500">
            <div className="space-y-1">
              <p className="font-semibold text-slate-900">{settings?.name}</p>
              {settings?.tagline && <p>{settings.tagline}</p>}
              {settings?.address && <p>{settings.address}</p>}
            </div>
            <div className="space-y-1 text-center">
              {settings?.taxId && <p>Nr Unik: {settings.taxId}</p>}
              {settings?.bankAccount && <p>Reiffeisen Bank: {settings.bankAccount}</p>}
              {settings?.swiftCode && <p>SWIFT: {settings.swiftCode}</p>}
            </div>
            <div className="space-y-1 text-right">
              {settings?.phone && <p>{settings.phone}</p>}
              {settings?.website && <p>{settings.website}</p>}
              {settings?.email && <p>{settings.email}</p>}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
