import React, { useState, useEffect, useRef } from 'react';
import {
  Type, Palette, Sparkles, Layers, Sliders, Trash2, Plus,
  Check, Eye, Download, Upload, Save, RefreshCw
} from 'lucide-react';

export default function StyleTab({
  styles = [],
  selectedStyleId,
  onSelectPreset,
  fonts = [],
  styleConfig = {},
  layoutConfig = {},
  onChangeStyleConfig,
  onSaveCustomPreset,
  onUpdateCustomPreset,
  onDeleteCustomPreset,
  onImportCustomPreset
}) {
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');
  const [selectedEmoji, setSelectedEmoji] = useState('⭐');
  const [activeRoleTab, setActiveRoleTab] = useState('accent'); // 'base' | 'accent' | 'soft'
  const fileInputRef = useRef(null);

  const EMOJI_OPTIONS = ['⭐', '💎', '🔥', '✨', '✍️', '🎬', '👑', '🚀', '📰', '🕊️'];

  const PRESET_ICONS = {
    editorial_mix: '📰',
    soft_minimal: '🕊️',
    italic_whisper: '✍️',
    weight_ladder: '🪜',
    aesthetic_editorial: '✨',
    hormozi_pop: '🔥',
    karaoke: '🎤',
    clean_minimal: '🌟',
    boxed: '⬛',
    neon_glow: '⚡',
    typewriter: '⌨️'
  };

  // Register font faces in browser so the live preview box renders them accurately
  useEffect(() => {
    if (!fonts || fonts.length === 0) return;
    fonts.forEach((f) => {
      try {
        const isItalic = f.filename.toLowerCase().includes('italic');
        const isBold = f.filename.toLowerCase().includes('bold') || f.filename.toLowerCase().includes('black');
        const isLight = f.filename.toLowerCase().includes('light');
        const weight = isBold ? '700' : isLight ? '300' : '400';

        const fontFace = new FontFace(f.family, `url(${f.url})`, {
          style: isItalic ? 'italic' : 'normal',
          weight: weight
        });
        fontFace.load().then((loaded) => {
          document.fonts.add(loaded);
        }).catch(() => {});
      } catch (_) {}
    });
  }, [fonts]);

  const uniqueFamilies = Array.from(new Set((fonts || []).map((f) => f.family))).filter(Boolean);

  const defaultRoles = {
    base: {
      font: styleConfig.font || 'Inter',
      weight: 700,
      italic: false,
      uppercase: false,
      size_mult: 1.0,
      color: styleConfig.primary_color || '#FFFFFF'
    },
    accent: {
      font: 'Playfair Display',
      weight: 400,
      italic: false,
      uppercase: false,
      size_mult: 1.35,
      color: styleConfig.highlight_color || '#FFD4A8'
    },
    soft: {
      font: 'Instrument Serif',
      weight: 400,
      italic: true,
      uppercase: false,
      size_mult: 0.88,
      color: '#D5D5D5'
    }
  };

  const roles = styleConfig.roles || defaultRoles;
  const currentRoleConfig = roles[activeRoleTab] || defaultRoles[activeRoleTab];

  const currentPreset = styles.find((s) => s.id === selectedStyleId);
  const isCurrentPresetCustom = currentPreset?.is_custom === true;

  const customPresets = styles.filter((s) => s.is_custom === true);
  const builtInPresets = styles.filter((s) => !s.is_custom);

  const handleFieldChange = (key, value) => {
    onChangeStyleConfig({ ...styleConfig, [key]: value });
  };

  const handleRoleChange = (roleKey, field, value) => {
    const updatedRole = {
      ...(roles[roleKey] || defaultRoles[roleKey]),
      [field]: value
    };

    const updatedRoles = {
      ...roles,
      [roleKey]: updatedRole
    };

    onChangeStyleConfig({
      ...styleConfig,
      roles: updatedRoles
    });
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!presetNameInput.trim() || !onSaveCustomPreset) return;
    onSaveCustomPreset({
      name: presetNameInput.trim(),
      icon: selectedEmoji,
      description: `Custom style (${roles.base.font} + ${roles.accent.font})`
    });
    setPresetNameInput('');
    setIsSavingPreset(false);
  };

  const handleExportPreset = (e, preset) => {
    e.stopPropagation();
    const exportData = {
      ...preset,
      roles: preset.roles || roles,
      grouping: preset.grouping || layoutConfig
    };
    const dataStr = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const downloadAnchor = document.createElement('a');
    downloadAnchor.setAttribute('href', dataStr);
    downloadAnchor.setAttribute('download', `${preset.id || 'caption_preset'}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  const handleImportFile = (e) => {
    const file = e.target.files && e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target.result);
        if (onImportCustomPreset) {
          onImportCustomPreset(parsed);
        }
      } catch (err) {
        console.error('Preset import error:', err);
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-4 overflow-y-auto">
      {/* Hidden file input for importing presets */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImportFile}
        accept=".json"
        className="hidden"
      />

      {/* Preset Cards & Actions Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Style Presets</span>
          </label>

          <div className="flex items-center gap-2">
            {/* If currently selected preset is custom, show Update button */}
            {isCurrentPresetCustom && onUpdateCustomPreset && (
              <button
                onClick={() => onUpdateCustomPreset(selectedStyleId)}
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-500/20 border border-blue-500/40 hover:border-blue-400 text-blue-300 text-xs font-medium transition-all cursor-pointer"
                title={`Update saved preset "${currentPreset.name}" with current settings`}
              >
                <RefreshCw className="w-3 h-3 text-blue-400" />
                <span>Update Preset</span>
              </button>
            )}

            {/* Save As New Preset Button */}
            <button
              onClick={() => setIsSavingPreset(!isSavingPreset)}
              className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-zinc-800 hover:bg-zinc-700 text-zinc-200 border border-zinc-700 text-xs font-medium transition-all cursor-pointer"
              title="Save current typography and colors as a new preset"
            >
              <Plus className="w-3.5 h-3.5 text-amber-400" />
              <span>Save Preset</span>
            </button>

            {/* Import Preset Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1 px-2 py-1 rounded-lg bg-zinc-900 hover:bg-zinc-800 text-zinc-400 hover:text-zinc-200 border border-zinc-800 text-xs transition-colors cursor-pointer"
              title="Import custom preset from JSON file"
            >
              <Upload className="w-3 h-3" />
              <span>Import</span>
            </button>
          </div>
        </div>

        {/* Save Preset Card Form */}
        {isSavingPreset && (
          <form
            onSubmit={handleSaveSubmit}
            className="mb-4 p-3.5 rounded-xl border border-amber-500/40 bg-zinc-900/90 shadow-xl space-y-3"
          >
            <div className="flex items-center justify-between pb-1 border-b border-zinc-800">
              <span className="text-xs font-semibold text-zinc-200 flex items-center gap-1.5">
                <Save className="w-3.5 h-3.5 text-amber-400" />
                <span>Save Current Style Preset</span>
              </span>
              <span className="text-[10px] text-zinc-400">Reuses Base, Accent, & Soft roles on future videos</span>
            </div>

            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Preset Name</label>
              <input
                type="text"
                placeholder="e.g. My Viral TikTok Style"
                value={presetNameInput}
                onChange={(e) => setPresetNameInput(e.target.value)}
                className="w-full bg-zinc-950 border border-zinc-700 focus:border-amber-400 rounded-lg p-2 text-xs text-white placeholder-zinc-500 outline-none"
                autoFocus
              />
            </div>

            {/* Icon picker */}
            <div>
              <label className="text-[11px] text-zinc-400 mb-1 block">Choose Icon</label>
              <div className="flex items-center gap-1.5 flex-wrap">
                {EMOJI_OPTIONS.map((emoji) => (
                  <button
                    key={emoji}
                    type="button"
                    onClick={() => setSelectedEmoji(emoji)}
                    className={`w-7 h-7 rounded-lg text-sm flex items-center justify-center transition-all cursor-pointer ${
                      selectedEmoji === emoji
                        ? 'bg-amber-500/30 border border-amber-400 scale-110 shadow-sm'
                        : 'bg-zinc-800 hover:bg-zinc-700 text-zinc-300'
                    }`}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            </div>

            {/* Quick summary of what will be saved */}
            <div className="p-2 rounded-lg bg-zinc-950/80 border border-zinc-800 text-[10px] space-y-1">
              <div className="text-zinc-400 font-mono font-medium">Included Roles Configuration:</div>
              <div className="flex items-center gap-3 text-zinc-300">
                <span>Base: <b className="text-white">{roles.base.font}</b> ({roles.base.weight})</span>
                <span>•</span>
                <span>Accent: <b className="text-amber-300">{roles.accent.font}</b> ({roles.accent.size_mult}x)</span>
                <span>•</span>
                <span>Soft: <b className="text-purple-300">{roles.soft.font}</b> ({roles.soft.italic ? 'Italic' : 'Regular'})</span>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-1">
              <button
                type="button"
                onClick={() => setIsSavingPreset(false)}
                className="px-3 py-1.5 rounded-lg text-xs text-zinc-400 hover:text-white transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={!presetNameInput.trim()}
                className="px-4 py-1.5 rounded-lg bg-amber-400 hover:bg-amber-300 text-black text-xs font-semibold disabled:opacity-40 transition-all cursor-pointer shadow-md"
              >
                Save Preset
              </button>
            </div>
          </form>
        )}

        {/* CUSTOM PRESETS SECTION (If any exist) */}
        {customPresets.length > 0 && (
          <div className="mb-4">
            <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
              <span>My Saved Presets ({customPresets.length})</span>
            </div>

            <div className="grid grid-cols-2 gap-2.5">
              {customPresets.map((preset) => {
                const isSelected = selectedStyleId === preset.id;

                return (
                  <div
                    key={preset.id}
                    onClick={() => onSelectPreset(preset.id)}
                    className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                      isSelected
                        ? 'border-amber-400/80 bg-zinc-900 shadow-glow-accent'
                        : 'border-zinc-800 bg-zinc-950/70 hover:border-zinc-700 hover:bg-zinc-900/50'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1.5">
                      <span className="text-base">{preset.icon || '⭐'}</span>
                      <div className="flex items-center gap-1.5">
                        {/* Export Preset JSON button */}
                        <button
                          onClick={(e) => handleExportPreset(e, preset)}
                          className="text-zinc-500 hover:text-zinc-200 p-1 rounded transition-colors"
                          title="Export preset as JSON"
                        >
                          <Download className="w-3 h-3" />
                        </button>

                        {/* Delete preset button */}
                        {onDeleteCustomPreset && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              if (confirm(`Delete preset "${preset.name}"?`)) {
                                onDeleteCustomPreset(preset.id);
                              }
                            }}
                            className="text-zinc-500 hover:text-red-400 p-1 rounded transition-colors"
                            title="Delete custom preset"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}

                        {isSelected && (
                          <span className="w-2 h-2 rounded-full bg-amber-400 shadow-glow" />
                        )}
                      </div>
                    </div>

                    <div className="font-semibold text-xs text-white">{preset.name}</div>
                    <div className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
                      {preset.description || 'Custom multi-role typography preset'}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* BUILT-IN PRESETS SECTION */}
        <div>
          <div className="flex items-center justify-between text-[11px] font-medium text-zinc-400 uppercase tracking-wider mb-2">
            <span>Built-in Presets</span>
          </div>

          <div className="grid grid-cols-2 gap-2.5">
            {builtInPresets.map((preset) => {
              const isSelected = selectedStyleId === preset.id;
              const isNewMultiRole = ['editorial_mix', 'soft_minimal', 'italic_whisper', 'weight_ladder'].includes(preset.id);

              return (
                <div
                  key={preset.id}
                  onClick={() => onSelectPreset(preset.id)}
                  className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden group cursor-pointer ${
                    isSelected
                      ? 'border-white bg-zinc-900 shadow-glow'
                      : 'border-zinc-800 bg-zinc-950/60 hover:border-zinc-700 hover:bg-zinc-900/40'
                  }`}
                >
                  <div className="flex items-center justify-between mb-1.5">
                    <span className="text-base">{PRESET_ICONS[preset.id] || preset.icon || '🎨'}</span>
                    <div className="flex items-center gap-1.5">
                      {isSelected && (
                        <span className="w-2 h-2 rounded-full bg-white shadow-glow" />
                      )}
                    </div>
                  </div>
                  <div className="font-semibold text-xs text-white">{preset.name}</div>
                  <div className="text-[10px] text-zinc-500 line-clamp-2 mt-0.5 leading-snug">
                    {preset.description}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Typography Controls & Preview */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-300">
            <Layers className="w-3.5 h-3.5 text-amber-400" />
            <span>Typography Styles</span>
          </label>
          <span className="text-[10px] text-zinc-400">Mix fonts and colors across words</span>
        </div>

        {/* Typography Preview Box */}
        <div className="p-4 rounded-xl border border-zinc-800 bg-zinc-950/80 text-center relative overflow-hidden shadow-inner">
          <div className="text-[10px] text-zinc-500 mb-2 flex items-center justify-center gap-1.5">
            <Eye className="w-3 h-3 text-zinc-400" />
            <span>Preview</span>
          </div>
          <div className="flex items-baseline justify-center flex-wrap gap-x-2 gap-y-1 py-1">
            {/* Base word */}
            <span
              style={{
                fontFamily: roles.base.font,
                fontWeight: roles.base.weight,
                fontStyle: roles.base.italic ? 'italic' : 'normal',
                fontSize: `${Math.round(20 * roles.base.size_mult)}px`,
                color: roles.base.color,
                textTransform: roles.base.uppercase ? 'uppercase' : 'none'
              }}
            >
              Make
            </span>

            {/* Accent (Hero) word */}
            <span
              style={{
                fontFamily: roles.accent.font,
                fontWeight: roles.accent.weight,
                fontStyle: roles.accent.italic ? 'italic' : 'normal',
                fontSize: `${Math.round(20 * roles.accent.size_mult)}px`,
                color: roles.accent.color,
                textTransform: roles.accent.uppercase ? 'uppercase' : 'none'
              }}
            >
              Videos
            </span>

            {/* Soft (Nuance) word */}
            <span
              style={{
                fontFamily: roles.soft.font,
                fontWeight: roles.soft.weight,
                fontStyle: roles.soft.italic ? 'italic' : 'normal',
                fontSize: `${Math.round(20 * roles.soft.size_mult)}px`,
                color: roles.soft.color,
                textTransform: roles.soft.uppercase ? 'uppercase' : 'none'
              }}
            >
              aesthetic
            </span>
          </div>
        </div>

        {/* Role Selector Tabs */}
        <div className="grid grid-cols-3 gap-1.5 p-1 bg-zinc-950 rounded-xl border border-zinc-800">
          <button
            onClick={() => setActiveRoleTab('base')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'base'
                ? 'bg-zinc-800 text-white shadow-sm'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Base</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roles.base.color }} />
          </button>
          <button
            onClick={() => setActiveRoleTab('accent')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'accent'
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 shadow-sm font-semibold'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Accent</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roles.accent.color }} />
          </button>
          <button
            onClick={() => setActiveRoleTab('soft')}
            className={`py-1.5 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeRoleTab === 'soft'
                ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30 shadow-sm italic'
                : 'text-zinc-400 hover:text-zinc-200'
            }`}
          >
            <span>Soft</span>
            <span className="w-2 h-2 rounded-full" style={{ backgroundColor: roles.soft.color }} />
          </button>
        </div>

        {/* Active Role Configuration Card */}
        <div className="p-3.5 rounded-xl border border-zinc-800 bg-zinc-900/40 space-y-3.5">
          <div className="flex items-center justify-between text-[11px] text-zinc-400 pb-1 border-b border-zinc-800/60">
            <span className="font-semibold text-zinc-300">
              {activeRoleTab === 'base' ? 'Base Style' : activeRoleTab === 'accent' ? 'Accent Style' : 'Soft Style'}
            </span>
            <span>
              {activeRoleTab === 'base' && 'Main spoken narration'}
              {activeRoleTab === 'accent' && 'Keywords & highlighted phrases'}
              {activeRoleTab === 'soft' && 'Secondary & subtle words'}
            </span>
          </div>

          {/* Role Font Family */}
          <div>
            <label className="text-[11px] text-zinc-400 mb-1.5 block">Font Family</label>
            <select
              value={currentRoleConfig.font || 'Inter'}
              onChange={(e) => handleRoleChange(activeRoleTab, 'font', e.target.value)}
              className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-all cursor-pointer"
            >
              {uniqueFamilies.map((fam) => (
                <option key={fam} value={fam}>
                  {fam}
                </option>
              ))}
            </select>
          </div>

          {/* Weight & Italic / Uppercase Row */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[11px] text-zinc-400 mb-1.5 block">Font Weight</label>
              <select
                value={currentRoleConfig.weight || 400}
                onChange={(e) => handleRoleChange(activeRoleTab, 'weight', parseInt(e.target.value))}
                className="w-full bg-zinc-950 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-2.5 py-1.5 text-xs text-zinc-200 outline-none transition-all cursor-pointer"
              >
                <option value={300}>300 - Light</option>
                <option value={400}>400 - Regular</option>
                <option value={600}>600 - SemiBold</option>
                <option value={700}>700 - Bold</option>
                <option value={800}>800 - ExtraBold</option>
                <option value={900}>900 - Black</option>
              </select>
            </div>

            {/* Color */}
            <div>
              <label className="text-[11px] text-zinc-400 mb-1.5 block">Role Color</label>
              <div className="flex items-center gap-2 bg-zinc-950 border border-zinc-800 rounded-lg p-1 px-2">
                <input
                  type="color"
                  value={currentRoleConfig.color || '#FFFFFF'}
                  onChange={(e) => handleRoleChange(activeRoleTab, 'color', e.target.value)}
                  className="w-6 h-6 rounded border-0 bg-transparent cursor-pointer"
                />
                <span className="text-xs font-mono text-zinc-300">
                  {currentRoleConfig.color || '#FFFFFF'}
                </span>
              </div>
            </div>
          </div>

          {/* Size Multiplier Slider */}
          <div>
            <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
              <span>Text Size</span>
              <span className="font-mono text-amber-300 font-semibold">
                {Math.round((currentRoleConfig.size_mult || 1.0) * 100)}%
              </span>
            </div>
            <input
              type="range"
              min={0.65}
              max={1.75}
              step={0.05}
              value={currentRoleConfig.size_mult || 1.0}
              onChange={(e) => handleRoleChange(activeRoleTab, 'size_mult', parseFloat(e.target.value))}
              className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-amber-400"
            />
          </div>

          {/* Italic and Uppercase Toggles */}
          <div className="grid grid-cols-2 gap-2 pt-1">
            <button
              type="button"
              onClick={() => handleRoleChange(activeRoleTab, 'italic', !currentRoleConfig.italic)}
              className={`py-1.5 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentRoleConfig.italic
                  ? 'bg-purple-500/20 border-purple-500/50 text-purple-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span className="italic font-serif">Italic</span>
            </button>

            <button
              type="button"
              onClick={() => handleRoleChange(activeRoleTab, 'uppercase', !currentRoleConfig.uppercase)}
              className={`py-1.5 px-3 rounded-lg border text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer ${
                currentRoleConfig.uppercase
                  ? 'bg-blue-500/20 border-blue-500/50 text-blue-300 font-semibold'
                  : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
              }`}
            >
              <span>ALL CAPS</span>
            </button>
          </div>
        </div>
      </div>

      {/* Global Sizing & Tracking */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Type className="w-3.5 h-3.5 text-zinc-400" />
          <span>Styling & Effects</span>
        </label>

        {/* Global Font Size Scale Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Base Font Size</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.font_size_pct || 0.054) * 1000) / 10}%
            </span>
          </div>
          <input
            type="range"
            min={0.025}
            max={0.095}
            step={0.002}
            value={styleConfig.font_size_pct || 0.054}
            onChange={(e) => handleFieldChange('font_size_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Letter Spacing / Tracking Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Letter Spacing</span>
            <span className="font-mono text-zinc-300">
              {styleConfig.spacing !== undefined ? styleConfig.spacing : -1}px
            </span>
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={1}
            value={styleConfig.spacing !== undefined ? styleConfig.spacing : -1}
            onChange={(e) => handleFieldChange('spacing', parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Outline Stroke Width */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Outline Thickness</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.outline_width_pct || 0.02) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.16}
            step={0.01}
            value={styleConfig.outline_width_pct !== undefined ? styleConfig.outline_width_pct : 0.02}
            onChange={(e) => handleFieldChange('outline_width_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Shadow Depth */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Shadow Depth</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.shadow_depth_pct || 0.04) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.1}
            step={0.005}
            value={styleConfig.shadow_depth_pct !== undefined ? styleConfig.shadow_depth_pct : 0.04}
            onChange={(e) => handleFieldChange('shadow_depth_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Ambient Blur */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Shadow Blur</span>
            <span className="font-mono text-zinc-300">
              {styleConfig.blur !== undefined ? styleConfig.blur : 2.0}px
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={5.0}
            step={0.5}
            value={styleConfig.blur !== undefined ? styleConfig.blur : 2.0}
            onChange={(e) => handleFieldChange('blur', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Animation & Hierarchy Section */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Animation Style</span>
        </label>

        <select
          value={styleConfig.animation_type || 'pop'}
          onChange={(e) => handleFieldChange('animation_type', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-all cursor-pointer"
        >
          <option value="pop">Scale Pop (Word highlight)</option>
          <option value="editorial">Editorial (Two-tier emphasis)</option>
          <option value="karaoke">Karaoke (Smooth word sweep)</option>
          <option value="neon">Neon Outer Glow</option>
          <option value="fade">Typewriter Fade</option>
          <option value="none">None (Static)</option>
        </select>
      </div>
    </div>
  );
}
