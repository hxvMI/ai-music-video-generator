import { AlertTriangle, CheckCircle2, Clock3, Loader2, XCircle } from "lucide-react";

type StatusTone = "ready" | "waiting" | "working" | "success" | "error";

type StatusPillProps = {
  label: string;
  tone: StatusTone;
  className?: string;
};

const toneStyles: Record<StatusTone, string> = {
  ready: "border-emerald-200 bg-emerald-50 text-emerald-800",
  waiting: "border-amber-200 bg-amber-50 text-amber-800",
  working: "border-cyan-200 bg-cyan-50 text-cyan-800",
  success: "border-emerald-200 bg-emerald-50 text-emerald-800",
  error: "border-red-200 bg-red-50 text-red-800",
};

const toneIcons = {
  ready: CheckCircle2,
  waiting: Clock3,
  working: Loader2,
  success: CheckCircle2,
  error: XCircle,
};

export default function StatusPill({ label, tone, className = "" }: StatusPillProps) {
  const Icon = toneIcons[tone] ?? AlertTriangle;

  return (
    <span
      data-status-tone={tone}
      className={[
        "inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium",
        toneStyles[tone],
        className,
      ].join(" ")}
    >
      <Icon
        aria-hidden="true"
        className={tone === "working" ? "h-3.5 w-3.5 animate-spin" : "h-3.5 w-3.5"}
      />
      {label}
    </span>
  );
}
