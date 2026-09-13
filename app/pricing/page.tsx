"use client";

import { useState } from "react";
import Link from "next/link";
import { Zap, Check, ArrowRight, HelpCircle, Menu, X } from "lucide-react";

export default function PricingPage() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [annual, setAnnual] = useState(false);

  const plans = [
    {
      name: "Free Starter",
      desc: "For quick notes, voice memos, and testing Sonic AI.",
      price: "₦0",
      period: "forever free",
      popular: false,
      cta: "Get Started Free",
      ctaHref: "/register",
      features: [
        "30 free transcription minutes / month",
        "Sub-5-second Groq Whisper inference",
        "Speaker names & timestamps",
        "Instant bullet-point summaries",
        "Export to PDF and Markdown",
        "Zero-egress local video extraction",
      ],
    },
    {
      name: "Pro Creator",
      desc: "For podcasters, researchers, and professionals who want to save hours.",
      price: annual ? "₦12,000" : "₦15,000",
      period: "per month",
      popular: true,
      cta: "Start 7-Day Free Trial",
      ctaHref: "/register?plan=pro",
      features: [
        "15 hours of audio / video per month",
        "Everything in Free Starter",
        "Automatic LinkedIn & Twitter post repurposing",
        "Full speaker diarization",
        "Word Doc (.docx) & PDF exports",
        "Priority processing queue",
        "Full project search & transcript history",
      ],
    },
    {
      name: "Team & Studio",
      desc: "For agencies, media teams, and businesses managing multiple clients.",
      price: annual ? "₦36,000" : "₦45,000",
      period: "per month",
      popular: false,
      cta: "Upgrade to Team",
      ctaHref: "/register?plan=team",
      features: [
        "60 hours of audio / video per month",
        "Everything in Pro Creator",
        "Unlimited project workspaces",
        "Up to 5 team members",
        "Custom vocabulary & industry terminology",
        "Dedicated cloud bandwidth",
        "Priority email & chat support",
      ],
    },
  ];

  const faqs = [
    {
      q: "Can I pay in Nigerian Naira (₦)?",
      a: "Yes! All subscription plans and credit top-ups are billed in Nigerian Naira (₦). We accept all local debit cards, bank transfers, and USSD via instant checkout.",
    },
    {
      q: "Do I need a card to get started?",
      a: "No. You can sign up and start transcribing your recordings immediately on the Free Starter tier without entering any payment details.",
    },
    {
      q: "What audio and video formats are supported?",
      a: "Sonic AI supports almost every common format: MP3, WAV, M4A, AAC, FLAC, OGG, MP4, MOV, MKV, and WEBM.",
    },
    {
      q: "How does it handle large 4K or HD video files?",
      a: "Our zero-egress browser engine extracts the audio stream right on your computer in under 1 second. Only the small audio is uploaded, saving you massive bandwidth and time.",
    },
    {
      q: "Is my audio and data kept private?",
      a: "Yes. Your audio files and transcripts belong exclusively to you. We do not sell your data or use your private conversations to train public AI models.",
    },
  ];

  return (
    <div className="min-h-screen bg-[#000000] text-zinc-100 flex flex-col justify-between selection:bg-[#00D4B4] selection:text-black overflow-x-hidden">
      {/* Background ambient lighting */}
      <div className="absolute -top-32 left-1/2 -translate-x-1/2 w-[800px] max-w-[100vw] h-[350px] bg-[#00D4B4]/10 blur-[120px] pointer-events-none" />

      {/* Navigation Header - Mobile Optimized with Hamburger */}
      <header className="sticky top-0 z-50 border-b border-white/[0.08] backdrop-blur-xl bg-black/80 px-4 sm:px-6 py-3 sm:py-3.5">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#00D4B4] flex items-center justify-center shadow-[0_0_15px_rgba(0,212,180,0.35)]">
              <Zap className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#0D0D0D] fill-current" />
            </div>
            <span className="text-sm sm:text-base font-semibold tracking-tight text-white flex items-center gap-1.5">
              Sonic AI <span className="text-[10px] sm:text-[11px] font-mono text-zinc-400 font-normal px-1.5 py-0.5 rounded border border-white/10 bg-white/5">Studio</span>
            </span>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-medium text-zinc-400">
            <Link href="/" className="hover:text-white transition">Home</Link>
            <Link href="/pricing" className="text-white transition">Pricing</Link>
            <Link href="/projects" className="hover:text-white transition">Studio</Link>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3">
            <Link 
              href="/login" 
              className="text-xs font-medium text-zinc-400 hover:text-white transition px-2.5 py-1.5 sm:px-3"
            >
              Sign In
            </Link>
            <Link
              href="/register"
              className="hidden xs:inline-flex px-3.5 py-1.5 sm:px-4 sm:py-2 text-xs font-semibold bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] rounded-full transition shadow-lg shadow-[#00D4B4]/25 items-center gap-1.5 active:scale-95"
            >
              Try Free <ArrowRight className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
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
              <Link
                href="/"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-zinc-300 hover:text-white hover:bg-white/5 transition flex items-center justify-between"
              >
                <span>Home</span>
                <span className="text-[10px] text-zinc-500 font-mono">Landing</span>
              </Link>
              <Link
                href="/pricing"
                onClick={() => setMobileMenuOpen(false)}
                className="px-3 py-2.5 rounded-lg text-sm font-medium text-white bg-white/5 transition flex items-center justify-between"
              >
                <span>Pricing Plans</span>
                <span className="text-[10px] text-[#00D4B4] font-mono">Current</span>
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

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 py-12 sm:py-16 flex flex-col items-center text-center z-10 w-full">
        <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full border border-white/[0.12] bg-white/[0.04] text-zinc-300 text-[11px] sm:text-xs font-medium mb-5">
          <span className="w-2 h-2 rounded-full bg-[#00D4B4]" />
          <span>Transparent & Simple Pricing</span>
        </div>

        <h1 className="text-2xl xs:text-3xl sm:text-5xl font-bold tracking-tight text-white leading-tight">
          Save hours every week. <br />
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#00D4B4] to-white">
            Pick the plan that fits your workflow.
          </span>
        </h1>

        <p className="mt-3 sm:mt-4 text-zinc-400 max-w-xl text-xs sm:text-base px-2">
          Start for free today. Upgrade anytime as your transcription and media needs grow.
        </p>

        {/* Monthly / Annual Toggle - Touch friendly */}
        <div className="mt-7 sm:mt-8 flex items-center justify-center gap-1.5 sm:gap-3 bg-zinc-950 border border-white/10 p-1 rounded-full w-full max-w-xs sm:max-w-none sm:w-auto">
          <button
            onClick={() => setAnnual(false)}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition ${
              !annual ? "bg-white text-black font-semibold shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            Monthly Billing
          </button>
          <button
            onClick={() => setAnnual(true)}
            className={`flex-1 sm:flex-initial px-3.5 sm:px-4 py-1.5 rounded-full text-xs font-medium transition flex items-center justify-center gap-1.5 ${
              annual ? "bg-[#00D4B4] text-black font-bold shadow-sm" : "text-zinc-400 hover:text-white"
            }`}
          >
            <span>Annual (Save 20%)</span>
          </button>
        </div>

        {/* Pricing Cards - Mobile Stacking */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-5 sm:gap-6 mt-10 sm:mt-12 max-w-6xl w-full text-left">
          {plans.map((plan, idx) => (
            <div
              key={idx}
              className={`rounded-2xl sm:rounded-3xl p-6 sm:p-8 flex flex-col justify-between transition-all duration-200 relative ${
                plan.popular
                  ? "bg-zinc-950 border-2 border-[#00D4B4] shadow-[0_0_35px_rgba(0,212,180,0.15)]"
                  : "bg-zinc-950/70 border border-white/[0.08] hover:border-white/20"
              }`}
            >
              {plan.popular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded-full bg-[#00D4B4] text-[#0D0D0D] font-bold text-[10px] sm:text-[11px] tracking-wider uppercase shadow-md">
                  Most Popular
                </div>
              )}

              <div>
                <h3 className="text-lg sm:text-xl font-bold text-white">{plan.name}</h3>
                <p className="text-xs text-zinc-400 mt-1 min-h-[32px] sm:min-h-[36px]">{plan.desc}</p>

                <div className="mt-5 sm:mt-6 flex items-baseline gap-1.5">
                  <span className="text-3xl sm:text-4xl font-extrabold text-white">{plan.price}</span>
                  <span className="text-xs text-zinc-400">/ {plan.period}</span>
                </div>

                <div className="mt-6 sm:mt-8 space-y-2.5 sm:space-y-3 pt-5 sm:pt-6 border-t border-white/[0.08]">
                  {plan.features.map((feat, fIdx) => (
                    <div key={fIdx} className="flex items-start gap-2.5 text-xs text-zinc-300">
                      <Check className="w-4 h-4 text-[#00D4B4] shrink-0 mt-0.5" />
                      <span>{feat}</span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="mt-6 sm:mt-8 pt-5 sm:pt-6">
                <Link
                  href={plan.ctaHref}
                  className={`w-full py-3 sm:py-3.5 rounded-full text-xs font-bold transition flex items-center justify-center gap-2 active:scale-95 ${
                    plan.popular
                      ? "bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] shadow-lg shadow-[#00D4B4]/25"
                      : "bg-white hover:bg-zinc-200 text-black shadow-sm"
                  }`}
                >
                  {plan.cta} <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>

        {/* FAQs Section */}
        <div className="mt-16 sm:mt-24 max-w-3xl w-full text-left">
          <h2 className="text-xl sm:text-2xl font-bold text-white text-center mb-6 sm:mb-8">
            Frequently Asked Questions
          </h2>

          <div className="space-y-3 sm:space-y-4">
            {faqs.map((faq, idx) => (
              <div key={idx} className="p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-white/[0.08] bg-zinc-950/60">
                <h3 className="text-xs sm:text-sm font-semibold text-white flex items-center gap-2">
                  <HelpCircle className="w-4 h-4 text-[#00D4B4] shrink-0" />
                  <span>{faq.q}</span>
                </h3>
                <p className="text-xs text-zinc-400 mt-2 leading-relaxed pl-6">
                  {faq.a}
                </p>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t border-white/[0.08] py-8 sm:py-10 px-4 sm:px-6 z-10 bg-black/40">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-500 text-center sm:text-left">
          <div className="flex items-center gap-2">
            <div className="w-5 h-5 rounded-md bg-[#00D4B4] flex items-center justify-center text-[#0D0D0D] font-bold text-[10px]">
              S
            </div>
            <span className="text-zinc-300 font-medium">Sonic AI Studio</span>
          </div>

          <div className="flex items-center gap-5 sm:gap-6 py-1">
            <Link href="/" className="py-1 px-1 hover:text-zinc-300 transition">Home</Link>
            <Link href="/projects" className="py-1 px-1 hover:text-zinc-300 transition">Studio</Link>
            <Link href="/pricing" className="py-1 px-1 hover:text-zinc-300 transition">Pricing</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
