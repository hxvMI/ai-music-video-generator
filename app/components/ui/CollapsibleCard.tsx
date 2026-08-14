"use client";

import type { ReactNode } from "react";
import { useState } from "react";
import { ChevronDown } from "lucide-react";

type CollapsibleCardProps = {
  title: string;
  description?: string;
  summary?: ReactNode;
  children: ReactNode;
  defaultOpen?: boolean;
  category?: string;
  className?: string;
};

export default function CollapsibleCard({
  title,
  description,
  summary,
  children,
  defaultOpen = false,
  category,
  className = "",
}: CollapsibleCardProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <details
      className={`group editor-disclosure ${className}`}
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="cursor-pointer list-none px-3 py-3">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            {category && (
              <p className="mb-1 text-[11px] font-semibold uppercase text-cyan-700">
                {category}
              </p>
            )}
            <p className="text-sm font-semibold text-gray-950">{title}</p>
            {description && (
              <p className="mt-1 text-xs text-gray-500">{description}</p>
            )}
            {summary && (
              <div className="mt-2 truncate text-xs font-medium text-gray-700 group-open:hidden">
                {summary}
              </div>
            )}
          </div>

          <ChevronDown
            aria-hidden="true"
            className="mt-0.5 h-4 w-4 shrink-0 text-gray-500 transition group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="editor-disclosure-content">
        {children}
      </div>
    </details>
  );
}
