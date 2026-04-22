import { getCategories, getProducts, saveCategories, saveProducts } from "@/lib/data-store";
import { validateCategoryInput } from "@/lib/validators";
import type { Category } from "@/types";

export const runtime = "nodejs";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const categories = await getCategories();
    const category = categories.find((item) => item.id === id);

    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    return Response.json(category);
  } catch (error) {
    return Response.json(
      { error: "Failed to load category", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function PUT(request: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const payload = await request.json();
    const { data, errors } = validateCategoryInput(payload);

    if (!data) {
      return Response.json({ error: "Validation failed", errors }, { status: 400 });
    }

    const categories = await getCategories();
    const existingCategory = categories.find((item) => item.id === id);
    if (!existingCategory) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    const duplicateName = categories.find(
      (item) => item.id !== id && item.name.toLowerCase() === data.name.toLowerCase()
    );
    if (duplicateName) {
      return Response.json({ error: "Category already exists" }, { status: 409 });
    }

    const updatedCategory: Category = { ...existingCategory, ...data };
    const nextCategories = categories.map((item) => (item.id === id ? updatedCategory : item));
    await saveCategories(nextCategories);

    if (existingCategory.name !== updatedCategory.name) {
      const products = await getProducts();
      const nextProducts = products.map((product) =>
        product.category.toLowerCase() === existingCategory.name.toLowerCase()
          ? { ...product, category: updatedCategory.name, updatedAt: new Date().toISOString() }
          : product
      );
      await saveProducts(nextProducts);
    }

    return Response.json(updatedCategory);
  } catch (error) {
    return Response.json(
      { error: "Failed to update category", detail: String(error) },
      { status: 500 }
    );
  }
}

export async function DELETE(_: Request, context: RouteParams) {
  try {
    const { id } = await context.params;
    const categories = await getCategories();
    const category = categories.find((item) => item.id === id);
    if (!category) {
      return Response.json({ error: "Category not found" }, { status: 404 });
    }

    const products = await getProducts();
    const isInUse = products.some(
      (product) => product.category.toLowerCase() === category.name.toLowerCase()
    );

    if (isInUse) {
      return Response.json(
        { error: "Cannot delete category used by products" },
        { status: 409 }
      );
    }

    const nextCategories = categories.filter((item) => item.id !== id);
    await saveCategories(nextCategories);

    return new Response(null, { status: 204 });
  } catch (error) {
    return Response.json(
      { error: "Failed to delete category", detail: String(error) },
      { status: 500 }
    );
  }
}
