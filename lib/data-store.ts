import { access, mkdir, readFile, writeFile } from "fs/promises";
import path from "path";
import type { Adjustment, Category, Product, Sale } from "@/types";

const DATA_DIR = path.join(process.cwd(), "data");
const PRODUCTS_FILE = path.join(DATA_DIR, "products.json");
const CATEGORIES_FILE = path.join(DATA_DIR, "categories.json");
const ADJUSTMENTS_FILE = path.join(DATA_DIR, "adjustments.json");
const SALES_FILE = path.join(DATA_DIR, "sales.json");

const now = new Date().toISOString();

const seededCategories: Category[] = [
  { id: "cat-1", name: "Beverages", description: "Drinks and refreshments" },
  { id: "cat-2", name: "Snacks", description: "Packaged snack products" },
  { id: "cat-3", name: "Household", description: "Cleaning and home essentials" },
];

const seededProducts: Product[] = [
  {
    id: "prd-1",
    name: "Orange Juice 1L",
    category: "Beverages",
    sku: "BEV-OJ-1L",
    quantity: 18,
    unit: "bottle",
    costPrice: 1.2,
    sellingPrice: 1.9,
    lowStockThreshold: 10,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "prd-2",
    name: "Potato Chips 100g",
    category: "Snacks",
    sku: "SNK-CHIPS-100",
    quantity: 7,
    unit: "pack",
    costPrice: 0.45,
    sellingPrice: 0.85,
    lowStockThreshold: 8,
    createdAt: now,
    updatedAt: now,
  },
  {
    id: "prd-3",
    name: "Dish Soap 500ml",
    category: "Household",
    sku: "HOU-DS-500",
    quantity: 24,
    unit: "bottle",
    costPrice: 1.1,
    sellingPrice: 1.7,
    lowStockThreshold: 6,
    createdAt: now,
    updatedAt: now,
  },
];

const seededAdjustments: Adjustment[] = [
  {
    id: "adj-1",
    productId: "prd-1",
    type: "in",
    quantity: 8,
    reason: "Initial stocking",
    date: now,
  },
  {
    id: "adj-2",
    productId: "prd-2",
    type: "out",
    quantity: 3,
    reason: "Sales batch",
    date: now,
  },
];

const seededSales: Sale[] = [];

function getSeedData(filePath: string): unknown {
  if (filePath === PRODUCTS_FILE) return seededProducts;
  if (filePath === CATEGORIES_FILE) return seededCategories;
  if (filePath === ADJUSTMENTS_FILE) return seededAdjustments;
  if (filePath === SALES_FILE) return seededSales;
  return [];
}

async function ensureFile(filePath: string, seedData: unknown): Promise<void> {
  try {
    await access(filePath);
  } catch {
    await writeFile(filePath, JSON.stringify(seedData, null, 2), "utf-8");
  }
}

export async function ensureDataFiles(): Promise<void> {
  await mkdir(DATA_DIR, { recursive: true });
  await Promise.all([
    ensureFile(PRODUCTS_FILE, seededProducts),
    ensureFile(CATEGORIES_FILE, seededCategories),
    ensureFile(ADJUSTMENTS_FILE, seededAdjustments),
    ensureFile(SALES_FILE, seededSales),
  ]);
}

async function readJsonFile<T>(filePath: string): Promise<T> {
  await ensureDataFiles();
  const content = await readFile(filePath, "utf-8");

  if (content.trim().length === 0) {
    const seedData = getSeedData(filePath);
    await writeJsonFile(filePath, seedData);
    return seedData as T;
  }

  try {
    return JSON.parse(content) as T;
  } catch {
    const seedData = getSeedData(filePath);
    await writeJsonFile(filePath, seedData);
    return seedData as T;
  }
}

async function writeJsonFile<T>(filePath: string, data: T): Promise<void> {
  await ensureDataFiles();
  await writeFile(filePath, JSON.stringify(data, null, 2), "utf-8");
}

export async function getProducts(): Promise<Product[]> {
  return readJsonFile<Product[]>(PRODUCTS_FILE);
}

export async function saveProducts(products: Product[]): Promise<void> {
  await writeJsonFile(PRODUCTS_FILE, products);
}

export async function getCategories(): Promise<Category[]> {
  return readJsonFile<Category[]>(CATEGORIES_FILE);
}

export async function saveCategories(categories: Category[]): Promise<void> {
  await writeJsonFile(CATEGORIES_FILE, categories);
}

export async function getAdjustments(): Promise<Adjustment[]> {
  return readJsonFile<Adjustment[]>(ADJUSTMENTS_FILE);
}

export async function saveAdjustments(adjustments: Adjustment[]): Promise<void> {
  await writeJsonFile(ADJUSTMENTS_FILE, adjustments);
}

export async function getSales(): Promise<Sale[]> {
  return readJsonFile<Sale[]>(SALES_FILE);
}

export async function saveSales(sales: Sale[]): Promise<void> {
  await writeJsonFile(SALES_FILE, sales);
}

