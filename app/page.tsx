"use client";

import { useEffect, useMemo, useState } from "react";
import type { ComponentType } from "react";
import Link from "next/link";
import { AlertTriangle, Banknote, Boxes, Receipt, Tags, TrendingUp } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Spinner } from "@/components/ui/spinner";
import { Table } from "@/components/ui/table";
import { formatCurrency } from "@/lib/currency";
import type { Adjustment, Category, Product, Sale } from "@/types";

interface SalesResponse {
  data: Sale[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  }; 
}

interface SummaryCardProps {
  title: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  href?: string;
}

function SummaryCard({ title, value, icon: Icon, href }: SummaryCardProps) {
  const content = (
    <article
      className={`rounded-xl border border-slate-200 bg-white p-5 shadow-sm ${
        href ? "transition hover:border-slate-300 hover:shadow-md" : ""
      }`}
    >
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500">{title}</p>
        <Icon className="h-5 w-5 text-slate-500" />
      </div>
      <p className="mt-4 text-3xl font-bold text-slate-900">{value}</p>
    </article>
  );

  if (!href) {
    return content;
  }

  return (
    <Link href={href} className="block rounded-xl focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-slate-400">
      {content}
    </Link>
  );
}

export default function DashboardPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [adjustments, setAdjustments] = useState<Adjustment[]>([]);
  const [sales, setSales] = useState<Sale[]>([]);
  const [totalSalesCount, setTotalSalesCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function loadDashboard() {
      setLoading(true);
      setError(null);

      try {
        const [productsRes, categoriesRes, adjustmentsRes, salesRes] = await Promise.all([
          fetch("/api/products"),
          fetch("/api/categories"),
          fetch("/api/adjustments"),
          fetch("/api/sales?page=1&limit=100000"),
        ]);

        if (!productsRes.ok || !categoriesRes.ok || !adjustmentsRes.ok || !salesRes.ok) {
          throw new Error("Failed to fetch dashboard data");
        }

        const [productsData, categoriesData, adjustmentsData, salesData] = await Promise.all([
          productsRes.json(),
          categoriesRes.json(),
          adjustmentsRes.json(),
          salesRes.json(),
        ]);

        setProducts(productsData);
        setCategories(categoriesData);
        setAdjustments(adjustmentsData);
        setSales((salesData as SalesResponse).data);
        setTotalSalesCount((salesData as SalesResponse).pagination.total);
      } catch (requestError) {
        setError(requestError instanceof Error ? requestError.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }

    loadDashboard();
  }, []);

  const lowStockCount = useMemo(
    () => products.filter((item) => item.quantity <= item.lowStockThreshold).length,
    [products]
  );

  const totalInventoryValue = useMemo(
    () => products.reduce((sum, item) => sum + item.quantity * item.costPrice, 0),
    [products]
  );

  const adjustmentByProduct = useMemo(() => {
    const map = new Map<string, number>();
    for (const item of adjustments) {
      const current = map.get(item.productId) ?? 0;
      map.set(
        item.productId,
        item.type === "in" ? current + item.quantity : current - item.quantity
      );
    }
    return map;
  }, [adjustments]);

  const todaySalesMetrics = useMemo(() => {
    const today = new Date();
    const start = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
    const end = start + 24 * 60 * 60 * 1000;

    const todaysSales = sales.filter((sale) => {
      const time = new Date(sale.date).getTime();
      return time >= start && time < end;
    });

    const revenue = todaysSales.reduce((sum, sale) => sum + sale.totalAmount, 0);
    const profit = todaysSales.reduce((sum, sale) => sum + sale.profit, 0);

    return {
      revenue,
      profit,
    };
  }, [sales]);

  const recentSales = useMemo(() => {
    return [...sales]
      .sort((a, b) => b.date.localeCompare(a.date))
      .slice(0, 5);
  }, [sales]);

  if (loading) {
    return (
      <div className="flex min-h-[50vh] items-center justify-center">
        <Spinner />
      </div>
    );
  }

  if (error) {
    return <p className="rounded-lg border border-rose-200 bg-rose-50 p-4 text-rose-700">{error}</p>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-slate-900">Dashboard</h1>
        <p className="text-sm text-slate-600">
          Real-time overview of stock levels, inventory value, and activity.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <SummaryCard
          title="Total Products"
          value={String(products.length)}
          icon={Boxes}
          href="/products"
        />
        <SummaryCard
          title="Low Stock Alerts"
          value={String(lowStockCount)}
          icon={AlertTriangle}
          href="/alerts"
        />
        <SummaryCard
          title="Inventory Value"
          value={formatCurrency(totalInventoryValue)}
          icon={Banknote}
        />
        <SummaryCard
          title="Categories"
          value={String(categories.length)}
          icon={Tags}
          href="/categories"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <SummaryCard
          title="Total Sales"
          value={String(totalSalesCount)}
          icon={Receipt}
          href="/sales"
        />
        <SummaryCard
          title="Revenue Today"
          value={formatCurrency(todaySalesMetrics.revenue)}
          icon={Banknote}
        />
        <SummaryCard
          title="Profit Today"
          value={formatCurrency(todaySalesMetrics.profit)}
          icon={TrendingUp}
        />
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Stock Overview</h2>
        <Table headers={["Product", "SKU", "Quantity", "Low Stock Threshold", "Status", "Movement"]}>
          {products.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={6}>
                No products available.
              </td>
            </tr>
          ) : (
            products.slice(0, 8).map((product) => {
              const isLowStock = product.quantity <= product.lowStockThreshold;
              const netMovement = adjustmentByProduct.get(product.id) ?? 0;
              return (
                <tr key={product.id}>
                  <td className="px-4 py-3 text-sm font-medium text-slate-900">{product.name}</td>
                  <td className="px-4 py-3 text-sm text-slate-600">{product.sku}</td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {product.quantity} {product.unit}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">{product.lowStockThreshold}</td>
                  <td className="px-4 py-3 text-sm">
                    {isLowStock ? (
                      <Badge label="Low Stock" variant="danger" />
                    ) : (
                      <Badge label="Healthy" variant="success" />
                    )}
                  </td>
                  <td className="px-4 py-3 text-sm text-slate-700">
                    {netMovement > 0 ? `+${netMovement}` : netMovement}
                  </td>
                </tr>
              );
            })
          )}
        </Table>
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold text-slate-900">Recent Sales</h2>
        <Table headers={["Sale #", "Date", "Items", "Total (RWF)", "Profit (RWF)"]}>
          {recentSales.length === 0 ? (
            <tr>
              <td className="px-4 py-6 text-center text-slate-500" colSpan={5}>
                No sales recorded yet.
              </td>
            </tr>
          ) : (
            recentSales.map((sale) => (
              <tr key={sale.id}>
                <td className="px-4 py-3 text-sm font-medium text-slate-900">{sale.saleNumber}</td>
                <td className="px-4 py-3 text-sm text-slate-700">
                  {new Date(sale.date).toLocaleString()}
                </td>
                <td className="px-4 py-3 text-sm text-slate-700">{sale.items.length}</td>
                <td className="px-4 py-3 text-sm text-slate-700">{formatCurrency(sale.totalAmount)}</td>
                <td className="px-4 py-3 text-sm text-emerald-700">{formatCurrency(sale.profit)}</td>
              </tr>
            ))
          )}
        </Table>
      </section>
    </div>
  );
}
