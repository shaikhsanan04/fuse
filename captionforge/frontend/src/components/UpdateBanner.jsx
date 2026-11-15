import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, X, ExternalLink } from 'lucide-react';

export default function UpdateBanner() {
  const [updateInfo, setUpdateInfo] = useState(null);
  const [isDismissed, setIsDismissed] = useState(false);

  useEffect(() => {
    // Check for updates on startup
    const checkForUpdates = async () => {
      try {
        const res = await fetch('/api/version');
        if (!res.ok) return;
        const data = await res.json();
        
        if (data && data.update_available) {
          // Check if this specific version was dismissed in this session
          const dismissedVersion = sessionStorage.getItem('fuse_dismissed_update');
          if (dismissedVersion !== data.latest_version) {
            setUpdateInfo(data);
          }
        }
      } catch (err) {
        // Silently fail if offline or backend is booting
      }
    };

    checkForUpdates();
  }, []);

  const handleUpdateClick = async () => {
    if (!updateInfo) return;
    const targetUrl = updateInfo.download_url || updateInfo.release_url;
    try {
      await fetch('/api/open-external-url', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: targetUrl }),
      });
    } catch {
      window.open(targetUrl, '_blank');
    }
  };

  const handleDismiss = () => {
    if (updateInfo) {
      sessionStorage.setItem('fuse_dismissed_update', updateInfo.latest_version);
    }
    setIsDismissed(true);
  };

  if (!updateInfo || !updateInfo.update_available || isDismissed) {
    return null;
  }

  return (
    <div className="w-full bg-gradient-to-r from-amber-500/15 via-orange-500/15 to-amber-500/15 border-b border-amber-500/30 px-4 py-2 flex items-center justify-between text-xs animate-in fade-in slide-in-from-top-1 duration-300">
      <div className="flex items-center gap-2.5 min-w-0">
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-amber-500/20 text-amber-400">
          <Sparkles className="w-3 h-3" />
        </span>
        <div className="text-zinc-200 truncate">
          <span className="font-semibold text-white">⚡ Fuse v{updateInfo.latest_version} is available!</span>
          <span className="text-zinc-400 ml-2 hidden sm:inline">
            A new version with features and improvements is ready.
          </span>
        </div>
      </div>

      <div className="flex items-center gap-2 shrink-0">
        <button
          onClick={handleUpdateClick}
          className="flex items-center gap-1.5 px-3 py-1 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-semibold text-[11px] transition-all shadow-sm cursor-pointer"
        >
          <span>Update Now</span>
          <ArrowRight className="w-3 h-3" />
        </button>

        <button
          onClick={handleDismiss}
          title="Dismiss notification"
          className="p-1 rounded-md text-zinc-400 hover:text-white hover:bg-white/10 transition-colors cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}