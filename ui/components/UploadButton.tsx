/**
 * Vexadoc — Upload Button
 * Lets users upload PDF or DOCX files directly from the UI.
 */

"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/lib/api";

interface UploadButtonProps {
  onUploadSuccess: (fileName: string) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];
const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export default function UploadButton({ onUploadSuccess }: UploadButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [fileName, setFileName] = useState("");
  const [error, setError] = useState<string | null>(null);

  const handleClick = () => {
    setError(null);
    fileRef.current?.click();
  };

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // ── Validate file type ─────────────────────────────────────
    if (!ALLOWED_TYPES.includes(file.type)) {
      setError("Only PDF and DOCX files are allowed.");
      return;
    }

    // ── Validate file size ─────────────────────────────────────
    if (file.size > MAX_SIZE) {
      setError("File must be smaller than 20 MB.");
      return;
    }

    setUploading(true);
    setFileName(file.name);
    setError(null);

    try {
      const result = await uploadDocument(file);
      onUploadSuccess(result.file_name);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setUploading(false);
      setFileName("");
      if (fileRef.current) fileRef.current.value = "";
    }
  };

  return (
    <div>
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
        className="hidden"
      />
      <button
        onClick={handleClick}
        disabled={uploading}
        aria-label="Upload document"
        className="flex items-center gap-2 px-4 py-2 text-sm font-medium
                   text-gray-600 border border-gray-300 rounded-xl
                   hover:bg-gray-50 disabled:opacity-50 transition-colors"
      >
        {uploading ? `Uploading ${fileName}...` : "Upload Document"}
      </button>
      {error && (
        <p className="text-xs text-red-500 mt-1">{error}</p>
      )}
    </div>
  );
}