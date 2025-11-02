import z from 'zod';

export const InvoiceItemSchema = z.object({
    label: z.string().min(1),
    qty: z.number().positive(),
    unitPrice: z.number().nonnegative(),
    taxRate: z.number().min(0).max(1).default(0),
});

export const CreateInvoiceSchema = z.object({
    patientId: z.string().uuid(),
    appointmentId: z.string().uuid().optional(),
    items: z.array(InvoiceItemSchema).min(1),
    currency: z.enum(['EUR']).default('EUR'),
    date: z.string().datetime().optional()
});

export const EditInvoiceSchema = z.object({
    items: z.array(InvoiceItemSchema).min(1).optional(),
    currency: z.enum(['EUR']).optional(),
    date: z.string().datetime().optional()
});

export const ListInvoicesSchema = z.object({
    q: z.string().optional(),
    status: z.enum(["DRAFT","SENT","PAID","PARTIALLY_PAID","VOID"]).optional(),
    to: z.string().datetime().optional(),
    patientId: z.string().uuid().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
    orderBy: z.enum(["date","createdAt","number","total"]).default("date"),
    order: z.enum(["asc","desc"]).default("desc")
});

export const CreatePaymentSchema = z.object({
    invoiceId: z.string().uuid(),
    amount: z.number().positive(),
    method: z.enum(["CASH","CARD","TRANSFER","CHECK"]),
    paidAt: z.string().datetime().optional(),
    reference: z.string().optional()
});

export const ListPaymentsSchema = z.object({
    invoiceId: z.string().uuid().optional(),
    from: z.string().datetime().optional(),
    to: z.string().datetime().optional(),
    page: z.coerce.number().int().min(1).default(1),
    pageSize: z.coerce.number().int().min(1).max(200).default(20),
    orderBy: z.enum(["paidAt","createdAt","amount"]).default("paidAt"),
    order: z.enum(["asc","desc"]).default("desc")
});



