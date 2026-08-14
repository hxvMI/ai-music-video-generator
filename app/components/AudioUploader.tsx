//Next.js uses server and client componenets
//since we need drage and drop + state + audio we need 
// "use client"
"use client";

import { useCallback, useState } from "react";
import { useDropzone } from "react-dropzone";

import { useObjectUrl } from "@/hooks/useObjectUrl";

export default function AudioUploader() {
  const [audioFile, setAudioFile] = useState<File | null>(null);
  const audioUrl = useObjectUrl(audioFile);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];

    if (!file) return;

    setAudioFile(file);
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "audio/mpeg": [".mp3"],
      "audio/wav": [".wav"],
    },
    multiple: false,
  });

  return (
    <div className="flex flex-col items-center gap-6">
      <div
        {...getRootProps()}
        className="border-2 border-dashed border-gray-500 p-10 rounded-xl cursor-pointer w-full max-w-xl text-center"
      >
        <input {...getInputProps()} />

        {isDragActive ? (
          <p>Drop the audio file here...</p>
        ) : (
          <p>Drag and drop an MP3 or WAV file here</p>
        )}
      </div>

      {audioFile && (
        <div className="text-center space-y-4">
          <p className="text-lg font-semibold">
            {audioFile.name}
          </p>

          <audio controls src={audioUrl ?? undefined} />
        </div>
      )}
    </div>
  );
}
