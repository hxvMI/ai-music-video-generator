"use client";

import { useId, useState } from "react";
import { RotateCcw } from "lucide-react";

type Props = {
  label: string; value: number; min: number; max: number; step: number;
  defaultValue: number; unit?: string; onChange: (value: number) => void;
};

export default function NumericControl({ label, value, min, max, step, defaultValue, unit, onChange }: Props) {
  const id = useId();
  // Let users clear the field or type a minus sign before committing a valid number.
  const [draft, setDraft] = useState("");
  const [editing, setEditing] = useState(false);
  return (
    <div className="numeric-control">
      <label id={id} className="text-xs font-medium text-gray-700">{label}</label>
      <div className="numeric-control-row">
        <input type="range" aria-labelledby={id} value={value} min={min} max={max} step={step}
          onChange={(event) => onChange(Number(event.target.value))} />
        <div className="numeric-value">
          <input type="number" aria-label={`${label} value`} min={min} max={max} step={step}
            value={editing ? draft : Number(value.toFixed(2))}
            onFocus={() => { setDraft(String(value)); setEditing(true); }}
            onChange={(event) => setDraft(event.target.value)}
            onBlur={() => {
              if (draft.trim() && Number.isFinite(Number(draft))) onChange(Math.min(max, Math.max(min, Number(draft))));
              setEditing(false);
            }}
            onKeyDown={(event) => { if (event.key === "Enter") event.currentTarget.blur(); }} />
          {unit && <span aria-hidden="true">{unit}</span>}
        </div>
        <button type="button" title={`Reset ${label.toLowerCase()}`} aria-label={`Reset ${label.toLowerCase()}`}
          onClick={() => onChange(defaultValue)} disabled={value === defaultValue}>
          <RotateCcw className="h-3.5 w-3.5" aria-hidden="true" />
        </button>
      </div>
    </div>
  );
}
