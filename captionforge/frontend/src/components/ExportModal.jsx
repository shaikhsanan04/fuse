import React from 'react';
import { Download, Film, FileText, CheckCircle2, X } from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  isRendering,
  renderProgress,
  renderMessage,
  downloadUrl,
  assContent,
  videoFilename,
  transcript
}) {
  if (!isOpen) return null;

  // Generate SRT from transcript words/segments
  const handleDownloadSRT = () => {
    if (!transcript || !transcript.segments) return;
    let srtText = '';
    transcript.segments.forEach((seg, idx) => {
      const formatSrtTime = (sec) => {
        const h = Math.floor(sec / 3600);
        const m = Math.floor((sec % 3600) / 60);
        const s = Math.floor(sec % 60);
        const ms = Math.floor((sec - Math.floor(sec)) * 1000);
        return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
      };
      srtText += `${idx + 1}\n`;
      srtText += `${formatSrtTime(seg.start)} --> ${formatSrtTime(seg.end)}\n`;
      srtText += `${seg.text}\n\n`;
    });

    const blob = new Blob([srtText], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFilename?.replace(/\.[^/.]+$/, '') || 'captions'}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadASS = () => {
    if (!assContent) return;
    const blob = new Blob([assContent], { type: 'text/plain;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${videoFilename?.replace(/\.[^/.]+$/, '') || 'captions'}.ass`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-semibold text-white mb-1">Export Captioned Video</h3>
        <p className="text-xs text-zinc-400 mb-6">
          High-definition video export with your customized captions
        </p>

        {isRendering ? (
          <div className="space-y-4 py-4">
            <div className="flex items-center justify-between text-xs font-mono">
              <span className="text-zinc-400">{renderMessage || 'Rendering...'}</span>
              <span className="text-white font-medium">{renderProgress.toFixed(0)}%</span>
            </div>

            <div className="h-2 w-full bg-zinc-900 rounded-full overflow-hidden border border-zinc-800">
              <div
                className="h-full bg-gradient-to-r from-blue-500 to-indigo-500 transition-all duration-300 rounded-full"
                style={{ width: `${renderProgress}%` }}
              />
            </div>

            <p className="text-[11px] text-zinc-500 text-center">
              Rendering video frames and applying caption typography...
            </p>
          </div>
        ) : downloadUrl ? (
          <div className="space-y-4 py-2">
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-emerald-300">Rendering Complete</div>
                <div className="text-[11px] text-zinc-400">Your captioned video is ready to download.</div>
              </div>
            </div>

            <a
              href={downloadUrl}
              download
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-black bg-white hover:bg-zinc-200 transition-all shadow-glow hover:shadow-white/20 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              <span>Download MP4 Video</span>
            </a>

            <div className="pt-3 border-t border-zinc-800/80">
              <span className="text-[11px] text-zinc-400 block mb-2">Export Subtitle Files</span>
              <div className="grid grid-cols-2 gap-2">
                <button
                  onClick={handleDownloadASS}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-blue-400" />
                  <span>Subtitles (.ass)</span>
                </button>
                <button
                  onClick={handleDownloadSRT}
                  className="flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg border border-zinc-800 bg-zinc-900 hover:bg-zinc-800 text-xs text-zinc-300 hover:text-white transition-colors cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 text-amber-400" />
                  <span>Captions (.srt)</span>
                </button>
              </div>
            </div>
          </div>
        ) : null}
      </div>
    </div>
  );
}
