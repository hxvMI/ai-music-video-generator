"use client";

import { useState } from "react";

import { Cloud, KeyRound, ShieldCheck } from "lucide-react";

import type { AiProviderConnection, AiProvider } from "@/types/videoProject";

type Props = {
  connection: AiProviderConnection;
  onChange: (connection: AiProviderConnection) => void;
};

const providers: Array<{ value: AiProvider; label: string }> = [
  { value: "server", label: "App default" },
  { value: "openai", label: "OpenAI" },
  { value: "cloudflare", label: "Cloudflare" },
];

export default function AiProviderSettings({ connection, onChange }: Props) {
  const [isOpen, setIsOpen] = useState(true);
  const isReady =
    connection.provider === "server" ||
    (connection.provider === "openai" && Boolean(connection.openAiApiKey.trim())) ||
    (connection.provider === "cloudflare" &&
      Boolean(connection.cloudflareAccountId.trim()) &&
      Boolean(connection.cloudflareApiToken.trim()));

  const update = (values: Partial<AiProviderConnection>) =>
    onChange({ ...connection, ...values });

  return (
    <details
      className="group editor-disclosure"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="list-none">
        <div className="flex items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-white">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-950">AI connection</p>
              <p className="truncate text-xs text-gray-500">
                {connection.provider === "server"
                  ? "Use the app's server configuration"
                  : `${connection.provider === "openai" ? "OpenAI" : "Cloudflare Workers AI"} ${isReady ? "ready" : "needs credentials"}`}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {isReady ? "Ready" : "Setup needed"}
            </span>
            <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
              {isOpen ? "Hide" : "Show"}
            </span>
          </div>
        </div>
      </summary>

      <div className="editor-disclosure-content grid gap-4">
        <div className="grid grid-cols-3 overflow-hidden rounded-lg border border-gray-200 text-sm">
          {providers.map((provider) => (
            <button
              key={provider.value}
              type="button"
              onClick={() => update({ provider: provider.value })}
              className={`px-3 py-2.5 font-medium ${connection.provider === provider.value ? "bg-gray-950 text-white" : "bg-white text-gray-700 hover:bg-gray-50"}`}
            >
              {provider.label}
            </button>
          ))}
        </div>

        {connection.provider === "openai" && (
          <label className="grid gap-1.5 text-sm font-medium text-gray-700">
            OpenAI API key
            <input
              type="password"
              autoComplete="off"
              value={connection.openAiApiKey}
              onChange={(event) => update({ openAiApiKey: event.target.value })}
              placeholder="sk-proj-..."
              className="rounded-lg border px-3 py-2.5 font-normal text-gray-950"
            />
          </label>
        )}

        {connection.provider === "cloudflare" && (
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Cloudflare Account ID
              <input
                type="text"
                autoComplete="off"
                value={connection.cloudflareAccountId}
                onChange={(event) => update({ cloudflareAccountId: event.target.value })}
                placeholder="32-character account ID"
                className="rounded-lg border px-3 py-2.5 font-normal text-gray-950"
              />
            </label>
            <label className="grid gap-1.5 text-sm font-medium text-gray-700">
              Workers AI API token
              <input
                type="password"
                autoComplete="off"
                value={connection.cloudflareApiToken}
                onChange={(event) => update({ cloudflareApiToken: event.target.value })}
                placeholder="API token"
                className="rounded-lg border px-3 py-2.5 font-normal text-gray-950"
              />
            </label>
          </div>
        )}

        <div className="info-callout flex items-start gap-2 rounded-lg px-3 py-2.5 text-xs">
          {connection.provider === "cloudflare" ? <Cloud className="mt-0.5 h-4 w-4 shrink-0" /> : <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0" />}
          <p>
            Personal credentials stay in this browser tab&apos;s memory and are sent only when you request lyrics or an AI background. They are not saved with the project or export.
          </p>
        </div>
      </div>
    </details>
  );
}
