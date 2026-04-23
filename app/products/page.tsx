"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Search, Trash2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import type { Category, Product, ProductInput } from "@/types";

const PAGE_SIZE = 8;

const emptyProductInput: ProductInput = {
  name: "",
  category: "",
  sku: "",
  quantity: 0,
  unit: "",
  costPrice: 0,
  sellingPrice: 0,
  lowStockThreshold: 0,
};

function normalizeNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export default function ProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [searchTerm, setSearchTerm] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [page, setPage] = useState(1);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Product | null>(null);
  const [form, setForm] = useState<ProductInput>(emptyProductInput);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [productsRes, categoriesRes] = await Promise.all([
        fetch("/api/products"),
        fetch("/api/categories"),
      ]);

      if (!productsRes.ok || !categoriesRes.ok) {
        throw new Error("Failed to load products");
      }

      const [productsData, categoriesData] = await Promise.all([
        productsRes.json(),
        categoriesRes.json(),
      ]);

      setProducts(productsData);
      setCategories(categoriesData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const filteredProducts = useMemo(() => {
    const query = searchTerm.trim().toLowerCase();
    return products.filter((product) => {
      const matchesSearch =
        product.name.toLowerCase().includes(query) ||
        product.sku.toLowerCase().includes(query);
      const matchesCategory =
        categoryFilter === "all" || product.category === categoryFilter;
      return matchesSearch && matchesCategory;
    });
  }, [products, searchTerm, categoryFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredProducts.length / PAGE_SIZE));
  const paginatedProducts = useMemo(() => {
    const start = (page - 1) * PAGE_SIZE;
    return filteredProducts.slice(start, start + PAGE_SIZE);
  }, [filteredProducts, page]);

  useEffect(() => {
    setPage(1);
  }, [searchTerm, categoryFilter]);

  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  function openCreateModal() {
    setEditingProduct(null);
    setForm(emptyProductInput);
    setFormErrors([]);
    setModalOpen(true);
  }

  function openEditModal(product: Product) {
    setEditingProduct(product);
    setForm({
      name: product.name,
      category: product.category,
      sku: product.sku,
      quantity: product.quantity,
      unit: product.unit,
      costPrice: product.costPrice,
      sellingPrice: product.sellingPrice,
      lowStockThreshold: product.lowStockThreshold,
    });
    setFormErrors([]);
    setModalOpen(true);
  }

  function validateForm(input: ProductInput): string[] {
    const errors: string[] = [];
    if (!input.name.trim()) errors.push("Name is required");
    if (!input.category.trim()) errors.push("Category is required");
    if (!input.unit.trim()) errors.push("Unit is required");
    if (input.quantity < 0) errors.push("Quantity cannot be negative");
    if (input.costPrice < 0) errors.push("Cost price cannot be negative");
    if (input.sellingPrice < 0) errors.push("Selling price cannot be negative");
    if (input.lowStockThreshold < 0) errors.push("Low stock threshold cannot be negative");
    return errors;
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const errors = validateForm(form);
    if (errors.length > 0) {
      setFormErrors(errors);
      return;
    }

    setSaving(true);
    setFormErrors([]);

    try {
      const endpoint = editingProduct ? `/api/products/${editingProduct.id}` : "/api/products";
      const method = editingProduct ? "PUT" : "POST";
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body.error || "Failed to save product";
        const details = Array.isArray(body.errors) ? body.errors : [];
        setFormErrors([message, ...details]);
        return;
      }

      setModalOpen(false);
      await loadData();
    } finally {
      setSaving(false);
    }
  }

  async function handleDelete(productId: string) {
    const confirmed = window.confirm("Delete this product?");
    if (!confirmed) return;

    const response = await fetch(`/api/products/${productId}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Failed to delete product");
      return;
    }

    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Products</h1>
          <p className="text-sm text-slate-600">Manage inventory items with full CRUD support.</p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Add Product
        </button>
      </div>

      <div className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 md:grid-cols-3">
        <label className="md:col-span-2">
          <span className="mb-1 block text-xs font-medium text-slate-500">Search</span>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
            <input
              type="text"
              value={searchTerm}
              onChange={(event) => setSearchTerm(event.target.value)}
              placeholder="Search by name or SKU"
              className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </div>
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-slate-500">Category</span>
          <select
            value={categoryFilter}
            onChange={(event) => setCategoryFilter(event.target.value)}
            className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
          >
            <option value="all">All Categories</option>
            {categories.map((category) => (
              <option key={category.id} value={category.name}>
                {category.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <>
          <Table
            headers={[
              "Name",
              "SKU",
              "Category",
              "Quantity",
              "Cost Price",
              "Selling Price",
              "Updated",
              "Actions",
            ]}
          >
            {paginatedProducts.length === 0 ? (
              <tr>
                <td className="px-4 py-6 text-center text-slate-500" colSpan={8}>
                  No products found.
                </td>
              </tr>
            ) : (
              paginatedProducts.map((product) => {
                const lowStock = product.quantity <= product.lowStockThreshold;
                return (
                  <tr key={product.id}>
                    <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{product.sku}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">{product.category}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      <div className="flex items-center gap-2">
                        <span>
                          {product.quantity} {product.unit}
                        </span>
                        {lowStock && <Badge label="Low" variant="danger" />}
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-slate-700">${product.costPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">${product.sellingPrice.toFixed(2)}</td>
                    <td className="px-4 py-3 text-sm text-slate-700">
                      {new Date(product.updatedAt).toLocaleString()}
                    </td>
                    <td className="px-4 py-3 text-sm">
                      <div className="flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(product)}
                          className="rounded-md border border-slate-300 p-1.5 text-slate-700 transition hover:bg-slate-100"
                          aria-label={`Edit ${product.name}`}
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(product.id)}
                          className="rounded-md border border-rose-300 p-1.5 text-rose-700 transition hover:bg-rose-50"
                          aria-label={`Delete ${product.name}`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </Table>

          <div className="flex items-center justify-between text-sm text-slate-600">
            <p>
              Showing {paginatedProducts.length} of {filteredProducts.length} products
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

      <Modal
        open={modalOpen}
        title={editingProduct ? "Edit Product" : "Add Product"}
        onClose={() => setModalOpen(false)}
      >
        <form className="space-y-4" onSubmit={handleSubmit}>
          {formErrors.length > 0 && (
            <div className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">
              <ul className="list-disc pl-5">
                {formErrors.map((message) => (
                  <li key={message}>{message}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <label className="space-y-1 sm:col-span-2">
              <span className="text-sm font-medium text-slate-700">Name</span>
              <input
                value={form.name}
                onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Category</span>
              <select
                value={form.category}
                onChange={(event) => setForm((prev) => ({ ...prev, category: event.target.value }))}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              >
                <option value="">Select category</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">SKU (optional)</span>
              <input
                value={form.sku}
                onChange={(event) => setForm((prev) => ({ ...prev, sku: event.target.value }))}
                placeholder={editingProduct ? "Leave blank to keep current SKU" : "Leave blank to auto-generate"}
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Quantity</span>
              <input
                type="number"
                min={0}
                value={form.quantity}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, quantity: normalizeNumber(event.target.value) }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Unit</span>
              <input
                value={form.unit}
                onChange={(event) => setForm((prev) => ({ ...prev, unit: event.target.value }))}
                placeholder="e.g. piece, bottle, box"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Cost Price</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.costPrice}
                onChange={(event) =>
                  setForm((prev) => ({ ...prev, costPrice: normalizeNumber(event.target.value) }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Selling Price</span>
              <input
                type="number"
                min={0}
                step="0.01"
                value={form.sellingPrice}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    sellingPrice: normalizeNumber(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
            <label className="space-y-1">
              <span className="text-sm font-medium text-slate-700">Low Stock Threshold</span>
              <input
                type="number"
                min={0}
                value={form.lowStockThreshold}
                onChange={(event) =>
                  setForm((prev) => ({
                    ...prev,
                    lowStockThreshold: normalizeNumber(event.target.value),
                  }))
                }
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>
          </div>

          <div className="flex justify-end gap-2 border-t border-slate-200 pt-4">
            <button
              type="button"
              onClick={() => setModalOpen(false)}
              className="rounded-lg border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white disabled:opacity-70"
            >
              {saving ? "Saving..." : editingProduct ? "Update Product" : "Create Product"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}
