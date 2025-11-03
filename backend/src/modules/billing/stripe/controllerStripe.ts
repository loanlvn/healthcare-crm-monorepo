import { Request, Response } from "express";
import { createCheckoutSessionForInvoice } from "./serviceStripe";
import { sendPaymentLinkEmail } from "../../../mailer/mailer";
import { formatEUR } from "../../../utils/money";
import { prisma } from "../../../infra/prisma";
import type Stripe from "stripe";
import { applySettlement } from "../invoices/serviceInvoice";
import { recalcInvoiceStatus } from "../invoices/serviceInvoice";
import { stripe } from "../../../utils/stripe";

export class StripeCheckoutController {
static async create(req: Request, res: Response) {
    const { invoiceId, email, description, sendEmail = false } = req.body ?? {};
    if (!invoiceId) return res.status(400).json({ error: "invoiceId is required" });

    try {
      const { session, outstanding } = await createCheckoutSessionForInvoice({
        invoiceId,
        email,
        description,
        currency: "eur",
      });

      if (sendEmail) {
        if (!email) {
          return res.status(400).json({ error: "email is required when sendEmail=true" });
        }
        // ISOLER l’envoi e-mail pour éviter le 500 global
        try {
          await sendPaymentLinkEmail(email, session.url!, formatEUR(outstanding));
          return res.status(204).end();
        } catch (mailErr) {
          console.error("sendPaymentLinkEmail failed:", mailErr);
          return res.status(200).json({
            url: session.url,
            amount: outstanding,
            emailed: false,
            error: "MAIL_SEND_FAILED",
          });
        }
      }

      return res.json({
        url: session.url,
        sessionId: session.id,
        amount: outstanding,
      });
    } catch (e: any) {
      if (e?.message === "NOTHING_TO_PAY")
        return res.status(409).json({ error: "Facture déjà soldée" });
      if (e?.message === "INVOICE_NOT_FOUND")
        return res.status(404).json({ error: "Facture introuvable" });

      console.error("stripe checkout create error", e);
      return res.status(500).json({ error: "Unable to create checkout session" });
    }
  }

  static async stripeWebhook(req: any, res: any) {
    const sig = req.headers["stripe-signature"] as string;
    let event: Stripe.Event;

    try {
      event = stripe.webhooks.constructEvent(
        req.body,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET!
      );
    } catch (err: any) {
      console.error("Webhook signature verification failed:", err.message);
      return res.status(400).send(`Webhook Error: ${err.message}`);
    }

    try {
      await prisma.stripeEventLog.create({ data: { eventId: event.id } });
    } catch {
      console.log(`Event ${event.id} already processed`);
      return res.json({ received: true });
    }

    try {
      switch (event.type) {
        case "checkout.session.completed":
        case "checkout.session.async_payment_succeeded": {
          const session = event.data.object as any;
          const invoiceId: string | undefined = session?.metadata?.invoiceId;
          const amountCents: number | null = session?.amount_total ?? null;
          const amount = amountCents ? amountCents / 100 : null;

          console.log(`Processing payment for invoice ${invoiceId}, amount: ${amount}`);

          if (!invoiceId || !amount || amount <= 0) {
            console.error("Missing invoiceId or invalid amount", { invoiceId, amount });
            break;
          }

          await prisma.$transaction(async (tx) => {
            // Créer le paiement
            await tx.payment.create({
              data: {
                invoiceId,
                amount: amount,
                paidAt: new Date(),
                method: "STRIPE",
                reference: `Stripe session ${session.id}`,
              },
            });

            // Mettre à jour le statut de la facture
            await recalcInvoiceStatus(tx, invoiceId);
          });

          console.log(`Successfully processed payment for invoice ${invoiceId}`);
          break;
        }

        case "checkout.session.async_payment_failed": {
          const session = event.data.object as any;
          const invoiceId = session?.metadata?.invoiceId as string | undefined;
          console.error(`Payment failed for invoice ${invoiceId}, session: ${session.id}`);
          break;
        }

        default:
          console.log(`Unhandled event type: ${event.type}`);
      }

      return res.json({ received: true });
    } catch (err) {
      console.error("Webhook handler error:", err);
      return res.status(500).json({ error: "webhook handler error" });
    }
  }
}
