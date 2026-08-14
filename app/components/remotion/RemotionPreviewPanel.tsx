"use client";

import { Player, type PlayerRef } from "@remotion/player";
import { MonitorPlay } from "lucide-react";

import MusicVideoComposition from "@/components/remotion/MusicVideoComposition";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import { buildRemotionCompositionConfig } from "@/lib/remotionCompositionConfig";
import type {
  PreparedVideoAssets,
  VideoExportManifest,
} from "@/types/videoProject";

type RemotionPreviewPanelProps = {
  manifest: VideoExportManifest;
  preparedAssets: PreparedVideoAssets;
  blockingReasons: string[];
  playerRef: (instance: PlayerRef | null) => void;
};

export default function RemotionPreviewPanel({
  manifest,
  preparedAssets,
  blockingReasons,
  playerRef,
}: RemotionPreviewPanelProps) {
  const isReady = blockingReasons.length === 0;
  const compositionConfig = buildRemotionCompositionConfig({
    manifest,
    preparedAssets,
  });

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-950 text-white">
            <MonitorPlay aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
            <h2 className="font-semibold text-gray-950">Video Preview</h2>
            <p className="text-sm text-gray-600">
              Same composition used for the final export.
            </p>
          </div>
        </div>

        <StatusPill
          label={isReady ? "Ready" : "Waiting"}
          tone={isReady ? "ready" : "waiting"}
        />
      </div>

      {/* LESSON CHECKPOINT - Official preview:
          The displayed preview and exported MP4 use the same Remotion
          composition, so layout and motion stay aligned.
      */}
      <div
        className="relative mt-4 w-full overflow-hidden rounded-lg bg-black shadow-sm"
      >
        <div
          aria-hidden="true"
          style={{
            paddingTop: `${
              (compositionConfig.compositionHeight /
                compositionConfig.compositionWidth) *
              100
            }%`,
          }}
        />
        <Player
          ref={playerRef}
          component={MusicVideoComposition}
          inputProps={compositionConfig.inputProps}
          durationInFrames={compositionConfig.durationInFrames}
          compositionWidth={compositionConfig.compositionWidth}
          compositionHeight={compositionConfig.compositionHeight}
          fps={compositionConfig.fps}
          controls
          acknowledgeRemotionLicense
          style={{
            display: "block",
            height: "100%",
            inset: 0,
            position: "absolute",
            width: "100%",
          }}
        />
      </div>

      {!isReady && (
        <p className="mt-3 text-sm text-gray-600">
          Complete the required setup items to preview the full composition.
        </p>
      )}
    </Panel>
  );
}
