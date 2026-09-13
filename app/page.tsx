"use client";

import { useState } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Zap,
  Mic,
  ArrowRight,
  Share2,
  Clock,
  ShieldCheck,
  Copy,
  Check,
  FileText,
  CheckCircle2,
  Scissors,
  ChevronDown,
  Menu,
  X,
  FileAudio,
  Download,
  Sparkles
} from "lucide-react";

export default function HomePage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [copiedTab, setCopiedTab] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<"summary" | "linkedin" | "x">("summary");

  const handleCopy = (key: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedTab(key);
    setTimeout(() => setCopiedTab(null), 2000);
  };

  const copySamples = {
    summary: "Key Decisions & Action Items:\n\n• Approved Q4 product priorities: ship automatic meeting notes and launch instant PDF exports.\n• Sarah will finalize the client onboarding workflow by Friday.\n• Alex is optimizing audio processing so 1-hour recordings process in under 5 seconds.\n• Next review scheduled for next Tuesday at 10 AM.",
    linkedin: "I used to spend 3 hours every week listening back to recordings and typing out meeting notes.\n\nNow I drop the audio into Sonic AI. In 5 seconds, I get:\n- Full word-for-word transcript with speaker names\n- 4 bullet action items\n- A clean executive summary ready to paste into Slack\n\nStop wasting time on busywork. Automate the notes so you can focus on the work.",
    x: "Stop taking notes during meetings.\n\nJust record the call, drop the file in Sonic AI, and let it pull the key action items and quotes in 5 seconds.\n\nYour time is worth more than manual transcription."
  };

  const marqueeItems = [
    { title: "Weekly Team All-Hands", duration: "42m", output: "Action items and decisions" },
    { title: "Customer Discovery Interview", duration: "55m", output: "Key quotes and problem takeaways" },
    { title: "Mobile Voice Memo", duration: "3m", output: "Formatted email draft" },
    { title: "Founder Interview Recording", duration: "1h 10m", output: "Full transcript and summary" },
    { title: "Strategy Planning Call", duration: "35m", output: "Executive recap document" },
    { title: "University Research Lecture", duration: "50m", output: "Study guide and notes" },
  ];

  return (
    <div className="relative min-h-screen bg-[#000000] text-zinc-100 flex flex-col justify-between selection:bg-[#00D4B4] selection:text-black overflow-x-hidden">
      {/* Subtle geometric dot grid */}
      <div 
        className="absolute inset-0 pointer-events-none opacity-[0.12]" 
        style={{
          backgroundImage: "radial-gradient(rgba(255, 255, 255, 0.15) 1px, transparent 1px)",
          backgroundSize: "32px 32px"
        }} 
      />

      {/* Top ambient spotlight */}
      <div className="absolute -top-40 left-1/2 -translate-x-1/2 w-[900px] max-w-[100vw] h-[350px] sm:h-[450px] bg-gradient-to-b from-[#00D4B4]/15 via-[#00D4B4]/5 to-transparent blur-[120px] sm:blur-[140px] pointer-events-none" />

      {/* Navigation Header - Mobile Optimized with Hamburger Drawer */}
      <header className="fixed top-0 left-0 right-0 z-50 border-b border-white/[0.06] backdrop-blur-xl bg-black/80 px-4 sm:px-6 py-3 sm:py-4">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#00D4B4] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,180,0.35)]">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D0D0D] fill-current" />
            </div>
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white">
              Sonic AI
            </span>
          </Link>

          {/* Desktop Navigation */}
          <nav className="hidden md:flex items-center gap-7 text-xs font-medium text-zinc-400">
            <a href="#features" className="hover:text-white transition">Features</a>
            <Link href="/pricing" className="hover:text-white transition">Pricing</Link>
            <Link href="/projects" className="hover:text-white transition">Studio</Link>
          </nav>

          {/* Right Action Buttons */}
          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/login" 
              className="text-xs font-medium text-zinc-400 hover:text-white transition px-2.5 py-1.5 sm:px-3"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-bold bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] rounded-xl transition shadow-lg shadow-[#00D4B4]/20 flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            >
              Start for free <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
            </Link>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-zinc-400 hover:text-white hover:bg-white/5 transition focus:outline-none"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="w-5 h-5 text-white" /> : <Menu className="w-5 h-5" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu Drawer */}
        {mobileMenuOpen && (
          <div className="md:hidden pt-4 pb-5 px-2 border-t border-white/[0.08] mt-3 space-y-3 bg-black/95 backdrop-blur-2xl rounded-2xl animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="flex flex-col space-y-1">
              <a
                href="#features"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
              >
                <span>Features</span>
                <span className="text-[10px] text-zinc-500 font-mono">Overview</span>
              </a>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
              >
                <span>Pricing Plans</span>
                <span className="text-[10px] text-[#00D4B4] font-mono">From $0</span>
              </Link>
              <Link
                href="/projects"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
              >
                <span>Studio Workspace</span>
                <span className="text-[10px] text-zinc-500 font-mono">Direct App</span>
              </Link>
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition"
              >
                Sign In
              </Link>
            </div>

            <div className="pt-2">
              <Link
                href="/register"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full py-3 px-4 rounded-xl bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] font-bold text-sm flex items-center justify-center gap-2 shadow-lg shadow-[#00D4B4]/25 active:scale-[0.98] transition"
              >
                Start Transcribing Free <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================
          FIRST 100VH: MOBILE-RESPONSIVE CLEAN HERO
          ========================================================= */}
      <section className="relative w-full min-h-[100dvh] flex flex-col items-center justify-center text-center px-4 sm:px-6 pt-20 pb-8 sm:pt-16 sm:pb-6 overflow-hidden">
        
        {/* Ambient Center Radial Glow */}
        <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[320px] sm:w-[600px] h-[220px] sm:h-[300px] bg-[#00D4B4]/10 rounded-full blur-[90px] sm:blur-[130px] pointer-events-none z-0" />

        {/* Hero Content */}
        <div className="relative z-10 flex flex-col items-center max-w-4xl mx-auto w-full">


          {/* Headline (4-Line Natural Wrap - Mobile Optimized) */}
          <h1 className="text-[28px] xs:text-3xl sm:text-5xl lg:text-6xl font-bold tracking-tight text-white leading-[1.18] sm:leading-[1.15] text-balance">
            <span className="block">Turn any audio or video into clean text.</span>
            <span className="block mt-1 text-transparent bg-clip-text bg-gradient-to-r from-[#00D4B4] via-emerald-200 to-white">
              Notes, summaries, and action items in seconds.
            </span>
          </h1>

          {/* Clean Subtitle */}
          <p className="mt-3.5 sm:mt-6 text-xs xs:text-sm sm:text-base lg:text-lg text-zinc-300 max-w-2xl px-2 sm:px-0 leading-relaxed text-balance">
            Drop any meeting, interview, podcast, or video recording. Get exact word-for-word transcripts, clear action items, and ready-to-share summaries without doing the tedious work.
          </p>

          {/* SINGLE PROMINENT PRIMARY CTA - Responsive Touch Target */}
          <div className="mt-7 sm:mt-9 flex flex-col items-center gap-2.5 sm:gap-3 w-full sm:w-auto px-2 sm:px-0">
            <Link
              href="/projects"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] font-bold rounded-full transition text-sm sm:text-base shadow-[0_0_30px_rgba(0,212,180,0.4)] hover:shadow-[0_0_45px_rgba(0,212,180,0.6)] flex items-center justify-center gap-2.5 active:scale-[0.98] transform hover:-translate-y-0.5"
            >
              Start Transcribing Free <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5" />
            </Link>

            {/* Reassurance text below CTA */}
            <p className="text-[11px] sm:text-xs text-zinc-400 font-medium text-center px-2">
              No credit card required • 30 free minutes every month • Instant setup
            </p>
          </div>

          {/* CONTINUOUS AUDIO SOUNDWAVE MARQUEE BELOW THE BUTTON */}
          <div className="mt-6 sm:mt-10 w-full max-w-4xl lg:max-w-5xl overflow-hidden relative py-1 sm:py-2">
            {/* Left & Right Soft Fade Masks */}
            <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-r from-black via-black/80 to-transparent z-10 pointer-events-none" />
            <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-l from-black via-black/80 to-transparent z-10 pointer-events-none" />

            <div className="animate-marquee flex items-center gap-1 sm:gap-1.5 h-10 sm:h-16 opacity-75 hover:opacity-100 transition-opacity duration-300">
              {[...[15, 28, 45, 62, 85, 95, 70, 48, 25, 18, 35, 55, 78, 92, 100, 84, 60, 38, 22, 16, 40, 65, 88, 98, 75, 50, 32, 20, 48, 72, 90, 80, 58, 35, 20, 15, 30, 52, 75, 92, 85, 62, 40, 22, 18, 35, 60, 82, 96, 78, 55, 30, 18, 42, 68, 88, 72, 48, 28, 15], ...[15, 28, 45, 62, 85, 95, 70, 48, 25, 18, 35, 55, 78, 92, 100, 84, 60, 38, 22, 16, 40, 65, 88, 98, 75, 50, 32, 20, 48, 72, 90, 80, 58, 35, 20, 15, 30, 52, 75, 92, 85, 62, 40, 22, 18, 35, 60, 82, 96, 78, 55, 30, 18, 42, 68, 88, 72, 48, 28, 15]].map((height, i) => (
                <div
                  key={i}
                  style={{
                    height: `${height}%`,
                    animation: `pulseGlow 2s infinite ease-in-out ${i * 0.04}s`,
                  }}
                  className={`w-0.5 sm:w-1 rounded-full transition-all duration-200 ${
                    i % 6 === 0
                      ? "bg-[#00D4B4]"
                      : i % 3 === 0
                      ? "bg-emerald-300/80"
                      : i % 2 === 0
                      ? "bg-zinc-600"
                      : "bg-zinc-800"
                  }`}
                />
              ))}
            </div>
          </div>
        </div>

        {/* Perfectly Centered Scroll Indicator */}
        <div className="absolute bottom-6 inset-x-0 mx-auto flex flex-col items-center justify-center gap-1 text-zinc-500 text-[11px] font-medium pointer-events-none z-10 text-center">
          <span>Scroll to explore</span>
          <ChevronDown className="w-3.5 h-3.5 animate-bounce" />
        </div>
      </section>

      {/* =========================================================
          SECTION 2: USE-CASE MARQUEE (ZERO EMOJIS, CLEAN SVG ICONS)
          ========================================================= */}
      <section className="relative w-full border-y border-white/[0.06] bg-zinc-950/60 py-3 sm:py-4 overflow-hidden">
        {/* Gradient edge masks */}
        <div className="absolute left-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-r from-black to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-10 sm:w-24 bg-gradient-to-l from-black to-transparent z-10 pointer-events-none" />

        <div className="animate-marquee flex gap-3 sm:gap-4">
          {[...marqueeItems, ...marqueeItems].map((item, idx) => (
            <div
              key={idx}
              className="flex items-center gap-2.5 sm:gap-3 px-3.5 sm:px-5 py-2 sm:py-2.5 rounded-full border border-white/[0.08] bg-black/80 backdrop-blur-sm text-left whitespace-nowrap shadow-sm hover:border-[#00D4B4]/40 transition"
            >
              <div className="w-5 h-5 sm:w-6 sm:h-6 rounded-full bg-[#00D4B4]/15 text-[#00D4B4] flex items-center justify-center shrink-0">
                <Mic className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
              </div>
              <div>
                <div className="text-[11px] sm:text-xs font-semibold text-white flex items-center gap-1.5">
                  <span>{item.title}</span>
                  <span className="text-[9px] sm:text-[10px] font-mono text-zinc-400">({item.duration})</span>
                </div>
                <div className="text-[10px] sm:text-[11px] text-[#00D4B4] font-medium flex items-center gap-1">
                  <ArrowRight className="w-2.5 h-2.5 text-[#00D4B4]" />
                  <span>{item.output}</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* =========================================================
          SECTION 3: CORE BENEFITS & BENTO FEATURES
          ========================================================= */}
      <main id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-14 sm:py-24 flex flex-col items-center text-center z-10 w-full">
        
        {/* Section Header */}
        <div className="max-w-xl mx-auto mb-10 text-center">

          <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white">
            Everything you need. Nothing you don't.
          </h2>
          <p className="mt-2 text-xs sm:text-sm text-zinc-400">
            From raw audio recordings to publication-ready summaries in single seconds.
          </p>
        </div>

        {/* Benefits Strip - Mobile 2x2 Grid with Clean Borders */}
        <div className="grid grid-cols-2 md:grid-cols-4 max-w-4xl w-full border border-white/[0.08] rounded-2xl bg-zinc-950/70 backdrop-blur-sm overflow-hidden text-left shadow-lg">
          <div className="p-4 sm:p-5 border-r border-b md:border-b-0 border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <Clock className="w-4 h-4 text-[#00D4B4]" />
              <span className="text-[10px] font-mono text-zinc-400">SPEED</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">&lt; 5s</div>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">Instant Turnaround</div>
          </div>

          <div className="p-4 sm:p-5 border-b md:border-b-0 md:border-r border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <FileAudio className="w-4 h-4 text-emerald-400" />
              <span className="text-[10px] font-mono text-zinc-400">INPUT</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-[#00D4B4] tracking-tight">Any File</div>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">Audio or Video</div>
          </div>

          <div className="p-4 sm:p-5 border-r border-white/[0.06] flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <CheckCircle2 className="w-4 h-4 text-white" />
              <span className="text-[10px] font-mono text-zinc-400">ACCURACY</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">99%+</div>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">Global Accents</div>
          </div>

          <div className="p-4 sm:p-5 flex flex-col justify-between">
            <div className="flex items-center justify-between text-zinc-500 mb-2">
              <Download className="w-4 h-4 text-purple-400" />
              <span className="text-[10px] font-mono text-zinc-400">EXPORT</span>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white tracking-tight">1-Click</div>
            <div className="text-[11px] sm:text-xs text-zinc-400 mt-1">PDF & Word Export</div>
          </div>
        </div>

        {/* 4 Stacked Alternating Feature Rows */}
        <div className="w-full max-w-6xl mt-12 sm:mt-16 divide-y divide-white/[0.06]">
          
          {/* Row 1: Exact Transcripts (Text Left / Icon Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full py-16 md:py-24 text-left">
            {/* Content Column */}
            <div className="order-2 lg:order-1 flex flex-col items-start space-y-4 max-w-xl">
              <span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase font-mono">
                LIVE NOW
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Exact Transcripts with Speaker Names
              </h3>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                Never re-listen to an hour-long recording just to find one sentence. Search the full text instantly, jump to specific speaker moments, or export cleanly formatted PDFs and Word documents.
              </p>

              {/* Supplementary Demo: 3 Mini Cards */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 sm:gap-3 pt-3 w-full">
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-zinc-950/60 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-white mb-1">Speaker Separation</div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">Automatically detects who is speaking throughout the conversation.</div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-zinc-950/60 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-white mb-1">Exact Timestamps</div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">Click any sentence to jump directly to that moment in the audio.</div>
                </div>
                <div className="p-3.5 rounded-xl border border-white/[0.06] bg-zinc-950/60 backdrop-blur-sm">
                  <div className="text-xs font-semibold text-white mb-1">PDF & Word Export</div>
                  <div className="text-[11px] text-zinc-400 leading-relaxed">Download formatted reports ready to share with your clients or team.</div>
                </div>
              </div>
            </div>

            {/* Icon Column */}
            <div className="order-1 lg:order-2 flex items-center justify-center relative w-full py-4 lg:py-0">
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-35 pointer-events-none" />
              <div className="relative z-10 max-w-xs md:max-w-sm w-full flex items-center justify-center">
                <Image
                  src="/3d-icon/exact-transcripts-with-speaker-names.png"
                  alt="3D icon representing exact transcripts with speaker names"
                  width={2548}
                  height={2548}
                  priority
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </div>
          </div>

          {/* Row 2: No Slow Video Uploads (Icon Left / Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full py-16 md:py-24 text-left">
            {/* Content Column */}
            <div className="order-2 lg:order-2 flex flex-col items-start space-y-4 max-w-xl">
              <span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase font-mono">
                ZERO WAITING
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                No Slow Video Uploads
              </h3>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                Have a huge 2GB video? Sonic AI extracts the audio right on your device in under a second so you don't spend all day staring at an upload bar.
              </p>

              {/* Supplementary Demo: Instant Extraction Preview */}
              <div className="w-full max-w-md pt-2 space-y-3">
                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4">
                  <div className="flex items-center justify-between text-xs mb-1.5">
                    <span className="text-zinc-300 font-medium truncate max-w-[180px]">team_interview.mp4</span>
                    <span className="text-emerald-400 font-mono text-xs font-semibold">Instant 0.4s</span>
                  </div>
                  <div className="text-xs text-zinc-400 leading-relaxed">
                    Only the lightweight audio is sent to transcribe. 100% private and 50x faster.
                  </div>
                </div>
                <div className="text-xs text-zinc-400 flex items-center gap-2 pt-0.5">
                  <CheckCircle2 className="w-4 h-4 text-[#00D4B4] shrink-0" />
                  <span>Works directly on your phone or laptop.</span>
                </div>
              </div>
            </div>

            {/* Icon Column */}
            <div className="order-1 lg:order-1 flex items-center justify-center relative w-full py-4 lg:py-0">
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-35 pointer-events-none" />
              <div className="relative z-10 max-w-xs md:max-w-sm w-full flex items-center justify-center">
                <Image
                  src="/3d-icon/no-slow-video-uploads.png"
                  alt="3D icon representing fast on-device video extraction"
                  width={2548}
                  height={2548}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </div>
          </div>

          {/* Row 3: Instant Summaries & Social Posts (Text Left / Icon Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full py-16 md:py-24 text-left">
            {/* Content Column */}
            <div className="order-2 lg:order-1 flex flex-col items-start space-y-4 max-w-xl">
              <span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase font-mono">
                1-CLICK MAGIC
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Instant Summaries & Social Posts
              </h3>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                Professional writing with zero artificial AI emojis. Turn your discussions into concise executive summaries, actionable bullet points, or viral social posts with a single click.
              </p>

              {/* Supplementary Demo: Interactive Tabs */}
              <div className="w-full max-w-xl pt-2">
                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-3 sm:p-4">
                  <div className="flex items-center justify-between gap-2 pb-3 border-b border-white/[0.06] mb-3">
                    <div className="flex items-center gap-1 overflow-x-auto no-scrollbar py-0.5">
                      {(["summary", "linkedin", "x"] as const).map((tab) => (
                        <button
                          key={tab}
                          onClick={() => setActiveTab(tab)}
                          className={`px-2.5 py-1 text-[11px] sm:text-xs rounded-lg font-medium transition whitespace-nowrap ${
                            activeTab === tab
                              ? "bg-[#00D4B4] text-[#0D0D0D] font-bold shadow-sm"
                              : "text-zinc-400 hover:text-white hover:bg-white/5"
                          }`}
                        >
                          {tab === "summary" ? "Summary" : tab === "linkedin" ? "LinkedIn Post" : "Twitter Thread"}
                        </button>
                      ))}
                    </div>

                    <button
                      onClick={() => handleCopy(activeTab, copySamples[activeTab])}
                      className="flex items-center gap-1 text-[11px] font-medium text-zinc-400 hover:text-white px-2.5 py-1 rounded border border-white/10 hover:bg-white/5 transition shrink-0 active:scale-95"
                    >
                      {copiedTab === activeTab ? (
                        <>
                          <Check className="w-3 h-3 text-[#00D4B4]" />
                          <span className="text-[#00D4B4]">Copied!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-3 h-3" />
                          <span className="hidden xs:inline">Copy Text</span>
                          <span className="xs:hidden">Copy</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="text-xs text-zinc-300 leading-relaxed whitespace-pre-line font-sans max-h-48 overflow-y-auto pr-1">
                    {copySamples[activeTab]}
                  </p>
                </div>
              </div>
            </div>

            {/* Icon Column */}
            <div className="order-1 lg:order-2 flex items-center justify-center relative w-full py-4 lg:py-0">
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-35 pointer-events-none" />
              <div className="relative z-10 max-w-xs md:max-w-sm w-full flex items-center justify-center">
                <Image
                  src="/3d-icon/instant-summaries-and-social-posts.png"
                  alt="3D icon representing instant summaries and social posts"
                  width={2548}
                  height={2548}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </div>
          </div>

          {/* Row 4: Shorts & Video Clips (Icon Left / Text Right) */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 lg:gap-16 items-center w-full py-16 md:py-24 text-left">
            {/* Content Column */}
            <div className="order-2 lg:order-2 flex flex-col items-start space-y-4 max-w-xl">
              <span className="inline-block rounded-full border border-border bg-muted px-3 py-1 text-xs font-medium tracking-wide text-muted-foreground uppercase font-mono">
                ROADMAP
              </span>
              <h3 className="text-3xl md:text-4xl font-bold text-foreground tracking-tight">
                Shorts & Video Clips
              </h3>
              <p className="text-muted-foreground text-base md:text-lg leading-relaxed max-w-md">
                Coming soon: Turn long video recordings into vertical 9:16 short clips with animated subtitles for social media.
              </p>

              {/* Supplementary Demo: Active Development Callout */}
              <div className="w-full max-w-md pt-2 space-y-3">
                <div className="rounded-xl border border-white/[0.08] bg-black/60 p-4 text-left">
                  <div className="text-xs text-amber-300 font-semibold mb-1">Under Active Development</div>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Preview locked studio tabs inside your project workspace.
                  </p>
                </div>

                <Link
                  href="/projects"
                  className="inline-flex items-center gap-2 text-xs sm:text-sm font-medium text-zinc-400 hover:text-white transition group pt-1"
                >
                  <span>Explore Workspace</span>
                  <ArrowRight className="w-3.5 h-3.5 group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            </div>

            {/* Icon Column */}
            <div className="order-1 lg:order-1 flex items-center justify-center relative w-full py-4 lg:py-0">
              <div className="absolute w-64 h-64 sm:w-80 sm:h-80 rounded-full bg-[var(--accent-glow)] blur-3xl opacity-35 pointer-events-none" />
              <div className="relative z-10 max-w-xs md:max-w-sm w-full flex items-center justify-center">
                <Image
                  src="/3d-icon/shorts-and-video-clips.png"
                  alt="3D icon representing shorts and video clips"
                  width={2548}
                  height={2548}
                  className="w-full h-auto object-contain drop-shadow-[0_20px_50px_rgba(0,0,0,0.6)] transform hover:scale-105 transition-transform duration-500 select-none"
                />
              </div>
            </div>
          </div>

        </div>

        {/* Bottom CTA Card - Mobile Optimized */}
        <div className="mt-14 sm:mt-24 max-w-4xl w-full rounded-2xl sm:rounded-3xl border border-[#00D4B4]/30 bg-gradient-to-b from-[#00D4B4]/10 to-zinc-950 p-6 sm:p-12 text-center relative overflow-hidden shadow-2xl">
          <h2 className="text-xl sm:text-2xl md:text-3xl font-bold text-white tracking-tight">
            Ready to get hours back in your week?
          </h2>
          <p className="mt-2.5 sm:mt-3 text-xs sm:text-sm text-zinc-300 max-w-lg mx-auto leading-relaxed">
            Try Sonic AI for free. Drop your first voice memo or meeting recording and get clean text in 5 seconds.
          </p>
          <div className="mt-6 sm:mt-7 flex justify-center w-full px-2 sm:px-0">
            <Link
              href="/register"
              className="w-full sm:w-auto px-8 py-3.5 sm:py-4 bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] font-bold rounded-full transition shadow-lg shadow-[#00D4B4]/30 text-sm sm:text-base flex items-center justify-center gap-2 active:scale-95"
            >
              Get Started Free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </main>

      {/* Footer - Mobile Friendly Layout */}
      <footer className="border-t border-white/[0.08] py-8 sm:py-10 px-4 sm:px-6 z-10 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#00D4B4] flex items-center justify-center text-[#0D0D0D] font-bold text-[10px]">
              S
            </div>
            <span className="text-zinc-300 font-medium">Sonic AI Studio</span>
            <span className="hidden sm:inline">•</span>
            <span className="hidden sm:inline">Turn voice into actionable content in seconds.</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 py-1">
            <Link href="/projects" className="py-1 px-1 hover:text-zinc-300 transition">Projects</Link>
            <Link href="/pricing" className="py-1 px-1 hover:text-zinc-300 transition">Pricing</Link>
            <Link href="/login" className="py-1 px-1 hover:text-zinc-300 transition">Sign In</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
