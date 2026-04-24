"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import type { Product } from "@/types";

export default function AlertsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);

      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to load alerts");
        }

        const data = (await response.json()) as Product[];
        setProducts(data);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadProducts();
  }, []);

  const lowStockProducts = useMemo(() => {
    return products
      .filter((product) => product.quantity <= product.lowStockThreshold)
      .map((product) => ({
        ...product,
        shortage: Math.max(0, product.lowStockThreshold - product.quantity),
      }))
      .sort((a, b) => {
        if (a.quantity === b.quantity) {
          return b.shortage - a.shortage;
        }
        return a.quantity - b.quantity;
      });
  }, [products]);

  if (loading) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Low Stock Alerts</h1>
          <p className="text-sm text-slate-600">
            Products that have reached or fallen below their stock threshold.
          </p>
        </div>
        <Link
          href="/products"
          className="inline-flex items-center justify-center rounded-lg border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 transition hover:bg-slate-100"
        >
          Manage Products
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <p className="text-sm text-slate-600">
          {lowStockProducts.length} alert{lowStockProducts.length === 1 ? "" : "s"} found.
        </p>
      </div>

      <Table
        headers={[
          "Product",
          "SKU",
          "Category",
          "In Stock",
          "Threshold",
          "Shortage",
          "Status",
        ]}
      >
        {lowStockProducts.length === 0 ? (
          <tr>
            <td className="px-4 py-6 text-center text-slate-500" colSpan={7}>
              No low stock alerts right now.
            </td>
          </tr>
        ) : (
          lowStockProducts.map((product) => {
            const isOutOfStock = product.quantity <= 0;
            return (
              <tr key={product.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{product.sku}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{product.category}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {product.quantity} {product.unit}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{product.lowStockThreshold}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{product.shortage}</td>
                <td className="px-4 py-3 text-sm">
                  {isOutOfStock ? (
                    <Badge label="Out of Stock" variant="danger" />
                  ) : (
                    <Badge label="Low Stock" variant="warning" />
                  )}
                </td>
              </tr>
            );
          })
        )}
      </Table>
    </div>
  );
}