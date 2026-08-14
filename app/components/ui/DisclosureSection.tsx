import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";

type DisclosureSectionProps = {
  title: string;
  description: string;
  children: ReactNode;
  defaultOpen?: boolean;
};

export default function DisclosureSection({
  title,
  description,
  children,
  defaultOpen = false,
}: DisclosureSectionProps) {
  // LESSON CHECKPOINT - Progressive disclosure:
  // Advanced render/debug information is useful, but it should not compete
  // with the main workflow. The native <details> element gives us accessible
  // show/hide behavior without extra React state.
  return (
    <details className="group" open={defaultOpen}>
      <summary className="advanced-disclosure cursor-pointer list-none rounded-lg p-4 transition">
        <div className="flex items-center justify-between gap-4">
          <div>
            <h2 className="font-semibold text-gray-950">{title}</h2>
            <p className="mt-1 text-sm text-gray-600">{description}</p>
          </div>

          <ChevronDown
            aria-hidden="true"
            className="h-5 w-5 shrink-0 text-gray-500 transition group-open:rotate-180"
          />
        </div>
      </summary>

      <div className="mt-4 flex flex-col gap-4">{children}</div>
    </details>
  );
}
