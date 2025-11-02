import { prisma } from "../../../infra/prisma";
import { stripe } from "../../../utils/stripe";

export async function getOutstanding(invoiceId: string) {
  const inv = await prisma.invoice.findUnique({
    where: { id: invoiceId },
    include: { payments: { select: { amount: true } } },
  });
  
  if (!inv) throw new Error("INVOICE_NOT_FOUND");
  
  const total = Number(inv.total ?? 0);
  const paid = inv.payments.reduce((s, p) => s + Number(p.amount ?? 0), 0);
  const outstanding = Math.max(0, total - paid);
  
  return { inv, outstanding, total, paid };
}

export async function createCheckoutSessionForInvoice(args: {
  invoiceId: string;
  email?: string;
  description?: string;
  currency?: "eur";
}) {
  const { inv, outstanding } = await getOutstanding(args.invoiceId);
  
  if (outstanding <= 0) throw new Error("NOTHING_TO_PAY");
  if (inv.status === "VOID") throw new Error("INVOICE_VOID");
  if (inv.status === "PAID") throw new Error("INVOICE_ALREADY_PAID");

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    payment_method_types: ["card"],
    line_items: [
      {
        price_data: {
          currency: args.currency ?? "eur",
          product_data: {
            name: args.description || `Règlement facture ${inv.number ?? inv.id}`,
            description: `Facture ${inv.number} - ${inv.patientId}`,
          },
          unit_amount: Math.round(outstanding * 100), // Convertir en centimes
        },
        quantity: 1,
      },
    ],
    customer_email: args.email,
    metadata: { 
      invoiceId: inv.id,
      invoiceNumber: inv.number || '',
    },
    success_url: `https://stripe.com`,
    cancel_url: `https://stripe.com`,
  });

  return { session, outstanding };
}