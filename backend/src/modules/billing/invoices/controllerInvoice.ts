import { Request, Response } from "express";
import { prisma } from "../../../infra/prisma";
import { Currency } from "@prisma/client";
import { badRequest, notFound } from "../../../utils/appError";
import {
  CreateInvoiceSchema,
  EditInvoiceSchema,
  ListInvoicesSchema,
} from "../dto";
import {
  computeTotals,
  generateInvoiceNumber,
  recalcAndUpdateTotals,
  getInvoiceWithPayments,
} from "./serviceInvoice";
import { mailer } from "../../../mailer/mailer";
import { pdfService } from "../../../utils/pdfService";

// helpers pour PDF
const toNumber = (v: unknown) =>
  v == null ? 0 : typeof v === "number" ? v : Number(v as any);

function serializeInvoiceForPdf(inv: any) {
  return {
    id: inv.id,
    number: inv.number,
    date: inv.date,
    currency: inv.currency,
    items: Array.isArray(inv.items) ? inv.items : [],
    subtotal: toNumber(inv.subtotal),
    taxTotal: toNumber(inv.taxTotal),
    total: toNumber(inv.total),
    status: inv.status,
    patient: {
      id: inv.patient.id,
      firstName: inv.patient.firstName,
      lastName: inv.patient.lastName,
      email: inv.patient.email,
    },
    issuer: {
      id: inv.issuer.id,
      firstName: inv.issuer.firstName,
      lastName: inv.issuer.lastName,
      email: inv.issuer.email,
    },
    payments:
      inv.payments?.map((p: any) => ({
        amount: toNumber(p.amount),
        paidAt: p.paidAt,
        method: p.method,
        reference: p.reference ?? null,
      })) ?? [],
  };
}

export class InvoiceController {
  // GET /invoices
  static async list(req: Request, res: Response) {
    const me = req.user!;
    const p = ListInvoicesSchema.parse(req.query);

    const where: any = {};
    if (p.status) where.status = p.status;
    const from = (p as any).from;
    if (from || p.to) {
      where.date = {
        gte: from ? new Date(from) : undefined,
        lte: p.to ? new Date(p.to) : undefined,
      };
    }
    if (p.patientId) where.patientId = p.patientId;
    if (p.q) {
      where.OR = [
        { number: { contains: p.q, mode: "insensitive" } },
        { patient: { lastName: { contains: p.q, mode: "insensitive" } } },
        { patient: { firstName: { contains: p.q, mode: "insensitive" } } },
      ];
    }

    if (me.role === "DOCTOR") {
      where.patient = { ownerId: me.id };
    }

    const [items, total] = await Promise.all([
      prisma.invoice.findMany({
        where,
        orderBy: { [p.orderBy]: p.order as "asc" | "desc" },
        skip: (p.page - 1) * p.pageSize,
        take: p.pageSize,
        select: {
          id: true,
          number: true,
          date: true,
          status: true,
          total: true,
          currency: true,
          patient: { select: { id: true, firstName: true, lastName: true } },
        },
      }),
      prisma.invoice.count({ where }),
    ]);

    res.json({
      items,
      meta: {
        page: p.page,
        pageSize: p.pageSize,
        total,
        hasNextPage: p.page * p.pageSize < total,
        hasPreviousPage: p.page > 1,
        orderBy: p.orderBy,
        order: p.order,
      },
    });
  }

  // POST /invoices
  static async create(req: Request, res: Response) {
    const me = req.user!;
    const body = CreateInvoiceSchema.parse(req.body);

    const totals = computeTotals(body.items);
    const invoice = await prisma.$transaction(async (tx) => {
      const number = await generateInvoiceNumber(tx);

      if (body.appointmentId) {
        const exists = await tx.invoice.findUnique({
          where: { appointmentId: body.appointmentId },
          select: { id: true },
        });
        if (exists) throw badRequest("INVOICE_ALREADY_EXISTS_FOR_APPOINTMENT");
      }

      return tx.invoice.create({
        data: {
          patientId: body.patientId,
          appointmentId: body.appointmentId,
          issuerId: me.id,
          number,
          date: body.date ? new Date(body.date) : new Date(),
          items: body.items,
          subtotal: totals.subtotal,
          taxTotal: totals.taxTotal,
          total: totals.total,
          currency: (body.currency ?? "EUR") as Currency,
          status: "DRAFT",
        },
      });
    });

    res.status(201).json(invoice);
  }

  // GET /invoices/:id
  static async detail(req: Request, res: Response) {
    const invoice = await getInvoiceWithPayments(req.params.id);
    if (!invoice) throw notFound("INVOICE_NOT_FOUND");
    res.json(invoice);
  }

  // PATCH /invoices/:id
  static async edit(req: Request, res: Response) {
    const id = req.params.id;
    const body = EditInvoiceSchema.parse(req.body);

    const updated = await prisma.$transaction(async (tx) => {
      const upd = await tx.invoice.update({
        where: { id },
        data: {
          date: body.date ? new Date(body.date) : undefined,
          currency: body.currency,
          items: body.items ?? undefined,
        },
      });
      if (body.items) await recalcAndUpdateTotals(tx, id);
      return tx.invoice.findUnique({ where: { id } });
    });

    res.json(updated);
  }

  // POST /invoices/:id/send
  static async send(req: Request, res: Response) {
    const id = req.params.id;

    const inv = await prisma.invoice.findUnique({
      where: { id },
      include: {
        patient: true,
        issuer: true,
        payments: true,
      },
    });
    if (!inv) throw notFound("INVOICE_NOT_FOUND");
    if (inv.status === "VOID") throw badRequest("CANNOT_SEND_VOID");
    if (!inv.patient.email) throw badRequest("PATIENT_MISSING_EMAIL");

    const invForPdf = serializeInvoiceForPdf(inv);

    const pdfBuffer = await pdfService.renderInvoice(invForPdf);
    const pdfUrl = await pdfService.store(pdfBuffer, `${inv.number}.pdf`);

    (await mailer.sendMail?.({
      to: inv.patient.email,
      subject: `Votre facture ${inv.number}`,
      html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;">
        <h2 style="margin:0 0 12px">Facture de ${
          inv.patient.firstName ?? ""
        }</h2>
        <p>Bonjour, \nVeuillez trouver votre facture ${
          inv.number
        } en pièce jointe.</p>
        <div style="margin-top:24px;">Cordialement,<br/>
        ${inv.issuer.firstName ?? ""} ${inv.issuer.lastName ?? ""} <br/> 
        <p style="color:#666;margin-top:16px">Ceci est un document généré automatiquement, veuillez ne pas y répondre.</p>
        </div>
      </div>
        `,
      attachments: [{ filename: `${inv.number}.pdf`, content: pdfBuffer }],
    })) ??
      mailer.sendMail({
        to: inv.patient.email,
        subject: `Votre facture ${inv.number}`,
        html: `
      <div style="font-family:system-ui,-apple-system,Segoe UI,Roboto,Arial,sans-serif;line-height:1.5;">
        <h2 style="margin:0 0 12px">Facture de ${
          inv.patient.firstName ?? ""
        }</h2>
        <p>Bonjour, \nVeuillez trouver votre facture ${
          inv.number
        } en pièce jointe.</p>
        <div style="margin-top:24px;">Cordialement,<br/>
        ${inv.issuer.firstName ?? ""} ${inv.issuer.lastName ?? ""} <br/> 
        <p style="color:#666;margin-top:16px">Ceci est un document généré automatiquement, veuillez ne pas y répondre.</p>
        </div>
      </div>
        `,
        attachments: [{ filename: `${inv.number}.pdf`, content: pdfBuffer }],
      });

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        status: inv.status === "DRAFT" ? "SENT" : inv.status,
        sentAt: new Date(),
        pdfUrl,
      },
    });

    res.json(updated);
  }

  // POST /invoices/:id/void
  static async void(req: Request, res: Response) {
    const id = req.params.id;

    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { id: true, status: true },
    });
    if (!inv) throw notFound("INVOICE_NOT_FOUND");
    if (inv.status === "PAID") throw badRequest("CANNOT_VOID_PAID");

    const updated = await prisma.invoice.update({
      where: { id },
      data: { status: "VOID" },
    });

    res.json(updated);
  }

  static async getInvoicePdf(req: Request, res: Response) {
    try {
      const { id } = req.params;
      const user = (req as any).user;
      if (!user) return res.status(401).json({ error: "Unauthorized" });

      const invDb = await getInvoiceWithPayments(id);
      if (!invDb) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

      const invForPdf = serializeInvoiceForPdf(invDb);

      // Génère le buffer PDF
      const pdfBuffer = await pdfService.renderInvoice(invForPdf);
      if (!pdfBuffer || pdfBuffer.length === 0) {
        return res.status(500).json({ error: "Empty PDF buffer" });
      }

      const filename = `invoice-${invDb.number || invDb.id}.pdf`;
      res.setHeader("Content-Type", "application/pdf");
      res.setHeader("Content-Disposition", `inline; filename="${filename}"`);
      res.setHeader("Access-Control-Expose-Headers", "Content-Disposition");

      return res.status(200).send(pdfBuffer);
    } catch (e) {
      console.error("getInvoicePdf error", e);
      return res.status(500).json({ error: "Unable to render invoice PDF" });
    }
  }
}
