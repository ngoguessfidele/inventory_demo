"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowLeft, Search, ShoppingCart, Trash2 } from "lucide-react";
import { Spinner } from "@/components/ui/spinner";
import { formatCurrency } from "@/lib/currency";
import type { Product } from "@/types";

interface CartItem {
  productId: string;
  quantity: number;
}

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

export default function NewSalePage() {
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState("");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    async function loadProducts() {
      setLoading(true);
      setError(null);
      try {
        const response = await fetch("/api/products");
        if (!response.ok) {
          throw new Error("Failed to load products");
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

  const productMap = useMemo(() => {
    return new Map(products.map((product) => [product.id, product]));
  }, [products]);

  const filteredProducts = useMemo(() => {
    const query = search.trim().toLowerCase();
    return products.filter((product) => {
      if (!query) return true;
      return (
        product.name.toLowerCase().includes(query) || product.sku.toLowerCase().includes(query)
      );
    });
  }, [products, search]);

  const cartDetails = useMemo(() => {
    return cart
      .map((item) => {
        const product = productMap.get(item.productId);
        if (!product) return null;

        const subtotal = roundMoney(item.quantity * product.sellingPrice);
        const cost = roundMoney(item.quantity * product.costPrice);
        return {
          ...item,
          product,
          subtotal,
          cost,
        };
      })
      .filter((item): item is NonNullable<typeof item> => Boolean(item));
  }, [cart, productMap]);

  const totals = useMemo(() => {
    const totalAmount = roundMoney(cartDetails.reduce((sum, item) => sum + item.subtotal, 0));
    const totalCost = roundMoney(cartDetails.reduce((sum, item) => sum + item.cost, 0));
    const profit = roundMoney(totalAmount - totalCost);
    return { totalAmount, totalCost, profit };
  }, [cartDetails]);

  function addToCart(productId: string) {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === productId);
      if (existing) {
        return prev.map((item) =>
          item.productId === productId
            ? { ...item, quantity: Math.min(item.quantity + 1, productMap.get(productId)?.quantity ?? item.quantity) }
            : item
        );
      }
      return [...prev, { productId, quantity: 1 }];
    });
  }

  function updateQuantity(productId: string, nextQuantity: number) {
    const max = productMap.get(productId)?.quantity ?? 0;
    const safeQuantity = Math.min(Math.max(1, Math.floor(nextQuantity)), max || 1);
    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: safeQuantity } : item
      )
    );
  }

  function removeFromCart(productId: string) {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  }

  async function handleCompleteSale() {
    if (cart.length === 0) {
      setError("Add at least one item to the cart");
      return;
    }

    setSaving(true);
    setError(null);
    try {
      const response = await fetch("/api/sales", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          items: cart.map((item) => ({ productId: item.productId, quantity: item.quantity })),
          notes,
        }),
      });

      if (!response.ok) {
        const body = await response.json().catch(() => ({}));
        setError(body.error || "Failed to complete sale");
        return;
      }

      router.push("/sales");
      router.refresh();
    } finally {
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-slate-900">New Sale</h1>
          <p className="text-sm text-slate-600">Search products, build a cart, and complete checkout.</p>
        </div>
        <button
          type="button"
          onClick={() => router.push("/sales")}
          className="inline-flex items-center gap-2 rounded-lg border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-100"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Sales
        </button>
      </div>

      {error && <p className="rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-700">{error}</p>}

      {loading ? (
        <div className="flex min-h-[40vh] items-center justify-center">
          <Spinner />
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="text-lg font-semibold text-slate-900">Products</h2>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
              <input
                type="text"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search by name or SKU"
                className="w-full rounded-lg border border-slate-300 py-2 pl-9 pr-3 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </div>
            <div className="max-h-105 space-y-2 overflow-auto pr-1">
              {filteredProducts.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No products match your search.
                </p>
              ) : (
                filteredProducts.map((product) => {
                  const inCart = cart.find((item) => item.productId === product.id);
                  return (
                    <div
                      key={product.id}
                      className="flex items-center justify-between rounded-lg border border-slate-200 p-3"
                    >
                      <div>
                        <p className="text-sm font-medium text-slate-900">{product.name}</p>
                        <p className="text-xs text-slate-500">
                          {product.sku} | In stock: {product.quantity} {product.unit} | {formatCurrency(product.sellingPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => addToCart(product.id)}
                        disabled={product.quantity <= 0}
                        className="rounded-md border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                      >
                        {inCart ? "Add More" : "Add"}
                      </button>
                    </div>
                  );
                })
              )}
            </div>
          </section>

          <section className="space-y-3 rounded-xl border border-slate-200 bg-white p-4">
            <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900">
              <ShoppingCart className="h-5 w-5" /> Cart
            </h2>

            <div className="max-h-80 space-y-2 overflow-auto pr-1">
              {cartDetails.length === 0 ? (
                <p className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm text-slate-500">
                  No items in cart.
                </p>
              ) : (
                cartDetails.map((item) => (
                  <div
                    key={item.productId}
                    className="space-y-2 rounded-lg border border-slate-200 p-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-medium text-slate-900">{item.product.name}</p>
                        <p className="text-xs text-slate-500">
                          {item.product.sku} | {formatCurrency(item.product.sellingPrice)} each
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.productId)}
                        className="rounded-md border border-rose-300 p-1.5 text-rose-700 hover:bg-rose-50"
                        aria-label={`Remove ${item.product.name}`}
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between">
                      <label className="flex items-center gap-2 text-xs text-slate-500">
                        Qty
                        <input
                          type="number"
                          min={1}
                          max={item.product.quantity}
                          value={item.quantity}
                          onChange={(event) =>
                            updateQuantity(item.productId, Number(event.target.value) || 1)
                          }
                          className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm text-slate-800"
                        />
                      </label>
                      <p className="text-sm font-semibold text-slate-900">
                        {formatCurrency(item.subtotal)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <label className="space-y-1">
              <span className="text-xs font-medium text-slate-500">Notes</span>
              <textarea
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
                rows={3}
                placeholder="Optional notes for this sale"
                className="w-full rounded-lg border border-slate-300 px-3 py-2 text-sm outline-none ring-slate-300 focus:ring-2"
              />
            </label>

            <div className="rounded-lg border border-slate-200 bg-slate-50 p-3 text-sm">
              <div className="flex items-center justify-between text-slate-600">
                <span>Total Amount</span>
                <strong className="text-slate-900">{formatCurrency(totals.totalAmount)}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-slate-600">
                <span>Total Cost</span>
                <strong className="text-slate-900">{formatCurrency(totals.totalCost)}</strong>
              </div>
              <div className="mt-1 flex items-center justify-between text-emerald-700">
                <span>Profit</span>
                <strong>{formatCurrency(totals.profit)}</strong>
              </div>
            </div>

            <button
              type="button"
              onClick={handleCompleteSale}
              disabled={saving || cartDetails.length === 0}
              className="w-full rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {saving ? "Completing..." : "Complete Sale"}
            </button>
          </section>
        </div>
      )}
    </div>
  );
}
