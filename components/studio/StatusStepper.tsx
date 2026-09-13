'use client';

export type AppStatus =
  | 'idle'
  | 'extracting'
  | 'transcribing'
  | 'refining'
  | 'done'
  | 'error'
  | 'generating_quiz'
  | 'quiz_only'
  | 'generating_captions'
  | 'captions_only';

interface StatusStepperProps {
  status: AppStatus;
  errorMessage?: string;
  failedStep?: 'extracting' | 'transcribing' | 'refining';
  onRetry?: () => void;
}

const STEPS = [
  { key: 'extracting', label: 'Extracting Audio', number: 1 },
  { key: 'transcribing', label: 'Transcribing', number: 2 },
  { key: 'refining', label: 'Polishing', number: 3 },
  { key: 'done', label: 'Done', number: 4 },
] as const;

function getStepState(
  stepKey: string,
  status: AppStatus,
  failedStep?: 'extracting' | 'transcribing' | 'refining'
): 'pending' | 'active' | 'complete' | 'error' {
  const order = ['extracting', 'transcribing', 'refining', 'done'];
  const currentIndex = order.indexOf(
    status === 'idle'
      ? 'extracting'
      : status === 'error'
        ? failedStep || 'extracting'
        : status
  );
  const stepIndex = order.indexOf(stepKey);

  if (status === 'error' && stepKey === failedStep) return 'error';
  if (status === 'done') return 'complete';
  if (stepIndex < currentIndex) return 'complete';
  if (stepIndex === currentIndex && status !== 'error') return 'active';
  return 'pending';
}

export default function StatusStepper({
  status,
  errorMessage,
  failedStep,
  onRetry,
}: StatusStepperProps) {
  if (status === 'idle') return null;

  return (
    <div className="w-full max-w-3xl mx-auto bg-white/[0.01] border border-white/5 p-6 rounded-2xl backdrop-blur-xl shadow-[0_8px_30px_rgba(0,0,0,0.3)]">
      <div className="flex items-center justify-between gap-2">
        {STEPS.map((step, index) => {
          const state = getStepState(step.key, status, failedStep);
          const isLast = index === STEPS.length - 1;

          return (
            <div key={step.key} className="flex items-center flex-1">
              <div className="flex flex-col items-center flex-1">
                <div className="relative">
                  {state === 'active' && (
                    <span className="absolute -inset-1.5 rounded-full border border-accent/30 animate-ping opacity-60 pointer-events-none" />
                  )}
                  <div
                    className={`
                      w-10 h-10 rounded-full flex items-center justify-center
                      text-sm font-medium transition-all duration-300
                      ${
                        state === 'complete'
                          ? 'bg-accent text-background shadow-[0_0_15px_rgba(0,212,180,0.4)]'
                          : state === 'active'
                            ? 'bg-accent/15 text-accent border-2 border-accent shadow-[0_0_15px_rgba(0,212,180,0.2)]'
                            : state === 'error'
                              ? 'bg-red-500/10 text-red-400 border-2 border-red-500 shadow-[0_0_15px_rgba(239,68,68,0.2)]'
                              : 'bg-muted border border-white/5 text-muted-foreground'
                      }
                    `}
                  >
                    {state === 'complete' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    ) : state === 'active' ? (
                      <svg className="w-5 h-5 animate-spin" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                      </svg>
                    ) : state === 'error' ? (
                      <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    ) : (
                      step.number
                    )}
                  </div>
                </div>
                <span
                  className={`
                    mt-3 text-xs sm:text-sm font-medium text-center tracking-wide
                    ${
                      state === 'active' || state === 'complete'
                        ? 'text-foreground'
                        : state === 'error'
                          ? 'text-red-400'
                          : 'text-muted-foreground'
                    }
                  `}
                >
                  {step.label}
                </span>
              </div>

              {!isLast && (
                <div
                  className={`
                    h-0.5 flex-1 mx-2 mb-8 transition-all duration-300
                    ${
                      getStepState(STEPS[index + 1].key, status, failedStep) !== 'pending' ||
                      status === 'done'
                        ? 'bg-accent shadow-[0_0_8px_rgba(0,212,180,0.4)]'
                        : 'bg-white/5'
                    }
                  `}
                />
              )}
            </div>
          );
        })}
      </div>

      {status === 'error' && (
        <div className="mt-6 p-4 rounded-xl bg-red-500/[0.03] border border-red-500/10 text-center animate-slide-down">
          <p className="text-red-400/90 text-sm font-medium leading-relaxed">{errorMessage || 'Something went wrong. Please try again.'}</p>
          {onRetry && (
            <button
              onClick={onRetry}
              className="mt-4 px-6 py-2.5 rounded-lg text-xs font-semibold uppercase tracking-wider bg-red-500/10 text-red-300 border border-red-500/20 hover:bg-red-500/20 hover:text-white transition-all duration-200"
            >
              Try again
            </button>
          )}
        </div>
      )}
    </div>
  );
}
