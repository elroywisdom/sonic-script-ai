'use client';

import { useCallback, useRef, useState } from 'react';

const ACCEPTED_FORMATS = ['.mp4', '.mov', '.avi', '.webm'];
const SIZE_WARNING_BYTES = 100 * 1024 * 1024;

interface UploadZoneProps {
  onStart: (file: File) => void;
  disabled?: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function UploadZone({ onStart, disabled }: UploadZoneProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [sizeWarning, setSizeWarning] = useState(false);
  const [formatError, setFormatError] = useState('');

  const validateFile = useCallback((file: File) => {
    const extension = `.${file.name.split('.').pop()?.toLowerCase() || ''}`;
    if (!ACCEPTED_FORMATS.includes(extension)) {
      setFormatError(
        `Unsupported format. Accepted: ${ACCEPTED_FORMATS.join(', ')}`
      );
      return false;
    }

    setFormatError('');
    setSizeWarning(file.size > SIZE_WARNING_BYTES);
    setSelectedFile(file);
    return true;
  }, []);

  const handleFile = useCallback(
    (file: File) => {
      validateFile(file);
    },
    [validateFile]
  );

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      if (disabled) return;

      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [disabled, handleFile]
  );

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile]
  );

  const handleStart = () => {
    if (selectedFile && !formatError) {
      onStart(selectedFile);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
      <div
        role="button"
        tabIndex={0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(e) => {
          if ((e.key === 'Enter' || e.key === ' ') && !disabled) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(e) => {
          e.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={(e) => {
          e.preventDefault();
          setIsDragging(false);
        }}
        onDrop={handleDrop}
        className={`
          relative flex flex-col items-center justify-center
          min-h-[260px] px-8 py-12 rounded-xl
          border-2 border-dashed transition-all duration-300 cursor-pointer
          ${
            isDragging
              ? 'border-accent bg-accent/5 shadow-[0_0_30px_rgba(0,212,180,0.15)] scale-[1.01]'
              : 'border-white/10 bg-black/20 hover:border-accent/60 hover:bg-white/[0.01] hover:scale-[1.005] hover:shadow-[0_0_25px_rgba(0,212,180,0.05)]'
          }
          ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
        `}
      >
        <input
          ref={inputRef}
          type="file"
          accept={ACCEPTED_FORMATS.join(',')}
          onChange={handleInputChange}
          className="hidden"
          disabled={disabled}
        />

        <div className="p-4 rounded-full bg-white/[0.02] border border-white/5 mb-4 group-hover:scale-110 transition-transform duration-300">
          <svg
            className="w-10 h-10 text-accent"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            aria-hidden="true"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={1.5}
              d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
            />
          </svg>
        </div>

        <p className="text-lg font-semibold text-foreground mb-1">
          Drop your video here
        </p>
        <p className="text-sm text-muted-foreground">
          or click to browse — MP4, MOV, AVI, WebM
        </p>
      </div>

      {formatError && (
        <p className="mt-4 text-sm text-red-400 text-center animate-slide-down">{formatError}</p>
      )}

      {selectedFile && !formatError && (
        <div className="mt-6 p-4 rounded-xl bg-white/[0.01] border border-white/5 flex flex-col items-center gap-4 animate-slide-down">
          <div className="text-center">
            <p className="text-xs text-muted-foreground uppercase font-mono tracking-wider">Selected file</p>
            <p className="text-foreground font-medium mt-1 truncate max-w-md">{selectedFile.name}</p>
            <p className="text-xs text-accent font-mono mt-0.5">
              {formatFileSize(selectedFile.size)}
            </p>
          </div>

          {sizeWarning && (
            <p className="text-xs text-amber-400 text-center max-w-md font-mono">
              ⚠️ This file is over 100MB. Processing may take longer.
            </p>
          )}

          <button
            onClick={handleStart}
            disabled={disabled}
            className="
              px-8 py-3 rounded-lg font-semibold text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)]
              active:scale-95 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Start Processing
          </button>
        </div>
      )}
    </div>
  );
}
