/* eslint-disable react-hooks/exhaustive-deps */
/* eslint-disable @typescript-eslint/no-explicit-any */
import { useParams, Link } from "react-router-dom";
import {
  useInvoice,
  useEditInvoice,
  useSendInvoice,
  useVoidInvoice,
} from "../services/hooks";
import { useEffect, useMemo, useState } from "react";
import { createStripeCheckout } from "../services/servicesStripe";
import { PdfActions } from "@/components/ui/pdfActions";

export default function InvoiceDetailPage() {
  const { id = "" } = useParams();
  const { data: inv, isLoading, error, refetch } = useInvoice(id, !!id);
  const editMut = useEditInvoice(id);
  const sendMut = useSendInvoice(id);
  const voidMut = useVoidInvoice(id);
  const [isProcessingStripe, setIsProcessingStripe] = useState(false);
  const [editing, setEditing] = useState(false);
  const [draftItems, setDraftItems] = useState<any[]>([]);
  const [sentBanner, setSentBanner] = useState<null | { email?: string }>(null);

  useEffect(() => {
    if (!inv?.items) return;
    const next = inv.items.map((i: any) => ({ ...i }));
    const sameLength = next.length === draftItems.length;
    const same =
      sameLength &&
      next.every((item: any, index: number) => {
        const p = draftItems[index];
        return (
          p &&
          item.label === p.label &&
          item.qty === p.qty &&
          item.unitPrice === p.unitPrice &&
          item.taxRate === p.taxRate
        );
      });
    if (!same) setDraftItems(next);
  }, [inv?.items]);

  const totalPaid = useMemo(() => {
    if (!inv?.payments?.length) return 0;
    return inv.payments.reduce(
      (s: number, p: any) => s + Number(p.amount ?? 0),
      0
    );
  }, [inv?.payments]);

  const outstanding = useMemo(() => {
    const t = Number(inv?.total ?? 0);
    return Math.max(0, t - totalPaid);
  }, [inv?.total, totalPaid]);

  const shouldPoll = !!inv && inv.status !== "VOID" && outstanding > 0;

  useEffect(() => {
    if (!shouldPoll) return;
    const t = setInterval(() => {
      refetch(); // recharge la facture
    }, 5000); // toutes les 5s
    return () => clearInterval(t);
  }, [shouldPoll, refetch]);

  const handleStripePayment = async () => {
    if (!inv) return;

    console.log("Stripe payment initiated", {
      invoiceId: inv.id,
      outstanding,
      status: inv.status,
      patientEmail: inv.patient?.email,
    });

    // garde-fous utiles
    if (!inv.patient?.email) {
      alert("Impossible d’envoyer le lien : email patient manquant.");
      return;
    }
    if (outstanding <= 0 || inv.status === "PAID" || inv.status === "VOID") {
      alert("Aucun montant à régler ou facture non éligible.");
      return;
    }

    setIsProcessingStripe(true);
    try {
      await createStripeCheckout({
        invoiceId: inv.id,
        email: inv.patient?.email ?? undefined,
        description: `Paiement facture ${inv.number}`,
        sendEmail: true,
      });
      setSentBanner({ email: inv.patient?.email ?? undefined });
      refetch(); // refresh la facture
    } catch (error: any) {
      console.error("Stripe payment error:", error);
      const msg =
        error?.response?.data?.error ||
        error?.message ||
        "Erreur lors de la demande d’envoi du lien Stripe";
      alert(msg);
    } finally {
      setIsProcessingStripe(false);
    }
  };

  const onSaveItems = () => {
    // Nettoyage basique + recalcul côté backend
    const clean = draftItems
      .filter((i) => String(i.label || "").trim() !== "")
      .map((i) => ({
        label: i.label,
        qty: Number(i.qty) || 0,
        unitPrice: Number(i.unitPrice) || 0,
        taxRate: Number(i.taxRate) || 0,
      }));
    editMut.mutate({ items: clean }, { onSuccess: () => setEditing(false) });
  };

  if (isLoading)
    return (
      <div className="flex justify-center items-center min-h-64">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  if (error)
    return (
      <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
        Erreur: {(error as any).message}
      </div>
    );
  if (!inv)
    return (
      <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
        Facture non trouvée
      </div>
    );

  const pdfUrl = `/api/billing/invoices/${inv.id}/pdf`;

  return (
    <div className="p-6 space-y-6 max-w-7xl mx-auto">
      {sentBanner && (
        <div className="p-3 rounded-lg border border-green-200 bg-green-50 text-green-800 flex items-center justify-between">
          <span>
            PDF envoyé{sentBanner.email ? ` à ${sentBanner.email}` : ""} ✔
          </span>
          <button
            className="text-sm underline"
            onClick={() => setSentBanner(null)}
          >
            OK
          </button>
        </div>
      )}
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">Facture {inv.number}</h1>
          <p className="text-muted mt-1">
            Créée le {new Date(inv.date).toLocaleDateString("fr-FR")}
          </p>
        </div>
        <Link
          to="/billing/invoices"
          className="btn btn-outline flex items-center gap-2 w-fit"
        >
          <svg
            className="w-4 h-4"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M10 19l-7-7m0 0l7-7m-7 7h18"
            />
          </svg>
          Retour aux factures
        </Link>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Col principale */}
        <div className="lg:col-span-2 space-y-6">
          {/* Statut & actions */}
          <div className="bg-white/0 card p-6">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                <div
                  className={`px-3 py-1 rounded-full text-sm font-medium border ${
                    inv.status === "PAID"
                      ? "bg-green-100 text-green-800 border-green-200"
                      : inv.status === "VOID"
                        ? "bg-gray-100 text-gray-800 border-gray-200"
                        : "bg-orange-100 text-orange-800 border-orange-200"
                  }`}
                >
                  {inv.status === "PAID"
                    ? "Payée"
                    : inv.status === "VOID"
                      ? "Annulée"
                      : "En attente"}
                </div>
                <div className="text-lg font-semibold">
                  {inv.total} {inv.currency}
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                {pdfUrl ? (
                  <div className="w-full">
                    <PdfActions pdfUrl={pdfUrl} />
                  </div>
                ) : (
                  <div className="p-3 rounded-lg border border-yellow-200 bg-yellow-50 text-yellow-800 text-sm">
                    PDF non disponible pour cette facture.
                  </div>
                )}

                {outstanding > 0 && inv.status !== "VOID" && (
                  <button
                    onClick={handleStripePayment}
                    disabled={isProcessingStripe}
                    className="btn btn-primary flex items-center gap-2"
                  >
                    {isProcessingStripe ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        Envoi en cours...
                      </>
                    ) : (
                      <>
                        <svg
                          className="w-4 h-4"
                          fill="none"
                          stroke="currentColor"
                          viewBox="0 0 24 24"
                        >
                          <path
                            strokeLinecap="round"
                            strokeLinejoin="round"
                            strokeWidth={2}
                            d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1"
                          />
                        </svg>
                        Envoyer le lien Stripe
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>

            {outstanding > 0 && inv.status !== "VOID" && (
              <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex justify-between items-center">
                  <span className="text-blue-800 font-medium">
                    Montant restant à payer :
                  </span>
                  <span className="text-lg font-bold text-blue-900">
                    {outstanding} {inv.currency}
                  </span>
                </div>
              </div>
            )}

            {/* Actions secondaires */}
            <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-token">
              <button
                className="btn btn-outline flex items-center gap-2"
                onClick={() =>
                  sendMut.mutate(undefined, {
                    onSuccess: () => {
                      setSentBanner({ email: inv.patient?.email || undefined });
                      setTimeout(() => setSentBanner(null), 5000);
                    },
                  })
                }
                disabled={inv.status === "VOID" || sendMut.isPending}
              >
                {sendMut.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-600"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z"
                    />
                  </svg>
                )}
                {sendMut.isPending ? "Envoi…" : "Envoyer (PDF + email)"}
              </button>

              <button
                className="btn btn-outline text-red-600 border-red-200 hover:bg-red-50 flex items-center gap-2"
                onClick={() => {
                  if (
                    window.confirm(
                      "Êtes-vous sûr de vouloir annuler cette facture ?"
                    )
                  ) {
                    voidMut.mutate();
                  }
                }}
                disabled={inv.status === "PAID" || voidMut.isPending}
              >
                {voidMut.isPending ? (
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-red-600"></div>
                ) : (
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={2}
                      d="M6 18L18 6M6 6l12 12"
                    />
                  </svg>
                )}
                {voidMut.isPending ? "Annulation…" : "Annuler"}
              </button>
            </div>
          </div>

          {/* Items */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Articles</h3>
              <button
                className="btn btn-outline btn-sm"
                onClick={() => setEditing(true)}
              >
                Éditer
              </button>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-token">
                    <th className="text-left py-3 font-medium text-muted">
                      Description
                    </th>
                    <th className="text-right py-3 font-medium text-muted">
                      Quantité
                    </th>
                    <th className="text-right py-3 font-medium text-muted">
                      Prix unitaire
                    </th>
                    <th className="text-right py-3 font-medium text-muted">
                      TVA
                    </th>
                    <th className="text-right py-3 font-medium text-muted">
                      Total
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {inv.items?.map((item: any, index: number) => (
                    <tr
                      key={index}
                      className="border-b border-gray-100 last:border-0"
                    >
                      <td className="py-3">{item.label}</td>
                      <td className="py-3 text-right text-muted">{item.qty}</td>
                      <td className="py-3 text-right text-muted">
                        {item.unitPrice} {inv.currency}
                      </td>
                      <td className="py-3 text-right text-muted">
                        {item.taxRate}%
                      </td>
                      <td className="py-3 text-right font-medium">
                        {(
                          item.qty *
                          item.unitPrice *
                          (1 + item.taxRate / 100)
                        ).toFixed(2)}{" "}
                        {inv.currency}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* Patient */}
          <div className="card p-6">
            <h3 className="text-lg font-semibold mb-4">Patient</h3>
            <div className="space-y-2">
              <div>
                <div className="text-sm text-muted">Nom</div>
                <div className="font-medium">
                  {inv.patient?.firstName} {inv.patient?.lastName}
                </div>
              </div>
              {inv.patient?.email && (
                <div>
                  <div className="text-sm text-muted">Email</div>
                  <div className="font-medium">{inv.patient.email}</div>
                </div>
              )}
            </div>
          </div>

          {/* Paiements */}
          <div className="card p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold">Paiements</h3>
              <Link
                to={`/billing/new-payment?invoiceId=${inv.id}`}
                className="btn btn-outline btn-sm"
              >
                Ajouter
              </Link>
            </div>
            {inv.payments?.length ? (
              <div className="space-y-3">
                {inv.payments.map((p: any) => (
                  <div
                    key={p.id}
                    className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-token"
                  >
                    <div>
                      <div className="font-medium">{p.method}</div>
                      <div className="text-sm text-muted">
                        {new Date(p.paidAt).toLocaleDateString("fr-FR")}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="font-bold text-green-600">
                        {p.amount} {inv.currency}
                      </div>
                      {p.reference && (
                        <div className="text-sm text-muted">{p.reference}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-4 text-muted">Aucun paiement</div>
            )}
          </div>
        </div>
      </div>

      {/* Modal édition items */}
      {editing && (
        <div className="modal-overlay" onClick={() => setEditing(false)}>
          <div
            className="modal max-w-2xl w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h4 className="text-lg font-semibold">Modifier les articles</h4>
              <button
                className="btn btn-ghost"
                onClick={() => setEditing(false)}
              >
                Fermer
              </button>
            </div>

            <div className="space-y-3 max-h-[60vh] overflow-y-auto pr-1">
              {draftItems.map((item, idx) => (
                <div
                  key={idx}
                  className="grid grid-cols-1 md:grid-cols-5 gap-3 items-center border border-token rounded-xl p-3"
                >
                  <input
                    className="input md:col-span-2"
                    placeholder="Description"
                    value={item.label}
                    onChange={(e) => {
                      const v = [...draftItems];
                      v[idx].label = e.target.value;
                      setDraftItems(v);
                    }}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="Qté"
                    value={item.qty}
                    onChange={(e) => {
                      const v = [...draftItems];
                      v[idx].qty = Number(e.target.value) || 0;
                      setDraftItems(v);
                    }}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="PU"
                    value={item.unitPrice}
                    onChange={(e) => {
                      const v = [...draftItems];
                      v[idx].unitPrice = Number(e.target.value) || 0;
                      setDraftItems(v);
                    }}
                  />
                  <input
                    type="number"
                    className="input"
                    placeholder="TVA %"
                    value={item.taxRate}
                    onChange={(e) => {
                      const v = [...draftItems];
                      v[idx].taxRate = Number(e.target.value) || 0;
                      setDraftItems(v);
                    }}
                  />
                </div>
              ))}

              <button
                className="btn btn-outline btn-sm"
                onClick={() =>
                  setDraftItems((it) => [
                    ...it,
                    { label: "", qty: 1, unitPrice: 0, taxRate: 0 },
                  ])
                }
              >
                + Ajouter une ligne
              </button>
            </div>

            <div className="flex justify-end gap-2 mt-5">
              <button
                className="btn btn-outline"
                onClick={() => setEditing(false)}
              >
                Annuler
              </button>
              <button
                className="btn btn-primary"
                onClick={onSaveItems}
                disabled={editMut.isPending}
              >
                {editMut.isPending ? "Enregistrement…" : "Enregistrer"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
