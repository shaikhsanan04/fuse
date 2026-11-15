import React from 'react';
import { Languages, Cpu, Play, CheckCircle } from 'lucide-react';

export default function TranscriptionConfig({
  language,
  setLanguage,
  model,
  setModel,
  onGenerate,
  isTranscribing,
  progress,
  progressMessage
}) {
  return (
    <div className="w-full max-w-2xl mx-auto mt-6 p-6 rounded-2xl border border-zinc-800 bg-zinc-950/60 backdrop-blur-sm shadow-xl">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
        {/* Language Selection */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
            <Languages className="w-3.5 h-3.5" />
            <span>Spoken Language</span>
          </label>
          <select
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
            disabled={isTranscribing}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all cursor-pointer"
          >
            <option value="auto">Auto Detect Language</option>
            <option value="en">English</option>
            <option value="hi">Hindi (Devanagari script)</option>
            <option value="hinglish">Hinglish (Hindi in Roman script)</option>
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">
            {language === 'hinglish' ? 'Biased towards Roman script (e.g. "Yaar aaj hum...")' : 'Detected automatically or forced'}
          </p>
        </div>

        {/* Model Selection */}
        <div>
          <label className="flex items-center gap-2 text-xs font-medium text-zinc-400 mb-2">
            <Cpu className="w-3.5 h-3.5" />
            <span>Whisper AI Model</span>
          </label>
          <select
            value={model}
            onChange={(e) => setModel(e.target.value)}
            disabled={isTranscribing}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2.5 text-sm text-zinc-200 outline-none transition-all cursor-pointer"
          >
            <option value="tiny">tiny (Ultra fast, lower accuracy)</option>
            <option value="base">base (Fast, good for clean audio)</option>
            <option value="small">small (Recommended: accurate & CPU-friendly)</option>
            <option value="medium">medium (High accuracy, slower on CPU)</option>
            <option value="large-v3-turbo">large-v3-turbo (Turbo large)</option>
            <option value="large-v3">large-v3 (Maximum precision)</option>
          </select>
          <p className="text-[11px] text-zinc-500 mt-1">
            Runs locally on CPU with int8 quantization (zero cloud)
          </p>
        </div>
      </div>

      {/* Progress display */}
      {isTranscribing && (
        <div className="mb-6 space-y-2">
          <div className="flex items-center justify-between text-xs font-mono">
            <span className="text-zinc-400">{progressMessage || 'Processing...'}</span>
            <span className="text-white font-medium">{progress.toFixed(0)}%</span>
          </div>
          <div className="h-1.5 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800/60">
            <div
              className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      )}

      {/* Action Button */}
      <button
        onClick={onGenerate}
        disabled={isTranscribing}
        className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-black bg-white hover:bg-zinc-200 disabled:bg-zinc-800 disabled:text-zinc-500 transition-all shadow-glow hover:shadow-white/20 active:scale-[0.99] cursor-pointer disabled:cursor-not-allowed"
      >
        {isTranscribing ? (
          <>
            <div className="w-4 h-4 border-2 border-zinc-400 border-t-zinc-900 rounded-full animate-spin" />
            <span>Transcribing with Word Timestamps...</span>
          </>
        ) : (
          <>
            <Play className="w-4 h-4 fill-black" />
            <span>Generate Subtitles</span>
          </>
        )}
      </button>
    </div>
  );
}
