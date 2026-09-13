import { Film, Sparkles, Plus, Play, Cpu, Music } from "lucide-react";

export default function FilmStudioPage() {
  const scenes = [
    {
      num: 1,
      script: "A lone traveler stands atop a rain-soaked skyscraper looking over Neo-Tokyo.",
      prompt: "Cinematic 8k, cyberpunk skyline, neon reflections, anamorphic lens, 35mm film grain",
      duration: "5s",
      model: "Runway Gen-3",
      status: "Ready",
    },
    {
      num: 2,
      script: "A drone swarms through the holographic billboards into the lower alleyways.",
      prompt: "FPV drone camera dive, hyper-speed, neon fog, high motion, octane render",
      duration: "5s",
      model: "Kling 1.5",
      status: "Draft",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Storyboard Director Header */}
      <div className="glass-card p-6 rounded-2xl flex items-center justify-between border border-white/5">
        <div>
          <h3 className="text-base font-bold text-white flex items-center gap-2">
            <Film className="w-5 h-5 text-violet-400" /> Multi-Scene AI Film Director
          </h3>
          <p className="text-xs text-slate-400 mt-1">
            Orchestrate multi-shot video generation with Runway Gen-3, Kling 1.5, and ElevenLabs voiceover.
          </p>
        </div>

        <button className="px-4 py-2 bg-violet-600 hover:bg-violet-500 text-white text-xs font-semibold rounded-xl transition shadow-lg shadow-violet-600/20 flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5" /> AI Script-to-Storyboard
        </button>
      </div>

      {/* Scenes Storyboard List */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {scenes.map((s) => (
          <div key={s.num} className="glass-card p-5 rounded-2xl border border-white/5 space-y-4">
            <div className="flex items-center justify-between border-b border-white/5 pb-3">
              <span className="text-xs font-bold text-violet-400 uppercase tracking-wider">
                Scene {s.num} ({s.duration})
              </span>
              <div className="flex items-center gap-2">
                <span className="px-2 py-0.5 rounded-full bg-white/5 text-[10px] font-mono text-slate-300">
                  <Cpu className="w-3 h-3 inline mr-1" /> {s.model}
                </span>
                <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${s.status === 'Ready' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}>
                  {s.status}
                </span>
              </div>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Narration / Script:</p>
              <p className="text-sm text-slate-200 mt-1 italic">"{s.script}"</p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-400">Visual Prompt:</p>
              <p className="text-xs text-slate-300 mt-1 bg-white/5 p-2.5 rounded-lg font-mono">
                {s.prompt}
              </p>
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-white/5">
              <button className="px-3 py-1.5 text-xs text-[#00D4B4] hover:text-indigo-300 flex items-center gap-1">
                <Music className="w-3.5 h-3.5" /> Add Voiceover
              </button>
              <button className="px-3 py-1.5 bg-white/10 hover:bg-white/20 text-white text-xs font-medium rounded-lg transition">
                Render Scene (25 Credits)
              </button>
            </div>
          </div>
        ))}

        {/* Add Scene Card */}
        <button className="border-2 border-dashed border-white/10 hover:border-violet-500/40 rounded-2xl flex flex-col items-center justify-center p-8 transition group min-h-[220px]">
          <Plus className="w-8 h-8 text-slate-500 group-hover:text-violet-400 transition mb-2" />
          <span className="text-sm font-medium text-slate-400 group-hover:text-white transition">
            Add New Scene
          </span>
        </button>
      </div>
    </div>
  );
}
