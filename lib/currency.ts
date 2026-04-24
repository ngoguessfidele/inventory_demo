const rwfFormatter = new Intl.NumberFormat("en-RW", {
  style: "decimal",
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatCurrency(value: number): string {
  return `${rwfFormatter.format(value)} RWF`;
}