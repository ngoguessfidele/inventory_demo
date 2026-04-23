import type { Product } from "@/types";

function buildSkuPrefix(category: string): string {
  const sanitized = category.toUpperCase().replace(/[^A-Z0-9]/g, "");
  if (sanitized.length === 0) {
    return "PRD";
  }
  return sanitized.slice(0, 3);
}

export function generateSku(products: Product[], category: string): string {
  const prefix = buildSkuPrefix(category);
  const pattern = new RegExp(`^${prefix}-(\\d{4})$`, "i");

  let maxSequence = 0;
  for (const product of products) {
    const match = product.sku.match(pattern);
    if (!match) continue;

    const sequence = Number(match[1]);
    if (Number.isFinite(sequence) && sequence > maxSequence) {
      maxSequence = sequence;
    }
  }

  let nextSequence = maxSequence + 1;
  let candidate = `${prefix}-${String(nextSequence).padStart(4, "0")}`;

  while (products.some((product) => product.sku.toLowerCase() === candidate.toLowerCase())) {
    nextSequence += 1;
    candidate = `${prefix}-${String(nextSequence).padStart(4, "0")}`;
  }

  return candidate;
}