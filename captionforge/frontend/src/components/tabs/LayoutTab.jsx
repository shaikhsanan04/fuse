import React from 'react';
import { LayoutTemplate, Eye, EyeOff, AlignVerticalSpaceAround, ShieldCheck } from 'lucide-react';

export default function LayoutTab({
  layoutConfig,
  onChangeLayout,
  safeAreaGuides,
  setSafeAreaGuides
}) {
  const handleFieldChange = (key, value) => {
    onChangeLayout({ ...layoutConfig, [key]: value });
  };

  const setWordsMode = (mode) => {
    if (mode === 'short') {
      onChangeLayout({
        ...layoutConfig,
        mode: 'short',
        max_words: 3,
        max_chars: 22,
        max_pause: 0.45
      });
    } else if (mode === 'long') {
      onChangeLayout({
        ...layoutConfig,
        mode: 'long',
        max_words: 7,
        max_chars: 48,
        max_pause: 0.6
      });
    } else {
      onChangeLayout({
        ...layoutConfig,
        mode: 'custom'
      });
    }
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-4 overflow-y-auto">
      {/* Chunking / Words per line */}
      <div>
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300 mb-3">
          <LayoutTemplate className="w-3.5 h-3.5 text-zinc-400" />
          <span>Pacing & Line Length</span>
        </label>

        {/* Mode Selector Buttons */}
        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            onClick={() => setWordsMode('short')}
            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              layoutConfig.mode === 'short'
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Short-form
            <span className="block text-[10px] text-zinc-500 font-normal">Reels & TikTok</span>
          </button>

          <button
            onClick={() => setWordsMode('long')}
            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              layoutConfig.mode === 'long'
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Long-form
            <span className="block text-[10px] text-zinc-500 font-normal">YouTube & Podcasts</span>
          </button>

          <button
            onClick={() => setWordsMode('custom')}
            className={`py-2 px-3 rounded-lg border text-xs font-medium transition-all ${
              layoutConfig.mode === 'custom'
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Custom
            <span className="block text-[10px] text-zinc-500 font-normal">Sliders</span>
          </button>
        </div>

        {/* Detailed sliders */}
        <div className="space-y-3 p-3 rounded-xl border border-zinc-800/80 bg-zinc-950/50">
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span>Max Words Per Line</span>
              <span className="font-mono text-zinc-200">{layoutConfig.max_words || 3} words</span>
            </div>
            <input
              type="range"
              min={1}
              max={10}
              step={1}
              value={layoutConfig.max_words || 3}
              onChange={(e) => handleFieldChange('max_words', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>

          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span>Max Characters Per Line</span>
              <span className="font-mono text-zinc-200">{layoutConfig.max_chars || 24} chars</span>
            </div>
            <input
              type="range"
              min={10}
              max={60}
              step={2}
              value={layoutConfig.max_chars || 24}
              onChange={(e) => handleFieldChange('max_chars', parseInt(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
            />
          </div>
        </div>
      </div>

      {/* Vertical Positioning */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
          <AlignVerticalSpaceAround className="w-3.5 h-3.5 text-zinc-400" />
          <span>Vertical Position</span>
        </label>

        {/* Quick Position Buttons */}
        <div className="grid grid-cols-3 gap-2">
          <button
            onClick={() => handleFieldChange('vertical_margin_pct', 0.18)}
            className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
              Math.abs((layoutConfig.vertical_margin_pct || 0.18) - 0.18) < 0.02
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Bottom (Reels & TikTok)
          </button>

          <button
            onClick={() => handleFieldChange('vertical_margin_pct', 0.42)}
            className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
              Math.abs((layoutConfig.vertical_margin_pct || 0.18) - 0.42) < 0.02
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Center
          </button>

          <button
            onClick={() => handleFieldChange('vertical_margin_pct', 0.08)}
            className={`py-1.5 px-3 rounded-lg border text-xs font-medium transition-all ${
              Math.abs((layoutConfig.vertical_margin_pct || 0.18) - 0.08) < 0.02
                ? 'border-white bg-zinc-900 text-white shadow-glow'
                : 'border-zinc-800 bg-zinc-950/60 text-zinc-400 hover:text-zinc-200'
            }`}
          >
            Lower Third
          </button>
        </div>

        {/* Slider for exact % placement */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Distance From Bottom Edge</span>
            <span className="font-mono text-zinc-200">
              {Math.round((layoutConfig.vertical_margin_pct || 0.18) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.05}
            max={0.55}
            step={0.01}
            value={layoutConfig.vertical_margin_pct || 0.18}
            onChange={(e) => handleFieldChange('vertical_margin_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Safe Area Guides Toggle */}
      <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-950/60 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <div>
            <span className="text-xs text-zinc-200 font-medium block">Social Media Safe Area</span>
            <span className="text-[10px] text-zinc-500">Guides for TikTok, Reels, and YouTube Shorts</span>
          </div>
        </div>
        <button
          onClick={() => setSafeAreaGuides(!safeAreaGuides)}
          className={`px-3 py-1 rounded-md text-xs font-medium transition-all cursor-pointer ${
            safeAreaGuides
              ? 'bg-zinc-800 text-white border border-zinc-700'
              : 'bg-zinc-900 text-zinc-400 hover:text-white border border-zinc-800'
          }`}
        >
          {safeAreaGuides ? 'Visible' : 'Hidden'}
        </button>
      </div>
    </div>
  );
}
