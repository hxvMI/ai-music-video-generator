"use client";

import { Pause, Play, SkipBack, SkipForward, Volume2 } from "lucide-react";
import { useState } from "react";

import Panel from "@/components/ui/Panel";

type PlaybackControlsProps = {
  audioFile: File | null;
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  play: () => void;
  pause: () => void;
  seek: (seconds: number) => void;
  volume: number;
  setVolume: (volume: number) => void;
  showDetailedControls?: boolean;
};

function formatTime(seconds: number) {
  if (!Number.isFinite(seconds)) return "0:00";

  const minutes = Math.floor(seconds / 60);
  const remainingSeconds = Math.floor(seconds % 60)
    .toString()
    .padStart(2, "0");

  return `${minutes}:${remainingSeconds}`;
}

export default function PlaybackControls({audioFile, isPlaying, currentTime, duration, play, pause, seek, volume, setVolume, showDetailedControls = true}: PlaybackControlsProps) {
  const hasLoadedAudio = audioFile !== null && duration > 0;
  //When current time is greater than 0 and audio has loaded can skip back
  //When current time is less than duration of video and audio has loaded can skip forward 
  const canSkipBack = hasLoadedAudio && currentTime > 0;
  const canSkipForward = hasLoadedAudio && currentTime < duration - 0.05;

  const [isScrubbing, setIsScrubbing] = useState(false);
  const [previewTime, setPreviewTime] = useState(currentTime);


  //If the song is playing normally, the slider should follow currentTime. 
  // But while the user is dragging, 
  // we do not want the audio engine fighting the user’s hand.
  const displayedTime = isScrubbing ? previewTime : currentTime;


  // YOUR TURN - Derived state checkpoint:
  // Derived state is a value we calculate from existing props/state.
  //
  // Example:
  // const canSkipBack = hasLoadedAudio && currentTime > 0;
  //
  // Learning question:
  // Why is this better than creating another useState variable?
  //
  // Hint:
  // If a value can be calculated from existing state, calculate it.
  // Store it with useState only when React needs to remember it independently.

  // YOUR TURN - Lesson checkpoint:
  // 1. Create a handleSkipBack function.
  // 2. It should call seek(currentTime - 10).
  // 3. Ask: why do we NOT directly set currentTime here?
  //    Because we need to make sure it is done safely through the seek function
  //    and then synchronized from Remotion's seeked/timeupdate events.
  //
  // Hint:
  // const handleSkipBack = () => {
  //   seek(currentTime - 10);
  // };
  const handleSkipBack = () => {
    seek(currentTime - 10);
  };

  // YOUR TURN - Lesson checkpoint:
  // 1. Create a handleSkipForward function.
  // 2. It should call seek(currentTime + 10).
  // 3. The hook already clamps the value so it cannot go below 0 or past duration.
  
  /**Note:
    function handleSkipForward() {seek(currentTime + 10);}
    is similar to arrow function const name = () => {} 
    in practice but arrow is prefered in React 
    difference between 2 is functions can be called wherever
    arrow functions can only be called by code after its declaration
    arrow functions also do not have their own this
  */
  const handleSkipForward = () => {
    seek(currentTime + 10);
  };

  const handleScrubStart = () => {
    setIsScrubbing(true);
    setPreviewTime(currentTime);
  };

  const handleScrubCommit = (nextTime: number) => {
    setIsScrubbing(false);
    setPreviewTime(nextTime);
    seek(nextTime);
  };

  return (
    <Panel className="p-4">
      <div className="flex items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gray-100 text-gray-800">
            <Volume2 aria-hidden="true" className="h-4 w-4" />
          </div>
          <div>
          <h2 className="font-semibold text-gray-950">Preview Controls</h2>
          <p className="text-sm text-gray-600">
            {showDetailedControls
              ? "Check timing, volume, and scrub points."
              : "Control preview playback."}
          </p>
          </div>
        </div>

        {showDetailedControls ? (
          <p className="text-sm font-medium text-gray-700">
            {formatTime(displayedTime)} / {formatTime(duration)}
          </p>
        ) : null}
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-3">

        <button
          type="button"
          disabled={!canSkipBack}
          onClick={handleSkipBack}
          className="playback-skip inline-flex items-center gap-2 rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          <SkipBack aria-hidden="true" className="h-4 w-4" />
          -10s
        </button>

        <button
          type="button"
          disabled={!hasLoadedAudio}
          onClick={isPlaying ? pause : play}
          className="inline-flex items-center gap-2 rounded border border-cyan-700 bg-cyan-700 px-4 py-2 text-sm font-medium text-white disabled:cursor-not-allowed disabled:opacity-50"
        >
          {isPlaying ? (
            <Pause aria-hidden="true" className="h-4 w-4" />
          ) : (
            <Play aria-hidden="true" className="h-4 w-4" />
          )}
          {isPlaying ? "Pause" : "Play"}
        </button>

        {/* YOUR TURN - UI checkpoint:
            Add two buttons around Play/Pause:
            - one for -10 seconds
            - one for +10 seconds

            This teaches event handlers and how UI calls hook commands.
        */}

        <button
          type="button"
          disabled={!canSkipForward}
          onClick={handleSkipForward}
          className="playback-skip inline-flex items-center gap-2 rounded border px-3 py-2 text-sm disabled:cursor-not-allowed disabled:opacity-50"
        >
          +10s
          <SkipForward aria-hidden="true" className="h-4 w-4" />
        </button>
      </div>

      {showDetailedControls ? (
      <div className="mt-4 flex flex-col gap-2">
        {/* Draft UI state keeps the thumb responsive while dragging. The
            selected time is committed to Remotion when the pointer releases. */}

          {/* range means slider like one used in audio or video */}
        <input
          type="range"
          min={0}
          max={duration || 0}
          step={0.1}
          value={displayedTime}
          disabled={!hasLoadedAudio}
          onPointerDown={handleScrubStart}
          onChange={(event) => {
            const nextTime = Number(event.target.value);
            setPreviewTime(nextTime);

            // Keyboard changes have no pointer-up event, so commit immediately.
            if (!isScrubbing) seek(nextTime);
          }}
          onPointerUp={(event) =>
            handleScrubCommit(Number(event.currentTarget.value))
          }
          onPointerCancel={(event) =>
            handleScrubCommit(Number(event.currentTarget.value))
          }
          className="w-full accent-cyan-700"
        />
      </div>
      ) : null}

      {showDetailedControls ? (
      <div className="mt-4 flex flex-col gap-2">
        <label className="text-sm font-medium text-gray-700">Volume</label>

        <input
        type="range"
        min={0}
        max={1}
        step={0.01}
        value={volume}
        onChange={(event) => setVolume(Number(event.target.value))}
        className="w-full accent-cyan-700"
        />
      </div>
      ) : null}
    </Panel>
  );
}
