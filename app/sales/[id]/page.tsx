"use client";

import { useEffect, useState } from "react";
import { useParams, useRouter } from "next/navigation";
import { ArrowLeft, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import type { Sale } from "@/types";

export default function SaleDetailPage() {
  const params = useParams<{ id: string }>();
  const router = useRouter();

  const [sale, setSale] = useState<Sale | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    async function loadSale() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch(`/api/sales/${params.id}`);
        if (!response.ok) {
          const body = await response.json().catch(() => ({}));
          throw new Error(body.error || "Failed to load sale");
        }
        const data = (await response.json()) as Sale;
        setSale(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    if (params.id) {
      loadSale();
    }
  }, [params.id]);

  async function handleDelete() {
    if (!sale) return;
    const confirmed = window.confirm(`Delete ${sale.saleNumber}? This restores stock levels.`);
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const response = await fetch(`/api/sales/${sale.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Failed to delete sale");
        return;
      }

      router.push("/sales");
      router.refresh();
    } finally {
      setDeleting(false);
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
        <button
          type="button"
          onClick={() => router.push("/sales")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales
        </button>
        <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>
      </div>
    );
  }

  if (!sale) {
    return null;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">{sale.saleNumber}</h1>
          <p className="text-sm text-slate-600">{new Date(sale.date).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => router.push("/sales")}
            className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
          >
            <ArrowLeft className="h-4 w-4" />
            Back
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={deleting}
            className="inline-flex items-center gap-2 rounded-lg border border-rose-300 px-3 py-2 text-sm text-rose-700 hover:bg-rose-50 disabled:opacity-50"
          >
            <Trash2 className="h-4 w-4" />
            {deleting ? "Deleting..." : "Delete Sale"}
          </button>
        </div>
      </div>

      {sale.notes && (
        <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
          <h2 className="mb-2 text-sm font-semibold uppercase tracking-wide text-slate-500">Notes</h2>
          <p className="text-sm text-slate-700">{sale.notes}</p>
        </section>
      )}

      <Table headers={["Product", "SKU", "Qty", "Unit Price (RWF)", "Cost Price (RWF)", "Subtotal (RWF)"]}>
        {sale.items.map((item) => (
          <tr key={item.productId}>
            <td className="px-4 py-3 text-sm font-medium text-slate-900">{item.productName}</td>
            <td className="px-4 py-3 text-sm text-slate-700">{item.sku}</td>
            <td className="px-4 py-3 text-sm text-slate-700">{item.quantity}</td>
            <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(item.unitPrice)}</td>
            <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(item.costPrice)}</td>
            <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(item.subtotal)}</td>
          </tr>
        ))}
      </Table>

      <section className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Amount</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrency(sale.totalAmount)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Total Cost</p>
          <p className="text-lg font-semibold text-slate-900">{formatCurrency(sale.totalCost)}</p>
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-slate-500">Profit</p>
          <p className="text-lg font-semibold text-emerald-700">{formatCurrency(sale.profit)}</p>
        </div>
      </section>
    </div>
  );
}
