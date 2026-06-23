'use client';

import { useState } from 'react';

export interface Question {
  id: number;
  question: string;
  options: string[];
  answerIndex: number;
  explanation: string;
}

interface QuizWorkspaceProps {
  questions: Question[];
  onClose: () => void;
}

export default function QuizWorkspace({ questions, onClose }: QuizWorkspaceProps) {
  const [currentIdx, setCurrentIdx] = useState(0);
  const [selectedOption, setSelectedOption] = useState<number | null>(null);
  const [userAnswers, setUserAnswers] = useState<number[]>([]);
  const [quizCompleted, setQuizCompleted] = useState(false);

  const currentQuestion = questions[currentIdx];
  const isAnswered = selectedOption !== null;

  const handleOptionSelect = (optionIdx: number) => {
    if (isAnswered) return;
    setSelectedOption(optionIdx);
  };

  const handleNext = () => {
    if (selectedOption === null) return;

    // Track the answer
    const nextAnswers = [...userAnswers, selectedOption];
    setUserAnswers(nextAnswers);

    // Go to next question or complete
    if (currentIdx < questions.length - 1) {
      setCurrentIdx(currentIdx + 1);
      setSelectedOption(null);
    } else {
      setQuizCompleted(true);
    }
  };

  const handleRetake = () => {
    setCurrentIdx(0);
    setSelectedOption(null);
    setUserAnswers([]);
    setQuizCompleted(false);
  };

  // Calculate score
  const correctCount = userAnswers.reduce((acc, ans, idx) => {
    return ans === questions[idx].answerIndex ? acc + 1 : acc;
  }, 0);

  // Score description helper
  const getScoreDescription = (score: number) => {
    if (score === 5) return { title: '🎉 Perfect Score!', msg: "You've fully mastered this material." };
    if (score === 4) return { title: '✨ Great Job!', msg: 'You have a very solid understanding.' };
    if (score === 3) return { title: '👍 Good Effort!', msg: 'You understood the core concepts.' };
    return { title: '📚 Keep Learning!', msg: 'Review the transcript and try again!' };
  };

  const scoreDetails = getScoreDescription(correctCount);

  if (quizCompleted) {
    return (
      <div className="w-full max-w-3xl mx-auto mt-12 p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-8 animate-fade-in relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
        <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
        <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />

        {/* Results Banner */}
        <div className="text-center space-y-3 relative z-10">
          <span className="inline-block text-[10px] font-semibold tracking-wider text-accent uppercase bg-accent/10 px-3 py-1 rounded-full border border-accent/20">
            Quiz Complete
          </span>
          <h3 className="text-2xl sm:text-3xl font-bold text-foreground">
            {scoreDetails.title}
          </h3>
          <p className="text-muted-foreground text-sm max-w-md mx-auto">
            {scoreDetails.msg}
          </p>

          <div className="relative w-36 h-36 mx-auto flex items-center justify-center rounded-full border border-white/10 bg-black/40 shadow-[0_0_40px_rgba(0,212,180,0.1)] mt-6">
            <div className="absolute inset-0 rounded-full bg-accent/5 blur-lg" />
            <div className="text-center z-10">
              <div className="text-5xl font-bold text-accent font-mono tracking-tight">{correctCount}</div>
              <div className="text-[10px] text-muted-foreground font-mono mt-1 uppercase tracking-wider">OF {questions.length} CORRECT</div>
            </div>
          </div>
        </div>

        {/* Question Review Section */}
        <div className="space-y-4 border-t border-white/10 pt-6 relative z-10">
          <h4 className="font-semibold text-xs uppercase tracking-wider text-muted-foreground font-mono">
            Review Answers
          </h4>
          <div className="space-y-4 max-h-[350px] overflow-y-auto pr-2 scroller">
            {questions.map((q, idx) => {
              const userAns = userAnswers[idx];
              const isCorrect = userAns === q.answerIndex;

              return (
                <div
                  key={q.id}
                  className={`p-4 rounded-xl border text-sm space-y-3 transition-all duration-200 relative overflow-hidden bg-black/30 ${
                    isCorrect 
                      ? 'border-emerald-500/20 hover:border-emerald-500/30' 
                      : 'border-red-500/20 hover:border-red-500/30'
                  }`}
                >
                  <div className={`absolute top-0 left-0 w-1 h-full ${isCorrect ? 'bg-emerald-500' : 'bg-red-500'}`} />
                  
                  <div className="flex items-start gap-3 justify-between">
                    <div className="space-y-1">
                      <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground block">
                        Question {idx + 1}
                      </span>
                      <p className="font-medium text-foreground leading-relaxed">
                        {q.question}
                      </p>
                    </div>
                    
                    <div className={`flex items-center gap-1 px-2.5 py-1 rounded font-mono text-[10px] uppercase tracking-wider shrink-0 ${
                      isCorrect
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-red-500/10 text-red-400 border border-red-500/20'
                    }`}>
                      {isCorrect ? (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                          <span>Correct</span>
                        </>
                      ) : (
                        <>
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          <span>Incorrect</span>
                        </>
                      )}
                    </div>
                  </div>

                  <div className="space-y-1.5 border-t border-white/5 pt-3">
                    <p className="text-xs text-muted-foreground font-mono">
                      Your answer: <span className={isCorrect ? 'text-emerald-400 font-semibold' : 'text-red-400 font-semibold'}>
                        {q.options[userAns]}
                      </span>
                    </p>
                    {!isCorrect && (
                      <p className="text-xs text-muted-foreground font-mono">
                        Correct answer: <span className="text-emerald-400 font-semibold">{q.options[q.answerIndex]}</span>
                      </p>
                    )}
                  </div>
                  
                  <div className="text-xs text-muted-foreground bg-white/[0.01] border border-white/5 p-3 rounded-lg italic leading-relaxed">
                    <span className="font-mono text-[9px] uppercase tracking-wider text-accent font-semibold block not-italic mb-1">Explanation</span>
                    {q.explanation}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Buttons */}
        <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4 border-t border-white/10 relative z-10">
          <button
            onClick={handleRetake}
            className="
              px-6 py-2.5 rounded-lg text-sm font-medium
              border border-white/10 text-muted-foreground bg-white/[0.01]
              hover:border-accent hover:text-accent hover:bg-accent/5
              transition-all duration-200 active:scale-95
            "
          >
            Retake Quiz
          </button>
          <button
            onClick={onClose}
            className="
              px-6 py-2.5 rounded-lg text-sm font-semibold text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)]
              transition-all duration-200 active:scale-95
            "
          >
            Dismiss Quiz
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-3xl mx-auto mt-12 p-6 sm:p-8 rounded-2xl border border-white/10 bg-white/[0.02] backdrop-blur-xl space-y-6 animate-fade-in relative overflow-hidden shadow-[0_12px_40px_rgba(0,0,0,0.5)]">
      <div className="absolute top-0 right-0 w-32 h-32 rounded-full bg-accent/5 blur-2xl pointer-events-none" />
      <div className="absolute bottom-0 left-0 w-32 h-32 rounded-full bg-purple-500/5 blur-2xl pointer-events-none" />

      {/* Progress header */}
      <div className="space-y-3 relative z-10">
        <div className="flex justify-between items-center text-xs font-mono text-muted-foreground">
          <span className="tracking-wider">COMPREHENSION CHECK</span>
          <span className="text-accent font-semibold">
            Question {currentIdx + 1} of {questions.length}
          </span>
        </div>
        {/* Progress Bar */}
        <div className="w-full h-1.5 bg-white/5 rounded-full overflow-hidden">
          <div
            className="h-full bg-accent transition-all duration-300 rounded-full shadow-[0_0_10px_rgba(0,212,180,0.5)]"
            style={{ width: `${((currentIdx + 1) / questions.length) * 100}%` }}
          />
        </div>
      </div>

      {/* Question Card */}
      <div className="space-y-4 relative z-10">
        <h3 className="text-lg sm:text-xl font-medium text-foreground leading-relaxed">
          {currentQuestion.question}
        </h3>

        {/* Options grid */}
        <div className="grid grid-cols-1 gap-3">
          {currentQuestion.options.map((option, idx) => {
            const isSelected = selectedOption === idx;
            const isCorrectAnswer = idx === currentQuestion.answerIndex;

            let btnStyle = 'border-white/10 bg-white/[0.02] text-foreground hover:bg-white/[0.04] hover:border-white/20 hover:scale-[1.005]';
            if (isAnswered) {
              if (isCorrectAnswer) {
                // Correct answer glows green
                btnStyle = 'border-emerald-500 bg-emerald-500/10 text-emerald-300 shadow-[0_0_15px_rgba(16,185,129,0.15)] scale-[1.005]';
              } else if (isSelected) {
                // Wrong selected answer glows red
                btnStyle = 'border-red-500 bg-red-500/10 text-red-300 shadow-[0_0_15px_rgba(239,68,68,0.15)] scale-[1.005]';
              } else {
                // Others fade out
                btnStyle = 'border-white/5 bg-white/[0.005] text-muted-foreground opacity-40 scale-[0.98] pointer-events-none';
              }
            } else if (isSelected) {
              btnStyle = 'border-accent bg-accent/10 text-accent scale-[1.005] shadow-[0_0_15px_rgba(0,212,180,0.15)]';
            }

            return (
              <button
                key={idx}
                disabled={isAnswered}
                onClick={() => handleOptionSelect(idx)}
                className={`
                  w-full text-left p-4 rounded-lg border text-sm font-medium
                  transition-all duration-200 flex items-center justify-between gap-4
                  ${btnStyle}
                `}
              >
                <span>{option}</span>
                {isAnswered ? (
                  isCorrectAnswer ? (
                    <svg className="w-5 h-5 text-emerald-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : isSelected ? (
                    <svg className="w-5 h-5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  ) : (
                    <span className="w-5 h-5 rounded-full border border-white/5 shrink-0" />
                  )
                ) : (
                  <span className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 transition-colors duration-200 ${isSelected ? 'border-accent' : 'border-white/20'}`}>
                    <span className={`w-2.5 h-2.5 rounded-full transition-all duration-200 ${isSelected ? 'bg-accent scale-100' : 'bg-transparent scale-0'}`} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>

      {/* Explanation Reveal */}
      {isAnswered && (
        <div className="p-4 rounded-lg bg-white/[0.02] border border-white/10 text-xs sm:text-sm space-y-2 animate-slide-down relative overflow-hidden z-10">
          <div className="absolute top-0 left-0 w-1 h-full bg-accent" />
          <p className="font-semibold text-accent uppercase tracking-wider font-mono text-[10px]">
            {selectedOption === currentQuestion.answerIndex ? 'Correct! Explanation:' : 'Incorrect. Explanation:'}
          </p>
          <p className="text-muted-foreground leading-relaxed pl-1">
            {currentQuestion.explanation}
          </p>
        </div>
      )}

      {/* Action Button */}
      {isAnswered && (
        <div className="flex justify-end pt-2 relative z-10 animate-fade-in">
          <button
            onClick={handleNext}
            className="
              px-6 py-2.5 rounded-lg text-sm font-semibold text-background
              bg-accent hover:bg-accent/90 hover:shadow-[0_0_20px_rgba(0,212,180,0.4)]
              transition-all duration-200 active:scale-95
            "
          >
            {currentIdx < questions.length - 1 ? 'Next Question' : 'See Results'}
          </button>
        </div>
      )}
    </div>
  );
}

