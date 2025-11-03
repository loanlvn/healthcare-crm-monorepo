/* eslint-disable @typescript-eslint/no-explicit-any */
import { type FormEvent, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useCreateInvoice } from "../services/hooks";
import PatientPicker from "@/features/appointements/services/PatientPickerAppointments";

export default function NewInvoicePage() {
  const nav = useNavigate();
  const createMut = useCreateInvoice();
  const [selectedPatientId, setSelectedPatientId] = useState<
    string | undefined
  >(undefined);

  const [items, setItems] = useState([
    { label: "Consultation", qty: 1, unitPrice: 60, taxRate: 0 },
  ]);

  const addItem = () =>
    setItems([...items, { label: "", qty: 1, unitPrice: 0, taxRate: 0 }]);
  const updateItem = (index: number, field: string, value: any) => {
    const next = [...items];
    next[index] = { ...next[index], [field]: value };
    setItems(next);
  };
  const removeItem = (index: number) =>
    setItems(items.filter((_, i) => i !== index));

  const calculateTotal = () =>
    items.reduce(
      (t, i) => t + i.qty * i.unitPrice * (1 + (i.taxRate || 0) / 100),
      0
    );

  function onSubmit(e: FormEvent) {
    e.preventDefault();
    if (!selectedPatientId) return alert("Veuillez sélectionner un patient");

    const cleanedItems = items
      .filter((i) => i.label.trim() !== "" && i.qty > 0 && i.unitPrice >= 0)
      .map((i) => ({
        label: i.label.trim(),
        qty: i.qty,
        unitPrice: i.unitPrice,
        taxRate: (i.taxRate ?? 0) / 100, // <-- conversion critique
      }));

    createMut.mutate(
      {
        patientId: selectedPatientId,
        items: cleanedItems,
        currency: "EUR",
      },
      { onSuccess: (created: any) => nav(`/billing/invoices/${created.id}`) }
    );
  }
  
// "060" -> "60", "0" -> "0"
  const stripLeadingZerosInt = (s: string) => s.replace(/^0+(?=\d)/, ""); 

  const stripLeadingZerosFloat = (s: string) => {
    if (s.startsWith("0.") || s === "0" || s === "") return s; 
    return s.replace(/^0+(?=\d)/, "");
  };

  return (
    <div className="p-6 space-y-6 max-w-4xl mx-auto">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-2xl font-bold">Nouvelle facture</h1>
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
          Retour
        </Link>
      </div>

      <form onSubmit={onSubmit} className="card p-6 space-y-6">
        <div>
          <label className="block text-sm font-medium text-muted mb-2">
            Patient
          </label>
          <PatientPicker
            value={selectedPatientId}
            onChange={(id) => setSelectedPatientId(id)}
            required
            className="w-full"
            placeholder="Rechercher un patient…"
          />
        </div>

        <div>
          <div className="flex items-center justify-between mb-4">
            <label className="block text-sm font-medium text-muted">
              Articles
            </label>
            <button
              type="button"
              onClick={addItem}
              className="btn btn-outline btn-sm"
            >
              + Ajouter un article
            </button>
          </div>

          <div className="space-y-3">
            {items.map((item, index) => (
              <div
                key={index}
                className="flex gap-3 items-start p-3 border border-token rounded-xl"
              >
                <div className="flex-1 grid grid-cols-1 md:grid-cols-4 gap-3">
                  <input
                    type="text"
                    placeholder="Description"
                    className="input"
                    value={item.label}
                    onChange={(e) => updateItem(index, "label", e.target.value)}
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Quantité"
                    className="input"
                    value={String(item.qty)}
                    onChange={(e) => {
                      const raw = stripLeadingZerosInt(e.target.value);
                      const n = Number(raw);
                      updateItem(
                        index,
                        "qty",
                        Number.isFinite(n) ? Math.max(1, Math.trunc(n)) : 1
                      );
                    }}
                    min="1"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="Prix unitaire"
                    className="input"
                    value={String(item.unitPrice)}
                    onChange={(e) => {
                      const raw = stripLeadingZerosFloat(e.target.value);
                      const n = Number(raw);
                      updateItem(
                        index,
                        "unitPrice",
                        Number.isFinite(n) ? Math.max(0, n) : 0
                      );
                    }}
                    step="0.01"
                  />
                  <input
                    type="text"
                    inputMode="numeric"
                    placeholder="TVA %"
                    className="input"
                    value={String(item.taxRate)}
                    onChange={(e) => {
                      const raw = stripLeadingZerosFloat(e.target.value);
                      const n = Number(raw);
                      updateItem(
                        index,
                        "taxRate",
                        Number.isFinite(n) ? Math.max(0, n) : 0
                      );
                    }}
                    step="0.1"
                  />
                </div>
                <button
                  type="button"
                  onClick={() => removeItem(index)}
                  className="btn btn-outline btn-sm text-red-600 border-red-200 hover:bg-red-50"
                >
                  ×
                </button>
              </div>
            ))}
          </div>
        </div>

        <div className="border-t border-token pt-4">
          <div className="flex justify-between items-center text-lg font-semibold">
            <span>Total</span>
            <span>{calculateTotal().toFixed(2)} EUR</span>
          </div>
        </div>

        <div className="flex items-center gap-3 pt-2">
          <button
            className="btn btn-primary"
            type="submit"
            disabled={createMut.isPending}
          >
            {createMut.isPending ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>{" "}
                Création…
              </>
            ) : (
              "Créer la facture"
            )}
          </button>
          {createMut.isError && (
            <span className="text-red-600 text-sm">
              {(createMut.error as any).message}
            </span>
          )}
        </div>
      </form>
    </div>
  );
}
