import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { formatINR } from "@/lib/money";

type MoneyValue = Prisma.Decimal | number | string;

export function StatCard({
  label,
  value,
  hint,
  tone = "default",
}: {
  label: string;
  value: string;
  hint?: string;
  tone?: "default" | "good" | "warn" | "bad";
}) {
  const toneClass = {
    default: "text-slate-900",
    good: "text-emerald-600",
    warn: "text-amber-600",
    bad: "text-rose-600",
  }[tone];
  return (
    <div className="card p-5">
      <div className="text-sm font-medium text-slate-500">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${toneClass}`}>{value}</div>
      {hint && <div className="mt-1 text-xs text-slate-400">{hint}</div>}
    </div>
  );
}

export function Money({ value }: { value: MoneyValue }) {
  return <span className="tabular-nums">{formatINR(value)}</span>;
}

const badgeTones: Record<string, string> = {
  ACTIVE: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  CLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  FORECLOSED: "bg-slate-100 text-slate-600 ring-slate-500/20",
  WRITTEN_OFF: "bg-rose-50 text-rose-700 ring-rose-600/20",
  DRAFT: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PAID: "bg-emerald-50 text-emerald-700 ring-emerald-600/20",
  PENDING: "bg-slate-100 text-slate-600 ring-slate-500/20",
  PARTIAL: "bg-amber-50 text-amber-700 ring-amber-600/20",
  OVERDUE: "bg-rose-50 text-rose-700 ring-rose-600/20",
};

export function Badge({ value }: { value: string }) {
  const tone = badgeTones[value] ?? "bg-slate-100 text-slate-600 ring-slate-500/20";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ring-1 ring-inset ${tone}`}
    >
      {value.replaceAll("_", " ")}
    </span>
  );
}

export function PageHeader({
  title,
  subtitle,
  action,
}: {
  title: string;
  subtitle?: string;
  action?: React.ReactNode;
}) {
  return (
    <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">{title}</h1>
        {subtitle && <p className="mt-1 text-sm text-slate-500">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <div className="card p-10 text-center text-sm text-slate-500">{children}</div>
  );
}

export function LinkButton({
  href,
  children,
  variant = "primary",
}: {
  href: string;
  children: React.ReactNode;
  variant?: "primary" | "secondary";
}) {
  return (
    <Link href={href} className={variant === "primary" ? "btn-primary" : "btn-secondary"}>
      {children}
    </Link>
  );
}
