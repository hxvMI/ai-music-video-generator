"use client";

import { Contrast, Moon, Sun } from "lucide-react";

export type InterfaceTheme = "studio" | "graphite" | "contrast";

type Props = {
  value: InterfaceTheme;
  onChange: (theme: InterfaceTheme) => void;
};

const themes = [
  { value: "studio" as const, label: "Studio", icon: Sun },
  { value: "graphite" as const, label: "Graphite", icon: Moon },
  { value: "contrast" as const, label: "Contrast", icon: Contrast },
];

export default function InterfaceThemePicker({ value, onChange }: Props) {
  return (
    <div className="interface-theme-picker" aria-label="Interface theme">
      {themes.map((theme) => {
        const Icon = theme.icon;
        return (
          <button
            key={theme.value}
            type="button"
            aria-pressed={value === theme.value}
            aria-label={theme.label}
            onClick={() => onChange(theme.value)}
            title={`${theme.label} interface theme`}
            className={value === theme.value ? "is-active" : ""}
          >
            <Icon className="h-3.5 w-3.5" aria-hidden="true" />
            <span>{theme.label}</span>
          </button>
        );
      })}
    </div>
  );
}

