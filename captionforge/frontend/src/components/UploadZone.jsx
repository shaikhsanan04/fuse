import React, { useState, useRef } from 'react';
import { UploadCloud, Film, CheckCircle2, AlertCircle } from 'lucide-react';

export default function UploadZone({ onFileSelect, isUploading, metadata }) {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef(null);

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragOver(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragOver(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        onFileSelect(file);
      }
    }
  };

  const handleFileInput = (e) => {
    if (e.target.files && e.target.files.length > 0) {
      onFileSelect(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto">
      <div
        onDragOver={handleDragOver}
        onDragLeave={handleDragLeave}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative group cursor-pointer rounded-2xl border-2 border-dashed p-10 text-center transition-all duration-200 ${
          isDragOver
            ? 'border-white bg-zinc-900/60 shadow-glow'
            : 'border-zinc-800 hover:border-zinc-700 bg-zinc-950/40 hover:bg-zinc-900/30'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="video/*"
          className="hidden"
          onChange={handleFileInput}
          disabled={isUploading}
        />

        <div className="flex flex-col items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-zinc-900 border border-zinc-800 flex items-center justify-center text-zinc-400 group-hover:text-white group-hover:scale-105 transition-all shadow-inner">
            <UploadCloud className="w-7 h-7" />
          </div>

          <div>
            <h3 className="text-base font-semibold text-white mb-1">
              Upload your video
            </h3>
            <p className="text-xs text-zinc-400">
              Drag and drop or browse files • MP4, MOV, WebM, MKV
            </p>
          </div>

          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300">
            <Film className="w-3.5 h-3.5" />
            <span>Choose a video</span>
          </div>
        </div>

        {isUploading && (
          <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm rounded-2xl flex flex-col items-center justify-center gap-3">
            <div className="w-6 h-6 border-2 border-white/20 border-t-white rounded-full animate-spin" />
            <span className="text-xs text-zinc-300">Uploading video...</span>
          </div>
        )}
      </div>

      {metadata && (
        <div className="mt-4 p-4 rounded-xl border border-zinc-800/80 bg-zinc-900/40 backdrop-blur flex items-center justify-between text-xs font-mono">
          <div className="flex items-center gap-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <span className="text-zinc-200 font-medium truncate max-w-xs">{metadata.filename}</span>
          </div>
          <div className="flex items-center gap-4 text-zinc-400">
            <span>{metadata.width} × {metadata.height}</span>
            <span>{metadata.duration?.toFixed(1)}s</span>
            <span>{metadata.fps} fps</span>
          </div>
        </div>
      )}
    </div>
  );
}
