import type { ReactNode } from "react";

type SummaryGridProps = {
  children: ReactNode;
  columns?: "two" | "three";
};

type InfoRowProps = {
  label: string;
  value: ReactNode;
};

export function InfoRow({ label, value }: InfoRowProps) {
  return (
    <div className="rounded-lg border border-gray-200 bg-gray-50 px-3 py-2">
      <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
        {label}
      </p>
      <div className="mt-1 truncate text-sm font-medium text-gray-950">
        {value}
      </div>
    </div>
  );
}

export default function SummaryGrid({
  children,
  columns = "two",
}: SummaryGridProps) {
  return (
    <div
      className={[
        "grid gap-2",
        columns === "three" ? "sm:grid-cols-3" : "sm:grid-cols-2",
      ].join(" ")}
    >
      {children}
    </div>
  );
}
