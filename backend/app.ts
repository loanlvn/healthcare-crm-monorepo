import express from 'express';
import cors from 'cors';
import helmet, { crossOriginResourcePolicy } from 'helmet';
import cookieParser from 'cookie-parser';
import pino from 'pino';
import pinoHttp from 'pino-http';
import router from './src/routes';
import { errorHandler } from './src/middlewares/errorHandler'
import path from 'node:path';
import { stripe } from './src/utils/stripe';
import type Stripe from 'stripe';
import { prisma } from './src/infra/prisma';

const app = express();

app.post('/api/billing/stripe/webhook', express.raw({ type: 'application/json' }), async (req, res) => {
  const sig = req.headers['stripe-signature'] as string;
  let event: Stripe.Event;

  try {
    event = stripe.webhooks.constructEvent(req.body, sig, process.env.STRIPE_WEBHOOK_SECRET!);
  } catch (err: any) {
    console.error('Invalid webhook signature:', err.message);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  // Idempotence (évite double insert si Stripe retry)
  try {
    await prisma.stripeEventLog.create({ data: { eventId: event.id } });
  } catch {
    // déjà traité
    return res.json({ received: true });
  }

  try {
    switch (event.type) {
      case 'checkout.session.completed':
      case 'checkout.session.async_payment_succeeded': {
        const session = event.data.object as any; // Stripe.Checkout.Session
        const invoiceId: string | undefined = session?.metadata?.invoiceId;
        const amountCents: number | null = session?.amount_total ?? null;
        const amount = amountCents ? amountCents / 100 : null;

        if (!invoiceId || !amount || amount <= 0) break;

        await prisma.payment.create({
          data: {
            invoiceId,
            amount,
            paidAt: new Date(),
            method: 'STRIPE',
            note: `Stripe session ${session.id}`,
          } as any,
        });

        try {
          const { applySettlement } = await import('./src/modules/billing/invoices/serviceInvoice.js');
          await (applySettlement as any)(prisma, invoiceId);
        } catch {
          // Fallback simple si pas de service : total - somme(payments)
          const inv = await prisma.invoice.findUnique({
            where: { id: invoiceId },
            include: { payments: { select: { amount: true } } },
          });
          if (inv) {
            const total = Number(inv.total ?? 0);
            const paid = inv.payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
            const status = paid >= total ? 'PAID' : paid > 0 ? 'PARTIALLY_PAID' : 'UNPAID';
            await prisma.invoice.update({ where: { id: invoiceId }, data: { status } as any });
          }
        }
        break;
      }

      case 'checkout.session.async_payment_failed': {
        const session = event.data.object as any;
        const invoiceId = session?.metadata?.invoiceId as string | undefined;
        if (invoiceId) {
          // Log interne/notification si tu veux
          console.warn('Paiement asynchrone échoué pour invoice', invoiceId);
        }
        break;
      }

      default:
        // Pas critique pour ton flow
        console.log('Unhandled event:', event.type);
    }

    return res.json({ received: true });
  } catch (err) {
    console.error('Webhook handler error:', err);
    return res.status(500).json({ error: 'webhook handler error' });
  }
});

const ORIGIN = 'http://localhost:5173'; 
app.use(cors({
  origin: ORIGIN,
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));

app.options(/.*/, cors({
  origin: ORIGIN,
  credentials: true,
  methods: ['GET','POST','PATCH','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
}));
app.use(helmet({ crossOriginResourcePolicy: { policy: "cross-origin" } }));
app.use(express.json());
app.use(cookieParser());
app.use(pinoHttp({ logger: pino({ level: process.env.NODE_ENV === 'production' ? 'info' : 'debug' }) }));
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: true, limit: "2mb" }));

app.use('/api', router);

app.use('/uploads', express.static(path.join(process.cwd(), 'uploads'), {
  setHeaders: (res) => {
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    res.setHeader('Surrogate-Control', 'no-store');
  }
}));
app.use('/files', express.static(path.join(process.cwd(), 'public')));

// 404 fallback
app.use((_req, res) => res.status(404).json({ error: 'NOT_FOUND' }));

// global error handler
app.use(errorHandler);

export default app;
