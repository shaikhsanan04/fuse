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
  const [selectedStyleId, setSelectedStyleId] = useState('editorial_mix');
  const [styleConfig, setStyleConfig] = useState({
    font: 'Inter',
    font_size_pct: 0.054,
    primary_color: '#FFFFFF',
    highlight_color: '#FFD4A8',
    outline_color: '#000000',
    outline_width_pct: 0.02,
    shadow_color: '#000000',
    shadow_depth_pct: 0.04,
    spacing: -1,
    blur: 2.0,
    editorial_top_scale: 75,
    editorial_hero_scale: 140,
    uppercase: false,
    animation_type: 'pop',
    roles: {
      base: {
        font: 'Inter',
        weight: 700,
        italic: false,
        uppercase: false,
        size_mult: 1.0,
        color: '#FFFFFF'
      },
      accent: {
        font: 'Playfair Display',
        weight: 400,
        italic: false,
        uppercase: false,
        size_mult: 1.35,
        color: '#FFD4A8'
      },
      soft: {
        font: 'Instrument Serif',
        weight: 400,
        italic: true,
        uppercase: false,
        size_mult: 0.88,
        color: '#D5D5D5'
      }
    }
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
      .then((data) => {
        setStyles(data);
        const lastPresetId = localStorage.getItem('captionforge_active_preset_id');
        if (lastPresetId && data.some((s) => s.id === lastPresetId)) {
          handleSelectPreset(lastPresetId, data);
        }
      })
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
  const handleSelectPreset = (presetId, stylesList = styles) => {
    setSelectedStyleId(presetId);
    try {
      localStorage.setItem('captionforge_active_preset_id', presetId);
    } catch (_) {}

    const list = stylesList && stylesList.length > 0 ? stylesList : styles;
    const preset = list.find((s) => s.id === presetId);
    if (!preset) return;

    const presetRoles = preset.roles || {};
    const parsedRoles = {
      base: {
        font: presetRoles.base?.font || preset.font || 'Inter',
        weight: presetRoles.base?.weight ?? 700,
        italic: Boolean(presetRoles.base?.italic),
        uppercase: Boolean(presetRoles.base?.uppercase),
        size_mult: presetRoles.base?.size_mult ?? 1.0,
        color: assColorToHex(presetRoles.base?.color, assColorToHex(preset.primary_color, '#FFFFFF'))
      },
      accent: {
        font: presetRoles.accent?.font || 'Playfair Display',
        weight: presetRoles.accent?.weight ?? 400,
        italic: Boolean(presetRoles.accent?.italic),
        uppercase: Boolean(presetRoles.accent?.uppercase),
        size_mult: presetRoles.accent?.size_mult ?? 1.35,
        color: assColorToHex(presetRoles.accent?.color, assColorToHex(preset.highlight_color, '#FFD4A8'))
      },
      soft: {
        font: presetRoles.soft?.font || 'Instrument Serif',
        weight: presetRoles.soft?.weight ?? 400,
        italic: Boolean(presetRoles.soft?.italic ?? true),
        uppercase: Boolean(presetRoles.soft?.uppercase),
        size_mult: presetRoles.soft?.size_mult ?? 0.88,
        color: assColorToHex(presetRoles.soft?.color, '#D5D5D5')
      }
    };

    setStyleConfig({
      font: preset.font || 'Inter',
      font_size_pct: preset.font_size_pct || 0.054,
      primary_color: assColorToHex(preset.primary_color, '#FFFFFF'),
      highlight_color: assColorToHex(preset.highlight_color, '#FFD4A8'),
      outline_color: assColorToHex(preset.outline_color, '#000000'),
      outline_width_pct: preset.outline_width_pct !== undefined ? preset.outline_width_pct : 0.02,
      shadow_color: assColorToHex(preset.shadow_color, '#000000'),
      shadow_depth_pct: preset.shadow_depth_pct !== undefined ? preset.shadow_depth_pct : 0.04,
      spacing: preset.spacing !== undefined ? preset.spacing : -1,
      blur: preset.blur !== undefined ? preset.blur : 2.0,
      editorial_top_scale: preset.editorial_top_scale || 75,
      editorial_hero_scale: preset.editorial_hero_scale || 140,
      uppercase: preset.uppercase === true,
      animation_type: preset.animation_type || 'pop',
      roles: parsedRoles
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
  const handleSaveCustomPreset = async (presetInput) => {
    try {
      const name = typeof presetInput === 'string' ? presetInput : presetInput.name;
      const icon = typeof presetInput === 'object' && presetInput.icon ? presetInput.icon : '⭐';
      const description = typeof presetInput === 'object' && presetInput.description ? presetInput.description : '';

      const presetId = 'custom_' + name.toLowerCase().replace(/[^a-z0-9]/g, '_') + '_' + Date.now().toString(36).slice(-4);
      const payload = {
        id: presetId,
        name: name,
        icon: icon,
        description: description || `Custom style (${styleConfig.roles?.base?.font || styleConfig.font} + ${styleConfig.roles?.accent?.font || 'Serif'})`,
        ...styleConfig,
        roles: styleConfig.roles,
        grouping: layoutConfig,
        is_custom: true
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
      handleSelectPreset(presetId, updated);
    } catch (err) {
      showToast(err.message || 'Failed to save preset', 'error');
    }
  };

  // Update an existing custom preset with current settings
  const handleUpdateCustomPreset = async (presetId) => {
    try {
      const existing = styles.find((s) => s.id === presetId);
      if (!existing) return;

      const payload = {
        ...existing,
        ...styleConfig,
        roles: styleConfig.roles,
        grouping: layoutConfig,
        is_custom: true
      };

      const res = await fetch(`/api/custom-presets/${presetId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      if (!res.ok) throw new Error('Failed to update preset');

      showToast(`Updated preset "${existing.name}"!`, 'success');
      const updated = await fetch('/api/styles').then((r) => r.json());
      setStyles(updated);
    } catch (err) {
      showToast(err.message || 'Failed to update preset', 'error');
    }
  };

  // Import a custom preset from JSON file
  const handleImportCustomPreset = async (presetData) => {
    try {
      if (!presetData || !presetData.name) {
        throw new Error('Invalid preset file: missing name');
      }
      const res = await fetch('/api/custom-presets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(presetData)
      });
      if (!res.ok) throw new Error('Failed to import preset');

      const saved = await res.json();
      showToast(`Imported preset "${presetData.name}"!`, 'success');
      const updated = await fetch('/api/styles').then((r) => r.json());
      setStyles(updated);
      handleSelectPreset(saved.id || presetData.id, updated);
    } catch (err) {
      showToast(err.message || 'Import failed', 'error');
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
        handleSelectPreset('editorial_mix', updated);
      }
    } catch (err) {
      showToast(err.message || 'Failed to delete preset', 'error');
    }
  };

  // Delete all transcripts for the current active job
  const handleDeleteAllTranscripts = async () => {
    if (!activeJob) return;
    try {
      const res = await fetch(`/api/transcript/${activeJob}`, { method: 'DELETE' });
      if (!res.ok) throw new Error('Failed to delete transcript');
      setTranscript(null);
      setAssContent('');
      showToast('Transcript deleted successfully. You can re-transcribe anytime.', 'success');
    } catch (err) {
      showToast(err.message || 'Failed to delete transcript', 'error');
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
            ? 'Captions ready'
            : activeJob
            ? 'Video ready'
            : ''
        }
        onReset={handleReset}
        activeJob={activeJob}
      />

      <main className={`flex-1 flex flex-col ${activeJob && transcript ? 'px-4 py-2.5 max-w-[1600px] h-[calc(100vh-3.5rem)] overflow-hidden' : 'p-6 max-w-7xl'} mx-auto w-full`}>
        {!activeJob ? (
          // Step 1: Upload View
          <div className="flex-1 flex flex-col items-center justify-center py-12">
            <div className="text-center mb-8 max-w-lg">
              <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-white mb-3">
                Studio-grade captions in seconds.
              </h1>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Turn your speech into dynamic, modern video captions. Highlight key phrases, mix typography styles, and export ready for social media.
              </p>
            </div>
            <UploadZone
              onFileSelect={handleFileUpload}
              isUploading={isUploading}
              metadata={videoMetadata}
            />
          </div>
        ) : !transcript ? (
          // Step 2: Configure & Transcribe View (Upload zone is hidden after uploading)
          <div className="flex-1 flex flex-col items-center justify-center py-6 max-w-2xl mx-auto w-full">
            <div className="text-center mb-6">
              <h2 className="text-2xl font-bold text-white mb-1.5">
                Transcription Settings
              </h2>
              <p className="text-xs text-zinc-400">
                Choose your spoken language and accuracy level to generate captions.
              </p>
            </div>

            {/* Compact Video Summary (Upload Zone is hidden) */}
            {videoMetadata && (
              <div className="w-full mb-2 p-3.5 rounded-xl border border-zinc-800/80 bg-zinc-900/50 backdrop-blur flex items-center justify-between text-xs">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-2 h-2 rounded-full bg-emerald-400 flex-shrink-0" />
                  <span className="text-zinc-200 font-medium truncate max-w-xs">{videoMetadata.filename || 'Video Loaded'}</span>
                </div>
                <div className="flex items-center gap-3 text-zinc-400 text-xs flex-shrink-0">
                  <span>{videoMetadata.width} × {videoMetadata.height}</span>
                  <span>{videoMetadata.duration?.toFixed(1)}s</span>
                  <button
                    onClick={handleReset}
                    className="text-xs text-zinc-400 hover:text-white underline cursor-pointer ml-1"
                    title="Upload a different video"
                  >
                    Change Video
                  </button>
                </div>
              </div>
            )}

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
          // Step 3: Editor Screen (Sticky Left Video Player, Scrollable Right Tabs)
          <div className="flex-1 flex flex-col lg:flex-row gap-5 items-start justify-center h-full max-h-full overflow-hidden">
            {/* LEFT COLUMN: Sticky Video Player (tightly sized to 9:16 or 16:9) */}
            <div className="sticky top-0 flex-shrink-0 flex items-center justify-center self-start">
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
            <div className="flex-1 min-w-[360px] max-w-4xl flex flex-col h-full max-h-full rounded-2xl border border-zinc-800/80 bg-zinc-950/70 backdrop-blur-md overflow-hidden shadow-2xl">
              {/* Tabs Navigation Header */}
              <div className="h-11 flex-shrink-0 border-b border-zinc-800/80 bg-zinc-900/40 px-3 flex items-center justify-between">
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
                    onDeleteAllTranscripts={handleDeleteAllTranscripts}
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
                    layoutConfig={layoutConfig}
                    onChangeStyleConfig={setStyleConfig}
                    onSaveCustomPreset={handleSaveCustomPreset}
                    onUpdateCustomPreset={handleUpdateCustomPreset}
                    onDeleteCustomPreset={handleDeleteCustomPreset}
                    onImportCustomPreset={handleImportCustomPreset}
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
