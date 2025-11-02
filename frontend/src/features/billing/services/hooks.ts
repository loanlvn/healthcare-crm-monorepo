import { useMutation, useQuery, useQueryClient, keepPreviousData } from "@tanstack/react-query";
import {
  listInvoices, createInvoice, getInvoice, editInvoice, sendInvoice, voidInvoice
} from "../services/servicesInvoice";
import {
  listPayments, createPayment, getPayment
} from "../services/servicesPayments";
import type {
  ListInvoicesParams, CreateInvoiceInput, EditInvoiceInput, ListPaymentsParams, CreatePaymentInput
} from "../types/billingTypes";

// INVOICES
export function useListInvoices(params: ListInvoicesParams) {
  return useQuery({
    queryKey: ["billing", "invoices", params],
    queryFn: () => listInvoices(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useInvoice(id?: string, enabled = !!id) {
  return useQuery({
    queryKey: ["billing", "invoice", id],
    queryFn: () => getInvoice(id!),
    enabled,
    staleTime: 30_000,
  });
}

export function useCreateInvoice() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreateInvoiceInput) => createInvoice(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });
}

export function useEditInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: EditInvoiceInput) => editInvoice(id, input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "invoice", id] });
      qc.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });
}

export function useSendInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => sendInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "invoice", id] });
      qc.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });
}

export function useVoidInvoice(id: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: () => voidInvoice(id),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "invoice", id] });
      qc.invalidateQueries({ queryKey: ["billing", "invoices"] });
    },
  });
}

// PAYMENTS
export function useListPayments(params: ListPaymentsParams) {
  return useQuery({
    queryKey: ["billing", "payments", params],
    queryFn: () => listPayments(params),
    placeholderData: keepPreviousData,
    staleTime: 30_000,
  });
}

export function useCreatePayment() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (input: CreatePaymentInput) => createPayment(input),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ["billing", "payments"] });
      qc.invalidateQueries({ queryKey: ["billing", "invoices"] }); 
    },
  });
}

export function usePayment(id?: string, enabled = !!id) {
  return useQuery({
    queryKey: ["billing", "payment", id],
    queryFn: () => getPayment(id!),
    enabled,
    staleTime: 30_000,
  });
}
