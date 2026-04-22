export type AdjustmentType = "in" | "out";

export interface Product {
  id: string;
  name: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  description: string;
}

export interface Adjustment {
  id: string;
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  date: string;
}

export interface ProductInput {
  name: string;
  category: string;
  sku: string;
  quantity: number;
  unit: string;
  costPrice: number;
  sellingPrice: number;
  lowStockThreshold: number;
}

export interface CategoryInput {
  name: string;
  description: string;
}

export interface AdjustmentInput {
  productId: string;
  type: AdjustmentType;
  quantity: number;
  reason: string;
  date?: string;
}

