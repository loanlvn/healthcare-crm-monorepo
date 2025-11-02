/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { useListInvoices } from "../services/hooks";
import { Link } from "react-router-dom";

export default function InvoicesPage() {
    const [page, setPage] = useState(1);
    const { data, isLoading, error } = useListInvoices({ page, pageSize: 20, orderBy: 'date', order: 'desc' });

      return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Invoices</h1>
        <Link to="/billing/new-invoice" className="btn btn-primary">+ New Invoice</Link>
      </header>

      <div className="card">
        {isLoading ? (
          <div className="p-4">Loading…</div>
        ) : error ? (
          <div className="p-4 text-red-600">Erreur: {(error as any).message}</div>
        ) : (
          <table className="table">
            <thead>
              <tr>
                <th className="th">#</th>
                <th className="th">Date</th>
                <th className="th">Patient</th>
                <th className="th">Status</th>
                <th className="th">Total</th>
                <th className="th">Actions</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((inv) => (
                <tr key={inv.id} className="row">
                  <td className="td">{inv.number}</td>
                  <td className="td">{new Date(inv.date).toLocaleDateString()}</td>
                  <td className="td">{inv.patient.firstName} {inv.patient.lastName}</td>
                  <td className="td">{inv.status}</td>
                  <td className="td">{inv.total} {inv.currency}</td>
                  <td className="td">
                    <Link to={`/billing/invoices/${inv.id}`} className="btn btn-outline">Open</Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div className="flex items-center gap-2">
        <button
          className="btn btn-outline"
          disabled={!data?.meta.hasPreviousPage}
          onClick={() => setPage((p) => p - 1)}
        >
          Prev
        </button>
        <span className="text-sm text-muted">Page {data?.meta.page}</span>
        <button
          className="btn btn-outline"
          disabled={!data?.meta.hasNextPage}
          onClick={() => setPage((p) => p + 1)}
        >
          Next
        </button>
      </div>
    </div>
  );
}
