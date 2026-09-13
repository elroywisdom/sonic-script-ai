'use client';

import { useEffect, useState } from 'react';
import ProcessLogs, { type LogEntry } from './ProcessLogs';
import type { AppStatus } from './StatusStepper';

interface ProcessingDashboardProps {
  status: AppStatus;
  logs: LogEntry[];
  progressPercent: number;
  estimatedRemainingSeconds: number;
  totalDurationSeconds?: number;
  currentChunkIndex?: number;
  totalChunks?: number;
  onRetry?: () => void;
  errorMessage?: string;
}

const REASSURING_MESSAGES = [
  '☕ Grab a quick coffee — your video is processing 8x faster than real-time!',
  '🎙️ Extracting crisp 16kHz mono audio streams for maximum Whisper AI accuracy...',
  '⚡ Segmenting audio into 2-minute chunks for rapid parallel transcription...',
  '💾 Progress saved locally — your audio chunks are cached on your device.',
  '✍️ DeepSeek AI will automatically polish raw text into clean markdown documentation.',
  '🎯 Generating accurate timestamps and speaker-friendly paragraph breaks...',
  '🚀 Sit back and relax — your full transcript will be ready shortly!',
];

export default function ProcessingDashboard({
  status,
  logs,
  progressPercent,
  estimatedRemainingSeconds,
  totalDurationSeconds,
  currentChunkIndex,
  totalChunks,
  onRetry,
  errorMessage,
}: ProcessingDashboardProps) {
  const [showTechnicalLogs, setShowTechnicalLogs] = useState(false);
  const [tipIndex, setTipIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setTipIndex((prev) => (prev + 1) % REASSURING_MESSAGES.length);
    }, 6000);
    return () => clearInterval(interval);
  }, []);

  const formatTime = (secs: number) => {
    if (secs <= 0 || !isFinite(secs)) return 'Calculating...';
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    if (m === 0) return `${s}s remaining`;
    return `~${m}m ${s}s remaining`;
  };

  const getStageTitle = () => {
    switch (status) {
      case 'extracting':
        return 'Extracting Audio Stream';
      case 'transcribing':
        return totalChunks && totalChunks > 1
          ? `Transcribing Audio (Chunk ${currentChunkIndex || 1} of ${totalChunks})`
          : 'Transcribing Audio with Whisper AI';
      case 'refining':
        return 'Polishing & Formatting Transcript';
      case 'error':
        return 'Processing Paused';
      default:
        return 'Processing Media';
    }
  };

  const isError = status === 'error';

  return (
    <div className="w-full max-w-3xl mx-auto space-y-6 animate-fade-in">
      {/* Main Processing Card */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        {/* Glow backdrop */}
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/5 blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

        {/* Top Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-white/5">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className={`w-2.5 h-2.5 rounded-full ${isError ? 'bg-red-500 animate-pulse' : 'bg-accent animate-ping'}`} />
              <h2 className="text-xl font-semibold tracking-tight text-white">
                {getStageTitle()}
              </h2>
            </div>
            {totalDurationSeconds ? (
              <p className="text-xs text-muted-foreground">
                Media length: {(totalDurationSeconds / 60).toFixed(1)} minutes
              </p>
            ) : null}
          </div>

          {!isError && (
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-accent/10 border border-accent/20 text-accent text-xs font-mono">
              <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
              </svg>
              <span>{formatTime(estimatedRemainingSeconds)}</span>
            </div>
          )}
        </div>

        {/* Progress Bar & Percentage */}
        {!isError ? (
          <div className="py-6 space-y-3">
            <div className="flex justify-between items-baseline">
              <span className="text-3xl font-bold font-mono tracking-tight text-white">
                {Math.min(100, Math.max(0, Math.round(progressPercent)))}%
              </span>
              <span className="text-xs text-muted-foreground uppercase tracking-widest font-semibold">
                Overall Progress
              </span>
            </div>

            {/* Progress track */}
            <div className="w-full h-3 rounded-full bg-white/5 p-0.5 overflow-hidden border border-white/5">
              <div
                className="h-full rounded-full bg-gradient-to-r from-accent/80 via-accent to-emerald-400 transition-all duration-500 shadow-[0_0_15px_rgba(0,212,180,0.4)]"
                style={{ width: `${Math.min(100, Math.max(2, progressPercent))}%` }}
              />
            </div>
          </div>
        ) : (
          <div className="py-6 flex flex-col items-center text-center gap-4">
            <div className="w-12 h-12 rounded-full bg-red-500/10 border border-red-500/20 text-red-400 flex items-center justify-center">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-semibold text-red-400">Processing Interrupted</h3>
              <p className="text-xs text-muted-foreground max-w-md mx-auto">{errorMessage || 'An error occurred during processing.'}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="mt-2 px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-accent/20 text-accent border border-accent/30 hover:bg-accent hover:text-black transition-all duration-200 shadow-[0_0_15px_rgba(0,212,180,0.2)]"
              >
                Resume / Try Again
              </button>
            )}
          </div>
        )}

        {/* Rotating Creative Copy / Tips */}
        {!isError && (
          <div className="pt-4 border-t border-white/5 flex items-center gap-3 text-xs text-muted-foreground/90 bg-white/[0.01] p-3 rounded-xl border border-white/[0.03] animate-fade-in">
            <p className="transition-opacity duration-300 font-medium leading-relaxed">
              {REASSURING_MESSAGES[tipIndex]}
            </p>
          </div>
        )}
      </div>

      {/* Collapsible Technical Logs Toggle */}
      <div className="flex flex-col items-center gap-3">
        <button
          onClick={() => setShowTechnicalLogs((prev) => !prev)}
          className="inline-flex items-center gap-2 text-xs text-muted-foreground hover:text-white transition-colors duration-200 px-4 py-2 rounded-full border border-white/5 bg-white/[0.02] hover:bg-white/5"
        >
          <span>{showTechnicalLogs ? 'Hide Technical Logs' : 'View Technical Logs'}</span>
          <svg
            className={`w-3.5 h-3.5 transition-transform duration-200 ${showTechnicalLogs ? 'rotate-180' : ''}`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>

        {showTechnicalLogs && (
          <div className="w-full animate-slide-down">
            <ProcessLogs logs={logs} isProcessing={status !== 'done' && status !== 'error'} />
          </div>
        )}
      </div>
    </div>
  );
}
