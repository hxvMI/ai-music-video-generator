"use client";

import { useEffect, useState } from "react";

import { useObjectUrl } from "@/hooks/useObjectUrl";

type AudioMetadataProps = {
  audioFile: File | null;
};

// useEffect(() => {
//     // do something
// }, [audioFile]);
//
//[audioFile] here means run effect whenever audioFile Changes

// Is the same as v in java
// if(audioFile changed){
//     do something
// }


//useEffect() runs code whenever somethings changes
//If nothing changes return immediately
//Otherwise store audio and make an objectURL path to it

export default function AudioMetadata({audioFile, }: AudioMetadataProps) {
  const [duration, setDuration] = useState(0);
  const audioUrl = useObjectUrl(audioFile);

  useEffect(() => {
    if (!audioUrl) return;

    const audio = new Audio(audioUrl);
    //loadedmetadata triggers when browser knows 'duration, bitrate, and file information'
    const handleLoadedMetadata = () => {
      setDuration(audio.duration);
    };

    audio.addEventListener("loadedmetadata", handleLoadedMetadata);

    return () => {
      audio.removeEventListener("loadedmetadata", handleLoadedMetadata);
    };
  }, [audioUrl]);
//Why is [audioFile] dependency array important
//with it useEffect(()) runs ONCE when component mounts
//without it Runs after EVERY RENDER
//This includes every keystroke or name change like when doing
//setArtistName(...) etc.

//THE 3 MODELS 
//1. useEffect(() => {})                RUN EVERY RENDER
//2. useEffect(() => {}, [])            RUN ONCE
//3. useEffect(() => {}, [audioFile])   RUN WHEN Specific Value Changes
//3a. if [songTitle, artistName]        RUN when either change            

  const displayedDuration = audioFile ? duration : 0;

  return (
    <section className="rounded-lg border bg-white p-4">
      <h2 className="font-semibold text-gray-950">Audio metadata</h2>

      <div className="mt-3 grid gap-2 text-sm text-gray-700">
        <div className="flex justify-between gap-4">
          <span>Name</span>
          <span className="max-w-56 truncate font-medium text-gray-950">
            {audioFile?.name ?? "No audio selected"}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span>Size</span>
          <span className="font-medium text-gray-950">
            {((audioFile?.size ?? 0) / 1024 / 1024).toFixed(2)} MB
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span>Type</span>
          <span className="font-medium text-gray-950">
            {audioFile?.type || "Unknown"}
          </span>
        </div>

        <div className="flex justify-between gap-4">
          <span>Duration</span>
          <span className="font-medium text-gray-950">
            {displayedDuration.toFixed(2)} sec
          </span>
        </div>
      </div>
    </section>
  );
}
