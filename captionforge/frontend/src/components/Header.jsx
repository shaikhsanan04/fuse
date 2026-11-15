import React from 'react';
import { Sparkles, Video, RefreshCw, Cpu } from 'lucide-react';

export default function Header({ status, onReset, activeJob }) {
  return (
    <header className="h-14 border-b border-zinc-800/80 bg-zinc-950/80 backdrop-blur-md sticky top-0 z-40 px-6 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-zinc-800 to-zinc-700 flex items-center justify-center border border-zinc-700/60 shadow-inner">
          <Sparkles className="w-4 h-4 text-white" />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm tracking-tight text-white">CaptionForge</span>
            <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 border border-zinc-700/50">
              Local AI
            </span>
          </div>
        </div>
      </div>

      <div className="flex items-center gap-4">
        {status && (
          <div className="flex items-center gap-2 text-xs font-mono text-zinc-400">
            <span className={`w-2 h-2 rounded-full ${
              status.includes('fail') || status.includes('error') ? 'bg-red-500' :
              status.includes('transcrib') || status.includes('render') ? 'bg-blue-400 animate-pulse' :
              'bg-emerald-400'
            }`} />
            <span>{status}</span>
          </div>
        )}

        {activeJob && (
          <button
            onClick={onReset}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-medium text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 transition-all"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>New Video</span>
          </button>
        )}
      </div>
    </header>
  );
}
