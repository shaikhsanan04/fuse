import React, { useState, useEffect, useRef } from 'react';
import Header from './components/Header';
import UploadZone from './components/UploadZone';
import TranscriptionConfig from './components/TranscriptionConfig';
import VideoPlayerPreview from './components/VideoPlayerPreview';
import TranscriptTab from './components/tabs/TranscriptTab';
import StyleTab from './components/tabs/StyleTab';
import LayoutTab from './components/tabs/LayoutTab';
import ExportModal from './components/ExportModal';
import Toast from './components/Toast';
import { FileText, Palette, LayoutTemplate, Download } from 'lucide-react';

// Helper: Convert ASS &HAABBGGRR / &HBBGGRR format to CSS Hex #RRGGBB
function assColorToHex(assStr, defaultHex = '#FFFFFF') {
  if (!assStr) return defaultHex;
  if (assStr.startsWith('#')) return assStr;
  if (assStr.startsWith('&H') || assStr.startsWith('&h')) {
    const raw = assStr.replace(/^&[Hh]/, '').replace(/&$/, '');
    if (raw.length === 6) {
      // BBGGRR -> #RRGGBB
      const b = raw.slice(0, 2);
      const g = raw.slice(2, 4);
      const r = raw.slice(4, 6);
      return `#${r}${g}${b}`;
    } else if (raw.length === 8) {
      // AABBGGRR -> #RRGGBB
      const b = raw.slice(2, 4);
      const g = raw.slice(4, 6);
      const r = raw.slice(6, 8);
      return `#${r}${g}${b}`;
    }
  }
  return defaultHex;
}

export default function App() {
  // Global App States
  const [activeJob, setActiveJob] = useState(null);
  const [videoMetadata, setVideoMetadata] = useState(null);
  const [videoUrl, setVideoUrl] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  // Transcription States
  const [language, setLanguage] = useState('auto');
  const [model, setModel] = useState('small');
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [transcribeProgress, setTranscribeProgress] = useState(0);
  const [transcribeMessage, setTranscribeMessage] = useState('');
  const [transcript, setTranscript] = useState(null);

  // Style & Layout States
  const [styles, setStyles] = useState([]);
  const [fonts, setFonts] = useState([]);
  const [selectedStyleId, setSelectedStyleId] = useState('aesthetic_editorial');
  const [styleConfig, setStyleConfig] = useState({
    font: 'Montserrat',
    font_size_pct: 0.058,
    primary_color: '#FFFFFF',
    highlight_color: '#A8D4FF',
    outline_color: '#000000',
    outline_width_pct: 0.015,
    shadow_color: '#000000',
    shadow_depth_pct: 0.045,
    spacing: -2,
    blur: 2.5,
    editorial_top_scale: 75,
    editorial_hero_scale: 140,
    uppercase: false,
    animation_type: 'editorial'
  });
  const [layoutConfig, setLayoutConfig] = useState({
    mode: 'short',
    max_words: 4,
    max_chars: 28,
    max_pause: 0.45,
    vertical_margin_pct: 0.22
  });

  // UI & Live Preview States
  const [activeTab, setActiveTab] = useState('transcript');
  const [safeAreaGuides, setSafeAreaGuides] = useState(true);
  const [assContent, setAssContent] = useState('');
  const [currentTime, setCurrentTime] = useState(0);
  const [seekTime, setSeekTime] = useState(null);

  // Render & Export States
  const [isRendering, setIsRendering] = useState(false);
  const [renderProgress, setRenderProgress] = useState(0);
  const [renderMessage, setRenderMessage] = useState('');
  const [downloadUrl, setDownloadUrl] = useState(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);

  // Toast Notification
  const [toast, setToast] = useState(null);
  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Load initial styles and fonts from backend
  useEffect(() => {
    fetch('/api/styles')
      .then((res) => res.json())
      .then((data) => setStyles(data))
      .catch((err) => console.error('Failed to load styles:', err));

    fetch('/api/fonts')
      .then((res) => res.json())
      .then((data) => setFonts(data))
      .catch((err) => console.error('Failed to load fonts:', err));
  }, []);

  // Handle Video Upload
  const handleFileUpload = async (file) => {
    setIsUploading(true);
    const formData = new FormData();
    formData.append('file', file);

    try {
      const res = await fetch('/api/upload', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.detail || 'Upload failed');
      }

      const data = await res.json();
      setActiveJob(data.job_id);
      setVideoMetadata(data.metadata);
      setVideoUrl(`/api/video/${data.job_id}`);

      // Auto-enable safe-area guides if vertical (9:16)
      const isVertical = (data.metadata.height || 1080) > (data.metadata.width || 1920);
      setSafeAreaGuides(isVertical);

      showToast(`Uploaded ${data.metadata.filename || 'video'} (${data.metadata.width}x${data.metadata.height})`);
    } catch (err) {
      showToast(err.message || 'Failed to upload video', 'error');
    } finally {
      setIsUploading(false);
    }
  };

  // Handle Transcription
  const handleStartTranscription = async () => {
    if (!activeJob) return;
    setIsTranscribing(true);
    setTranscribeProgress(0);
    setTranscribeMessage('Initializing Whisper engine...');

    try {
      const res = await fetch(`/api/transcribe/${activeJob}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ language, model }),
      });

      if (!res.ok) {
        throw new Error('Failed to initiate transcription');
      }

      // Connect to SSE stream
      const eventSource = new EventSource(`/api/progress/${activeJob}`);

      eventSource.onmessage = async (e) => {
        try {
          const event = JSON.parse(e.data);
          setTranscribeProgress(event.progress || 0);
          setTranscribeMessage(event.message || '');

          if (event.stage === 'ready' || event.stage === 'completed') {
            eventSource.close();
            setIsTranscribing(false);
            showToast('Transcription completed!');

            // Fetch transcript data
            const trRes = await fetch(`/api/transcript/${activeJob}`);
            const trData = await trRes.json();
            setTranscript(trData);

            // Fetch initial ASS content immediately
            const assRes = await fetch(`/api/ass/${activeJob}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                style_id: selectedStyleId,
                font: styleConfig.font,
                overrides: {
                  ...styleConfig,
                  vertical_margin_pct: layoutConfig.vertical_margin_pct,
                },
                grouping: layoutConfig,
              }),
            });
            if (assRes.ok) {
              const assData = await assRes.json();
              setAssContent(assData.ass_content);
            }
          } else if (event.stage === 'error') {
            eventSource.close();
            setIsTranscribing(false);
            showToast(event.error || 'Transcription failed', 'error');
          }
        } catch (parseErr) {
          console.error('Error parsing SSE event:', parseErr);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsTranscribing(false);
      };
    } catch (err) {
      setIsTranscribing(false);
      showToast(err.message || 'Transcription request failed', 'error');
    }
  };

  // Handle Preset Selection
  const handleSelectPreset = (presetId) => {
    setSelectedStyleId(presetId);
    const preset = styles.find((s) => s.id === presetId);
    if (!preset) return;

    setStyleConfig({
      font: preset.font || 'Montserrat',
      font_size_pct: preset.font_size_pct || 0.058,
      primary_color: assColorToHex(preset.primary_color, '#FFFFFF'),
      highlight_color: assColorToHex(preset.highlight_color, '#A8D4FF'),
      outline_color: assColorToHex(preset.outline_color, '#000000'),
      outline_width_pct: preset.outline_width_pct !== undefined ? preset.outline_width_pct : 0.015,
      shadow_color: assColorToHex(preset.shadow_color, '#000000'),
      shadow_depth_pct: preset.shadow_depth_pct !== undefined ? preset.shadow_depth_pct : 0.045,
      spacing: preset.spacing !== undefined ? preset.spacing : -2,
      blur: preset.blur !== undefined ? preset.blur : 2.5,
      editorial_top_scale: preset.editorial_top_scale || 75,
      editorial_hero_scale: preset.editorial_hero_scale || 140,
      uppercase: preset.uppercase === true,
      animation_type: preset.animation_type || 'editorial',
    });

    if (preset.grouping) {
      setLayoutConfig((prev) => ({
        ...prev,
        mode: preset.grouping.mode || prev.mode,
        max_words: preset.grouping.max_words || prev.max_words,
        max_chars: preset.grouping.max_chars || prev.max_chars,
        max_pause: preset.grouping.max_pause || prev.max_pause,
        vertical_margin_pct: preset.vertical_margin_pct || prev.vertical_margin_pct,
      }));
    }
  };

  // Debounced ASS Generation for Live JASSUB Preview
  const debounceTimerRef = useRef(null);

  useEffect(() => {
    if (!activeJob || !transcript || !transcript.words || transcript.words.length === 0) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(async () => {
      try {
        const payload = {
          style_id: selectedStyleId,
          font: styleConfig.font,
          overrides: {
            ...styleConfig,
            vertical_margin_pct: layoutConfig.vertical_margin_pct,
          },
          grouping: layoutConfig,
        };

        const res = await fetch(`/api/ass/${activeJob}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (res.ok) {
          const data = await res.json();
          setAssContent(data.ass_content);
        }
      } catch (err) {
        console.error('Failed to regenerate live ASS:', err);
      }
    }, 150);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [activeJob, transcript, selectedStyleId, styleConfig, layoutConfig]);

  // Handle Transcript Updates (edits, splits, merges)
  const handleUpdateTranscript = async (newTranscript) => {
    setTranscript(newTranscript);
    if (!activeJob) return;

    try {
      await fetch(`/api/transcript/${activeJob}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          words: newTranscript.words,
          segments: newTranscript.segments,
        }),
      });
    } catch (err) {
      console.error('Failed to persist transcript edit:', err);
    }
  };

  // Handle Video Rendering & Export
  const handleStartRender = async () => {
    if (!activeJob || !transcript) return;
    setIsExportModalOpen(true);
    setIsRendering(true);
    setRenderProgress(0);
    setRenderMessage('Queuing FFmpeg render job...');
    setDownloadUrl(null);

    try {
      const payload = {
        style_id: selectedStyleId,
        font: styleConfig.font,
        overrides: {
          ...styleConfig,
          vertical_margin_pct: layoutConfig.vertical_margin_pct,
        },
        grouping: layoutConfig,
      };

      const res = await fetch(`/api/render/${activeJob}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        throw new Error('Failed to start render');
      }

      // Connect to SSE stream to track real render progress
      const eventSource = new EventSource(`/api/progress/${activeJob}`);

      eventSource.onmessage = (e) => {
        try {
          const event = JSON.parse(e.data);
          setRenderProgress(event.progress || 0);
          setRenderMessage(event.message || '');

          if (event.stage === 'completed') {
            eventSource.close();
            setIsRendering(false);
            setDownloadUrl(`/api/download/${activeJob}`);
            showToast('Video export completed!');
          } else if (event.stage === 'error') {
            eventSource.close();
            setIsRendering(false);
            showToast(event.error || 'Render failed', 'error');
          }
        } catch (err) {
          console.error('Error in render SSE:', err);
        }
      };

      eventSource.onerror = () => {
        eventSource.close();
        setIsRendering(false);
      };
    } catch (err) {
      setIsRendering(false);
      showToast(err.message || 'Render initiation failed', 'error');
    }
  };

  // Save current style customizations as a reusable preset
  const handleSaveCustomPreset = async (name) => {
    try {
      const presetId = name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36);
      const payload = {
        id: presetId,
        name: name,
        description: `Custom preset (${styleConfig.font}, ${styleConfig.animation_type})`,
        ...styleConfig,
        grouping: layoutConfig
      };
      const res = await fetch('/api/custom-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to save preset');
      showToast(`Saved preset "${name}"!`, 'success');
      const updated = await fetch('/api/styles').then((r) => r.json());
      setStyles(updated);
      setSelectedStyleId(presetId);
    } catch (err) {
      showToast(err.message || 'Failed to save preset', 'error');
    }
  };

  // Delete a user-created custom preset
  const handleDeleteCustomPreset = async (presetId) => {
    try {
      const res = await fetch(`/api/custom-presets/${presetId}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete preset');
      showToast('Custom preset deleted', 'success');
      const updated = await fetch('/api/styles').then((r) => r.json());
      setStyles(updated);
      if (selectedStyleId === presetId) {
        handleSelectPreset('aesthetic_editorial');
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete preset', 'error');
    }
  };

  // Reset to new video
  const handleReset = () => {
    setActiveJob(null);
    setVideoMetadata(null);
    setVideoUrl(null);
    setTranscript(null);
    setAssContent('');
    setCurrentTime(0);
    setDownloadUrl(null);
  };

  return (
    <div className="min-h-screen bg-background text-zinc-100 flex flex-col font-sans selection:bg-white selection:text-black">
      <Header
        status={
          isTranscribing
            ? 'Transcribing audio...'
            : isRendering
            ? 'Rendering video...'
            : transcript
            ? 'Subtitles ready'
            : activeJob
            ? 'Video ready'
            : 'Idle'
        }
        onReset={handleReset}
        activeJob={activeJob}
      />

      <main className="flex-1 flex flex-col p-6 max-w-7xl mx-auto w-full">
        {!activeJob ? (
          // Step 1: Upload View
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="text-center mb-8 max-w-md">
              <h1 className="text-3xl font-bold tracking-tight text-white mb-2">
                Auto Subtitles. Precision ASS.
              </h1>
              <p className="text-sm text-zinc-400">
                Word-level timestamps with faster-whisper, modern caption styles, and 1:1 WASM live preview.
              </p>
            </div>
            <UploadZone
              onFileSelect={handleFileUpload}
              isUploading={isUploading}
              metadata={videoMetadata}
            />
          </div>
        ) : !transcript ? (
          // Step 2: Configure & Transcribe View
          <div className="flex-1 flex flex-col items-center justify-center py-6">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1">
                Configure Transcription
              </h2>
              <p className="text-xs text-zinc-400">
                Choose model precision and audio language before extracting timestamps.
              </p>
            </div>

            <UploadZone
              onFileSelect={handleFileUpload}
              isUploading={isUploading}
              metadata={videoMetadata}
            />

            <TranscriptionConfig
              language={language}
              setLanguage={setLanguage}
              model={model}
              setModel={setModel}
              onGenerate={handleStartTranscription}
              isTranscribing={isTranscribing}
              progress={transcribeProgress}
              progressMessage={transcribeMessage}
            />
          </div>
        ) : (
          // Step 3: Editor Screen (Two Columns: Left Video Player, Right Tabs)
          <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6 h-[calc(100vh-7rem)] min-h-[620px]">
            {/* LEFT COLUMN: Live Preview Player */}
            <div className="lg:col-span-7 flex flex-col h-full">
              <VideoPlayerPreview
                videoUrl={videoUrl}
                assContent={assContent}
                fonts={fonts}
                safeAreaGuides={safeAreaGuides}
                setSafeAreaGuides={setSafeAreaGuides}
                currentTime={currentTime}
                onTimeUpdate={setCurrentTime}
                seekTime={seekTime}
                videoMetadata={videoMetadata}
              />
            </div>

            {/* RIGHT COLUMN: Tab Controls & Export */}
            <div className="lg:col-span-5 flex flex-col h-full rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md overflow-hidden shadow-2xl">
              {/* Tabs Navigation Header */}
              <div className="h-12 border-b border-zinc-800/80 bg-zinc-900/40 px-3 flex items-center justify-between">
                <div className="flex items-center gap-1">
                  <button
                    onClick={() => setActiveTab('transcript')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'transcript'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <FileText className="w-3.5 h-3.5" />
                    <span>Transcript</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('style')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'style'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <Palette className="w-3.5 h-3.5" />
                    <span>Style</span>
                  </button>

                  <button
                    onClick={() => setActiveTab('layout')}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-all cursor-pointer ${
                      activeTab === 'layout'
                        ? 'bg-zinc-800 text-white shadow-sm'
                        : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-900/60'
                    }`}
                  >
                    <LayoutTemplate className="w-3.5 h-3.5" />
                    <span>Layout</span>
                  </button>
                </div>

                {/* Primary Export Button */}
                <button
                  onClick={handleStartRender}
                  className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-black bg-white hover:bg-zinc-200 transition-all shadow-glow hover:shadow-white/20 active:scale-95 cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export</span>
                </button>
              </div>

              {/* Tab Content Panes */}
              <div className="flex-1 overflow-hidden">
                {activeTab === 'transcript' && (
                  <TranscriptTab
                    transcript={transcript}
                    onUpdateTranscript={handleUpdateTranscript}
                    onSeek={(time) => setSeekTime(time)}
                    currentTime={currentTime}
                  />
                )}

                {activeTab === 'style' && (
                  <StyleTab
                    styles={styles}
                    selectedStyleId={selectedStyleId}
                    onSelectPreset={handleSelectPreset}
                    fonts={fonts}
                    styleConfig={styleConfig}
                    onChangeStyleConfig={setStyleConfig}
                    onSaveCustomPreset={handleSaveCustomPreset}
                    onDeleteCustomPreset={handleDeleteCustomPreset}
                  />
                )}

                {activeTab === 'layout' && (
                  <LayoutTab
                    layoutConfig={layoutConfig}
                    onChangeLayout={setLayoutConfig}
                    safeAreaGuides={safeAreaGuides}
                    setSafeAreaGuides={setSafeAreaGuides}
                  />
                )}
              </div>
            </div>
          </div>
        )}
      </main>

      {/* Export Progress & Download Modal */}
      <ExportModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        isRendering={isRendering}
        renderProgress={renderProgress}
        renderMessage={renderMessage}
        downloadUrl={downloadUrl}
        assContent={assContent}
        videoFilename={videoMetadata?.filename}
        transcript={transcript}
      />

      {/* Floating Toast Notification */}
      <Toast toast={toast} onClose={() => setToast(null)} />
    </div>
  );
}
