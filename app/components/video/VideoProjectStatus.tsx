"use client";

import {
  formatResolvedPresetSummary,
  resolveVisualPresets,
} from "@/lib/visualPresetSelection";
import Panel from "@/components/ui/Panel";
import StatusPill from "@/components/ui/StatusPill";
import type { VideoProject } from "@/types/videoProject";

type VideoProjectStatusProps = {
  project: VideoProject;
};

export default function VideoProjectStatus({ project }: VideoProjectStatusProps) {
  const resolvedPresets = resolveVisualPresets({
    style: project.style,
    audioAnalysis: project.audioAnalysis,
  });
  const requiredItems = [
    {
      label: "Audio",
      isReady: project.assets.audioFile !== null,
    },
    {
      label: "Song title",
      isReady: project.metadata.songTitle.trim().length > 0,
    },
    {
      label: "Artist name",
      isReady: project.metadata.artistName.trim().length > 0,
    },
    {
      label: "Duration",
      isReady: project.playback.duration > 0,
    },
    {
      label: "Reactive analysis",
      isReady: project.audioAnalysis !== null,
    },
  ];

  const isReadyForRender = requiredItems.every((item) => item.isReady);

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h2 className="font-semibold text-gray-950">Render readiness</h2>
          <p className="text-sm text-gray-600">
            {isReadyForRender
              ? "This project has the required data for export."
              : "Finish the required items before rendering."}
          </p>
        </div>

        <StatusPill
          label={isReadyForRender ? "Ready" : "Draft"}
          tone={isReadyForRender ? "ready" : "waiting"}
        />
      </div>

      {/* LESSON CHECKPOINT - Export model:
          Rendering tools like Remotion need a stable project shape.
          This component does not care where state came from. It only reads
          the VideoProject object and checks whether required render data exists.
      */}
      <div className="mt-4 grid grid-cols-2 gap-2 text-sm">
        {requiredItems.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between rounded border px-3 py-2"
          >
            <span>{item.label}</span>
            <span>{item.isReady ? "Ready" : "Missing"}</span>
          </div>
        ))}
      </div>

      <div className="mt-4 text-sm text-gray-600">
        <p>Theme: {project.style.theme}</p>
        <p>Visual mode: {project.style.visualMode}</p>
        <p>Resolved presets: {formatResolvedPresetSummary(resolvedPresets)}</p>
        <p>Visualizer color: {project.style.visualizerColor}</p>
      </div>
    </Panel>
  );
}
