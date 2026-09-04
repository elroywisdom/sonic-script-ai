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
  const [activeView, setActiveView] = useState<'polished' | 'raw'>('polished');
  const [copied, setCopied] = useState(false);

  const [quizState, setQuizState] = useState<'none' | 'loading' | 'loaded' | 'error'>('none');
  const [quizData, setQuizData] = useState<Question[]>([]);
  const [quizError, setQuizError] = useState('');

  const [captionsState, setCaptionsState] = useState<'none' | 'loading' | 'loaded' | 'error'>('none');
  const [captionsData, setCaptionsData] = useState<CaptionData | null>(null);
  const [captionsError, setCaptionsError] = useState('');

  const countWords = (text: string) => text.split(/\s+/).filter(Boolean).length;
  const countChars = (text: string) => text.length;

  const activeText = activeView === 'polished' ? polishedTranscript || rawTranscript : rawTranscript;

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(activeText);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = activeText;
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
        body: JSON.stringify({ transcript: activeText }),
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
        body: JSON.stringify({ transcript: activeText }),
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
    <div className="w-full max-w-4xl mx-auto space-y-8 animate-fade-in">
      {/* Executive Hero Header */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-6 sm:p-8 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-accent/10 blur-3xl pointer-events-none -translate-y-1/2 translate-x-1/2" />

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-6 border-b border-white/5">
          <div className="space-y-1.5">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-semibold uppercase tracking-wider">
              <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
              <span>Transcript Ready</span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
              Generated Script
            </h2>
            <div className="flex items-center gap-3 text-xs text-muted-foreground font-mono pt-1">
              <span>{countWords(activeText)} words</span>
              <span>•</span>
              <span>{countChars(activeText)} characters</span>
            </div>
          </div>

          {/* Quick Action Export Buttons */}
          <div className="flex items-center gap-3">
            <button
              onClick={handleCopy}
              className="px-5 py-2.5 rounded-xl text-xs font-bold uppercase tracking-wider bg-accent text-background hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.3)] transition-all duration-200 active:scale-95 flex items-center gap-2"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                {copied ? (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                ) : (
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 5H6a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2v-1M8 5a2 2 0 002 2h2a2 2 0 002-2M8 5a2 2 0 012-2h2a2 2 0 012 2m0 0h2a2 2 0 012 2v3m2 4H10m0 0l3-3m-3 3l3 3" />
                )}
              </svg>
              <span>{copied ? 'Copied ✓' : 'Copy Script'}</span>
            </button>

            <button
              onClick={() => downloadFile(`# Transcript\n\n${activeText}`, 'transcript.md', 'text/markdown')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent transition-all duration-200"
            >
              Export .md
            </button>

            <button
              onClick={() => downloadFile(activeText, 'transcript.txt', 'text/plain')}
              className="px-4 py-2.5 rounded-xl text-xs font-semibold text-white bg-white/5 border border-white/10 hover:bg-white/10 hover:border-accent transition-all duration-200"
            >
              Export .txt
            </button>
          </div>
        </div>

        {/* View Toggle Tabs */}
        <div className="flex border-b border-white/5 mt-6 mb-4">
          <button
            onClick={() => setActiveView('polished')}
            className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider border-b-2 mr-6 transition-all duration-200 ${
              activeView === 'polished'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            ✨ Polished Script
          </button>
          <button
            onClick={() => setActiveView('raw')}
            className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider border-b-2 transition-all duration-200 ${
              activeView === 'raw'
                ? 'border-accent text-accent'
                : 'border-transparent text-muted-foreground hover:text-white'
            }`}
          >
            🎙️ Raw Audio Output with Timestamps
          </button>
        </div>

        {/* Script Display Body */}
        <div className="mt-4 rounded-xl border border-white/5 bg-black/40 p-6 shadow-inner">
          <textarea
            readOnly
            value={activeText}
            className={`
              scroller h-[480px] w-full bg-transparent
              ${activeView === 'polished' ? 'font-sans text-base text-white/95 leading-relaxed' : 'font-mono text-sm text-white/80 leading-relaxed'}
              resize-none focus:outline-none border-0 selection:bg-accent/30
            `}
          />
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

      {/* Action Footer Buttons */}
      <div className="flex justify-center items-center gap-4 flex-wrap pt-2">
        <button
          onClick={onReset}
          className="
            px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider
            border border-white/10 text-muted-foreground bg-white/[0.02]
            hover:border-accent hover:text-white hover:bg-white/5
            transition-all duration-200 active:scale-95
          "
        >
          Process Another Video
        </button>

        {quizState !== 'loaded' && (
          <button
            onClick={generateQuiz}
            disabled={quizState === 'loading'}
            className="
              px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(0,212,180,0.4)]
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-95 flex items-center gap-2
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
            </svg>
            <span>{quizState === 'loading' ? 'Formulating Quiz...' : 'Generate 5-Question Quiz'}</span>
          </button>
        )}

        {captionsState !== 'loaded' && (
          <button
            onClick={generateCaptions}
            disabled={captionsState === 'loading'}
            className="
              px-6 py-3 rounded-xl text-xs font-semibold uppercase tracking-wider text-white
              bg-white/5 border border-white/10 hover:border-accent hover:text-accent hover:bg-accent/5
              disabled:opacity-50 disabled:cursor-not-allowed
              transition-all duration-200 active:scale-95 flex items-center gap-2
            "
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
            </svg>
            <span>{captionsState === 'loading' ? 'Crafting Captions...' : 'Generate Social Captions'}</span>
          </button>
        )}
      </div>
    </div>
  );
}
