import { prisma } from "../../../infra/prisma";
import { Prisma, InvoiceStatus, Currency } from "@prisma/client";

type InvoiceItem = { label: string; qty: number; unitPrice: number; taxRate?: number };


export function computeTotals(items: InvoiceItem[]) {
  const subtotal = items.reduce((s, it) => s + it.qty * it.unitPrice, 0);
  const taxTotal = items.reduce((s, it) => s + (it.qty * it.unitPrice) * (it.taxRate ?? 0), 0);
  const total = subtotal + taxTotal;
  return { subtotal, taxTotal, total };
}


export async function generateInvoiceNumber(tx: Prisma.TransactionClient) {
  const today = new Date();
  const y = today.getFullYear();
  const m = String(today.getMonth()+1).padStart(2, "0");
  const prefix = `${y}${m}-`;
  const last = await tx.invoice.findFirst({
    where: { number: { startsWith: prefix } },
    orderBy: { number: "desc" },
    select: { number: true },
  });
  const seq = last ? parseInt(last.number.split("-")[1] ?? "0", 10) + 1 : 1;
  return `${prefix}${String(seq).padStart(4, "0")}`;
}

export async function ensureInvoiceIsEditable(id: string) {
  const inv = await prisma.invoice.findUnique({ where: { id }, select: { status: true, issuerId: true }});
  if (!inv) throw new Error("INVOICE_NOT_FOUND");
  if (inv.status === "VOID" || inv.status === "PAID") throw new Error("INVOICE_LOCKED");
  return inv;
}

export async function recalcAndUpdateTotals(tx: Prisma.TransactionClient, invoiceId: string) {
  const inv = await tx.invoice.findUnique({ where: { id: invoiceId }});
  if (!inv) throw new Error("INVOICE_NOT_FOUND");
  const items = (inv.items as unknown as InvoiceItem[]) ?? [];
  const totals = computeTotals(items);
  await tx.invoice.update({
    where: { id: invoiceId },
    data: { 
      subtotal: new Prisma.Decimal(totals.subtotal),
      taxTotal: new Prisma.Decimal(totals.taxTotal),
      total: new Prisma.Decimal(totals.total),
    },
  });
}

export async function getInvoiceWithPayments(id: string) {
  return prisma.invoice.findUnique({
    where: { id },
    include: {
      patient: { select: { id: true, firstName: true, lastName: true, email: true, ownerId: true } },
      payments: true,
      appointment: { select: { id: true, startsAt: true, endsAt: true } },
      issuer: { select: { id: true, firstName: true, lastName: true, email: true } },
    },
  });
}

export async function computePaidAmount(tx: Prisma.TransactionClient, invoiceId: string) {
  const agg = await tx.payment.aggregate({ where: { invoiceId }, _sum: { amount: true } });
  return new Prisma.Decimal(agg._sum.amount ?? 0);
}


export async function applySettlement(tx: Prisma.TransactionClient, invoiceId: string) {
  const inv = await tx.invoice.findUnique({
    where: { id: invoiceId },
    select: { id: true, status: true, total: true, paidAt: true },
  });
  if (!inv) throw new Error("INVOICE_NOT_FOUND");

  const total = new Prisma.Decimal(inv.total);
  const paid  = await computePaidAmount(tx, invoiceId);
  const rest  = total.sub(paid);

  let status: InvoiceStatus;
  let paidAt: Date | null = inv.paidAt ?? null;

  if (inv.status === "VOID") {
    status = "VOID";
    // paidAt inchangé
  } else if (rest.lte(0)) {
    status = "PAID";
    if (!paidAt) paidAt = new Date();
  } else if (paid.gt(0)) {
    status = "PARTIALLY_PAID";
    // on ne force pas paidAt ici
  } else {
    status = "SENT";
    paidAt = null;
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: {
      status,
      // si schema.paidAt est nullable: undefined = ne touche pas, null = efface
      paidAt: paidAt ?? undefined,
    },
  });
}

export async function recalcInvoiceStatus(tx: Prisma.TransactionClient, invoiceId: string) {
  const inv = await tx.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: true }
  });
  
  if (!inv) throw new Error("INVOICE_NOT_FOUND");
  
  const total = Number(inv.total);
  const paid = inv.payments.reduce((sum, p) => sum + Number(p.amount), 0);
  
  // Utilisez une tolérance pour les arrondis
  const tolerance = 0.01;
  let status: InvoiceStatus = inv.status;
  let paidAt: Date | null = inv.paidAt;

  if (Math.abs(paid - total) < tolerance) {
    status = "PAID";
    paidAt = paidAt || new Date();
  } else if (paid > 0 && paid < total) {
    status = "PARTIALLY_PAID";
  } else if (paid <= 0 && inv.status !== "VOID") {
    status = "SENT";
  }

  await tx.invoice.update({
    where: { id: invoiceId },
    data: { 
      status,
      paidAt: paidAt || undefined
    },
  });
}

