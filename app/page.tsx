'use client';

import { useCallback, useRef, useState } from 'react';
import StatusStepper, { type AppStatus } from '@/components/StatusStepper';
import TranscriptWorkspace from '@/components/TranscriptWorkspace';
import UploadZone from '@/components/UploadZone';
import PasteTranscriptZone from '@/components/PasteTranscriptZone';
import QuizWorkspace, { type Question } from '@/components/QuizWorkspace';
import CaptionWorkspace, { type CaptionData } from '@/components/CaptionWorkspace';
import ProcessLogs, { type LogEntry } from '@/components/ProcessLogs';
import { extractAudioChunks, CHUNK_DURATION_SECONDS, type ExtractedAudio } from '@/lib/extractAudio';

import ProcessingDashboard from '@/components/ProcessingDashboard';
import {
  saveCachedChunks,
  getCachedRecord,
  saveChunkTranscript,
  type CachedRecord,
} from '@/lib/audioCache';
import { RollingRateLimiter, fetchWithRetry } from '@/lib/rateLimiter';

type PipelineStep = 'extracting' | 'transcribing' | 'refining' | 'generating_quiz' | 'generating_captions';

function getErrorMessage(error: unknown): string {
  if (error instanceof Error) return error.message;
  return 'An unexpected error occurred. Please try again.';
}

function getResponseError(data: Record<string, unknown>): string {
  return (
    (typeof data.detail === 'string' && data.detail) ||
    (typeof data.error === 'string' && data.error) ||
    (typeof data.message === 'string' && data.message) ||
    'Request failed'
  );
}

function getFileKey(file: File): string {
  return `${file.name}_${file.size}_${file.lastModified}`;
}

export default function Home() {
  const [status, setStatus] = useState<AppStatus>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [failedStep, setFailedStep] = useState<PipelineStep>('extracting');
  const [rawTranscript, setRawTranscript] = useState('');
  const [polishedTranscript, setPolishedTranscript] = useState('');
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [activeTab, setActiveTab] = useState<'video' | 'text'>('video');
  const [pastedTranscript, setPastedTranscript] = useState('');
  const [quizQuestions, setQuizQuestions] = useState<Question[]>([]);
  const [captionsData, setCaptionsData] = useState<CaptionData | null>(null);
  
  // Dashboard calculation states
  const [progressPercent, setProgressPercent] = useState(0);
  const [estimatedRemainingSeconds, setEstimatedRemainingSeconds] = useState(0);
  const [totalDurationSeconds, setTotalDurationSeconds] = useState(0);
  const [currentChunkIndex, setCurrentChunkIndex] = useState(1);
  const [totalChunks, setTotalChunks] = useState(1);
  const [cachedRecordFound, setCachedRecordFound] = useState<CachedRecord | null>(null);

  const audioChunksRef = useRef<ExtractedAudio[]>([]);
  const currentFileRef = useRef<File | null>(null);
  const startTimeRef = useRef<number>(0);

  const isProcessing =
    status === 'extracting' ||
    status === 'transcribing' ||
    status === 'refining' ||
    status === 'generating_quiz' ||
    status === 'generating_captions';

  const addLog = useCallback((message: string, type: LogEntry['type'] = 'info') => {
    const elapsedSecs = (Date.now() - startTimeRef.current) / 1000;
    const pad = (num: number) => String(num).padStart(2, '0');
    const mins = Math.floor(elapsedSecs / 60);
    const secs = Math.floor(elapsedSecs % 60);
    const ms = Math.floor((elapsedSecs % 1) * 10);
    const timestamp = `${pad(mins)}:${pad(secs)}.${ms}`;

    // Parse progress percentages and duration metrics from log messages
    if (message.includes('complete') && message.includes('%')) {
      const match = message.match(/(\d+)%\s+complete/);
      if (match) {
        const extractPct = parseInt(match[1], 10);
        // Extraction represents 0-50% of total pipeline
        const overallPct = Math.round((extractPct / 100) * 50);
        setProgressPercent(overallPct);
      }
    }
    if (message.includes('Duration:')) {
      const durMatch = message.match(/Duration:\s*([\d\.]+)s/);
      if (durMatch) {
        const durationSecs = parseFloat(durMatch[1]);
        setTotalDurationSeconds(durationSecs);
        // 8x speed extraction estimate (duration / 8) + buffer for transcription
        const estSecs = Math.round(durationSecs / 8) + 60;
        setEstimatedRemainingSeconds(estSecs);
      }
    }

    setLogs((prev) => [...prev, { timestamp, message, type }]);
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    currentFileRef.current = file;
    audioChunksRef.current = [];
    setErrorMessage('');
    setRawTranscript('');
    setPolishedTranscript('');
    setLogs([]);
    setProgressPercent(0);
    setEstimatedRemainingSeconds(120);
    startTimeRef.current = Date.now();

    const fileKey = getFileKey(file);
    let currentStep: PipelineStep = 'extracting';

    try {
      // Check IndexedDB cache first
      const cached = await getCachedRecord(fileKey);
      let audioChunks: ExtractedAudio[] = [];

      if (cached && cached.chunks.length > 0) {
        addLog(`Found cached audio extractions for '${file.name}' in browser storage (${cached.chunks.length} chunks). Skipping extraction phase!`, 'success');
        audioChunks = cached.chunks;
        audioChunksRef.current = audioChunks;
        setTotalDurationSeconds(cached.durationSeconds || 0);
        setProgressPercent(50);
      } else {
        setStatus('extracting');
        currentStep = 'extracting';
        addLog(`Initializing extraction pipeline for ${file.name}...`, 'info');
        audioChunks = await extractAudioChunks(file, (msg) => addLog(msg, 'info'));
        audioChunksRef.current = audioChunks;

        const dur = audioChunks.reduce((acc, c) => acc + c.durationSeconds, 0);
        setTotalDurationSeconds(dur);

        // Save extracted chunks to IndexedDB
        await saveCachedChunks(fileKey, file.name, file.size, dur, audioChunks);
        addLog(`Saved extracted audio chunks to local browser storage.`, 'info');
      }

      setStatus('transcribing');
      currentStep = 'transcribing';
      setTotalChunks(audioChunks.length);
      addLog(`Extraction complete. Created ${audioChunks.length} audio chunk(s) for transcription.`, 'success');

      const rawTranscripts: string[] = new Array(audioChunks.length);
      const polishedChunks: string[] = new Array(audioChunks.length);
      const existingRecord = await getCachedRecord(fileKey);
      const existingTranscripts = existingRecord?.transcripts || {};

      const rateLimiter = new RollingRateLimiter(18, 60000);
      let completedCount = 0;

      const processChunk = async (chunk: ExtractedAudio, i: number) => {
        let chunkRawText = '';

        if (existingTranscripts[i]) {
          addLog(`[Chunk ${i + 1}/${audioChunks.length}] Loaded from browser cache.`, 'success');
          chunkRawText = existingTranscripts[i];
          rawTranscripts[i] = chunkRawText;
        } else {
          // Acquire rate limiter slot (18 RPM rolling window cap)
          await rateLimiter.acquire((waitTimeMs, currentRPM) => {
            addLog(`[Chunk ${i + 1}/${audioChunks.length}] Groq RPM safety window reached (${currentRPM} requests in last 60s). Pausing ${(waitTimeMs / 1000).toFixed(1)}s...`, 'info');
          });

          // Check if R2 Presigned Upload is available
          let r2UploadedKey: string | null = null;
          try {
            const urlRes = await fetch('/api/upload-url', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ filename: chunk.filename, contentType: chunk.blob.type }),
            });
            const urlData = await urlRes.json();
            if (urlRes.ok && urlData.enabled && urlData.uploadUrl) {
              addLog(`[Chunk ${i + 1}/${audioChunks.length}] Uploading directly to Cloudflare R2 presigned URL (bypassing Vercel 4.5MB limit)...`, 'info');
              await fetch(urlData.uploadUrl, {
                method: 'PUT',
                headers: { 'Content-Type': chunk.blob.type },
                body: chunk.blob,
              });
              r2UploadedKey = urlData.key;
            }
          } catch (err) {
            // R2 unavailable or failed, fallback to direct payload upload
          }

          let res: Response;
          if (r2UploadedKey) {
            res = await fetchWithRetry('/api/transcribe', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                r2Key: r2UploadedKey,
                filename: chunk.filename,
                offset: i * CHUNK_DURATION_SECONDS,
              }),
            }, {
              onRetry: (_attempt, _delayMs, reason) => addLog(`[Chunk ${i + 1}/${audioChunks.length}] ${reason}`, 'info'),
            });
          } else {
            addLog(`[Chunk ${i + 1}/${audioChunks.length}] Uploading '${chunk.filename}' (${(chunk.blob.size / (1024 * 1024)).toFixed(2)} MB) to Groq Whisper...`, 'info');
            const transcribeForm = new FormData();
            transcribeForm.append('audio', chunk.blob, chunk.filename);
            transcribeForm.append('filename', chunk.filename);
            transcribeForm.append('offset', String(i * CHUNK_DURATION_SECONDS));

            res = await fetchWithRetry('/api/transcribe', {
              method: 'POST',
              body: transcribeForm,
            }, {
              onRetry: (_attempt, _delayMs, reason) => addLog(`[Chunk ${i + 1}/${audioChunks.length}] ${reason}`, 'info'),
            });
          }

          const contentType = res.headers.get('content-type') || '';
          let transcribeData: Record<string, unknown> = {};
          if (contentType.includes('application/json')) {
            transcribeData = await res.json();
          } else {
            const errText = await res.text();
            throw new Error(`Server returned non-JSON error (${res.status}): ${errText.slice(0, 200)}`);
          }
          if (!res.ok) {
            addLog(`[Chunk ${i + 1}/${audioChunks.length}] Failed: ${getResponseError(transcribeData)}`, 'error');
            throw new Error(getResponseError(transcribeData));
          }

          chunkRawText = transcribeData.rawTranscript as string;
          rawTranscripts[i] = chunkRawText;
          await saveChunkTranscript(fileKey, i, chunkRawText);
          addLog(`[Chunk ${i + 1}/${audioChunks.length}] Transcribed successfully.`, 'success');
        }

        completedCount++;
        const currentPct = 50 + Math.round((completedCount / audioChunks.length) * 35);
        setProgressPercent(currentPct);
        setCurrentChunkIndex(completedCount);

        const remChunkSecs = Math.max(5, Math.ceil((audioChunks.length - completedCount) / 4) * 4);
        setEstimatedRemainingSeconds(remChunkSecs);

        // PIPELINED REFINEMENT: Immediately trigger refinement for this chunk in parallel!
        if (chunkRawText && chunkRawText.trim()) {
          addLog(`[Chunk ${i + 1}/${audioChunks.length}] Starting pipelined refinement (Groq Llama 3.3 70B)...`, 'info');
          try {
            const refineRes = await fetch('/api/refine', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ rawTranscript: chunkRawText }),
            });
            if (refineRes.ok) {
              const refineData = await refineRes.json();
              polishedChunks[i] = (refineData.polishedTranscript as string) || chunkRawText;
              addLog(`[Chunk ${i + 1}/${audioChunks.length}] Pipelined refinement complete.`, 'success');
            } else {
              polishedChunks[i] = chunkRawText;
            }
          } catch (err) {
            polishedChunks[i] = chunkRawText;
          }
        } else {
          polishedChunks[i] = '';
        }
      };

      addLog(`Starting parallel transcription & pipelined refinement of ${audioChunks.length} chunks (18 RPM rate limiter + 429 retry active)...`, 'info');

      // Bounded concurrency pool (4 active slots)
      const CONCURRENCY_LIMIT = 4;
      let poolIndex = 0;

      const worker = async () => {
        while (poolIndex < audioChunks.length) {
          const idx = poolIndex++;
          await processChunk(audioChunks[idx], idx);
        }
      };

      const workers = Array.from(
        { length: Math.min(CONCURRENCY_LIMIT, audioChunks.length) },
        () => worker()
      );
      await Promise.all(workers);

      const assembledRaw = rawTranscripts.filter(Boolean).join(' ').trim();
      const assembledPolished = polishedChunks.filter(Boolean).join('\n\n').trim() || assembledRaw;

      setRawTranscript(assembledRaw);
      setPolishedTranscript(assembledPolished);

      setProgressPercent(100);
      setEstimatedRemainingSeconds(0);
      setStatus('done');
      addLog('Pipeline completed successfully! Enjoy your polished transcript.', 'success');
    } catch (error) {
      const errMsg = getErrorMessage(error);
      addLog(`Error during step '${currentStep}': ${errMsg}`, 'error');
      setFailedStep(currentStep);
      setStatus('error');
      setErrorMessage(errMsg);
    }
  }, [addLog]);

  const runQuizPipeline = useCallback(async (transcript: string) => {
    setPastedTranscript(transcript);
    setErrorMessage('');
    setQuizQuestions([]);
    setLogs([]);
    startTimeRef.current = Date.now();

    try {
      setStatus('generating_quiz');
      setFailedStep('generating_quiz');
      addLog('Initializing quiz generation pipeline...', 'info');
      addLog('Analyzing transcript content...', 'info');
      addLog(`Sending transcript (${transcript.length} characters) to AI for quiz generation...`, 'info');

      const res = await fetch('/api/quiz', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getResponseError(data));
      }

      setQuizQuestions(data.questions);
      addLog('Quiz generated successfully! Loaded 5 questions.', 'success');
      setStatus('quiz_only');
    } catch (error) {
      const errMsg = getErrorMessage(error);
      addLog(`Error during quiz generation: ${errMsg}`, 'error');
      setFailedStep('generating_quiz');
      setStatus('error');
      setErrorMessage(errMsg);
    }
  }, [addLog]);

  const runCaptionsPipeline = useCallback(async (transcript: string) => {
    setPastedTranscript(transcript);
    setErrorMessage('');
    setCaptionsData(null);
    setLogs([]);
    startTimeRef.current = Date.now();

    try {
      setStatus('generating_captions');
      setFailedStep('generating_captions');
      addLog('Initializing caption generation pipeline...', 'info');
      addLog('Analyzing transcript content for platform optimization...', 'info');
      addLog(`Sending transcript (${transcript.length} characters) to AI for captions...`, 'info');

      const res = await fetch('/api/captions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ transcript }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(getResponseError(data));
      }

      setCaptionsData(data);
      addLog('Social media captions generated successfully!', 'success');
      setStatus('captions_only');
    } catch (error) {
      const errMsg = getErrorMessage(error);
      addLog(`Error during captions generation: ${errMsg}`, 'error');
      setFailedStep('generating_captions');
      setStatus('error');
      setErrorMessage(errMsg);
    }
  }, [addLog]);

  const handleStart = useCallback(
    (file: File) => {
      runPipeline(file);
    },
    [runPipeline]
  );

  const handleRetry = useCallback(() => {
    if (activeTab === 'text') {
      if (failedStep === 'generating_quiz') {
        runQuizPipeline(pastedTranscript);
      } else if (failedStep === 'generating_captions') {
        runCaptionsPipeline(pastedTranscript);
      }
    } else if (currentFileRef.current) {
      runPipeline(currentFileRef.current);
    }
  }, [activeTab, pastedTranscript, runPipeline, runQuizPipeline, runCaptionsPipeline, failedStep]);

  const handleReset = useCallback(() => {
    currentFileRef.current = null;
    setStatus('idle');
    setErrorMessage('');
    setFailedStep('extracting');
    setRawTranscript('');
    setPolishedTranscript('');
    setPastedTranscript('');
    setQuizQuestions([]);
    setCaptionsData(null);
    setLogs([]);
  }, []);

  return (
    <main className="min-h-screen flex flex-col relative overflow-hidden bg-[#0d0d0d]">
      {/* Glowing ambient backgrounds */}
      <div className="absolute top-0 left-0 w-[500px] h-[500px] rounded-full bg-accent/5 blur-[120px] pointer-events-none -translate-x-1/2 -translate-y-1/2" />
      <div className="absolute bottom-0 right-0 w-[600px] h-[600px] rounded-full bg-purple-500/[0.02] blur-[150px] pointer-events-none translate-x-1/3 translate-y-1/3" />

      <header className="border-b border-white/5 bg-black/20 backdrop-blur-md px-6 py-8 relative z-10">
        <div className="max-w-6xl mx-auto">
          <h1 className="text-2xl sm:text-3xl font-semibold tracking-tight">
            TM Labs Sonic<span className="text-accent">Script</span> AI
          </h1>
          <p className="mt-2 text-sm text-muted-foreground max-w-2xl leading-relaxed">
            Instantly transform video recordings into polished, shareable transcripts,
            formatted markdown documentation, interactive comprehension quizzes, and
            optimized social media captions.
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 py-12 gap-8 w-full max-w-4xl mx-auto">
        {status === 'idle' && (
          <div className="w-full max-w-2xl mx-auto space-y-6">
            <div className="flex border-b border-white/10 w-full mb-2">
              <button
                onClick={() => setActiveTab('video')}
                disabled={isProcessing}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-semibold tracking-wider uppercase border-b-2 transition-all duration-300 ${
                  activeTab === 'video'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Upload Video
              </button>
              <button
                onClick={() => setActiveTab('text')}
                disabled={isProcessing}
                className={`flex-1 py-3 text-center text-xs sm:text-sm font-semibold tracking-wider uppercase border-b-2 transition-all duration-300 ${
                  activeTab === 'text'
                    ? 'border-accent text-accent'
                    : 'border-transparent text-muted-foreground hover:text-white'
                } disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                Paste Transcript
              </button>
            </div>

            {activeTab === 'video' ? (
              <UploadZone onStart={handleStart} disabled={isProcessing} />
            ) : (
              <PasteTranscriptZone
                onGenerate={runQuizPipeline}
                onGenerateCaptions={runCaptionsPipeline}
                disabled={isProcessing}
              />
            )}
          </div>
        )}

        {(status === 'extracting' || status === 'transcribing' || status === 'refining' || (status === 'error' && failedStep !== 'generating_quiz' && failedStep !== 'generating_captions')) && (
          <>
            <StatusStepper
              status={status}
              errorMessage={errorMessage}
              failedStep={failedStep as 'extracting' | 'transcribing' | 'refining'}
              onRetry={handleRetry}
            />
            <ProcessingDashboard
              status={status}
              logs={logs}
              progressPercent={progressPercent}
              estimatedRemainingSeconds={estimatedRemainingSeconds}
              totalDurationSeconds={totalDurationSeconds}
              currentChunkIndex={currentChunkIndex}
              totalChunks={totalChunks}
              onRetry={handleRetry}
              errorMessage={errorMessage}
            />
          </>
        )}

        {(status === 'generating_quiz' || status === 'generating_captions' || (status === 'error' && (failedStep === 'generating_quiz' || failedStep === 'generating_captions'))) && (
          <>
            <div className="w-full max-w-3xl mx-auto bg-white/[0.01] border border-white/5 p-8 rounded-2xl backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)] flex flex-col items-center justify-center gap-6 animate-fade-in relative overflow-hidden">
              <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
              
              {status === 'generating_quiz' || status === 'generating_captions' ? (
                <div className="flex flex-col items-center justify-center gap-4 text-center">
                  <div className="relative w-16 h-16 flex items-center justify-center">
                    <span className="absolute inset-0 rounded-full border border-accent/20 animate-ping opacity-60" />
                    <div className="w-12 h-12 rounded-full border-2 border-accent border-t-transparent animate-spin flex items-center justify-center shadow-[0_0_15px_rgba(0,212,180,0.2)]" />
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-foreground">
                      {status === 'generating_quiz' ? 'Generating Quiz Questions' : 'Generating Social Captions'}
                    </h3>
                    <p className="text-sm text-muted-foreground">
                      {status === 'generating_quiz' 
                        ? 'AI is reading the transcript and formulating comprehension questions...' 
                        : 'AI is reading the transcript and crafting optimized social media posts...'}
                    </p>
                  </div>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center gap-4 text-center w-full">
                  <div className="w-12 h-12 rounded-full bg-red-500/10 text-red-400 border-2 border-red-500 flex items-center justify-center shadow-[0_0_15px_rgba(239,68,68,0.2)]">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </div>
                  <div className="space-y-1">
                    <h3 className="text-lg font-semibold text-red-400">
                      {failedStep === 'generating_quiz' ? 'Quiz Generation Failed' : 'Captions Generation Failed'}
                    </h3>
                    <p className="text-sm text-muted-foreground max-w-md mx-auto">{errorMessage || 'Something went wrong. Please try again.'}</p>
                  </div>
                  <button
                    onClick={handleRetry}
                    className="mt-2 px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 hover:text-white transition-all duration-200"
                  >
                    Try again
                  </button>
                </div>
              )}
            </div>
            <ProcessLogs logs={logs} isProcessing={isProcessing} />
          </>
        )}

        {status === 'quiz_only' && (
          <QuizWorkspace
            questions={quizQuestions}
            onClose={handleReset}
          />
        )}

        {status === 'captions_only' && captionsData && (
          <CaptionWorkspace
            data={captionsData}
            onClose={handleReset}
          />
        )}

        {status === 'done' && (
          <TranscriptWorkspace
            rawTranscript={rawTranscript}
            polishedTranscript={polishedTranscript}
            onReset={handleReset}
          />
        )}
      </div>
    </main>
  );
}
