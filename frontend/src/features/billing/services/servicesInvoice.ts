import { api } from "@/lib/api";
import { type PageResponse } from "../types/billingTypes";
import type {
  ListInvoicesParams,
  InvoiceListItem,
  Invoice,
  CreateInvoiceInput,
  EditInvoiceInput,
} from "../types/billingTypes";

const BASE = "billing";

// ne pas envoyer de clés undefined dans l'URL
function toSearchParams(p: ListInvoicesParams = {}): Record<string, string> {
  const o: Record<string, string> = {};
  if (p.q != null && p.q !== "") o.q = p.q;
  if (p.status) o.status = p.status;
  if (p.from) o.from = p.from;
  if (p.to) o.to = p.to;
  if (p.patientId) o.patientId = p.patientId;
  if (p.page != null) o.page = String(p.page);
  if (p.pageSize != null) o.pageSize = String(p.pageSize);
  if (p.orderBy) o.orderBy = p.orderBy;
  if (p.order) o.order = p.order;
  return o;
}

export async function listInvoices(
  params: ListInvoicesParams = {}
): Promise<PageResponse<InvoiceListItem>> {
  return api
    .get(`${BASE}/invoices`, { searchParams: toSearchParams(params) })
    .json<PageResponse<InvoiceListItem>>();
}

export async function createInvoice(input: CreateInvoiceInput): Promise<Invoice> {
  return api
    .post(`${BASE}/invoices`, { json: input })
    .json<Invoice>();
}

export async function getInvoice(id: string): Promise<Invoice> {
  return api
    .get(`${BASE}/invoices/${id}`)
    .json<Invoice>();
}

export async function editInvoice(id: string, input: EditInvoiceInput): Promise<Invoice> {
  return api
    .patch(`${BASE}/invoices/${id}`, { json: input })
    .json<Invoice>();
}

export async function sendInvoice(id: string): Promise<Invoice> {
  return api
    .post(`${BASE}/invoices/${id}/send`)
    .json<Invoice>();
}

export async function voidInvoice(id: string): Promise<Invoice> {
  return api
    .post(`${BASE}/invoices/${id}/void`)
    .json<Invoice>();
}
