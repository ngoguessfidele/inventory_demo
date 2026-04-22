"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { ArrowDownCircle, ArrowUpCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import type { Adjustment, AdjustmentType, Product } from "@/types";

interface AdjustmentFormState {
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  date: string;
}

function toDateTimeLocal(iso: string): string {
  const date = new Date(iso);
  const pad = (value: number) => String(value).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}

export default function AdjustmentsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState<AdjustmentFormState>({
    productId: "",
    type: "in",
    quantity: 1,
    reason: "",
    date: toDateTimeLocal(new Date().toISOString()),
  });

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, adjustmentsRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/adjustments"),
      ]);

      if (!productsRes.ok || !adjustmentsRes.ok) {
        throw new Error("Failed to load adjustments");
      }

      const [productsData, adjustmentsData] = await Promise.all([
        productsRes.json(),
        adjustmentsRes.json(),
      ]);

      setProducts(productsData);
      setAdjustments(adjustmentsData);
      if (productsData.length > 0 && !form.productId) {
        setForm((prev) => ({ ...prev, productId: productsData[0].id }));
      }
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const productMap = useMemo(() => {
    const map = new Map<string, Product>();
    for (const product of products) {
      map.set(product.id, product);
    }
    return map;
  }, [products]);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFormError(null);

    if (!form.productId) {
      setFormError("Product is required");
      return;
    }
    if (form.quantity <= 0) {
      setFormError("Quantity must be greater than zero");
      return;
    }
    if (!form.reason.trim()) {
      setFormError("Reason is required");
      return;
    }

    setSaving(true);
    try {
      const response = await fetch("/api/adjustments", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          productId: form.productId,
          type: form.type,
          quantity: form.quantity,
          reason: form.reason,
          date: new Date(form.date).toISOString(),
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setFormError(body.error || "Failed to save adjustment");
        return;
      }

      setForm((prev) => ({
        ...prev,
        quantity: 1,
        reason: "",
        date: toDateTimeLocal(new Date().toISOString()),
      }));
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Stock Adjustments</h1>
        <p className="text-sm text-slate-600">
          Log stock-in and stock-out entries and sync product quantities automatically.
        </p>
      </div>

      <section className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm">
        <h2 className="mb-4 text-lg font-semibold text-slate-900">New Adjustment</h2>
        <form className="grid gap-4 md:grid-cols-2 lg:grid-cols-5" onSubmit={handleSubmit}>
          <label className="space-y-1 lg:col-span-2">
            <span className="text-xs font-medium text-slate-500">Product</span>
            <select
              value={form.productId}
              onChange={(event) => setForm((prev) => ({ ...prev, productId: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            >
              {products.map((product) => (
                <option key={product.id} value={product.id}>
                  {product.name} ({product.quantity} {product.unit})
                </option>
              ))}
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Type</span>
            <select
              value={form.type}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, type: event.target.value as AdjustmentType }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            >
              <option value="in">Stock In</option>
              <option value="out">Stock Out</option>
            </select>
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Quantity</span>
            <input
              type="number"
              min={1}
              value={form.quantity}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, quantity: Number(event.target.value) || 0 }))
              }
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-xs font-medium text-slate-500">Date</span>
            <input
              type="datetime-local"
              value={form.date}
              onChange={(event) => setForm((prev) => ({ ...prev, date: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

          <label className="space-y-1 md:col-span-2 lg:col-span-4">
            <span className="text-xs font-medium text-slate-500">Reason</span>
            <input
              value={form.reason}
              onChange={(event) => setForm((prev) => ({ ...prev, reason: event.target.value }))}
              placeholder="e.g. Restock from supplier"
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

          <div className="flex items-end">
            <button
              type="submit"
              disabled={saving}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {saving ? "Saving..." : "Save Entry"}
            </button>
          </div>
        </form>

        {formError && (
          <p className="mt-3 rounded-md border border-rose-200 bg-rose-50 p-2 text-sm text-rose-700">
            {formError}
          </p>
        )}
      </section>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Table headers={["Date", "Product", "Type", "Quantity", "Reason", "Status"]}>
          {adjustments.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                No stock adjustments recorded.
              </td>
            </tr>
          ) : (
            adjustments.map((adjustment) => {
              const product = productMap.get(adjustment.productId);
              const isLowStock = product
                ? product.quantity <= product.lowStockThreshold
                : false;
              return (
                <tr key={adjustment.id}>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {new Date(adjustment.date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">
                    {product?.name ?? "Deleted product"}
                  </td>
                  <td className="px-4 py-3 text-sm">
                    {adjustment.type === "in" ? (
                      <span className="inline-flex items-center gap-1 text-emerald-700">
                        <ArrowUpCircle className="h-4 w-4" /> In
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-amber-700">
                        <ArrowDownCircle className="h-4 w-4" /> Out
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{adjustment.quantity}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">{adjustment.reason}</td>
                  <td className="px-4 py-3 text-sm">
                    {isLowStock ? (
                      <Badge label="Low Stock" variant="danger" />
                    ) : (
                      <Badge label="OK" variant="success" />
                    )}
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      )}
    </div>
  );
}

