import { api } from "@/lib/api";
import { type PageResponse } from "../types/billingTypes";
import type { ListPaymentsParams, Payment, CreatePaymentInput } from "../types/billingTypes";

const BASE = "billing";

function toSearchParams(p: ListPaymentsParams = {}): Record<string, string> {
  const o: Record<string, string> = {};
  if (p.invoiceId) o.invoiceId = p.invoiceId;
  if (p.from) o.from = p.from;
  if (p.to) o.to = p.to;
  if (p.page != null) o.page = String(p.page);
  if (p.pageSize != null) o.pageSize = String(p.pageSize);
  if (p.orderBy) o.orderBy = p.orderBy;
  if (p.order) o.order = p.order;
  return o;
}

export async function listPayments(
    params: ListPaymentsParams = {}
): Promise<PageResponse<Payment>> {
    return api
    .get(`${BASE}/payments`, { searchParams: toSearchParams(params) })
    .json<PageResponse<Payment>>();
}

export async function createPayment(payload: CreatePaymentInput) {
  const res = await api.post("billing/payments", { json: payload });
  return res.json();
}


export async function getPayment(id: string): Promise<Payment> {
  return api
    .get(`${BASE}/payments/${id}`)
    .json<Payment>();
}
