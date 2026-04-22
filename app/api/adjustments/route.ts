import {
  getAdjustments,
  getProducts,
  saveAdjustments,
  saveProducts,
} from "@/lib/data-store";
import { validateAdjustmentInput } from "@/lib/validators";
import type { Adjustment, Product } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const adjustments = await getAdjustments();
    const sorted = [...adjustments].sort((a, b) => b.date.localeCompare(a.date));
    return Response.json(sorted);
  } catch (error) {
    return Response.json(
      { error: "Failed to load adjustments", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { data, errors } = validateAdjustmentInput(payload);
    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const products = await getProducts();
    const product = products.find((item) => item.id === data.productId);
    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    if (data.type === "out" && data.quantity > product.quantity) {
      return Response.json(
        { error: "Stock-out quantity exceeds available stock" },
        { status: 400 }
      );
    }

    const nextQuantity =
      data.type === "in" ? product.quantity + data.quantity : product.quantity - data.quantity;

    const updatedProduct: Product = {
      ...product,
      quantity: nextQuantity,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = products.map((item) =>
      item.id === product.id ? updatedProduct : item
    );
    await saveProducts(nextProducts);

    const adjustments = await getAdjustments();
    const newAdjustment: Adjustment = {
      id: crypto.randomUUID(),
      productId: data.productId,
      type: data.type,
      quantity: data.quantity,
      reason: data.reason,
      date: data.date,
    };

    const nextAdjustments = [newAdjustment, ...adjustments];
    await saveAdjustments(nextAdjustments);

    return Response.json(newAdjustment, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: "Failed to create adjustment", detail: String(error) },
      { status: 500 }
    );
  }
}

