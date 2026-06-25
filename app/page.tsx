'use client';

import { useCallback, useRef, useState } from 'react';
import StatusStepper, { type AppStatus } from '@/components/StatusStepper';
import TranscriptWorkspace from '@/components/TranscriptWorkspace';
import UploadZone from '@/components/UploadZone';
import PasteTranscriptZone from '@/components/PasteTranscriptZone';
import QuizWorkspace, { type Question } from '@/components/QuizWorkspace';
import CaptionWorkspace, { type CaptionData } from '@/components/CaptionWorkspace';
import ProcessLogs, { type LogEntry } from '@/components/ProcessLogs';
import { extractAudioChunks } from '@/lib/extractAudio';

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

    setLogs((prev) => [...prev, { timestamp, message, type }]);
  }, []);

  const runPipeline = useCallback(async (file: File) => {
    currentFileRef.current = file;
    setErrorMessage('');
    setRawTranscript('');
    setPolishedTranscript('');
    setLogs([]);
    startTimeRef.current = Date.now();

    let currentStep: PipelineStep = 'extracting';

    try {
      setStatus('extracting');
      currentStep = 'extracting';
      addLog(`Initializing extraction pipeline for ${file.name}...`, 'info');
      const audioChunks = await extractAudioChunks(file, (msg) => addLog(msg, 'info'));

      setStatus('transcribing');
      currentStep = 'transcribing';
      addLog(`Extraction complete. Created ${audioChunks.length} audio chunk(s) for transcription.`, 'success');

      let raw = '';
      if (audioChunks.length === 1) {
        addLog(`Uploading audio file '${audioChunks[0].filename}' (${(audioChunks[0].blob.size / (1024 * 1024)).toFixed(2)} MB) to Groq Whisper...`, 'info');
        const transcribeForm = new FormData();
        transcribeForm.append('audio', audioChunks[0].blob, audioChunks[0].filename);
        transcribeForm.append('filename', audioChunks[0].filename);
        transcribeForm.append('offset', '0');

        const res = await fetch('/api/transcribe', {
          method: 'POST',
          body: transcribeForm,
        });
        const transcribeData = await res.json();
        if (!res.ok) {
          throw new Error(getResponseError(transcribeData));
        }
        raw = transcribeData.rawTranscript;
        addLog('Transcription completed successfully.', 'success');
      } else {
        addLog(`Starting concurrent transcription of ${audioChunks.length} chunks...`, 'info');
        const promises = audioChunks.map(async (chunk, i) => {
          addLog(`[Chunk ${i + 1}/${audioChunks.length}] Uploading '${chunk.filename}' (${(chunk.blob.size / (1024 * 1024)).toFixed(2)} MB) to Groq Whisper...`, 'info');

          const transcribeForm = new FormData();
          transcribeForm.append('audio', chunk.blob, chunk.filename);
          transcribeForm.append('filename', chunk.filename);
          const chunkOffset = i * 120; // 120 seconds (2 minutes) per chunk
          transcribeForm.append('offset', String(chunkOffset));

          const res = await fetch('/api/transcribe', {
            method: 'POST',
            body: transcribeForm,
          });
          const transcribeData = await res.json();
          if (!res.ok) {
            addLog(`[Chunk ${i + 1}/${audioChunks.length}] Failed: ${getResponseError(transcribeData)}`, 'error');
            throw new Error(getResponseError(transcribeData));
          }

          addLog(`[Chunk ${i + 1}/${audioChunks.length}] Transcribed successfully.`, 'success');
          return transcribeData.rawTranscript;
        });

        const transcripts = await Promise.all(promises);
        raw = transcripts.join(' ').trim();
        addLog('All audio chunks transcribed successfully.', 'success');
      }

      setRawTranscript(raw);

      setStatus('refining');
      currentStep = 'refining';
      addLog(`Sending raw transcript (${raw.length} characters) to DeepSeek-Chat for refining & polishing...`, 'info');
      const refineRes = await fetch('/api/refine', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawTranscript: raw }),
      });

      const refineData = await refineRes.json();
      if (!refineRes.ok) {
        throw new Error(getResponseError(refineData));
      }

      const polished = refineData.polishedTranscript as string;
      setPolishedTranscript(polished);
      addLog(`Polishing completed successfully (${polished.length} characters).`, 'success');
      setStatus('done');
      addLog('Pipeline completed successfully! Enjoy your transcript.', 'success');
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

        {(status === 'extracting' || status === 'transcribing' || status === 'refining' || (status === 'error' && failedStep !== 'generating_quiz')) && (
          <>
            <StatusStepper
              status={status}
              errorMessage={errorMessage}
              failedStep={failedStep as 'extracting' | 'transcribing' | 'refining'}
              onRetry={handleRetry}
            />
            <ProcessLogs logs={logs} isProcessing={isProcessing} />
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
          <>
            <StatusStepper status="done" />
            <ProcessLogs logs={logs} isProcessing={false} />
            <TranscriptWorkspace
              rawTranscript={rawTranscript}
              polishedTranscript={polishedTranscript}
              onReset={handleReset}
            />
          </>
        )}
      </div>
    </main>
  );
}
