"use client";

import { useEffect, useMemo, useState } from "react";
import type { FormEvent } from "react";
import { Pencil, Plus, Trash2 } from "lucide-react";
import { Modal } from "@/components/ui/modal";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import type { Category, CategoryInput, Product } from "@/types";

const emptyCategoryInput: CategoryInput = {
  name: "",
  description: "",
};

export default function CategoriesPage() {
  const [categories, setCategories] = useState<Category[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [form, setForm] = useState<CategoryInput>(emptyCategoryInput);
  const [formErrors, setFormErrors] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);

  async function loadData() {
    setLoading(true);
    setError(null);
    try {
      const [categoriesRes, productsRes] = await Promise.all([
        fetch("/api/categories"),
        fetch("/api/products"),
      ]);

      if (!categoriesRes.ok || !productsRes.ok) {
        throw new Error("Failed to load categories");
      }

      const [categoriesData, productsData] = await Promise.all([
        categoriesRes.json(),
        productsRes.json(),
      ]);

      setCategories(categoriesData);
      setProducts(productsData);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  const usageMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const product of products) {
      map.set(product.category, (map.get(product.category) ?? 0) + 1);
    }
    return map;
  }, [products]);

  function openCreateModal() {
    setEditingCategory(null);
    setForm(emptyCategoryInput);
    setFormErrors([]);
    setModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setForm({
      name: category.name,
      description: category.description,
    });
    setFormErrors([]);
    setModalOpen(true);
  }

  function validateForm(input: CategoryInput): string[] {
    const errors: string[] = [];
    if (!input.name.trim()) errors.push("Name is required");
    if (!input.description.trim()) errors.push("Description is required");
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
      const endpoint = editingCategory
        ? `/api/categories/${editingCategory.id}`
        : "/api/categories";
      const method = editingCategory ? "PUT" : "POST";

      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        const message = body.error || "Failed to save category";
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

  async function handleDelete(category: Category) {
    const confirmed = window.confirm(`Delete "${category.name}" category?`);
    if (!confirmed) return;

    const response = await fetch(`/api/categories/${category.id}`, { method: "DELETE" });
    if (!response.ok) {
      const body = await response.json().catch(() => ({}));
      setError(body.error || "Failed to delete category");
      return;
    }
    await loadData();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">Categories</h1>
          <p className="text-sm text-slate-600">
            Organize products with reusable categories and descriptions.
          </p>
        </div>
        <button
          type="button"
          onClick={openCreateModal}
          className="inline-flex items-center justify-center gap-2 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700"
        >
          <Plus className="h-4 w-4" />
          Add Category
        </button>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <Table headers={["Name", "Description", "Products", "Actions"]}>
          {categories.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={4}>
                No categories found.
              </td>
            </tr>
          ) : (
            categories.map((category) => (
              <tr key={category.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{category.name}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{category.description}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{usageMap.get(category.name) ?? 0}</td>
                <td className="px-4 py-3 text-sm">
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => openEditModal(category)}
                      className="rounded-md border border-slate-300 p-1.5 text-slate-700 transition hover:bg-slate-100"
                      aria-label={`Edit ${category.name}`}
                    >
                      <Pencil className="h-4 w-4" />
                    </button>
                    <button
                      type="button"
                      onClick={() => handleDelete(category)}
                      className="rounded-md border border-rose-300 p-1.5 text-rose-700 transition hover:bg-rose-50"
                      aria-label={`Delete ${category.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))
          )}
        </Table>
      )}

      <Modal
        open={modalOpen}
        title={editingCategory ? "Edit Category" : "Add Category"}
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

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Name</span>
            <input
              value={form.name}
              onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

          <label className="space-y-1">
            <span className="text-sm font-medium text-slate-700">Description</span>
            <textarea
              value={form.description}
              onChange={(event) =>
                setForm((prev) => ({ ...prev, description: event.target.value }))
              }
              rows={4}
              className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
            />
          </label>

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
              {saving ? "Saving..." : editingCategory ? "Update Category" : "Create Category"}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
}

