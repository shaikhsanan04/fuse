import React, { useEffect, useRef, useState } from 'react';
import JASSUB from 'jassub';
import jassubWorkerUrl from 'jassub/dist/worker/worker.js?worker&url';
import {
  Play, Pause, Volume2, VolumeX, RotateCcw,
  Eye, EyeOff
} from 'lucide-react';

export default function VideoPlayerPreview({
  videoUrl,
  assContent,
  fonts,
  safeAreaGuides,
  setSafeAreaGuides,
  currentTime,
  onTimeUpdate,
  seekTime,
  videoMetadata
}) {
  const videoRef = useRef(null);
  const containerRef = useRef(null);
  const jassubRef = useRef(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [duration, setDuration] = useState(0);
  const [localTime, setLocalTime] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [jassubReady, setJassubReady] = useState(false);

  // Initialize or re-create JASSUB when video or track changes
  useEffect(() => {
    const video = videoRef.current;
    if (!video || !assContent) return;

    let isDisposed = false;

    const setupJassub = async () => {
      // If instance exists, simply update the subtitle track
      if (jassubRef.current) {
        try {
          await jassubRef.current.setTrack(assContent);
          await jassubRef.current.resize();
          return;
        } catch (e) {
          console.warn('[JASSUB] setTrack failed, recreating instance:', e);
          try {
            await jassubRef.current.destroy();
          } catch (_) {}
          jassubRef.current = null;
        }
      }

      if (isDisposed) return;

      try {
        const fontUrls = (fonts || []).map((f) => f.url);

        const instance = new JASSUB({
          video: video,
          subContent: assContent,
          fonts: fontUrls,
          workerUrl: jassubWorkerUrl,
          wasmUrl: '/api/jassub/wasm/jassub-worker.wasm',
          modernWasmUrl: '/api/jassub/wasm/jassub-worker-modern.wasm',
          wasmWorkerUrl: '/api/jassub/wasm/jassub-worker.js',
          modernWasmWorkerUrl: '/api/jassub/wasm/jassub-worker-modern.js',
          availableFonts: {
            'liberation sans': '/api/jassub/default.woff2',
          },
          debug: false,
        });

        jassubRef.current = instance;

        await instance.ready;
        if (!isDisposed && jassubRef.current === instance) {
          setJassubReady(true);
          await instance.resize();
          console.log('[JASSUB] Live preview WASM renderer initialized successfully.');
        }
      } catch (err) {
        console.error('[JASSUB] Initialization failed:', err);
      }
    };

    setupJassub();

    return () => {
      isDisposed = true;
    };
  }, [videoUrl, assContent, fonts]);

  // Clean up on unmount or video change
  useEffect(() => {
    return () => {
      if (jassubRef.current) {
        try {
          jassubRef.current.destroy();
        } catch (_) {}
        jassubRef.current = null;
      }
    };
  }, [videoUrl]);

  // Handle external seek requests
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && videoRef.current) {
      videoRef.current.currentTime = seekTime;
      setLocalTime(seekTime);
      jassubRef.current?.resize();
    }
  }, [seekTime]);

  // Sync canvas size whenever container resizes or video loads metadata
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    const handleResize = () => {
      if (jassubRef.current) {
        jassubRef.current.resize();
      }
    };

    video.addEventListener('loadedmetadata', handleResize);
    video.addEventListener('canplay', handleResize);
    video.addEventListener('play', handleResize);
    window.addEventListener('resize', handleResize);

    return () => {
      video.removeEventListener('loadedmetadata', handleResize);
      video.removeEventListener('canplay', handleResize);
      video.removeEventListener('play', handleResize);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const togglePlay = () => {
    const video = videoRef.current;
    if (!video) return;
    if (video.paused) {
      video.play();
      setIsPlaying(true);
    } else {
      video.pause();
      setIsPlaying(false);
    }
    jassubRef.current?.resize();
  };

  const handleTimeUpdate = () => {
    const video = videoRef.current;
    if (!video) return;
    setLocalTime(video.currentTime);
    if (onTimeUpdate) {
      onTimeUpdate(video.currentTime);
    }
  };

  const handleLoadedMetadata = () => {
    const video = videoRef.current;
    if (!video) return;
    setDuration(video.duration || 0);
    jassubRef.current?.resize();
  };

  const handleScrub = (e) => {
    const video = videoRef.current;
    if (!video) return;
    const newTime = parseFloat(e.target.value);
    video.currentTime = newTime;
    setLocalTime(newTime);
    jassubRef.current?.resize();
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    video.muted = !isMuted;
    setIsMuted(!isMuted);
  };

  const formatTime = (seconds) => {
    if (isNaN(seconds)) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  };

  const isVertical = (videoMetadata?.height || 1080) > (videoMetadata?.width || 1920);

  return (
    <div className="flex flex-col h-full bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl">
      {/* Top Bar with Safe-Area Toggle & Controls */}
      <div className="h-10 px-4 border-b border-zinc-800/80 bg-zinc-900/40 flex items-center justify-between text-xs text-zinc-400">
        <div className="flex items-center gap-2">
          <span className="font-mono text-zinc-300">Live ASS Preview</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            libass WASM
          </span>
          {jassubReady && (
            <span className="inline-flex items-center gap-1 text-[10px] text-emerald-400 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span>Active</span>
            </span>
          )}
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              if (jassubRef.current) {
                jassubRef.current.resize(true);
              }
            }}
            className="text-[11px] font-mono text-zinc-400 hover:text-zinc-200 px-2 py-0.5 rounded hover:bg-zinc-800 transition-colors"
            title="Force redraw canvas"
          >
            Redraw
          </button>

          <button
            onClick={() => setSafeAreaGuides(!safeAreaGuides)}
            className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-mono transition-all cursor-pointer ${
              safeAreaGuides
                ? 'bg-blue-500/20 text-blue-400 border border-blue-500/30'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle TikTok / Reels UI Safe-Area Overlay"
          >
            {safeAreaGuides ? <Eye className="w-3.5 h-3.5" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span>Safe Area</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport */}
      <div
        ref={containerRef}
        className="relative flex-1 bg-black flex items-center justify-center overflow-hidden"
      >
        <div
          className={`relative ${
            isVertical ? 'h-full max-w-[420px] aspect-[9/16]' : 'w-full max-h-[540px] aspect-video'
          } flex items-center justify-center`}
        >
          <video
            ref={videoRef}
            src={videoUrl}
            onTimeUpdate={handleTimeUpdate}
            onLoadedMetadata={handleLoadedMetadata}
            onPlay={() => {
              setIsPlaying(true);
              jassubRef.current?.resize();
            }}
            onPause={() => {
              setIsPlaying(false);
              jassubRef.current?.resize();
            }}
            playsInline
            crossOrigin="anonymous"
            className="w-full h-full object-contain cursor-pointer select-none"
            onClick={togglePlay}
          />

          {/* TikTok / Reels UI Overlay Guides */}
          {safeAreaGuides && (
            <div className="absolute inset-0 pointer-events-none z-30 select-none">
              {/* Top Header Exclusion Zone */}
              <div className="absolute top-0 left-0 right-0 h-[14%] border-b border-dashed border-red-500/40 bg-red-500/5 flex items-start justify-center pt-2">
                <span className="text-[10px] font-mono text-red-400/80 bg-black/60 px-2 py-0.5 rounded">
                  Top UI Zone (Header / Notches)
                </span>
              </div>

              {/* Right Side Buttons Exclusion Zone */}
              <div className="absolute top-[20%] right-0 bottom-[20%] w-[18%] border-l border-dashed border-red-500/40 bg-red-500/5 flex items-center justify-center">
                <span className="text-[10px] font-mono text-red-400/80 bg-black/60 px-1 py-1 rounded rotate-90">
                  Icons Zone
                </span>
              </div>

              {/* Bottom Caption & Audio Title Exclusion Zone */}
              <div className="absolute bottom-0 left-0 right-0 h-[22%] border-t border-dashed border-red-500/40 bg-red-500/5 flex items-end justify-center pb-2">
                <span className="text-[10px] font-mono text-red-400/80 bg-black/60 px-2 py-0.5 rounded">
                  Bottom UI Zone (Captions / Sound / Navigation)
                </span>
              </div>

              {/* Golden Safe Content Zone */}
              <div className="absolute top-[16%] left-[6%] right-[20%] bottom-[24%] border border-dashed border-emerald-400/50 rounded flex items-center justify-center">
                <span className="text-[9px] font-mono text-emerald-400/60 bg-black/60 px-1.5 py-0.5 rounded">
                  Safe Zone
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Vercel Player Controls */}
      <div className="p-3 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-2">
        {/* Scrubbing timeline */}
        <div className="flex items-center gap-3">
          <span className="text-[11px] font-mono text-zinc-400 w-10 text-right">
            {formatTime(localTime)}
          </span>
          <input
            type="range"
            min={0}
            max={duration || 1}
            step={0.05}
            value={localTime}
            onChange={handleScrub}
            className="flex-1 h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white hover:bg-zinc-700 transition-all"
          />
          <span className="text-[11px] font-mono text-zinc-500 w-10">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between pt-1">
          <div className="flex items-center gap-2">
            <button
              onClick={togglePlay}
              className="w-8 h-8 rounded-lg bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all shadow-glow hover:shadow-white/20 active:scale-95 cursor-pointer"
            >
              {isPlaying ? <Pause className="w-4 h-4 fill-black" /> : <Play className="w-4 h-4 fill-black ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setLocalTime(0);
                  jassubRef.current?.resize();
                }
              }}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={toggleMute}
              className="w-8 h-8 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
