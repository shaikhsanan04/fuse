import React from 'react';
import { UploadCloud, Sparkles, Download, Layers, ShieldCheck, Film, FileText, Check } from 'lucide-react';

export default function HowItWorks() {
  return (
    <section className="w-full max-w-5xl mx-auto mt-20 mb-8 px-4" aria-label="How Fuse Works">
      {/* Top Header Badge & Title */}
      <div className="flex flex-col items-center text-center mb-10">
        <div className="flex items-center gap-2 mb-3">
          <div className="w-7 h-7 rounded-full bg-zinc-800 border border-zinc-700/80 flex items-center justify-center shadow-inner">
            <Sparkles className="w-3.5 h-3.5 text-white" />
          </div>
          <div className="w-7 h-7 rounded-full bg-gradient-to-tr from-amber-500/30 to-amber-400/20 border border-amber-500/40 flex items-center justify-center shadow-inner">
            <Film className="w-3.5 h-3.5 text-amber-300" />
          </div>
        </div>

        <h2 className="text-2xl sm:text-3xl font-bold tracking-tight text-white mb-2">
          How <span className="font-serif italic font-normal text-[1.12em] tracking-normal" style={{ fontFamily: '"Instrument Serif", serif' }}>Fuse</span> Works
        </h2>
        <p className="text-xs sm:text-sm text-zinc-400 max-w-md">
          Create studio-grade captioned videos in three simple steps. Fast, offline, and completely private.
        </p>
      </div>

      {/* 3 Step Cards Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Step 1: Upload */}
        <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/40 hover:border-zinc-700/80 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                Step 01
              </span>
              <span className="text-zinc-600 text-xs">01 / 03</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-zinc-100 transition-colors">
              Upload Your Video
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Drag and drop any clip. Speech is extracted and transcribed offline directly on your machine.
            </p>
          </div>

          {/* Inner Visual Mockup */}
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-3 shadow-inner">
            <div className="flex items-center gap-2.5 p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
              <div className="w-8 h-8 rounded-lg bg-zinc-800/90 flex items-center justify-center flex-shrink-0">
                <UploadCloud className="w-4 h-4 text-zinc-300" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="text-xs font-medium text-zinc-200 truncate">clip_reels.mp4</div>
                <div className="text-[10px] text-zinc-500 font-mono">1080 × 1920 • 9:16 Vertical</div>
              </div>
            </div>

            <div className="flex items-center justify-between text-[11px] pt-1 border-t border-zinc-800/60">
              <span className="inline-flex items-center gap-1.5 text-emerald-400 font-medium">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>100% Private & Local</span>
              </span>
              <span className="text-zinc-500 font-mono text-[10px]">MP4, MOV, WebM</span>
            </div>
          </div>
        </div>

        {/* Step 2: Style & Highlight */}
        <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/40 hover:border-zinc-700/80 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-300 border border-amber-500/30">
                Step 02
              </span>
              <span className="text-zinc-600 text-xs">02 / 03</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-zinc-100 transition-colors">
              Style & Highlight
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Mix editorial serif fonts with modern sans, pick presets, and highlight punchy keywords in 1 click.
            </p>
          </div>

          {/* Inner Visual Mockup */}
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-3 shadow-inner">
            {/* Live Typography Preview simulation */}
            <div className="p-2.5 rounded-lg bg-zinc-950/80 border border-zinc-800/70 text-center">
              <span className="text-xs font-bold text-white tracking-tight">Make </span>
              <span className="font-serif italic text-sm text-amber-300 pr-0.5" style={{ fontFamily: '"Instrument Serif", serif' }}>
                captions
              </span>
              <span className="text-xs font-bold text-white tracking-tight"> aesthetic</span>
            </div>

            {/* Quick role pills */}
            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/60 text-[10px]">
              <span className="px-2 py-0.5 rounded bg-zinc-800 text-zinc-300 border border-zinc-700/70">
                Base: Inter
              </span>
              <span className="px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 border border-amber-500/40 font-medium">
                Accent: Serif
              </span>
              <span className="px-2 py-0.5 rounded bg-purple-500/20 text-purple-300 border border-purple-500/30 italic">
                Soft: Italic
              </span>
            </div>
          </div>
        </div>

        {/* Step 3: Export */}
        <div className="group rounded-2xl border border-zinc-800/80 bg-zinc-950/60 hover:bg-zinc-900/40 hover:border-zinc-700/80 p-5 flex flex-col justify-between transition-all duration-300 shadow-xl hover:shadow-2xl">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded-full bg-zinc-900 text-zinc-400 border border-zinc-800">
                Step 03
              </span>
              <span className="text-zinc-600 text-xs">03 / 03</span>
            </div>
            <h3 className="text-base font-semibold text-white mb-1.5 group-hover:text-zinc-100 transition-colors">
              Export Studio Video
            </h3>
            <p className="text-xs text-zinc-400 leading-relaxed mb-5">
              Export high-res video with captions burned into the frame, or download ready-to-use ASS & SRT files.
            </p>
          </div>

          {/* Inner Visual Mockup */}
          <div className="rounded-xl border border-zinc-800/90 bg-zinc-900/60 p-3.5 space-y-3 shadow-inner">
            <div className="flex items-center justify-between p-2 rounded-lg bg-zinc-950/80 border border-zinc-800/70">
              <div className="flex items-center gap-2">
                <div className="w-6 h-6 rounded bg-emerald-500/20 flex items-center justify-center text-emerald-400">
                  <Check className="w-3.5 h-3.5" />
                </div>
                <span className="text-xs font-medium text-zinc-200">Export Ready</span>
              </div>
              <span className="text-[10px] font-mono text-zinc-400">1080p MP4</span>
            </div>

            <div className="flex items-center justify-between gap-1.5 pt-1 border-t border-zinc-800/60 text-[10px]">
              <span className="inline-flex items-center gap-1 text-zinc-300">
                <Download className="w-3 h-3 text-zinc-400" />
                <span>Burned MP4</span>
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <FileText className="w-3 h-3 text-blue-400" />
                <span>.ASS</span>
              </span>
              <span className="inline-flex items-center gap-1 text-zinc-400">
                <FileText className="w-3 h-3 text-amber-400" />
                <span>.SRT</span>
              </span>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
