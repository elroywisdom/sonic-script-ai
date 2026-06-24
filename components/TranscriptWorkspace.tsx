'use client';

import { useState } from 'react';
import QuizWorkspace, { type Question } from './QuizWorkspace';
import CaptionWorkspace, { type CaptionData } from './CaptionWorkspace';

interface TranscriptWorkspaceProps {
  rawTranscript: string;
  polishedTranscript: string;
  onReset: () => void;
}

export default function TranscriptWorkspace({
  rawTranscript,
  polishedTranscript,
  onReset,
}: TranscriptWorkspaceProps) {
  const [copied, setCopied] = useState(false);
  const [quizState, setQuizState] = useState<'none' | 'loading' | 'loaded' | 'error'>('none');
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [quizError, setQuizError] = useState('');
  const [captionsState, setCaptionsState] = useState<'none' | 'loading' | 'loaded' | 'error'>('none');
  const [captionsData, setCaptionsData] = useState<CaptionData | null>(null);
  const [captionsError, setCaptionsError] = useState('');

  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const countChars = (text: string) => text.length;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(polishedTranscript);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback
      const textarea = document.createElement('textarea');
      textarea.value = polishedTranscript;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const downloadFile = (content: string, filename: string, mimeType: string) => {
    const blob = new Blob([content], { type: `${mimeType};charset=utf-8` });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    link.click();
    URL.revokeObjectURL(url);
  };

  const generateQuiz = async () => {
    setQuizState('loading');
    setQuizError('');
    try {
      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: polishedTranscript }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to generate quiz');
      }
      setQuizData(data.questions);
      setQuizState('loaded');
    } catch (err) {
      console.error(err);
      setQuizError(err instanceof Error ? err.message : 'An error occurred during quiz generation');
      setQuizState('error');
    }
  };

  const generateCaptions = async () => {
    setCaptionsState('loading');
    setCaptionsError('');
    try {
      const res = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript: polishedTranscript }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.detail || data.error || 'Failed to generate captions');
      }
      setCaptionsData(data);
      setCaptionsState('loaded');
    } catch (err) {
      console.error(err);
      setCaptionsError(err instanceof Error ? err.message : 'An error occurred during captions generation');
      setCaptionsState('error');
    }
  };

  return (
    <div className="w-full max-w-6xl mx-auto space-y-8 animate-fade-in">
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Raw Panel */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] font-bold text-muted-foreground uppercase tracking-wider">
                Raw Whisper Output
              </span>
              <div className="font-mono text-[9px] text-white/40">
                {countWords(rawTranscript)} words • {countChars(rawTranscript)} chars
              </div>
            </div>
            <button
              onClick={() => downloadFile(rawTranscript, 'raw-transcript.txt', 'text/plain')}
              className="font-mono text-[10px] text-muted-foreground hover:text-accent transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded flex items-center gap-1.5"
            >
              <span>Download .txt</span>
            </button>
          </div>
          <textarea
            readOnly
            value={rawTranscript}
            className="
              scroller h-[400px] w-full p-4 bg-black/30
              font-mono text-sm text-white/80 leading-relaxed
              resize-none focus:outline-none border-0
            "
          />
        </div>

        {/* Polished Panel */}
        <div className="flex flex-col rounded-xl border border-white/10 bg-white/[0.02] overflow-hidden shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
          {/* Header Bar */}
          <div className="flex items-center justify-between px-4 py-3 bg-white/[0.03] border-b border-white/5">
            <div className="space-y-0.5">
              <span className="font-mono text-[10px] font-bold text-accent uppercase tracking-wider">
                Polished DeepSeek Output
              </span>
              <div className="font-mono text-[9px] text-white/40">
                {countWords(polishedTranscript)} words • {countChars(polishedTranscript)} chars
              </div>
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => downloadFile(polishedTranscript, 'polished-transcript.txt', 'text/plain')}
                className="font-mono text-[10px] text-muted-foreground hover:text-accent transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded"
              >
                Download .txt
              </button>
              <button
                onClick={() => downloadFile(`# Polished Transcript\n\n${polishedTranscript}`, 'polished-transcript.md', 'text/markdown')}
                className="font-mono text-[10px] text-muted-foreground hover:text-accent transition-colors bg-white/5 hover:bg-white/10 px-2.5 py-1 rounded"
              >
                Download .md
              </button>
            </div>
          </div>
          <textarea
            readOnly
            value={polishedTranscript}
            className="
              scroller h-[400px] w-full p-4 bg-black/30
              font-mono text-sm text-white/90 leading-relaxed
              resize-none focus:outline-none border-0
            "
          />
          {/* Action Bar */}
          <div className="p-3 bg-white/[0.01] border-t border-white/5 flex justify-end">
            <button
              onClick={handleCopy}
              className="
                px-5 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider
                bg-accent text-background hover:bg-accent/90 hover:shadow-[0_0_15px_rgba(0,212,180,0.3)]
                transition-all duration-200 active:scale-95
              "
            >
              {copied ? 'Copied ✓' : 'Copy Text'}
            </button>
          </div>
        </div>
      </div>

      {/* Quiz Section */}
      {quizState === 'loaded' && (
        <QuizWorkspace
          questions={quizData}
          onClose={() => setQuizState('none')}
        />
      )}

      {quizState === 'error' && (
        <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center max-w-xl mx-auto animate-slide-down">
          <p className="text-red-400 text-sm font-medium">{quizError}</p>
        </div>
      )}

      {/* Captions Section */}
      {captionsState === 'loaded' && captionsData && (
        <CaptionWorkspace
          data={captionsData}
          onClose={() => setCaptionsState('none')}
        />
      )}

      {captionsState === 'error' && (
        <div className="p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center max-w-xl mx-auto animate-slide-down">
          <p className="text-red-400 text-sm font-medium">{captionsError}</p>
        </div>
      )}

      {/* Actions */}
      <div className="mt-8 flex justify-center gap-4 flex-wrap">
        <button
          onClick={onReset}
          className="
            px-6 py-2.5 rounded-lg text-sm font-medium
            border border-white/10 text-muted-foreground bg-white/[0.01]
            hover:border-accent hover:text-accent hover:bg-accent/5
            transition-all duration-200 active:scale-95
          "
        >
          Process Another File
        </button>

        {quizState !== 'loaded' && (
          <button
            onClick={generateQuiz}
            disabled={quizState === 'loading'}
            className="
              px-6 py-2.5 rounded-lg text-sm font-semibold text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-95
            "
          >
            {quizState === 'loading' ? 'Generating Quiz...' : 'Generate 5-Question Quiz'}
          </button>
        )}

        {captionsState !== 'loaded' && (
          <button
            onClick={generateCaptions}
            disabled={captionsState === 'loading'}
            className="
              px-6 py-2.5 rounded-lg text-sm font-semibold text-white
              bg-transparent border border-white/10 hover:border-accent hover:text-accent hover:bg-accent/5
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-95
            "
          >
            {captionsState === 'loading' ? 'Generating Captions...' : 'Generate Social Captions'}
          </button>
        )}
      </div>
    </div>
  );
}
