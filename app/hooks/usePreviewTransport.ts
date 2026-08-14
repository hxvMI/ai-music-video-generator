"use client";

import type { PlayerRef } from "@remotion/player";
import { useCallback, useEffect, useState } from "react";

type PreviewTransportOptions = {
  duration: number;
  fps: number;
  source: File | null;
};

type TransportState = {
  currentTime: number;
  isPlaying: boolean;
  volume: number;
};

const INITIAL_TRANSPORT_STATE: TransportState = {
  currentTime: 0,
  isPlaying: false,
  volume: 1,
};

function clamp(value: number, minimum: number, maximum: number) {
  return Math.min(Math.max(value, minimum), maximum);
}

export function usePreviewTransport({
  duration,
  fps,
  source,
}: PreviewTransportOptions) {
  const [player, setPlayer] = useState<PlayerRef | null>(null);
  const [transportState, setTransportState] = useState(
    INITIAL_TRANSPORT_STATE
  );

  const playerRef = useCallback((instance: PlayerRef | null) => {
    setPlayer(instance);
  }, []);

  useEffect(() => {
    if (!player) return;

    const updateTime = ({ detail }: { detail: { frame: number } }) => {
      setTransportState((currentState) => ({
        ...currentState,
        currentTime: detail.frame / fps,
      }));
    };
    const handlePlay = () => {
      setTransportState((currentState) => ({
        ...currentState,
        isPlaying: true,
      }));
    };
    const handlePause = () => {
      setTransportState((currentState) => ({
        ...currentState,
        isPlaying: false,
      }));
    };
    const handleEnded = () => {
      setTransportState((currentState) => ({
        ...currentState,
        currentTime: duration,
        isPlaying: false,
      }));
    };
    const handleVolumeChange = ({
      detail,
    }: {
      detail: { volume: number };
    }) => {
      setTransportState((currentState) => ({
        ...currentState,
        volume: detail.volume,
      }));
    };

    player.addEventListener("timeupdate", updateTime);
    player.addEventListener("seeked", updateTime);
    player.addEventListener("play", handlePlay);
    player.addEventListener("pause", handlePause);
    player.addEventListener("ended", handleEnded);
    player.addEventListener("volumechange", handleVolumeChange);

    return () => {
      player.removeEventListener("timeupdate", updateTime);
      player.removeEventListener("seeked", updateTime);
      player.removeEventListener("play", handlePlay);
      player.removeEventListener("pause", handlePause);
      player.removeEventListener("ended", handleEnded);
      player.removeEventListener("volumechange", handleVolumeChange);
    };
  }, [duration, fps, player]);

  useEffect(() => {
    if (!player) return;

    // A replacement track must never inherit the previous track's frame.
    player.pause();
    player.seekTo(0);
  }, [player, source]);

  const play = useCallback(() => {
    player?.play();
  }, [player]);

  const pause = useCallback(() => {
    player?.pause();
  }, [player]);

  const seek = useCallback(
    (seconds: number) => {
      if (!player || duration <= 0) return;

      const lastFrame = Math.max(Math.ceil(duration * fps) - 1, 0);
      const requestedFrame = Math.round(clamp(seconds, 0, duration) * fps);
      player.seekTo(Math.min(requestedFrame, lastFrame));
    },
    [duration, fps, player]
  );

  const setVolume = useCallback(
    (nextVolume: number) => {
      player?.setVolume(clamp(nextVolume, 0, 1));
    },
    [player]
  );

  return {
    playerRef,
    play,
    pause,
    seek,
    setVolume,
    currentTime:
      duration > 0 ? clamp(transportState.currentTime, 0, duration) : 0,
    duration,
    isPlaying: duration > 0 && transportState.isPlaying,
    volume: transportState.volume,
  };
}
