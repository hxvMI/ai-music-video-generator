"use client";

import {
  formatResolvedPresetSummary,
  resolveVisualPresets,
} from "@/lib/visualPresetSelection";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import type { VideoExportManifest } from "@/types/videoProject";

type VideoExportManifestPanelProps = {
  manifest: VideoExportManifest;
  blockingReasons: string[];
};

function formatBytes(bytes: number | null) {
  if (bytes === null) return "Missing";

  return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
}

function formatAssetSummary(
  asset: VideoExportManifest["assets"]["background"]
) {
  if (!asset.fileName) return "Missing";

  return asset.sizeBytes === null
    ? asset.fileName
    : `${asset.fileName} - ${formatBytes(asset.sizeBytes)}`;
}

export default function VideoExportManifestPanel({
  manifest,
  blockingReasons,
}: VideoExportManifestPanelProps) {
  const isReadyForExport = blockingReasons.length === 0;
  const resolvedPresets = resolveVisualPresets({
    style: manifest.style,
    audioAnalysis: manifest.audioAnalysis,
  });
  const manifestJson = JSON.stringify(
    {
      ...manifest,
      background: {
        ...manifest.background,
        generatedDataUrl: manifest.background.generatedDataUrl.startsWith(
          "data:"
        )
          ? `[data URL omitted: ${manifest.background.generatedDataUrl.length} characters]`
          : manifest.background.generatedDataUrl,
      },
    },
    null,
    2
  );

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-950">Render Manifest</h2>
          <p className="text-sm text-gray-600">
            {isReadyForExport
              ? "The serializable render settings are ready for the next export step."
              : "The manifest is available, but rendering is still blocked."}
          </p>
        </div>

        <StatusPill
          label={isReadyForExport ? "Export ready" : "Needs input"}
          tone={isReadyForExport ? "ready" : "waiting"}
        />
      </div>

      {/* LESSON CHECKPOINT - Serializable manifest:
          File objects cannot be safely sent to a renderer as JSON.
          This manifest stores render settings and file metadata only.
          A future upload step will replace browser files with stable asset URLs.
      */}
      {blockingReasons.length > 0 && (
        <ul className="mt-4 list-disc pl-5 text-sm text-gray-700">
          {blockingReasons.map((reason) => (
            <li key={reason}>{reason}</li>
          ))}
        </ul>
      )}

      <div className="mt-4 grid gap-2 text-sm sm:grid-cols-2">
        <div className="rounded border px-3 py-2">
          <p className="font-medium">Audio</p>
          <p>{formatBytes(manifest.assets.audio.sizeBytes)}</p>
        </div>

        <div className="rounded border px-3 py-2">
          <p className="font-medium">Background</p>
          <p>{formatAssetSummary(manifest.assets.background)}</p>
        </div>

        <div className="rounded border px-3 py-2">
          <p className="font-medium">Logo</p>
          <p>{formatBytes(manifest.assets.logo.sizeBytes)}</p>
        </div>

        <div className="rounded border px-3 py-2">
          <p className="font-medium">Output</p>
          <p>
            {manifest.renderSettings.width}x{manifest.renderSettings.height},{" "}
            {manifest.renderSettings.fps}fps
          </p>
        </div>

        <div className="rounded border px-3 py-2 sm:col-span-2">
          <p className="font-medium">Resolved visuals</p>
          <p>{formatResolvedPresetSummary(resolvedPresets)}</p>
          {manifest.style.visualMode === "auto" && (
            <p>
              {manifest.style.reactiveTimeline.zones.length}{" "}
              {manifest.style.reactiveTimeline.mode} arrangement zones
            </p>
          )}
        </div>
      </div>

      <textarea
        readOnly
        value={manifestJson}
        className="mt-4 h-64 w-full rounded border p-3 font-mono text-xs"
      />
    </Panel>
  );
}
