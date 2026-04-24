type BadgeVariant = "default" | "success" | "warning" | "danger";

const variantClassNames: Record<BadgeVariant, string> = {
  default: "bg-slate-100 text-slate-700 dark:bg-slate-700 dark:text-slate-100",
  success: "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-200",
  warning: "bg-amber-100 text-amber-700 dark:bg-amber-900/40 dark:text-amber-200",
  danger: "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-200",
};

interface BadgeProps {
  label: string;
  variant?: BadgeVariant;
}

export function Badge({ label, variant = "default" }: BadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-semibold ${variantClassNames[variant]}`}
    >
      {label}
    </span>
  );
}

