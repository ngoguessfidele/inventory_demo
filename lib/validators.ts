import type {
  AdjustmentInput,
  CategoryInput,
  ProductInput,
} from "@/types";

interface ValidationResult<T> {
  data?: T;
  errors: string[];
}

function asNonEmptyString(value: unknown, field: string): string | null {
  if (typeof value !== "string" || value.trim().length === 0) {
    return `${field} is required`;
  }
  return value.trim();
}

function asOptionalString(value: unknown): string {
  return typeof value === "string" ? value.trim() : "";
}

function asNumber(value: unknown, field: string): { value?: number; error?: string } {
  const numberValue = Number(value);
  if (!Number.isFinite(numberValue)) {
    return { error: `${field} must be a valid number` };
  }
  return { value: numberValue };
}

export function validateProductInput(payload: unknown): ValidationResult<ProductInput> {
  const errors: string[] = [];
  const input = payload as Record<string, unknown>;

  const name = asNonEmptyString(input?.name, "Name");
  if (!name) errors.push("Name is required");

  const category = asNonEmptyString(input?.category, "Category");
  if (!category) errors.push("Category is required");

  const sku = asOptionalString(input?.sku);

  const unit = asNonEmptyString(input?.unit, "Unit");
  if (!unit) errors.push("Unit is required");

  const quantityResult = asNumber(input?.quantity, "Quantity");
  if (quantityResult.error) errors.push(quantityResult.error);
  if ((quantityResult.value ?? 0) < 0) errors.push("Quantity cannot be negative");

  const costResult = asNumber(input?.costPrice, "Cost price");
  if (costResult.error) errors.push(costResult.error);
  if ((costResult.value ?? 0) < 0) errors.push("Cost price cannot be negative");

  const sellingResult = asNumber(input?.sellingPrice, "Selling price");
  if (sellingResult.error) errors.push(sellingResult.error);
  if ((sellingResult.value ?? 0) < 0) errors.push("Selling price cannot be negative");

  const thresholdResult = asNumber(input?.lowStockThreshold, "Low stock threshold");
  if (thresholdResult.error) errors.push(thresholdResult.error);
  if ((thresholdResult.value ?? 0) < 0) {
    errors.push("Low stock threshold cannot be negative");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      name: name!,
      category: category!,
      sku,
      unit: unit!,
      quantity: quantityResult.value!,
      costPrice: costResult.value!,
      sellingPrice: sellingResult.value!,
      lowStockThreshold: thresholdResult.value!,
    },
    errors: [],
  };
}

export function validateCategoryInput(payload: unknown): ValidationResult<CategoryInput> {
  const errors: string[] = [];
  const input = payload as Record<string, unknown>;

  const name = asNonEmptyString(input?.name, "Name");
  if (!name) errors.push("Name is required");

  const description = asNonEmptyString(input?.description, "Description");
  if (!description) errors.push("Description is required");

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      name: name!,
      description: description!,
    },
    errors: [],
  };
}

export function validateAdjustmentInput(
  payload: unknown
): ValidationResult<Required<AdjustmentInput>> {
  const errors: string[] = [];
  const input = payload as Record<string, unknown>;

  const productId = asNonEmptyString(input?.productId, "Product");
  if (!productId) errors.push("Product is required");

  const type = input?.type;
  if (type !== "in" && type !== "out") {
    errors.push("Type must be 'in' or 'out'");
  }

  const quantityResult = asNumber(input?.quantity, "Quantity");
  if (quantityResult.error) errors.push(quantityResult.error);
  if ((quantityResult.value ?? 0) <= 0) errors.push("Quantity must be greater than 0");

  const reason = asNonEmptyString(input?.reason, "Reason");
  if (!reason) errors.push("Reason is required");

  const dateInput =
    typeof input?.date === "string" && input.date.trim().length > 0
      ? input.date.trim()
      : new Date().toISOString();

  const parsedDate = new Date(dateInput);
  if (Number.isNaN(parsedDate.getTime())) {
    errors.push("Date must be a valid ISO date string");
  }

  if (errors.length > 0) {
    return { errors };
  }

  return {
    data: {
      productId: productId!,
      type: type as "in" | "out",
      quantity: quantityResult.value!,
      reason: reason!,
      date: parsedDate.toISOString(),
    },
    errors: [],
  };
}

