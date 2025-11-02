import { api } from "@/lib/api";

export interface CreateStripeCheckoutParams {
  invoiceId: string;
  email?: string;
  description?: string;
  sendEmail?: boolean;
}

export interface StripeCheckoutResponse {
  url: string;
  sessionId: string;
  amount: number;
}

export async function createStripeCheckout(
  params: CreateStripeCheckoutParams
): Promise<StripeCheckoutResponse> {
  return api
    .post("billing/stripe/checkout", { json: params })
    .json<StripeCheckoutResponse>();
}