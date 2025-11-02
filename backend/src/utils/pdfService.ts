/* eslint-disable @typescript-eslint/no-explicit-any */
import fs from "node:fs/promises";
import path from "node:path";
import PDFDocument from "pdfkit";


type PDFDoc = InstanceType<typeof PDFDocument>;

type Party = { firstName?: string | null; lastName?: string | null; email?: string | null };
type Patient = Party & { id: string; ownerId?: string | null };
type Issuer = Party & { id: string };

type InvoiceItem = { label: string; qty: number; unitPrice: number; taxRate?: number };
type InvoiceForPdf = {
  id: string;
  number: string;
  date: Date | string;
  currency: "EUR" | string;
  items: InvoiceItem[] | any;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  status: "DRAFT" | "SENT" | "PAID" | "PARTIALLY_PAID" | "VOID";
  patient: Patient;
  issuer: Issuer;
  payments?: Array<{ amount: any; paidAt: Date | string; method: string; reference?: string | null }>;
};

type PaymentForPdf = {
  id: string;
  amount: any;
  method: string;
  paidAt: Date | string;
  reference?: string | null;
  invoice: {
    id: string;
    number: string;
    date: Date | string;
    currency: "EUR" | string;
    total: any;
    patient: Patient;
    issuer?: Issuer | null;
  };
};

// —— Helpers ———————————————————————————————————————————————————————————————
const fmtMoney = (v: number, ccy = "EUR") =>
  new Intl.NumberFormat("fr-FR", { style: "currency", currency: ccy }).format(Number(v));

const fmtDate = (d: Date | string) =>
  new Intl.DateTimeFormat("fr-FR", { year: "numeric", month: "2-digit", day: "2-digit" })
    .format(new Date(d));

function docToBuffer(doc: PDFDoc): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on("data", (c: any) => chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(c)));
    doc.on("end", () => resolve(Buffer.concat(chunks)));
    doc.on("error", (e: any) => reject(e));
    doc.end();
  });
}

function ensureArrayItems(items: any): InvoiceItem[] {
  if (!Array.isArray(items)) return [];
  return items.map((it) => ({
    label: String(it.label),
    qty: Number(it.qty),
    unitPrice: Number(it.unitPrice),
    taxRate: it.taxRate == null ? 0 : Number(it.taxRate),
  }));
}

function header(doc: PDFDoc, title: string) {
  doc
    .fontSize(20)
    .text(title, { align: "right" })
    .moveDown(0.5);
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#cccccc")
    .lineWidth(1)
    .stroke()
    .moveDown();
}

function partiesBlock(doc: PDFDoc, leftTitle: string, leftLines: string[], rightTitle: string, rightLines: string[]) {
  const startY = doc.y;
  doc.fontSize(11).text(leftTitle, 50, startY, { width: 250, continued: false, underline: true });
  doc.moveDown(0.2);
  leftLines.forEach((l) => doc.fontSize(10).text(l, { width: 250 }));
  const rightX = 320;
  doc.fontSize(11).text(rightTitle, rightX, startY, { width: 250, underline: true });
  doc.moveDown(0.2);
  rightLines.forEach((l) => doc.fontSize(10).text(l, { width: 250, continued: false }));
  doc.moveDown();
}

function tableHeader(doc: PDFDoc, columns: Array<{ label: string; x: number }>, yPad = 6) {
  const y = doc.y;
  doc.rect(50, y, 495, 20).fill("#f2f2f2").fillColor("#000");
  doc.fontSize(10);
  columns.forEach((c) => doc.text(c.label, c.x, y + yPad));
  doc.moveDown();
  doc.fillColor("#000");
}

function tableRow(doc: PDFDoc, cols: Array<{ text: string; x: number }>, yHeight = 18) {
  const y = doc.y + 2;
  doc.fontSize(10);
  cols.forEach((c) => doc.text(c.text, c.x, y, { width: 180 }));
  doc.moveDown(0.6);
  // ligne horizontale
  doc
    .moveTo(50, doc.y)
    .lineTo(545, doc.y)
    .strokeColor("#eaeaea")
    .lineWidth(1)
    .stroke();
}

function totalsBlock(doc: PDFDoc, rows: Array<[string, string]>) {
  doc.moveDown();
  const startX = 330;
  rows.forEach(([k, v]) => {
    const y = doc.y + 2;
    doc.fontSize(10).text(k, startX, y, { width: 120, align: "right" });
    doc.fontSize(10).text(v, startX + 130, y, { width: 90, align: "right" });
    doc.moveDown(0.4);
  });
}

// —— Rendu facture ————————————————————————————————————————————————————————
export async function renderInvoice(invoice: InvoiceForPdf): Promise<Buffer> {
  const items = ensureArrayItems(invoice.items);
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  // HEADER
  header(doc, `FACTURE ${invoice.number}`);

  // Parties
  const patientName = `${invoice.patient.firstName ?? ""} ${invoice.patient.lastName ?? ""}`.trim();
  const issuerName = `${invoice.issuer.firstName ?? ""} ${invoice.issuer.lastName ?? ""}`.trim();
  partiesBlock(
    doc,
    "ÉMIS PAR",
    [issuerName || "—", invoice.issuer.email || "—"],
    "DESTINATAIRE",
    [patientName || "—", invoice.patient.email || "—"]
  );

  // Infos facture
  doc.moveDown(0.5);
  doc.fontSize(11).text(`Date : ${fmtDate(invoice.date)}`);
  doc.fontSize(11).text(`Statut : ${invoice.status}`);
  doc.moveDown(0.5);

  // Table items
  tableHeader(doc, [
    { label: "Désignation", x: 55 },
    { label: "Qté", x: 325 },
    { label: "PU HT", x: 370 },
    { label: "TVA", x: 440 },
    { label: "Montant TTC", x: 500 },
  ]);

  items.forEach((it) => {
    const lineTotal = (it.qty * it.unitPrice) * (1 + (it.taxRate ?? 0));
    tableRow(doc, [
      { text: it.label, x: 55 },
      { text: String(it.qty), x: 325 },
      { text: fmtMoney(it.unitPrice, invoice.currency), x: 370 },
      { text: `${Math.round((it.taxRate ?? 0) * 100)}%`, x: 440 },
      { text: fmtMoney(lineTotal, invoice.currency), x: 500 },
    ]);
  });

  // Totaux
  totalsBlock(doc, [
    ["Sous-total", fmtMoney(invoice.subtotal as any, invoice.currency)],
    ["Total TVA", fmtMoney(invoice.taxTotal as any, invoice.currency)],
    ["Total TTC", fmtMoney(invoice.total as any, invoice.currency)],
  ]);

  // Paiements (optionnel)
  if (invoice.payments && invoice.payments.length > 0) {
    doc.moveDown();
    doc.fontSize(12).text("Paiements enregistrés", { underline: true }).moveDown(0.3);
    invoice.payments.forEach((p) => {
      doc.fontSize(10).text(
        `• ${fmtDate(p.paidAt)} — ${fmtMoney(p.amount as any, invoice.currency)} (${p.method}${p.reference ? " · " + p.reference : ""})`
      );
    });
  }

  // Pied de page
  doc.moveDown(2);
  doc.fontSize(9).fillColor("#666").text("Document généré automatiquement — ne pas répondre à cet email.");
  return await docToBuffer(doc);
}

// —— Rendu reçu de paiement ————————————————————————————————————————————————
export async function renderPaymentReceipt(payment: PaymentForPdf): Promise<Buffer> {
  const doc = new PDFDocument({ size: "A4", margin: 50 });

  header(doc, `REÇU DE PAIEMENT ${payment.id.slice(0, 8).toUpperCase()}`);

  const patientName = `${payment.invoice.patient.firstName ?? ""} ${payment.invoice.patient.lastName ?? ""}`.trim();
  const issuerName =
    payment.invoice.issuer
      ? `${payment.invoice.issuer.firstName ?? ""} ${payment.invoice.issuer.lastName ?? ""}`.trim()
      : "";

  partiesBlock(
    doc,
    "ÉMIS PAR",
    [issuerName || "—", payment.invoice.issuer?.email || "—"],
    "BÉNÉFICIAIRE",
    [patientName || "—", payment.invoice.patient.email || "—"]
  );

  doc.moveDown(0.5);
  doc.fontSize(11).text(`Facture associée : ${payment.invoice.number}`);
  doc.fontSize(11).text(`Date facture : ${fmtDate(payment.invoice.date)}`);
  doc.moveDown(0.5);

  tableHeader(doc, [
    { label: "Date paiement", x: 55 },
    { label: "Montant", x: 200 },
    { label: "Méthode", x: 320 },
    { label: "Référence", x: 430 },
  ]);

  tableRow(doc, [
    { text: fmtDate(payment.paidAt), x: 55 },
    { text: fmtMoney(payment.amount as any, payment.invoice.currency), x: 200 },
    { text: payment.method, x: 320 },
    { text: payment.reference || "—", x: 430 },
  ]);

  doc.moveDown(2);
  doc.fontSize(10).text(`Montant facture : ${fmtMoney(payment.invoice.total as any, payment.invoice.currency)}`);
  doc.fontSize(10).text(`Montant payé   : ${fmtMoney(payment.amount as any, payment.invoice.currency)}`);

  doc.moveDown(2);
  doc.fontSize(9).fillColor("#666").text("Document généré automatiquement — ne pas répondre à cet email.");
  return await docToBuffer(doc);
}

// —— Stockage local ————————————————————————————————————————————————————————
const PUBLIC_DIR = path.join(process.cwd(), "public");
const PDF_DIR = path.join(PUBLIC_DIR, "pdf");

export async function store(buffer: Buffer, fileName: string): Promise<string> {
  await fs.mkdir(PUBLIC_DIR, { recursive: true });
  await fs.mkdir(PDF_DIR, { recursive: true });

  const safeName = fileName.replace(/[^a-zA-Z0-9._-]/g, "_");
  const absPath = path.join(PDF_DIR, safeName);
  await fs.writeFile(absPath, buffer);

  return `/files/pdf/${safeName}`;
}

// API attendue par tes controllers
export const pdfService = {
  renderInvoice,
  renderPaymentReceipt,
  store,
};
