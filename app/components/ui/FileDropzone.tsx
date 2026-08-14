"use client";

import { FileUp, X } from "lucide-react";
import { useDropzone, type Accept } from "react-dropzone";

type FileDropzoneProps = {
  label: string;
  description: string;
  accept: Accept;
  selectedFile: File | null;
  onFileChange: (file: File | null) => void;
};

export default function FileDropzone({
  label,
  description,
  accept,
  selectedFile,
  onFileChange,
}: FileDropzoneProps) {
  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    accept,
    multiple: false,
    onDrop: (acceptedFiles) => {
      onFileChange(acceptedFiles[0] ?? null);
    },
  });

  // LESSON CHECKPOINT - Reusable UI:
  // Audio, background, and logo uploads all need the same drag/drop behavior.
  // A shared component keeps the interaction consistent and avoids copying the
  // same react-dropzone code into every form section.
  return (
    <div className="flex flex-col gap-2">
      <div
        {...getRootProps()}
        className={[
          "cursor-pointer rounded-lg border border-dashed p-4 transition",
          "bg-white text-left hover:border-cyan-400 hover:bg-cyan-50/60",
          isDragActive ? "border-cyan-500 bg-cyan-50" : "border-gray-300",
        ].join(" ")}
      >
        <input {...getInputProps()} />

        <div className="flex items-start gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-gray-100 text-gray-700">
            <FileUp aria-hidden="true" className="h-4 w-4" />
          </div>

          <div>
            <p className="font-medium text-gray-950">{label}</p>
            <p className="mt-1 text-sm text-gray-600">{description}</p>

            <p className="mt-3 text-sm font-medium text-cyan-700">
              {isDragActive ? "Drop the file here" : "Drag & drop or browse"}
            </p>
          </div>
        </div>
      </div>

      {selectedFile && (
        <div className="flex items-center justify-between gap-3 rounded-lg border bg-gray-50 px-3 py-2 text-sm text-gray-700">
          <div className="min-w-0">
            <span className="font-medium text-gray-950">
              {selectedFile.name}
            </span>
            <span className="ml-2 text-gray-500">
              {(selectedFile.size / 1024 / 1024).toFixed(2)} MB
            </span>
          </div>
          <button
            type="button"
            onClick={() => onFileChange(null)}
            className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded border border-gray-200 bg-white text-gray-600 hover:border-red-300 hover:text-red-700"
            aria-label={`Remove ${selectedFile.name}`}
          >
            <X aria-hidden="true" className="h-3.5 w-3.5" />
          </button>
        </div>
      )}
    </div>
  );
}
