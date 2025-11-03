import type { RequestHandler } from "express";
import { prisma } from "../infra/prisma";
import type { Role } from "@prisma/client";

export const requireSelfOrAdmin: RequestHandler = (req, res, next) => {
    const me = req.user!;
    const targetId = req.params.id;
    if (me.role === 'ADMIN' || me.id === targetId) return next();
    return res.status(403).json({ error: 'FORBBINDEN_SELF' });
};

export const requireLogged: RequestHandler = (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: "UNAUTHORIZED" });
  return next();
};


function pickInvoiceId(req: any): string | undefined {
  return (
    req.params?.id ||
    req.params?.invoiceId ||
    req.body?.invoiceId ||
    req.query?.invoiceId
  );
}

export const requireOwnerPatientOrAdmin = (): RequestHandler => {
    return async (req, res, next) => {
        const me = req.user!;
        if (me.role === 'ADMIN') return next();

        const patientId = req.params.id ?? req.params.patientId;
        if(!patientId) return res.status(400).json({ error: 'PATIENT_ID_REQUIRED' });

        const p = await prisma?.patient.findUnique({ where: {id: patientId }, select: { ownerId: true }});
        if (!p) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });

        if(me.role === 'DOCTOR' && p.ownerId === me.id) return next();

        return res.status(403).json({ error: 'OWNER_REQUIRED' });
    };
};

export const requireOwnerAppointmentOrAdmin = (): RequestHandler => {
  return async (req, res, next) => {
    const me = req.user!;
    if (me.role === 'ADMIN') return next();

    const id = req.params.id;
    const a = await prisma.appointment.findUnique({ where: { id }, select: { doctorId: true } });
    if (!a) return res.status(404).json({ error: 'APPOINTMENT_NOT_FOUND' });

    if (me.role === 'DOCTOR' && a.doctorId === me.id) return next();
    return res.status(403).json({ error: 'OWNER_REQUIRED' });
  };
};

export const requireRole = (...roles: Role[]): RequestHandler => (req, res, next) => {
  if (!req.user) return res.status(401).json({ error: 'UNAUTHORIZED' });
  if (roles.includes(req.user.role)) return next();
  return res.status(403).json({ error: 'FORBIDDEN' });
};

export const requireOwnerPatientOrAdminOrSecretary: RequestHandler = async (req, res, next) => {
  const me = req.user!;
  if (me.role === 'ADMIN' || me.role === 'SECRETARY') return next();

  const patientId = req.params.id ?? req.params.patientId;
  if (!patientId) return res.status(400).json({ error: 'PATIENT_ID_REQUIRED' });

  const p = await prisma.patient.findUnique({ where: { id: patientId }, select: { ownerId: true } });
  if (!p) return res.status(404).json({ error: 'PATIENT_NOT_FOUND' });

  if (me.role === 'DOCTOR' && p.ownerId === me.id) return next();
  return res.status(403).json({ error: 'OWNER_REQUIRED' });
};

// --- Guards Billing (Invoices & Payments) ------------------------------------

export const requireInvoiceAccessOrAdminOrSecretary: RequestHandler = async (
  req,
  res,
  next
) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

  if (me.role === "ADMIN" || me.role === "SECRETARY") return next();

  if (me.role === "DOCTOR") {
    const invoiceId = pickInvoiceId(req);
    if (!invoiceId)
      return res.status(400).json({ error: "INVOICE_ID_REQUIRED" });

    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { patient: { select: { ownerId: true } } },
    });
    if (!inv) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

    if (inv.patient.ownerId !== me.id) {
      return res.status(403).json({ error: "FORBIDDEN_INVOICE_OWNER" });
    }
    return next();
  }

  return res.status(403).json({ error: "FORBIDDEN" });
};

export const requireDoctorOwnsPatientForInvoiceCreation: RequestHandler =
  async (req, res, next) => {
    const me = req.user!;
    if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

    if (me.role === "ADMIN" || me.role === "SECRETARY") return next();

    if (me.role === "DOCTOR") {
      const patientId = req.body?.patientId;
      if (!patientId)
        return res.status(400).json({ error: "PATIENT_ID_REQUIRED" });

      const p = await prisma.patient.findUnique({
        where: { id: patientId },
        select: { ownerId: true },
      });
      if (!p) return res.status(404).json({ error: "PATIENT_NOT_FOUND" });

      if (p.ownerId !== me.id)
        return res.status(403).json({ error: "OWNER_REQUIRED" });
      return next();
    }

    return res.status(403).json({ error: "FORBIDDEN" });
  };

export const requireInvoiceIssuerOrAdmin: RequestHandler = async (
  req,
  res,
  next
) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

  const id = req.params.id;
  if (!id) return res.status(400).json({ error: "INVOICE_ID_REQUIRED" });

  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { issuerId: true },
  });
  if (!inv) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

  if (me.role === "ADMIN" || inv.issuerId === me.id) return next();
  return res.status(403).json({ error: "ONLY_ISSUER_OR_ADMIN_CAN_EDIT" });
};

export const requireInvoiceEditable: RequestHandler = async (
  req,
  res,
  next
) => {
  const id = req.params.id;
  const inv = await prisma.invoice.findUnique({
    where: { id },
    select: { status: true },
  });
  if (!inv) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

  if (inv.status === "PAID" || inv.status === "VOID") {
    return res.status(400).json({ error: "INVOICE_LOCKED" });
  }
  return next();
};

export const requireAdminToVoidInvoice: RequestHandler = (req, res, next) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });
  if (me.role !== "ADMIN")
    return res.status(403).json({ error: "ONLY_ADMIN_CAN_VOID" });
  return next();
};

export const requireInvoiceSendRights: RequestHandler = async (
  req,
  res,
  next
) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

  if (me.role === "ADMIN" || me.role === "SECRETARY") return next();

  if (me.role === "DOCTOR") {
    const id = req.params.id;
    if (!id) return res.status(400).json({ error: "INVOICE_ID_REQUIRED" });

    const inv = await prisma.invoice.findUnique({
      where: { id },
      select: { patient: { select: { ownerId: true } } },
    });
    if (!inv) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

    if (inv.patient.ownerId !== me.id) {
      return res.status(403).json({ error: "FORBIDDEN_INVOICE_OWNER" });
    }
    return next();
  }

  return res.status(403).json({ error: "FORBIDDEN" });
};

export const requirePaymentAccess: RequestHandler = async (req, res, next) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

  if (me.role === "ADMIN" || me.role === "SECRETARY") return next();

  if (me.role === "DOCTOR") {
    const paymentId = req.params.id;
    if (!paymentId)
      return res.status(400).json({ error: "PAYMENT_ID_REQUIRED" });

    const pay = await prisma.payment.findUnique({
      where: { id: paymentId },
      select: {
        invoice: { select: { patient: { select: { ownerId: true } } } },
      },
    });
    if (!pay) return res.status(404).json({ error: "PAYMENT_NOT_FOUND" });

    if (pay.invoice.patient.ownerId !== me.id) {
      return res.status(403).json({ error: "FORBIDDEN_PAYMENT_OWNER" });
    }
    return next();
  }

  return res.status(403).json({ error: "FORBIDDEN" });
};

export const requireInvoiceAccessForPaymentCreation: RequestHandler = async (
  req,
  res,
  next
) => {
  const me = req.user!;
  if (!me) return res.status(401).json({ error: "UNAUTHORIZED" });

  if (me.role === "ADMIN" || me.role === "SECRETARY") return next();

  if (me.role === "DOCTOR") {
    const invoiceId = req.body?.invoiceId;
    if (!invoiceId)
      return res.status(400).json({ error: "INVOICE_ID_REQUIRED" });

    const inv = await prisma.invoice.findUnique({
      where: { id: invoiceId },
      select: { patient: { select: { ownerId: true } }, status: true },
    });
    if (!inv) return res.status(404).json({ error: "INVOICE_NOT_FOUND" });

    if (inv.patient.ownerId !== me.id) {
      return res.status(403).json({ error: "FORBIDDEN_INVOICE_OWNER" });
    }
    if (inv.status === "VOID")
      return res.status(400).json({ error: "CANNOT_PAY_VOID" });

    return next();
  }

  return res.status(403).json({ error: "FORBIDDEN" });
};