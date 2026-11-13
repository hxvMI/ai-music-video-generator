"use client";

import { useState } from "react";

import { Cloud, KeyRound, ShieldCheck, RefreshCw } from "lucide-react";
import { useAppAiCredits } from "@/hooks/useAppAiCredits";

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
  const [isOpen, setIsOpen] = useState(false);
  const { credits, failed, refresh } = useAppAiCredits();
  const isReady =
    (connection.provider === "server" && !failed && credits?.status === "ready") ||
    (connection.provider === "openai" && Boolean(connection.openAiApiKey.trim())) ||
    (connection.provider === "cloudflare" &&
      Boolean(connection.cloudflareAccountId.trim()) &&
      Boolean(connection.cloudflareApiToken.trim()));

  const update = (values: Partial<AiProviderConnection>) =>
    onChange({ ...connection, ...values });

  return (
    <details
      className="group ai-connection editor-disclosure"
      open={isOpen}
      onToggle={(event) => setIsOpen(event.currentTarget.open)}
    >
      <summary className="list-none">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-950 text-white">
              <KeyRound className="h-4 w-4" aria-hidden="true" />
            </span>
            <div className="min-w-0">
              <p className="text-sm font-semibold text-gray-950">AI connection</p>
              <p className="truncate text-xs text-gray-500">
                {connection.provider === "server"
                  ? failed ? "Balance unavailable"
                    : credits?.status === "ready" ? `Cloudflare · ${credits.remaining}/${credits.limit} shared credits`
                    : credits?.status === "exhausted" ? "Shared allowance exhausted"
                    : credits?.status === "not_configured" ? "Personal connection available"
                    : "Checking shared allowance"
                  : `${connection.provider === "openai" ? "OpenAI" : "Cloudflare Workers AI"} ${isReady ? "ready" : "needs credentials"}`}
              </p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <span className={`rounded-full px-2.5 py-1 text-xs font-medium ${isReady ? "bg-emerald-50 text-emerald-800" : "bg-amber-50 text-amber-800"}`}>
              {isReady ? "Connected" : "Connect"}
            </span>
            <span className="rounded border border-gray-200 bg-white px-2 py-1 text-xs font-medium text-gray-600">
              {isOpen ? "Hide" : "Manage"}
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

        <div className="grid gap-2 rounded-lg border border-gray-200 bg-gray-50 p-3" aria-live="polite">
          <div className="flex items-center justify-between gap-2">
            <p className="text-sm font-semibold text-gray-950">App default credits</p>
            <button type="button" onClick={refresh} title="Refresh shared credits" aria-label="Refresh shared credits"
              className="rounded border border-gray-200 bg-white p-2 text-gray-700">
              <RefreshCw className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
          <p className="text-sm text-gray-700">
            {failed || credits?.status === "unavailable" ? "Shared balance unavailable. Use your own connection or try again later."
              : !credits ? "Checking shared allowance..."
              : credits.status === "not_configured" ? "App default needs server setup. Personal connections are available."
              : credits.status === "exhausted" ? "Shared allowance exhausted. Switch to OpenAI or Cloudflare with your own credentials."
              : `${credits.remaining} of ${credits.limit} daily credits left, shared by all visitors.`}
          </p>
          {credits?.remaining !== null && credits?.remaining !== undefined && (
            <progress aria-label="Shared daily credits remaining" value={credits.remaining} max={credits.limit} className="h-2 w-full accent-cyan-700" />
          )}
          <p className="text-xs text-gray-500">
            One credit per submitted background or transcription request, including failed attempts. Resets at 00:00 UTC.
            This is the app&apos;s request allowance; Cloudflare&apos;s separate neuron limit may run out sooner.
          </p>
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
