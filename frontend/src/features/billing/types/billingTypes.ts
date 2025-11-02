export type Order = 'asc' | 'desc';

export type PageMeta = {
  page: number;
  pageSize: number;
  total: number;
  hasNextPage: boolean;
  hasPreviousPage: boolean;
  orderBy?: string;
  order?: Order;
};

export type PageResponse<T> = { items: T[]; meta: PageMeta };

export type InvoiceStatus = 'DRAFT' | 'SENT' | 'PAID' | 'PARTIALLY_PAID' | 'VOID';
export type PayMethod = 'CASH' | 'CARD' | 'TRANSFER' | 'CHECK';

export type InvoiceItem = {
  label: string;
  qty: number;
  unitPrice: number;
  taxRate?: number; // 0..1 (ex: 0.23)
};

export type InvoiceListItem = {
  id: string;
  number: string;
  date: string;
  status: InvoiceStatus;
  total: number | string;
  currency: 'EUR' | string;
  patient: { id: string; firstName: string; lastName: string };
};

export type Invoice = {
  id: string;
  number: string;
  date: string;
  status: InvoiceStatus;
  subtotal: number | string;
  taxTotal: number | string;
  total: number | string;
  currency: 'EUR' | string;
  items: InvoiceItem[];
  patient: { id: string; firstName: string; lastName: string; email?: string | null };
  issuer: { id: string; firstName: string; lastName: string; email?: string | null };
  payments?: Array<{ id: string; amount: number | string; method: PayMethod; paidAt: string; reference?: string | null }>;
  pdfUrl?: string | null;
};

export type ListInvoicesParams = {
  q?: string;
  status?: InvoiceStatus;
  from?: string; // ISO
  to?: string;   // ISO
  patientId?: string;
  page?: number;
  pageSize?: number;
  orderBy?: 'date' | 'createdAt' | 'number' | 'total';
  order?: Order;
};

export type CreateInvoiceInput = {
  patientId: string;
  appointmentId?: string;
  items: InvoiceItem[];
  currency?: 'EUR';
  date?: string; // ISO
};

export type EditInvoiceInput = {
  items?: InvoiceItem[];
  date?: string; // ISO
  currency?: 'EUR';
};

export type Payment = {
  id: string;
  invoiceId: string;
  amount: number | string;
  method: PayMethod;
  paidAt: string;
  reference?: string | null;
  invoice?: { id: string; number: string; patientId: string; total: number | string };
};

export type ListPaymentsParams = {
  invoiceId?: string;
  from?: string;
  to?: string;
  page?: number;
  pageSize?: number;
  orderBy?: 'paidAt' | 'createdAt' | 'amount';
  order?: Order;
};

export type CreatePaymentInput = {
  invoiceId: string;
  amount: number;
  method: PayMethod;
  paidAt?: string;
  reference?: string;
};
