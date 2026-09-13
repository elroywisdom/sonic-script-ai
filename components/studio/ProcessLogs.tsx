'use client';

import { useEffect, useRef, useState } from 'react';

export interface LogEntry {
  timestamp: string;
  message: string;
  type: 'info' | 'success' | 'warning' | 'error';
}

interface ProcessLogsProps {
  logs: LogEntry[];
  isProcessing: boolean;
}

export default function ProcessLogs({ logs, isProcessing }: ProcessLogsProps) {
  const [isExpanded, setIsExpanded] = useState(true);
  const [copied, setCopied] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom of logs on new entry
  useEffect(() => {
    if (scrollRef.current && isExpanded) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [logs, isExpanded]);

  if (logs.length === 0) return null;

  const handleCopy = async () => {
    const text = logs
      .map((log) => `[${log.timestamp}] [${log.type.toUpperCase()}] ${log.message}`)
      .join('\n');
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy logs', err);
    }
  };

  // Determine status color dot
  const hasError = logs.some((log) => log.type === 'error');
  const dotColorClass = hasError
    ? 'bg-red-500'
    : isProcessing
      ? 'bg-accent animate-pulse'
      : 'bg-emerald-500';

  return (
    <div className="w-full max-w-3xl mx-auto rounded-lg border border-white/10 bg-black/40 backdrop-blur-md overflow-hidden transition-all duration-300">
      {/* Terminal Title Bar */}
      <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5">
        <div className="flex items-center gap-2">
          <span className={`w-2 h-2 rounded-full ${dotColorClass}`} />
          <span className="font-mono text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            System logs
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={handleCopy}
            className="font-mono text-[10px] text-muted-foreground hover:text-accent transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
          >
            {copied ? 'Copied ✓' : 'Copy Logs'}
          </button>
          <button
            onClick={() => setIsExpanded(!isExpanded)}
            className="font-mono text-[10px] text-muted-foreground hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
          >
            {isExpanded ? 'Collapse' : 'Expand'}
          </button>
        </div>
      </div>

      {/* Terminal Content */}
      {isExpanded && (
        <div
          ref={scrollRef}
          className="scroller h-48 overflow-y-auto p-4 font-mono text-xs space-y-1 bg-black/60 selection:bg-accent/30"
        >
          {logs.map((log, index) => {
            let textColor = 'text-muted-foreground';
            if (log.type === 'success') textColor = 'text-accent';
            if (log.type === 'warning') textColor = 'text-amber-400';
            if (log.type === 'error') textColor = 'text-red-400 font-semibold';

            return (
              <div key={index} className="flex items-start gap-2 hover:bg-white/[0.02] py-0.5 rounded px-1">
                <span className="text-white/30 select-none">[{log.timestamp}]</span>
                <span className={textColor}>{log.message}</span>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
