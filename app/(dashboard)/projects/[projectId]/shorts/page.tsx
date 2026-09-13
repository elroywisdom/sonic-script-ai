import { Scissors, Sparkles, Sliders, Play, Download } from "lucide-react";

export default function ShortsStudioPage() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      {/* 9:16 Video Canvas Preview */}
      <div className="lg:col-span-2 glass-card p-6 rounded-2xl flex flex-col items-center justify-center min-h-[550px]">
        <div className="w-[280px] h-[500px] bg-black rounded-2xl border border-white/10 shadow-2xl relative overflow-hidden flex flex-col justify-between p-4">
          <div className="flex justify-between items-center text-xs text-white/70">
            <span className="bg-red-500/80 px-2 py-0.5 rounded text-[10px] font-bold">9:16 PREVIEW</span>
            <span>00:32 / 00:58</span>
          </div>

          {/* Simulated Kinetic Subtitle */}
          <div className="text-center my-auto">
            <span className="text-xl font-extrabold uppercase tracking-tight text-white drop-shadow-[0_2px_10px_rgba(0,0,0,1)]">
              THE <span className="text-amber-400 underline decoration-indigo-500">SECRET</span> TO SCALE
            </span>
          </div>

          <div className="flex justify-center">
            <button className="w-10 h-10 rounded-full bg-white/20 backdrop-blur-md flex items-center justify-center text-white hover:bg-white/30 transition">
              <Play className="w-5 h-5 ml-0.5" />
            </button>
          </div>
        </div>
      </div>

      {/* Shorts Settings & AI Hook Detector */}
      <div className="space-y-6">
        <div className="glass-card p-6 rounded-2xl border border-white/5">
          <h3 className="text-sm font-semibold text-white mb-2 flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-cyan-400" /> AI Viral Hook Detection
          </h3>
          <p className="text-xs text-slate-400 mb-4">
            Automatically analyze energy, punchlines, and speech cadence to generate 30–60s viral shorts.
          </p>
          <button className="w-full py-2.5 bg-[#00D4B4] hover:bg-[#00D4B4]/90 text-[#0D0D0D] font-bold text-xs font-semibold rounded-xl transition shadow-lg shadow-cyan-600/20">
            Scan & Extract Top 3 Clips (10 Credits)
          </button>
        </div>

        <div className="glass-card p-6 rounded-2xl border border-white/5 space-y-4">
          <h4 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
            <Sliders className="w-3.5 h-3.5 text-[#00D4B4]" /> Kinetic Subtitle Styles
          </h4>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button className="p-3 rounded-xl border border-[#00D4B4] bg-[#00D4B4]/10 text-white font-medium text-center">
              Hormozi Pop
            </button>
            <button className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-center">
              Minimal White
            </button>
            <button className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-center">
              Neon Cyber
            </button>
            <button className="p-3 rounded-xl border border-white/5 bg-white/5 hover:bg-white/10 text-slate-300 font-medium text-center">
              Karaoke Bounce
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
