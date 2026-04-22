import {
  getAdjustments,
  getProducts,
  saveAdjustments,
  saveProducts,
} from "@/lib/data-store";
import type { Product } from "@/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const adjustments = await getAdjustments();
    const adjustment = adjustments.find((item) => item.id === id);
    if (!adjustment) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }
    return Response.json(adjustment);
  } catch (error) {
    return Response.json(
      { error: "Failed to load adjustment", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const adjustments = await getAdjustments();
    const adjustment = adjustments.find((item) => item.id === id);

    if (!adjustment) {
      return Response.json({ error: "Adjustment not found" }, { status: 404 });
    }

    const products = await getProducts();
    const product = products.find((item) => item.id === adjustment.productId);

    if (!product) {
      return Response.json({ error: "Related product not found" }, { status: 404 });
    }

    const revertedQuantity =
      adjustment.type === "in"
        ? product.quantity - adjustment.quantity
        : product.quantity + adjustment.quantity;

    if (revertedQuantity < 0) {
      return Response.json(
        { error: "Cannot delete adjustment because stock would become negative" },
        { status: 400 }
      );
    }

    const updatedProduct: Product = {
      ...product,
      quantity: revertedQuantity,
      updatedAt: new Date().toISOString(),
    };
    const nextProducts = products.map((item) =>
      item.id === updatedProduct.id ? updatedProduct : item
    );
    await saveProducts(nextProducts);

    const nextAdjustments = adjustments.filter((item) => item.id !== id);
    await saveAdjustments(nextAdjustments);

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: "Failed to delete adjustment", detail: String(error) },
      { status: 500 }
    );
  }
}

