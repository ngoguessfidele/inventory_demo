import {
  getAdjustments,
  getProducts,
  getSales,
  saveAdjustments,
  saveProducts,
  saveSales,
} from "@/lib/data-store";
import type { Product } from "@/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const sales = await getSales();
    const sale = sales.find((item) => item.id === id);

    if (!sale) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    return Response.json(sale);
  } catch (error) {
    return Response.json(
      { error: "Failed to load sale", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;

    const [sales, products, adjustments] = await Promise.all([
      getSales(),
      getProducts(),
      getAdjustments(),
    ]);

    const sale = sales.find((item) => item.id === id);
    if (!sale) {
      return Response.json({ error: "Sale not found" }, { status: 404 });
    }

    const productMap = new Map<string, Product>(products.map((product) => [product.id, product]));

    for (const item of sale.items) {
      const product = productMap.get(item.productId);
      if (!product) {
        return Response.json(
          { error: `Related product not found for ${item.productName}` },
          { status: 404 }
        );
      }
    }

    const now = new Date().toISOString();
    const nextProducts = products.map((product) => {
      const matchingItem = sale.items.find((item) => item.productId === product.id);
      if (!matchingItem) return product;

      return {
        ...product,
        quantity: product.quantity + matchingItem.quantity,
        updatedAt: now,
      };
    });

    const saleReason = `Sale - ${sale.saleNumber}`;
    const nextAdjustments = adjustments.filter(
      (adjustment) => !(adjustment.type === "out" && adjustment.reason === saleReason)
    );
    const nextSales = sales.filter((item) => item.id !== id);

    await Promise.all([
      saveProducts(nextProducts),
      saveAdjustments(nextAdjustments),
      saveSales(nextSales),
    ]);

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: "Failed to delete sale", detail: String(error) },
      { status: 500 }
    );
  }
}
