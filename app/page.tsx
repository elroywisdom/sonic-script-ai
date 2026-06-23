'use client';

import { useCallback, useRef, useState } from 'react';
import StatusStepper, { type AppStatus } from '@/components/StatusStepper';
import TranscriptWorkspace from '@/components/TranscriptWorkspace';
import UploadZone from '@/components/UploadZone';
import ProcessLogs, { type LogEntry } from '@/components/ProcessLogs';
import { extractAudioChunks } from '@/lib/extractAudio';

type PipelineStep = 'extracting' | 'transcribing' | 'refining';

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
  const currentFileRef = useRef<File | null>(null);
  const startTimeRef = useRef<number>(0);

  const isProcessing =
    status === 'extracting' ||
    status === 'transcribing' ||
    status === 'refining';

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

  const handleStart = useCallback(
    (file: File) => {
      runPipeline(file);
    },
    [runPipeline]
  );

  const handleRetry = useCallback(() => {
    if (currentFileRef.current) {
      runPipeline(currentFileRef.current);
    }
  }, [runPipeline]);

  const handleReset = useCallback(() => {
    currentFileRef.current = null;
    setStatus('idle');
    setErrorMessage('');
    setFailedStep('extracting');
    setRawTranscript('');
    setPolishedTranscript('');
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
            formatted markdown documentation, and interactive comprehension quizzes.
          </p>
        </div>
      </header>

      <div className="flex-1 flex flex-col items-center px-6 py-12 gap-8 w-full max-w-4xl mx-auto">
        {status === 'idle' && (
          <UploadZone onStart={handleStart} disabled={isProcessing} />
        )}

        {status !== 'idle' && status !== 'done' && (
          <>
            <StatusStepper
              status={status}
              errorMessage={errorMessage}
              failedStep={failedStep}
              onRetry={handleRetry}
            />
            <ProcessLogs logs={logs} isProcessing={isProcessing} />
          </>
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
