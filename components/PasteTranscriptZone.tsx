'use client';

import { useState, useCallback, useEffect } from 'react';

interface PasteTranscriptZoneProps {
  onGenerate: (transcript: string) => void;
  disabled?: boolean;
}

export default function PasteTranscriptZone({
  onGenerate,
  disabled = false,
}: PasteTranscriptZoneProps) {
  const [text, setText] = useState('');
  const [wordCount, setWordCount] = useState(0);
  const [charCount, setCharCount] = useState(0);

  // Compute stats on text change
  useEffect(() => {
    const chars = text.length;
    const words = text.trim() === '' ? 0 : text.trim().split(/\s+/).filter(Boolean).length;
    setCharCount(chars);
    setWordCount(words);
  }, [text]);

  const handleGenerate = useCallback(() => {
    if (text.trim().length >= 50 && !disabled) {
      onGenerate(text.trim());
    }
  }, [text, disabled, onGenerate]);

  const isTooShort = text.trim().length > 0 && text.trim().length < 50;

  return (
    <div className="w-full max-w-2xl mx-auto rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl p-6 sm:p-8 shadow-[0_12px_40px_rgba(0,0,0,0.5)] animate-fade-in relative overflow-hidden">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
      
      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <label htmlFor="transcript-input" className="text-sm font-semibold text-muted-foreground uppercase tracking-wider font-mono">
            Paste Transcript Text
          </label>
          <div className="font-mono text-[10px] text-white/40">
            {wordCount} words • {charCount} chars
          </div>
        </div>

        <div className="relative group">
          <textarea
            id="transcript-input"
            disabled={disabled}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your video or audio transcript here... (Minimum 50 characters required to generate a high-quality quiz)"
            className="
              scroller w-full h-[260px] p-4 rounded-xl border border-white/10 bg-black/30
              font-mono text-sm text-white/90 leading-relaxed placeholder-white/30
              resize-none focus:outline-none focus:border-accent/60 focus:ring-1 focus:ring-accent/30
              transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed
            "
          />
          {text.length > 0 && !disabled && (
            <button
              onClick={() => setText('')}
              className="absolute bottom-4 right-4 font-mono text-[10px] text-muted-foreground hover:text-accent transition-colors bg-white/5 hover:bg-white/10 px-2 py-1 rounded"
              title="Clear transcript"
            >
              Clear
            </button>
          )}
        </div>

        {isTooShort && (
          <p className="text-xs text-amber-400 font-mono animate-slide-down">
            ⚠️ Transcript is too short. Please enter at least 50 characters to ensure a good quiz.
          </p>
        )}

        <div className="flex justify-center mt-2">
          <button
            onClick={handleGenerate}
            disabled={disabled || text.trim().length < 50}
            className="
              px-8 py-3 rounded-lg font-semibold text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)]
              active:scale-95 transition-all duration-200
              disabled:opacity-50 disabled:cursor-not-allowed
            "
          >
            Generate Quiz
          </button>
        </div>
      </div>
    </div>
  );
}
