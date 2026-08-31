/**
 * Vexadoc — Upload Button
 * Lets users upload PDF or DOCX files directly from the UI.
 * Shows a progress bar while uploading.
 */

"use client";

import { useRef, useState } from "react";
import { uploadDocument } from "@/lib/api";
import { Upload } from "lucide-react";
import toast from "react-hot-toast";

interface UploadButtonProps {
  onUploadSuccess: (fileName: string, documentId: string) => void;
}

const ALLOWED_TYPES = [
  "application/pdf",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_SIZE = 20 * 1024 * 1024; // 20 MB

export default function UploadButton({
  onUploadSuccess,
}: UploadButtonProps) {
  const fileRef = useRef<HTMLInputElement>(null);

  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);

  const handleClick = () => {
    fileRef.current?.click();
  };

  const handleFile = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!ALLOWED_TYPES.includes(file.type)) {
      toast.error("Only PDF and DOCX files are allowed.");
      return;
    }

    if (file.size > MAX_SIZE) {
      toast.error("File must be smaller than 20 MB.");
      return;
    }

    setUploading(true);
    setProgress(0);

    // Fake progress until upload completes
    const progressInterval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 90) {
          clearInterval(progressInterval);
          return 90;
        }
        return prev + 10;
      });
    }, 180);

    try {
      const result = await uploadDocument(file);

      clearInterval(progressInterval);
      setProgress(100);

      setTimeout(() => {
        onUploadSuccess(result.file_name, result.document_id);
        setUploading(false);
        setProgress(0);
        toast.success("Document uploaded successfully.");
      }, 300);

    } catch (err) {
      clearInterval(progressInterval);
      setUploading(false);
      setProgress(0);
      toast.error(
        err instanceof Error ? err.message : "Upload failed."
      );
    } finally {
      if (fileRef.current) {
        fileRef.current.value = "";
      }
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <input
        ref={fileRef}
        type="file"
        accept=".pdf,.docx"
        onChange={handleFile}
        className="hidden"
      />

      <button
        type="button"
        onClick={handleClick}
        disabled={uploading}
        aria-label="Upload document"
        className="
          flex items-center justify-center gap-2
          h-10 px-4 rounded-xl
          border border-gray-200
          bg-white
          text-sm font-medium text-gray-700
          shadow-sm
          hover:bg-gray-50
          hover:border-gray-300
          transition-all duration-200
          disabled:opacity-60
          disabled:cursor-not-allowed
        "
      >
        <Upload className="w-4 h-4" />
        {uploading ? "Uploading..." : "Upload"}
      </button>

      {uploading && (
        <div className="w-full h-1.5 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-300 ease-out"
            style={{ width: `${progress}%` }}
          />
        </div>
      )}

    </div>
  );
}