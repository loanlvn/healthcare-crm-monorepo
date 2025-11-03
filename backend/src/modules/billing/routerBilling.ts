import { Router } from "express";
import express from "express";
import { InvoiceController } from "./invoices/controllerInvoice";
import { PaymentController } from "./payments/controllerPayments";
import {
  requireRole,
  requireInvoiceAccessOrAdminOrSecretary,
  requireInvoiceIssuerOrAdmin,
  requireInvoiceEditable,
  requireInvoiceSendRights,
  requireAdminToVoidInvoice,
  requireInvoiceAccessForPaymentCreation,
  requirePaymentAccess,
  requireLogged,
  requireOwnerPatientOrAdminOrSecretary,
} from "../../middlewares/guards";
import { StripeCheckoutController } from "./stripe/controllerStripe";


export const billingRouter = Router();

// INVOICES
billingRouter.get(
  "/invoices",
  requireLogged, 
  InvoiceController.list
);

billingRouter.post(
  "/invoices",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireOwnerPatientOrAdminOrSecretary,
  InvoiceController.create
);

billingRouter.get(
  "/invoices/:id",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireInvoiceAccessOrAdminOrSecretary,
  InvoiceController.detail
);

billingRouter.patch(
  "/invoices/:id",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireInvoiceAccessOrAdminOrSecretary,
  requireInvoiceIssuerOrAdmin,
  requireInvoiceEditable,
  InvoiceController.edit
);

billingRouter.post(
  "/invoices/:id/send",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireInvoiceSendRights,
  InvoiceController.send
);

billingRouter.post(
  "/invoices/:id/void",
  requireRole("ADMIN"), 
  requireAdminToVoidInvoice,
  InvoiceController.void
);

billingRouter.get(
  "/invoices/:id/pdf",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireInvoiceAccessOrAdminOrSecretary,
  InvoiceController.getInvoicePdf
)

// PAYMENTS
billingRouter.get(
  "/payments",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  PaymentController.list 
);

billingRouter.post(
  "/payments",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requireInvoiceAccessForPaymentCreation,
  PaymentController.create
);

billingRouter.get(
  "/payments/:id",
  requireRole("ADMIN", "SECRETARY", "DOCTOR"),
  requirePaymentAccess,
  PaymentController.detail
);

// STRIPE 
billingRouter.post(
  "/stripe/checkout",
  requireLogged,
  StripeCheckoutController.create
);

billingRouter.post(
  "/stripe/webhook",
  express.raw({ type: "application/json" }),
  StripeCheckoutController.stripeWebhook
)
