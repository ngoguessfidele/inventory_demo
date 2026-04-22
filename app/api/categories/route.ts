import { getCategories, getProducts, saveCategories } from "@/lib/data-store";
import { validateCategoryInput } from "@/lib/validators";
import type { Category } from "@/types";

export const runtime = "nodejs";

export async function GET() {
  try {
    const categories = await getCategories();
    return Response.json(categories);
  } catch (error) {
    return Response.json(
      { error: "Failed to load categories", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function POST(request: Request) {
  try {
    const payload = await request.json();
    const { data, errors } = validateCategoryInput(payload);

    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const categories = await getCategories();
    const duplicateName = categories.find(
      (category) => category.name.toLowerCase() === data.name.toLowerCase()
    );

    if (duplicateName) {
      return Response.json({ error: "Category already exists" }, { status: 409 });
    }

    const products = await getProducts();
    const isUsedByProducts = products.some(
      (product) => product.category.toLowerCase() === data.name.toLowerCase()
    );

    const newCategory: Category = {
      id: crypto.randomUUID(),
      ...data,
    };

    const nextCategories = [newCategory, ...categories];
    await saveCategories(nextCategories);

    return Response.json(
      {
        ...newCategory,
        usedByProducts: isUsedByProducts,
      },
      { status: 201 }
    );
  } catch (error) {
    return Response.json(
      { error: "Failed to create category", detail: String(error) },
      { status: 500 }
    );
  }
}

