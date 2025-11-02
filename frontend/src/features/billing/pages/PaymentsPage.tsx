/* eslint-disable @typescript-eslint/no-explicit-any */
import { useState } from "react";
import { Link } from "react-router-dom";
import { useListPayments } from "../services/hooks";

export default function PaymentsPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, error } = useListPayments({
    page, pageSize: 20, orderBy: "paidAt", order: "desc"
  });

  return (
    <div className="p-4 space-y-4">
      <header className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">Payments</h1>
        <Link to="/billing/new-payment" className="btn btn-primary">+ New Payment</Link>
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
                <th className="th">Date</th>
                <th className="th">Amount</th>
                <th className="th">Method</th>
                <th className="th">Invoice</th>
              </tr>
            </thead>
            <tbody>
              {data?.items.map((p) => (
                <tr key={p.id} className="row">
                  <td className="td">{new Date(p.paidAt).toLocaleString()}</td>
                  <td className="td">{p.amount}</td>
                  <td className="td">{p.method}</td>
                  <td className="td">
                    {p.invoice ? <Link className="btn btn-outline" to={`/billing/invoices/${p.invoice.id}`}>{p.invoice.number}</Link> : "-"}
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
