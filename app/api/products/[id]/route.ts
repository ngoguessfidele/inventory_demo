import { getAdjustments, getProducts, saveAdjustments, saveProducts } from "@/lib/data-store";
import { validateProductInput } from "@/lib/validators";
import type { Product } from "@/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const products = await getProducts();
    const product = products.find((item) => item.id === id);

    if (!product) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    return Response.json(product);
  } catch (error) {
    return Response.json(
      { error: "Failed to load product", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const { data, errors } = validateProductInput(payload);

    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const products = await getProducts();
    const existingProduct = products.find((item) => item.id === id);

    if (!existingProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const requestedSku = data.sku.trim();
    const nextSku = requestedSku.length > 0 ? requestedSku : existingProduct.sku;

    const duplicateSku = products.find(
      (item) => item.id !== id && item.sku.toLowerCase() === nextSku.toLowerCase()
    );
    if (duplicateSku) {
      return Response.json({ error: "SKU already exists" }, { status: 409 });
    }

    const updatedProduct: Product = {
      ...existingProduct,
      ...data,
      sku: nextSku,
      updatedAt: new Date().toISOString(),
    };

    const nextProducts = products.map((item) => (item.id === id ? updatedProduct : item));
    await saveProducts(nextProducts);

    return Response.json(updatedProduct);
  } catch (error) {
    return Response.json(
      { error: "Failed to update product", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const products = await getProducts();
    const hasProduct = products.some((item) => item.id === id);

    if (!hasProduct) {
      return Response.json({ error: "Product not found" }, { status: 404 });
    }

    const nextProducts = products.filter((item) => item.id !== id);
    await saveProducts(nextProducts);

    const adjustments = await getAdjustments();
    const nextAdjustments = adjustments.filter((item) => item.productId !== id);
    await saveAdjustments(nextAdjustments);

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: "Failed to delete product", detail: String(error) },
      { status: 500 }
    );
  }
}

