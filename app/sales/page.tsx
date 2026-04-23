"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Plus, Search, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import type { Sale } from "@/types";

const PAGE_SIZE = 10;

interface SalesResponse {
  data: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export default function SalesPage() {
  const router = useRouter();
  const [sales, setSales] = useState<Sale[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalRows, setTotalRows] = useState(0);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const query = useMemo(() => search.trim(), [search]);

  async function loadSales(currentPage: number, currentSearch: string) {
    setLoading(true);
    setError(null);
    try {
      const params = new URLSearchParams({
        page: String(currentPage),
        limit: String(PAGE_SIZE),
      });
      if (currentSearch) {
        params.set("search", currentSearch);
      }

      const response = await fetch(`/api/sales?${params.toString()}`);
      if (!response.ok) {
        throw new Error("Failed to load sales");
      }

      const body = (await response.json()) as SalesResponse;
      setSales(body.data);
      setTotalPages(body.pagination.totalPages);
      setTotalRows(body.pagination.total);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadSales(page, query);
  }, [page, query]);

  useEffect(() => {
    setPage(1);
  }, [query]);

  async function handleDelete(sale: Sale) {
    const confirmed = window.confirm(`Delete ${sale.saleNumber}? This restores stock levels.`);
    if (!confirmed) return;

    setDeletingId(sale.id);
    setError(null);
    try {
      const response = await fetch(`/api/sales/${sale.id}`, { method: "DELETE" });
      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Failed to delete sale");
        return;
      }

      await loadSales(page, query);
    } finally {
      setDeletingId(null);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Sales</h1>
          <p className="text-sm text-slate-600">Track sales, profit, and item-level sale history.</p>
        </div>
        <Link
          href="/sales/new"
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          New Sale
        </Link>
      </div>

      <div className="rounded-xl border border-slate-200 bg-white p-4">
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search by sale number, notes, product, or SKU"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </div>
        </label>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <Table headers={["Sale #", "Date", "Items", "Total", "Profit", "Actions"]}>
            {sales.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                  No sales found.
                </td>
              </tr>
            ) : (
              sales.map((sale) => (
                <tr
                  key={sale.id}
                  className="cursor-pointer hover:bg-slate-50"
                  onClick={() => router.push(`/sales/${sale.id}`)}
                >
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{sale.saleNumber}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {new Date(sale.date).toLocaleString()}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{sale.items.length}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">${sale.totalAmount.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm text-emerald-700">${sale.profit.toFixed(2)}</td>
                  <td className="px-4 py-3 text-sm" onClick={(event) => event.stopPropagation()}>
                    <button
                      type="button"
                      onClick={() => handleDelete(sale)}
                      disabled={deletingId === sale.id}
                      className="rounded-md border border-rose-300 p-1.5 text-rose-700 transition hover:bg-rose-50 disabled:opacity-50"
                      aria-label={`Delete ${sale.saleNumber}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))
            )}
          </Table>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              Showing {sales.length} of {totalRows} sales
            </p>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setPage((prev) => Math.max(1, prev - 1))}
                disabled={page === 1}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Previous
              </button>
              <span>
                Page {page} / {totalPages}
              </span>
              <button
                type="button"
                onClick={() => setPage((prev) => Math.min(totalPages, prev + 1))}
                disabled={page >= totalPages}
                className="rounded-md border border-slate-300 px-3 py-1 disabled:cursor-not-allowed disabled:opacity-50"
              >
                Next
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
