// src/modules/billing/payments/controllerPayments.ts
import { Request, Response } from "express";
import { prisma } from "../../../infra/prisma";
import { Prisma } from "@prisma/client"; // <-- IMPORTANT pour Prisma.Decimal
import { notFound, badRequest } from "../../../utils/appError";
import { CreatePaymentSchema, ListPaymentsSchema } from "../dto";
import { applySettlement } from "../invoices/serviceInvoice";

export class PaymentController {
  static async list(req: Request, res: Response) {
    const me = req.user!;
    const p = ListPaymentsSchema.parse(req.query);

    const where: any = {};
    if (p.invoiceId) where.invoiceId = p.invoiceId;
    if (p.from || p.to) {
      where.paidAt = {
        ...(p.from ? { gte: new Date(p.from) } : {}),
        ...(p.to ? { lte: new Date(p.to) } : {}),
      };
    }

    const [items, total] = await Promise.all([
      prisma.payment.findMany({
        where,
        orderBy: { [p.orderBy]: p.order },
        skip: (p.page - 1) * p.pageSize,
        take: p.pageSize,
        include: { invoice: true },
      }),
      prisma.payment.count({ where }),
    ]);

    res.json({ items, meta: { page: p.page, pageSize: p.pageSize, total } });
  }

static async create(req: Request, res: Response) {
  const data = CreatePaymentSchema.parse(req.body);

  const payment = await prisma.$transaction(async (tx) => {
    // 1) Charge la facture
    const inv = await tx.invoice.findUnique({
      where: { id: data.invoiceId },
      select: { id: true, total: true }, // le statut n'est pas nécessaire pour décider
    });
    if (!inv) return res.status(404).json({ code: "INVOICE_NOT_FOUND" });

    // 2) Somme déjà payée (Decimal)
    const agg = await tx.payment.aggregate({
      where: { invoiceId: inv.id },
      _sum: { amount: true },
    });
    const already = new Prisma.Decimal(agg._sum.amount ?? 0);
    const total  = new Prisma.Decimal(inv.total);
    const rest   = total.sub(already);              // Decimal sécurisé

    // 3) Blocage métier: déjà soldée ?
    if (rest.lte(0)) {
      return res.status(400).json({ code: "INVOICE_ALREADY_PAID" });
    }

    // 4) Montant demandé & overpayment
    const amount = new Prisma.Decimal(data.amount);
    if (amount.lte(0)) {
      return res.status(400).json({ code: "AMOUNT_INVALID" });
    }
    if (amount.gt(rest)) {
      return res.status(400).json({
        code: "OVERPAYMENT",
        message: `Reste: ${rest.toFixed(2)}`
      });
    }

    // 5) Création du paiement
    const p = await tx.payment.create({
      data: {
        invoice: { connect: { id: inv.id } },
        amount,
        method: data.method,
        paidAt: data.paidAt ? new Date(data.paidAt) : new Date(),
        reference: data.reference ?? null,
      },
      include: { invoice: true },
    });

    // 6) Recalcule et applique le statut (PARTIALLY_PAID / PAID) proprement
    await applySettlement(tx, inv.id);

    return p;
  });

  return res.status(201).json(payment);
}


  static async detail(req: Request, res: Response) {
    const pay = await prisma.payment.findUnique({
      where: { id: req.params.id },
      include: { invoice: true },
    });
    if (!pay) throw notFound("PAYMENT_NOT_FOUND");
    res.json(pay);
  }
}
