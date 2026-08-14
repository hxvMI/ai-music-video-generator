"use client";

import { useState, type ReactNode } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";

type WorkflowStepCardProps = {
  stepNumber: number;
  title: string;
  description: string;
  icon: LucideIcon;
  isReady: boolean;
  missingItems?: string[];
  completedSummary?: ReactNode;
  children: ReactNode;
  initialOpen?: boolean;
};

export default function WorkflowStepCard({
  stepNumber,
  title,
  description,
  icon: Icon,
  isReady,
  missingItems = [],
  completedSummary,
  children,
  initialOpen,
}: WorkflowStepCardProps) {
  // Readiness chooses the initial layout, then the disclosure belongs to the
  // user. A validation change should never close a form while it has focus.
  const [isOpen, setIsOpen] = useState(() => initialOpen ?? !isReady);
  const toggleLabel = isOpen ? "Hide" : "Show";

  return (
    <Panel className="workflow-step p-4">
      <div className="flex items-start gap-3">
        <div className="workflow-step-icon flex h-9 w-9 shrink-0 items-center justify-center rounded-lg">
          <Icon aria-hidden="true" className="h-4 w-4" />
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div>
              <p className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                Step {stepNumber}
              </p>
              <h2 className="text-base font-semibold text-gray-950">{title}</h2>
            </div>

            <div className="flex items-center gap-2">
              <StatusPill
                label={isReady ? "Ready" : "Needs input"}
                tone={isReady ? "ready" : "waiting"}
              />
              <button
                type="button"
                aria-expanded={isOpen}
                onClick={() => setIsOpen((currentValue) => !currentValue)}
                className="inline-flex items-center gap-1 rounded border border-gray-200 px-2.5 py-1 text-xs font-medium text-gray-700 transition hover:border-cyan-300 hover:text-cyan-800"
              >
                {toggleLabel}
                <ChevronDown
                  aria-hidden="true"
                  className={[
                    "h-3.5 w-3.5 transition",
                    isOpen ? "rotate-180" : "",
                  ].join(" ")}
                />
              </button>
            </div>
          </div>

          <p className="mt-1 text-sm text-gray-600">{description}</p>

          {missingItems.length > 0 && (
            <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
              Missing: {missingItems.join(", ")}
            </div>
          )}

          {!isOpen && completedSummary && (
            <div className="mt-3 truncate rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
              {completedSummary}
            </div>
          )}

          {isOpen && <div className="mt-4">{children}</div>}
        </div>
      </div>
    </Panel>
  );
}
