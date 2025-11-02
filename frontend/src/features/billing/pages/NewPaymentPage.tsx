/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { useCreatePayment, useInvoice } from "../services/hooks";
import { createStripeCheckout as stripeCheckout } from "../services/servicesStripe";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";
import { api } from "@/lib/api";
import { useQuery } from "@tanstack/react-query";

type InvoiceLite = {
  id: string;
  number?: string | null;
  status: "DRAFT" | "SENT" | "PAID" | "VOID" | string;
  total: number;
  currency: string;
  createdAt: string;
};
type PageMeta = { page: number; pageSize: number; total?: number };
type InvoicePickerParams = {
  patientId?: string;
  q?: string;
  page?: number;
  pageSize?: number;
  orderBy?: string;
  order?: "asc" | "desc";
};

function useInvoicesForPicker(params: InvoicePickerParams, enabled = true) {
  return useQuery({
    queryKey: ["billing", "invoices-picker", params],
    enabled: enabled && !!params.patientId,
    queryFn: async () => {
      const res = await api.get("billing/invoices", { searchParams: params });
      const json = (await res.json()) as { items: InvoiceLite[]; meta: PageMeta };
      return json;
    },
  });
}

function useQueryParams() {
  const { search } = useLocation();
  return useMemo(() => new URLSearchParams(search), [search]);
}

export default function NewPaymentPageV2() {
  const q = useQueryParams();
  const [patientId, setPatientId] = useState<string | undefined>(undefined);
  const [invoiceId, setInvoiceId] = useState<string>(q.get("invoiceId") || "");
  const [amount, setAmount] = useState<string>("");
  const [method, setMethod] = useState<"CASH" | "CARD" | "TRANSFER" | "CHECK">("CARD");
  const [paidAt, setPaidAt] = useState("");
  const [reference, setReference] = useState("");
  const [isCreatingStripe, setIsCreatingStripe] = useState(false);
  const [invSearch, setInvSearch] = useState("");
  const [page, setPage] = useState(1);
  const pageSize = 10;

  const mut = useCreatePayment();
  const { data: invDetail } = useInvoice(invoiceId || undefined, !!invoiceId);

  useEffect(() => {
    if (!invDetail) return;
    if (invDetail.patient?.id && invDetail.patient.id !== patientId) {
      setPatientId(invDetail.patient.id);
    }
    if (invDetail.total != null && Array.isArray(invDetail.payments)) {
      const paid = invDetail.payments.reduce((s: number, p: any) => s + Number(p.amount || 0), 0);
      const restNum = Math.max(0, Number(invDetail.total) - paid);
      const currentNum = Number(
        (typeof amount === "string" ? amount : String(amount)).replace(",", ".")
      );
      if (restNum > 0 && (!Number.isFinite(currentNum) || Math.abs(restNum - currentNum) > 1e-6)) {
        setAmount(restNum.toFixed(2));
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [invDetail?.patient?.id, invDetail?.payments, invDetail?.total]);

  const {
    data: invs,
    isLoading: loadingInvs,
    isFetching,
  } = useInvoicesForPicker(
    {
      patientId,
      q: invSearch || undefined,
      page,
      pageSize,
      orderBy: "createdAt",
      order: "desc",
    },
    !!patientId
  );

  const meta = invs?.meta ?? { page, pageSize };
  const lastPage = meta.total
    ? Math.max(1, Math.ceil(meta.total / (meta.pageSize || pageSize)))
    : page + ((invs?.items?.length ?? 0) === (meta.pageSize || pageSize) ? 1 : 0);

  async function payWithStripe() {
    if (!invoiceId) return alert("Sélectionnez d'abord une facture");
    setIsCreatingStripe(true);
    try {
      const { url } = await stripeCheckout({
        invoiceId,
        email: invDetail?.patient?.email || undefined,
        description: invDetail?.number ? `Paiement facture ${invDetail.number}` : `Paiement facture ${invoiceId}`,
        sendEmail: false,
      });
      window.location.href = url;
    } catch {
      alert("Impossible de créer la session Stripe");
    } finally {
      setIsCreatingStripe(false);
    }
  }

  function toISOOrUndefined(s: string) {
    if (!s) return undefined;
    const normalized = s.trim().replace(/\//g, "-").replace(/\s+/, "T");
    const d = new Date(normalized);
    return Number.isFinite(d.getTime()) ? d.toISOString() : undefined;
  }

  function onSubmit(e: FormEvent) {
    e.preventDefault();

    const uuidRe =
      /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!invoiceId || !uuidRe.test(invoiceId)) {
      return alert("Facture invalide: invoiceId manquant ou non-UUID");
    }

    const safeAmountStr = typeof amount === "string" ? amount : String(amount ?? "");
    const amt = Math.round(Number(safeAmountStr.replace(",", ".")) * 100) / 100;
    if (!Number.isFinite(amt) || amt <= 0) {
      return alert("Montant invalide (> 0 requis)");
    }

    const paidAtISO = toISOOrUndefined(paidAt);
    if (paidAt && !paidAtISO) {
      return alert("Format de date invalide. Ex: 2025-10-30T10:00:00.000Z");
    }

    const alreadyPaid = (invDetail?.payments ?? []).reduce((s, p: any) => s + Number(p.amount || 0), 0);
    const rest = Math.max(0, Number(invDetail?.total ?? 0) - alreadyPaid);
    const round2 = (n: number) => Math.round(n * 100) / 100;
    if (round2(amt) > round2(rest)) {
      return alert(`Montant trop élevé. Reste: ${round2(rest).toFixed(2)} ${invDetail?.currency ?? "EUR"}`);
    }

    const payload = {
      invoiceId,
      amount: amt,
      method,
      paidAt: paidAtISO,
      reference: reference || undefined,
    };

    mut.mutate(payload, {
      onError: async (err: any) => {
        try {
          const res = err?.response;
          if (res) {
            const ct = res.headers?.get("content-type") ?? "";
            const data = ct.includes("application/json") ? await res.json() : await res.text();
            if (typeof data === "object" && data) {
              const code = (data as any).code || (data as any).error?.code;
              const message = (data as any).message || (data as any).error?.message;
              const issues = (data as any).issues;
              if (issues?.length) {
                alert(
                  issues
                    .map((i: any) => `${i.path?.join(".") || "field"}: ${i.message}`)
                    .join("\n")
                );
                return;
              }
              if (code || message) {
                alert(`${code ?? "ERREUR"}: ${message ?? ""}`);
                return;
              }
            }
            alert("Requête invalide (400).");
            return;
          }
        } catch {
          // ignore
        }
        alert("Erreur lors de la création du paiement.");
      },
    });
  }

  return (
    <div className="p-6 space-y-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">Nouveau paiement</h1>
        <Link to="/billing/payments" className="btn btn-outline">Retour</Link>
      </div>

      <form onSubmit={onSubmit} className="card p-6 space-y-6">
        <div>
          <div className="label mb-2">Patient</div>
          <PatientPicker
            value={patientId}
            onChange={(id) => {
              setPatientId(id);
              setInvoiceId("");
              setInvSearch("");
              setPage(1);
            }}
            required
            className="w-full"
            placeholder="Rechercher un patient…"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-2">
            <div className="label">Facture</div>
            <input
              className="input !py-1.5 !h-9 !text-sm w-56"
              placeholder="Rechercher une facture…"
              value={invSearch}
              onChange={(e) => {
                setInvSearch(e.target.value);
                setPage(1);
              }}
              disabled={!patientId}
            />
          </div>

          <div className={`border border-token rounded-xl ${!patientId ? "opacity-60" : ""}`}>
            {loadingInvs && <div className="p-3 text-sm">Chargement…</div>}
            {!loadingInvs && (!invs?.items?.length || invs.items.length === 0) && (
              <div className="p-3 text-sm">
                {patientId ? "Aucune facture" : "Sélectionnez d'abord un patient"}
              </div>
            )}
            {!!invs?.items?.length && (
              <ul className="max-h-48 overflow-auto">
                {invs.items.map((f) => {
                  const active = f.id === invoiceId;
                  return (
                    <li
                      key={f.id}
                      className={`px-3 py-2 cursor-pointer hover:bg-primary/5 ${active ? "bg-primary/10" : ""}`}
                      onClick={() => setInvoiceId(f.id)}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <div>
                          <div className="text-sm font-medium">{f.number || f.id}</div>
                          <div className="text-xs text-muted">
                            {new Date(f.createdAt).toLocaleDateString("fr-FR")}
                          </div>
                        </div>
                        <div className="text-right">
                          <span
                            className={`text-xs px-2 py-0.5 rounded-full border ${
                              f.status === "PAID"
                                ? "bg-green-100 text-green-800 border-green-200"
                                : f.status === "VOID"
                                  ? "bg-gray-100 text-gray-800 border-gray-200"
                                  : "bg-orange-100 text-orange-800 border-orange-200"
                            }`}
                          >
                            {f.status}
                          </span>
                          <div className="text-sm font-semibold">
                            {f.total} {f.currency}
                          </div>
                        </div>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}

            <div className="flex items-center gap-2 text-xs p-2 border-t border-token">
              <button
                type="button"
                className="border border-token px-2 py-0.5 rounded hover:bg-primary/5 disabled:opacity-50"
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                disabled={!patientId || (meta.page ?? 1) <= 1 || isFetching}
              >
                ◀
              </button>
              <span>Page {meta.page ?? page} / {lastPage}</span>
              <button
                type="button"
                className="border border-token px-2 py-0.5 rounded hover:bg-primary/5 disabled:opacity-50"
                onClick={() => setPage((p) => Math.min(lastPage, p + 1))}
                disabled={!patientId || isFetching}
              >
                ▶
              </button>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="label">Montant</div>
            <input
              className="input no-prefix"
              type="text"
              inputMode="decimal"
              placeholder="Ex: 60.00"
              value={typeof amount === "string" ? amount : String(amount ?? "")}
              onChange={(e) => {
                const raw = e.target.value.replace(",", ".");
                if (raw === "") return setAmount("");
                const normalized = raw.startsWith("0.") ? raw : raw.replace(/^0+(?=\d)/, "");
                if (/^\d*(\.\d{0,2})?$/.test(normalized)) setAmount(normalized);
              }}
              required
            />
            {!!invDetail && (
              <p className="text-xs text-muted mt-1">
                Total facture: {invDetail.total} {invDetail.currency}
              </p>
            )}
          </div>
          <div>
            <div className="label">Méthode</div>
            <select className="select" value={method} onChange={(e) => setMethod(e.target.value as any)}>
              <option value="CARD">Carte</option>
              <option value="CASH">Espèces</option>
              <option value="TRANSFER">Virement</option>
              <option value="CHECK">Chèque</option>
            </select>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <div className="label">Payé le (optionnel)</div>
            <input
              className="input"
              type="datetime-local"
              value={paidAt}
              onChange={(e) => setPaidAt(e.target.value)}
            />
          </div>
          <div>
            <div className="label">Référence (optionnel)</div>
            <input className="input" value={reference} onChange={(e) => setReference(e.target.value)} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 pt-2">
          <button className="btn btn-primary" type="submit" disabled={mut.isPending}>Enregistrer</button>
          <button
            type="button"
            className="btn btn-outline"
            onClick={payWithStripe}
            disabled={isCreatingStripe || !invoiceId}
          >
            {isCreatingStripe ? "Création Stripe…" : "Payer avec Stripe"}
          </button>
          {mut.isError && <span className="text-red-600 text-sm">{(mut.error as any).message}</span>}
          {mut.isSuccess && <span className="text-sm">Créé.</span>}
        </div>
      </form>
    </div>
  );
}
