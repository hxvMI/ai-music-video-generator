import { ListChecks } from "lucide-react";

import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import SummaryGrid, { InfoRow } from "@/components/ui/SummaryGrid";
import { getVideoRenderOutputFileName } from "@/lib/videoExportManifest";
import {
  formatResolvedPresetSummary,
  resolveVisualPresets,
} from "@/lib/visualPresetSelection";
import type { VideoExportManifest } from "@/types/videoProject";

type ProductionSummaryPanelProps = {
  manifest: VideoExportManifest;
  blockingReasons: string[];
};

function formatDuration(seconds: number) {
  if (!Number.isFinite(seconds) || seconds <= 0) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export default function ProductionSummaryPanel({
  manifest,
  blockingReasons,
}: ProductionSummaryPanelProps) {
  const isReady = blockingReasons.length === 0;
  const resolvedPresets = resolveVisualPresets({
    style: manifest.style,
    audioAnalysis: manifest.audioAnalysis,
  });
  const nextAction = isReady ? "Review preview, then export." : blockingReasons[0];

  return (
    <Panel className="p-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-white">
            <ListChecks aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-950">Project Summary</h2>
            <p className="text-sm text-gray-600">{nextAction}</p>
          </div>
        </div>

        <StatusPill
          label={isReady ? "Ready" : `${blockingReasons.length} missing`}
          tone={isReady ? "ready" : "waiting"}
        />
      </div>

      <div className="mt-4">
        <SummaryGrid>
          <InfoRow
            label="Track"
            value={
              manifest.metadata.songTitle || manifest.metadata.artistName
                ? `${manifest.metadata.artistName || "Artist"} - ${
                    manifest.metadata.songTitle || "Song title"
                  }`
                : "Untitled"
            }
          />
          <InfoRow
            label="Duration"
            value={formatDuration(manifest.renderSettings.durationSeconds)}
          />
          <InfoRow
            label="Visuals"
            value={
              manifest.style.visualMode === "auto"
                ? `${manifest.style.theme}, ${manifest.style.reactiveTimeline.zones.length}-zone ${manifest.style.reactiveTimeline.mode} arrangement`
                : `${manifest.style.theme}, ${manifest.style.visualMode}`
            }
          />
          <InfoRow
            label="Background"
            value={manifest.assets.background.fileName ?? "None"}
          />
        </SummaryGrid>
      </div>

      <div className="mt-3 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-gray-700">
        <p className="font-medium text-gray-950">
          {getVideoRenderOutputFileName(manifest)}
        </p>
        <p className="mt-1 text-xs">
          {formatResolvedPresetSummary(resolvedPresets)}
        </p>
      </div>

      {!isReady && (
        <div className="mt-3 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-xs text-amber-900">
          <p className="font-medium">Before export:</p>
          <ul className="mt-1 list-inside list-disc">
            {blockingReasons.map((reason) => (
              <li key={reason}>{reason}</li>
            ))}
          </ul>
        </div>
      )}
    </Panel>
  );
}
