import {
  getAdjustments,
  getProducts,
  getSales,
  saveAdjustments,
  saveProducts,
  saveSales,
} from "@/lib/data-store";
import { validateSaleInput } from "@/lib/validators";
import type { Adjustment, Product, Sale, SaleInputItem, SaleItem } from "@/types";

export const runtime = "nodejs";

function roundMoney(value: number): number {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function generateSaleNumber(sales: Sale[]): string {
  const pattern = /^SALE-(\d{4,})$/i;
  let maxNumber = 0;

  for (const sale of sales) {
    const match = sale.saleNumber.match(pattern);
    if (!match) continue;
    const current = Number(match[1]);
    if (Number.isFinite(current) && current > maxNumber) {
      maxNumber = current;
    }
  }

  return `SALE-${String(maxNumber + 1).padStart(4, "0")}`;
}

function normalizeItems(items: SaleInputItem[]): SaleInputItem[] {
  const grouped = new Map<string, number>();
  for (const item of items) {
    grouped.set(item.productId, (grouped.get(item.productId) ?? 0) + item.quantity);
  }

  return Array.from(grouped.entries()).map(([productId, quantity]) => ({
    productId,
    quantity,
  }));
}

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const search = url.searchParams.get("search")?.trim().toLowerCase() ?? "";

    const pageRaw = Number(url.searchParams.get("page") ?? "1");
    const limitRaw = Number(url.searchParams.get("limit") ?? "10");
    const page = Number.isFinite(pageRaw) && pageRaw > 0 ? Math.floor(pageRaw) : 1;
    const limit = Number.isFinite(limitRaw) && limitRaw > 0 ? Math.floor(limitRaw) : 10;

    const sales = await getSales();
    const sorted = [...sales].sort((a, b) => b.date.localeCompare(a.date));

    const filtered = search
      ? sorted.filter((sale) => {
          const itemHit = sale.items.some(
            (item) =>
              item.productName.toLowerCase().includes(search) ||
              item.sku.toLowerCase().includes(search)
          );
          return (
            sale.saleNumber.toLowerCase().includes(search) ||
            (sale.notes ?? "").toLowerCase().includes(search) ||
            itemHit
          );
        })
      : sorted;

    const total = filtered.length;
    const totalPages = Math.max(1, Math.ceil(total / limit));
    const start = (page - 1) * limit;
    const data = filtered.slice(start, start + limit);

    return Response.json({
      data,
      pagination: {
        page,
        limit,
        total,
        totalPages,
      },
    });
  } catch (error) {
    return Response.json(
      { error: "Failed to load sales", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { data, errors } = validateSaleInput(payload);

    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const [products, adjustments, sales] = await Promise.all([
      getProducts(),
      getAdjustments(),
      getSales(),
    ]);

    const normalizedItems = normalizeItems(data.items);
    const productMap = new Map<string, Product>(products.map((product) => [product.id, product]));

    for (const item of normalizedItems) {
      const product = productMap.get(item.productId);
      if (!product) {
        return Response.json({ error: "Product not found" }, { status: 404 });
      }
      if (item.quantity > product.quantity) {
        return Response.json(
          {
            error: `Insufficient stock for ${product.name}. Available: ${product.quantity}, requested: ${item.quantity}`,
          },
          { status: 400 }
        );
      }
    }

    const saleNumber = generateSaleNumber(sales);
    const now = new Date().toISOString();

    const saleItems: SaleItem[] = normalizedItems.map((item) => {
      const product = productMap.get(item.productId)!;
      const subtotal = roundMoney(item.quantity * product.sellingPrice);
      return {
        productId: product.id,
        productName: product.name,
        sku: product.sku,
        quantity: item.quantity,
        unitPrice: roundMoney(product.sellingPrice),
        costPrice: roundMoney(product.costPrice),
        subtotal,
      };
    });

    const totalAmount = roundMoney(saleItems.reduce((sum, item) => sum + item.subtotal, 0));
    const totalCost = roundMoney(
      saleItems.reduce((sum, item) => sum + item.quantity * item.costPrice, 0)
    );
    const profit = roundMoney(totalAmount - totalCost);

    const productQuantityMap = new Map<string, number>();
    for (const item of saleItems) {
      productQuantityMap.set(item.productId, item.quantity);
    }

    const nextProducts = products.map((product) => {
      const soldQuantity = productQuantityMap.get(product.id);
      if (!soldQuantity) return product;
      return {
        ...product,
        quantity: product.quantity - soldQuantity,
        updatedAt: now,
      };
    });

    const sale: Sale = {
      id: crypto.randomUUID(),
      saleNumber,
      date: now,
      items: saleItems,
      totalAmount,
      totalCost,
      profit,
      notes: data.notes || undefined,
    };

    const saleAdjustments: Adjustment[] = saleItems.map((item) => ({
      id: crypto.randomUUID(),
      productId: item.productId,
      type: "out",
      quantity: item.quantity,
      reason: `Sale - ${saleNumber}`,
      date: now,
    }));

    await Promise.all([
      saveProducts(nextProducts),
      saveAdjustments([...saleAdjustments, ...adjustments]),
      saveSales([sale, ...sales]),
    ]);

    return Response.json(sale, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: "Failed to create sale", detail: String(error) },
      { status: 500 }
    );
  }
}
