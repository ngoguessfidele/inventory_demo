import { getProducts, saveProducts } from "@/lib/data-store";
import { validateProductInput } from "@/lib/validators";
import type { Product } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const products = await getProducts();
    return Response.json(products);
  } catch (error) {
    return Response.json(
      { error: "Failed to load products", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { data, errors } = validateProductInput(payload);

    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const products = await getProducts();
    const duplicateSku = products.find(
      (product) => product.sku.toLowerCase() === data.sku.toLowerCase()
    );

    if (duplicateSku) {
      return Response.json({ error: "SKU already exists" }, { status: 409 });
    }

    const now = new Date().toISOString();
    const newProduct: Product = {
      id: crypto.randomUUID(),
      ...data,
      createdAt: now,
      updatedAt: now,
    };

    const nextProducts = [newProduct, ...products];
    await saveProducts(nextProducts);

    return Response.json(newProduct, { status: 201 });
  } catch (error) {
    return Response.json(
      { error: "Failed to create product", detail: String(error) },
      { status: 500 }
    );
  }
}

