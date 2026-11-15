import React, { useState } from 'react';
import { Download, Film, FileText, CheckCircle2, X, FolderOpen, Play, Save, HardDrive, Loader2 } from 'lucide-react';

export default function ExportModal({
  isOpen,
  onClose,
  isRendering,
  renderProgress,
  renderMessage,
  downloadUrl,
  assContent,
  videoFilename,
  transcript,
  jobId
}) {
  const [isSaving, setIsSaving] = useState(false);
  const [savedInfo, setSavedInfo] = useState(null);
  const [saveError, setSaveError] = useState(null);

  if (!isOpen) return null;

  // Native OS Save As Dialog (prompts user to choose folder and filename)
  const handleSaveAs = async () => {
    if (!jobId) {
      handleBrowserBlobDownload();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/save-video/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'saved') {
        setSavedInfo(data);
      } else if (data.status === 'error') {
        setSaveError(data.message || 'Failed to save file');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to connect to backend');
      handleBrowserBlobDownload();
    } finally {
      setIsSaving(false);
    }
  };

  // Instant 1-click Quick Save to Downloads folder
  const handleQuickSave = async () => {
    if (!jobId) {
      handleBrowserBlobDownload();
      return;
    }
    setIsSaving(true);
    setSaveError(null);
    try {
      const res = await fetch(`/api/quick-save-video/${jobId}`, { method: 'POST' });
      const data = await res.json();
      if (data.status === 'saved') {
        setSavedInfo(data);
      } else if (data.status === 'error') {
        setSaveError(data.message || 'Failed to save to Downloads');
      }
    } catch (err) {
      setSaveError(err.message || 'Failed to connect to backend');
      handleBrowserBlobDownload();
    } finally {
      setIsSaving(false);
    }
  };

  // Highlight file in Windows File Explorer
  const handleReveal = async () => {
    if (!savedInfo?.path) return;
    try {
      await fetch('/api/reveal-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savedInfo.path }),
      });
    } catch (err) {
      console.error('Failed to reveal file:', err);
    }
  };

  // Open file with default Windows Media Player
  const handleOpenFile = async () => {
    if (!savedInfo?.path) return;
    try {
      await fetch('/api/open-file', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ path: savedInfo.path }),
      });
    } catch (err) {
      console.error('Failed to open file:', err);
    }
  };

  // Direct Browser Blob Download Fallback
  const handleBrowserBlobDownload = async () => {
    if (!downloadUrl) return;
    try {
      const res = await fetch(downloadUrl);
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `${videoFilename?.replace(/\.[^/.]+$/, '') || 'video'}_captioned.mp4`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(() => URL.revokeObjectURL(url), 5000);
    } catch (err) {
      console.error('Blob download failed', err);
    }
  };

  // Subtitle exports
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
      <div className="w-full max-w-lg rounded-2xl border border-zinc-800 bg-zinc-950 p-6 shadow-2xl relative animate-in fade-in zoom-in-95 duration-200">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-zinc-500 hover:text-zinc-200 transition-colors p-1"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-base font-semibold text-white mb-1">Export Captioned Video</h3>
        <p className="text-xs text-zinc-400 mb-5">
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
          <div className="space-y-4 py-1">
            <div className="p-3.5 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
              <div>
                <div className="text-xs font-medium text-emerald-300">Rendering Complete</div>
                <div className="text-[11px] text-zinc-400">Your captioned video has been compiled and is ready to save.</div>
              </div>
            </div>

            {/* If video has been saved */}
            {savedInfo ? (
              <div className="p-3.5 rounded-xl bg-blue-500/10 border border-blue-500/20 space-y-3">
                <div className="flex items-start gap-2.5">
                  <CheckCircle2 className="w-4 h-4 text-blue-400 shrink-0 mt-0.5" />
                  <div className="min-w-0 flex-1">
                    <div className="text-xs font-medium text-blue-200 truncate">{savedInfo.filename}</div>
                    <div className="text-[10px] text-zinc-400 truncate font-mono mt-0.5" title={savedInfo.path}>
                      {savedInfo.path}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={handleOpenFile}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-500 text-white text-xs font-medium transition-all shadow-sm cursor-pointer"
                  >
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Play Video</span>
                  </button>
                  <button
                    onClick={handleReveal}
                    className="flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors border border-zinc-700 cursor-pointer"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Show in Folder</span>
                  </button>
                </div>
              </div>
            ) : null}

            {saveError && (
              <div className="p-2.5 rounded-lg bg-red-500/10 border border-red-500/20 text-xs text-red-400">
                {saveError}
              </div>
            )}

            {/* Save Buttons */}
            <div className="space-y-2">
              <button
                onClick={handleSaveAs}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-medium text-sm text-black bg-white hover:bg-zinc-200 active:scale-[0.99] transition-all shadow-glow hover:shadow-white/20 cursor-pointer disabled:opacity-50"
              >
                {isSaving ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <Save className="w-4 h-4" />
                )}
                <span>Save Captioned Video As...</span>
              </button>

              <button
                onClick={handleQuickSave}
                disabled={isSaving}
                className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl font-medium text-xs text-zinc-200 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 transition-colors cursor-pointer disabled:opacity-50"
              >
                <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                <span>Quick Save to Downloads Folder</span>
              </button>
            </div>

            <div className="text-center pt-1">
              <button
                onClick={handleBrowserBlobDownload}
                className="text-[11px] text-zinc-500 hover:text-zinc-300 underline transition-colors cursor-pointer"
              >
                Or download directly via browser
              </button>
            </div>

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