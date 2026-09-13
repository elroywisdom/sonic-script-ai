'use client';

import { useState, useRef } from 'react';
import QuizWorkspace, { type Question } from './QuizWorkspace';
import CaptionWorkspace, { type CaptionData } from './CaptionWorkspace';

interface TranscriptWorkspaceProps {
  rawTranscript: string;
  polishedTranscript: string;
  onReset: () => void;
}

type MainTab = 'script' | 'quiz' | 'captions';

export default function TranscriptWorkspace({
  rawTranscript,
  polishedTranscript,
  onReset,
}: TranscriptWorkspaceProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [mainTab, setMainTab] = useState<MainTab>('script');
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

  const scrollToTop = () => {
    containerRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

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
    setMainTab('quiz');
    setQuizState('loading');
    setQuizError('');
    scrollToTop();

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
    setMainTab('captions');
    setCaptionsState('loading');
    setCaptionsError('');
    scrollToTop();

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
    <div ref={containerRef} className="w-full max-w-4xl mx-auto space-y-6 animate-fade-in scroll-mt-6">
      {/* Primary Workspace Navigation Tabs */}
      <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-white/[0.02] p-4 sm:p-6 backdrop-blur-xl shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
        <div className="flex flex-wrap items-center justify-between gap-4 pb-4 border-b border-white/10">
          {/* Main Tabs */}
          <div className="flex items-center gap-1.5 bg-black/40 p-1.5 rounded-xl border border-white/5">
            <button
              onClick={() => { setMainTab('script'); scrollToTop(); }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                mainTab === 'script'
                  ? 'bg-accent text-background font-bold shadow-[0_0_15px_rgba(0,212,180,0.3)]'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
              <span>Script</span>
            </button>

            <button
              onClick={() => {
                setMainTab('quiz');
                scrollToTop();
                if (quizState === 'none') generateQuiz();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                mainTab === 'quiz'
                  ? 'bg-accent text-background font-bold shadow-[0_0_15px_rgba(0,212,180,0.3)]'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
              </svg>
              <span>Quiz</span>
              {quizState === 'loaded' && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                  Ready
                </span>
              )}
              {quizState === 'loading' && (
                <span className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full" />
              )}
            </button>

            <button
              onClick={() => {
                setMainTab('captions');
                scrollToTop();
                if (captionsState === 'none') generateCaptions();
              }}
              className={`px-4 py-2 rounded-lg text-xs font-semibold tracking-wider transition-all duration-200 flex items-center gap-2 ${
                mainTab === 'captions'
                  ? 'bg-accent text-background font-bold shadow-[0_0_15px_rgba(0,212,180,0.3)]'
                  : 'text-muted-foreground hover:text-white'
              }`}
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
              </svg>
              <span>Social Content</span>
              {captionsState === 'loaded' && (
                <span className="px-1.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-mono border border-emerald-500/30">
                  Ready
                </span>
              )}
              {captionsState === 'loading' && (
                <span className="w-3 h-3 border-2 border-current border-t-transparent animate-spin rounded-full" />
              )}
            </button>
          </div>

          {/* Reset Process Button */}
          <button
            onClick={onReset}
            className="px-4 py-2 rounded-xl text-xs font-semibold uppercase tracking-wider text-muted-foreground bg-white/[0.02] border border-white/10 hover:border-accent hover:text-white hover:bg-white/5 transition-all duration-200 active:scale-95"
          >
            Process Another Video
          </button>
        </div>

        {/* TAB CONTENT: SCRIPT */}
        {mainTab === 'script' && (
          <div className="pt-6 space-y-6 animate-fade-in">
            {/* Header info & Export Actions */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 pb-4 border-b border-white/5">
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
              <div className="flex items-center gap-3 flex-wrap">
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
            <div className="flex border-b border-white/5">
              <button
                onClick={() => setActiveView('polished')}
                className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider border-b-2 mr-6 transition-all duration-200 flex items-center gap-2 ${
                  activeView === 'polished'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
                </svg>
                <span>Polished Script</span>
              </button>
              <button
                onClick={() => setActiveView('raw')}
                className={`pb-3 text-xs sm:text-sm font-semibold uppercase tracking-wider border-b-2 transition-all duration-200 flex items-center gap-2 ${
                  activeView === 'raw'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-white'
                }`}
              >
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
                <span>Raw Audio Output with Timestamps</span>
              </button>
            </div>

            {/* Script Display Body */}
            <div className="rounded-xl border border-white/5 bg-black/40 p-6 shadow-inner">
              <textarea
                readOnly
                value={activeText}
                className={`
                  scroller h-[460px] w-full bg-transparent
                  ${activeView === 'polished' ? 'font-sans text-base text-white/95 leading-relaxed' : 'font-mono text-sm text-white/80 leading-relaxed'}
                  resize-none focus:outline-none border-0 selection:bg-accent/30
                `}
              />
            </div>

            {/* Quick Action Footer Banners inside Script view */}
            <div className="flex justify-center items-center gap-4 flex-wrap pt-2">
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
                <span>{quizState === 'loaded' ? 'View Quiz' : quizState === 'loading' ? 'Formulating Quiz...' : 'Generate 5-Question Quiz'}</span>
              </button>

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
                <span>{captionsState === 'loaded' ? 'View Social Content' : captionsState === 'loading' ? 'Crafting Captions...' : 'Generate Social Captions'}</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB CONTENT: QUIZ */}
        {mainTab === 'quiz' && (
          <div className="pt-6 animate-fade-in">
            {quizState === 'loading' && (
              <div className="p-12 text-center space-y-4 rounded-xl border border-white/5 bg-black/40">
                <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto shadow-[0_0_15px_rgba(0,212,180,0.2)]" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Formulating Comprehension Quiz</h3>
                  <p className="text-xs text-muted-foreground">AI is reading your transcript to generate 5 key multiple-choice questions...</p>
                </div>
              </div>
            )}

            {quizState === 'error' && (
              <div className="p-8 text-center space-y-4 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
                <p className="text-red-400 text-sm font-medium">{quizError || 'Failed to generate quiz.'}</p>
                <button
                  onClick={generateQuiz}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 hover:text-white transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            )}

            {quizState === 'none' && (
              <div className="p-12 text-center space-y-4 rounded-xl border border-white/5 bg-black/30">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Comprehension Quiz</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">Generate a 5-question interactive quiz from this script to test understanding or reinforce learning.</p>
                </div>
                <button
                  onClick={generateQuiz}
                  className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-background bg-accent hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(0,212,180,0.4)] transition-all duration-200 active:scale-95"
                >
                  Generate Quiz Now
                </button>
              </div>
            )}

            {quizState === 'loaded' && (
              <QuizWorkspace
                questions={quizData}
                onClose={() => setMainTab('script')}
                embedded={true}
              />
            )}
          </div>
        )}

        {/* TAB CONTENT: CAPTIONS */}
        {mainTab === 'captions' && (
          <div className="pt-6 animate-fade-in">
            {captionsState === 'loading' && (
              <div className="p-12 text-center space-y-4 rounded-xl border border-white/5 bg-black/40">
                <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin mx-auto shadow-[0_0_15px_rgba(0,212,180,0.2)]" />
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Crafting Social Content Pack</h3>
                  <p className="text-xs text-muted-foreground">AI is generating tailored posts for YouTube, Instagram, LinkedIn, WhatsApp & TikTok...</p>
                </div>
              </div>
            )}

            {captionsState === 'error' && (
              <div className="p-8 text-center space-y-4 rounded-xl border border-red-500/20 bg-red-500/[0.03]">
                <p className="text-red-400 text-sm font-medium">{captionsError || 'Failed to generate captions.'}</p>
                <button
                  onClick={generateCaptions}
                  className="px-5 py-2.5 rounded-xl text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 hover:text-white transition-all duration-200"
                >
                  Try Again
                </button>
              </div>
            )}

            {captionsState === 'none' && (
              <div className="p-12 text-center space-y-4 rounded-xl border border-white/5 bg-black/30">
                <div className="w-12 h-12 rounded-full bg-accent/10 border border-accent/20 flex items-center justify-center mx-auto text-accent">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                  </svg>
                </div>
                <div className="space-y-1">
                  <h3 className="text-lg font-semibold text-white">Social Media Content Pack</h3>
                  <p className="text-xs text-muted-foreground max-w-md mx-auto">Generate ready-to-publish titles, descriptions, hashtags, hooks, and broadcast messages for all major platforms.</p>
                </div>
                <button
                  onClick={generateCaptions}
                  className="px-6 py-3 rounded-xl text-xs font-bold uppercase tracking-wider text-background bg-accent hover:bg-accent/90 hover:shadow-[0_0_25px_rgba(0,212,180,0.4)] transition-all duration-200 active:scale-95"
                >
                  Generate Social Content Now
                </button>
              </div>
            )}

            {captionsState === 'loaded' && captionsData && (
              <CaptionWorkspace
                data={captionsData}
                onClose={() => setMainTab('script')}
                embedded={true}
              />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
