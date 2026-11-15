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

  // Store active video dimensions (from metadata or natural video size)
  const [videoDims, setVideoDims] = useState({
    width: videoMetadata?.width || 1080,
    height: videoMetadata?.height || 1920
  });

  useEffect(() => {
    if (videoMetadata?.width && videoMetadata?.height) {
      setVideoDims({
        width: videoMetadata.width,
        height: videoMetadata.height
      });
    }
  }, [videoMetadata]);

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

    const w = videoMetadata?.width || video.videoWidth || 1080;
    const h = videoMetadata?.height || video.videoHeight || 1920;
    setVideoDims({ width: w, height: h });

    setTimeout(() => {
      jassubRef.current?.resize();
    }, 60);
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

  // Determine whether video is 9:16 vertical or 16:9 horizontal
  const isVertical = (videoDims.height || 1920) > (videoDims.width || 1080);

  return (
    <div className="flex flex-col w-fit bg-zinc-950 rounded-2xl border border-zinc-800/80 overflow-hidden shadow-2xl select-none">
      {/* Top Bar with Safe-Area Toggle */}
      <div className="h-9 px-3 border-b border-zinc-800/80 bg-zinc-900/50 flex items-center justify-between text-xs text-zinc-400 gap-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-zinc-300">Live Preview</span>
          <span className="text-[10px] px-1.5 py-0.5 rounded bg-zinc-800 text-zinc-400 font-mono">
            {isVertical ? '9:16' : '16:9'}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setSafeAreaGuides(!safeAreaGuides)}
            className={`flex items-center gap-1.5 px-2 py-0.5 rounded text-xs transition-all cursor-pointer ${
              safeAreaGuides
                ? 'bg-zinc-800 text-zinc-200 border border-zinc-700'
                : 'text-zinc-500 hover:text-zinc-300'
            }`}
            title="Toggle Social Media Safe Area Guide"
          >
            {safeAreaGuides ? <Eye className="w-3.5 h-3.5 text-blue-400" /> : <EyeOff className="w-3.5 h-3.5" />}
            <span className="text-[11px]">Safe Area</span>
          </button>
        </div>
      </div>

      {/* Main Video Viewport - Exactly fits aspect ratio and screen height */}
      <div
        ref={containerRef}
        className="relative bg-black flex items-center justify-center overflow-hidden"
      >
        <div
          className="relative flex items-center justify-center bg-black overflow-hidden"
          style={
            isVertical
              ? {
                  height: 'min(calc(100vh - 12.5rem), 540px)',
                  aspectRatio: '9 / 16'
                }
              : {
                  height: 'min(calc(100vh - 13.5rem), 380px)',
                  aspectRatio: '16 / 9'
                }
          }
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

          {/* Social Media Safe Area Viewfinder Guide (Shown for vertical 9:16 videos) */}
          {safeAreaGuides && isVertical && (
            <div className="absolute inset-0 pointer-events-none z-30 select-none">
              <div className="absolute top-[14%] left-[6%] right-[18%] bottom-[22%] border border-dashed border-white/35 rounded-xl flex items-end justify-end p-1.5">
                <span className="text-[9px] text-white/60 bg-black/70 px-1.5 py-0.5 rounded backdrop-blur-sm">
                  Safe Area
                </span>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Modern Compact Player Controls */}
      <div className="p-2.5 border-t border-zinc-800/80 bg-zinc-950 flex flex-col gap-1.5">
        {/* Scrubbing timeline */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono text-zinc-400 w-8 text-right">
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
          <span className="text-[10px] font-mono text-zinc-500 w-8">
            {formatTime(duration)}
          </span>
        </div>

        {/* Buttons row */}
        <div className="flex items-center justify-between pt-0.5">
          <div className="flex items-center gap-1.5">
            <button
              onClick={togglePlay}
              className="w-7 h-7 rounded-lg bg-white hover:bg-zinc-200 text-black flex items-center justify-center transition-all shadow-glow hover:shadow-white/20 active:scale-95 cursor-pointer"
              title={isPlaying ? 'Pause' : 'Play'}
            >
              {isPlaying ? <Pause className="w-3.5 h-3.5 fill-black" /> : <Play className="w-3.5 h-3.5 fill-black ml-0.5" />}
            </button>

            <button
              onClick={() => {
                if (videoRef.current) {
                  videoRef.current.currentTime = 0;
                  setLocalTime(0);
                  jassubRef.current?.resize();
                }
              }}
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 cursor-pointer"
              title="Restart"
            >
              <RotateCcw className="w-3 h-3" />
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={toggleMute}
              className="w-7 h-7 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-white flex items-center justify-center transition-all border border-zinc-800 cursor-pointer"
              title={isMuted ? 'Unmute' : 'Mute'}
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
