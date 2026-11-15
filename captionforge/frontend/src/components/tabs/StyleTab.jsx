import React, { useState } from 'react';
import { Type, Palette, Sparkles, Layers, Sliders, Trash2, Plus, Check } from 'lucide-react';

export default function StyleTab({
  styles,
  selectedStyleId,
  onSelectPreset,
  fonts,
  styleConfig,
  onChangeStyleConfig,
  onSaveCustomPreset,
  onDeleteCustomPreset
}) {
  const [isSavingPreset, setIsSavingPreset] = useState(false);
  const [presetNameInput, setPresetNameInput] = useState('');

  const PRESET_ICONS = {
    aesthetic_editorial: '✨',
    hormozi_pop: '🔥',
    karaoke: '🎤',
    clean_minimal: '🌟',
    boxed: '⬛',
    neon_glow: '⚡',
    typewriter: '⌨️'
  };

  const handleFieldChange = (key, value) => {
    onChangeStyleConfig({ ...styleConfig, [key]: value });
  };

  const handleSaveSubmit = (e) => {
    e.preventDefault();
    if (!presetNameInput.trim() || !onSaveCustomPreset) return;
    onSaveCustomPreset(presetNameInput.trim());
    setPresetNameInput('');
    setIsSavingPreset(false);
  };

  return (
    <div className="flex flex-col h-full space-y-6 p-4 overflow-y-auto">
      {/* Preset Cards Section */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
            <Sparkles className="w-3.5 h-3.5 text-zinc-400" />
            <span>Style Presets</span>
          </label>
          <button
            onClick={() => setIsSavingPreset(!isSavingPreset)}
            className="flex items-center gap-1 text-[11px] text-zinc-400 hover:text-white transition-colors cursor-pointer"
          >
            <Plus className="w-3 h-3" />
            <span>Save Preset</span>
          </button>
        </div>

        {/* Save Preset Inline Input */}
        {isSavingPreset && (
          <form onSubmit={handleSaveSubmit} className="mb-3 p-2.5 rounded-xl border border-zinc-700 bg-zinc-900 flex items-center gap-2">
            <input
              type="text"
              placeholder="Preset Name (e.g. My Neon Edit)"
              value={presetNameInput}
              onChange={(e) => setPresetNameInput(e.target.value)}
              className="flex-1 bg-transparent text-xs text-white placeholder-zinc-500 outline-none px-2"
              autoFocus
            />
            <button
              type="submit"
              disabled={!presetNameInput.trim()}
              className="px-2.5 py-1 rounded bg-white text-black text-[11px] font-medium hover:bg-zinc-200 disabled:opacity-40 transition-all cursor-pointer"
            >
              Save
            </button>
            <button
              type="button"
              onClick={() => setIsSavingPreset(false)}
              className="text-[11px] text-zinc-400 hover:text-white px-1 cursor-pointer"
            >
              Cancel
            </button>
          </form>
        )}

        <div className="grid grid-cols-2 gap-2.5">
          {styles.map((preset) => {
            const isSelected = selectedStyleId === preset.id;
            const isEditorial = preset.id === 'aesthetic_editorial';
            const isCustom = preset.is_custom === true;

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
                  <span className="text-base">{PRESET_ICONS[preset.id] || '🎨'}</span>
                  <div className="flex items-center gap-1.5">
                    {isEditorial && (
                      <span className="text-[9px] font-medium tracking-wide px-1.5 py-0.5 rounded-full bg-blue-500/20 text-blue-300 border border-blue-500/30">
                        NEW
                      </span>
                    )}
                    {isCustom && (
                      <span className="text-[9px] font-medium tracking-wide px-1.5 py-0.5 rounded-full bg-purple-500/20 text-purple-300 border border-purple-500/30">
                        CUSTOM
                      </span>
                    )}
                    {isCustom && onDeleteCustomPreset && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onDeleteCustomPreset(preset.id);
                        }}
                        className="text-zinc-500 hover:text-red-400 p-0.5 rounded transition-colors"
                        title="Delete custom preset"
                      >
                        <Trash2 className="w-3 h-3" />
                      </button>
                    )}
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

      {/* Typography Section */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Type className="w-3.5 h-3.5 text-zinc-400" />
          <span>Typography</span>
        </label>

        {/* Font Family */}
        <div>
          <label className="text-[11px] text-zinc-400 mb-1.5 block">Font Family</label>
          <select
            value={styleConfig.font || 'Montserrat'}
            onChange={(e) => handleFieldChange('font', e.target.value)}
            className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-all cursor-pointer"
          >
            {fonts.map((f) => (
              <option key={f.filename} value={f.family}>
                {f.family} ({f.display_name})
              </option>
            ))}
          </select>
        </div>

        {/* Font Size Relative Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Font Size Scale</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.font_size_pct || 0.052) * 1000) / 10}% of height
            </span>
          </div>
          <input
            type="range"
            min={0.025}
            max={0.095}
            step={0.002}
            value={styleConfig.font_size_pct || 0.052}
            onChange={(e) => handleFieldChange('font_size_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Letter Spacing / Tracking Slider */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Letter Spacing (Tracking)</span>
            <span className="font-mono text-zinc-300">
              {styleConfig.spacing !== undefined ? styleConfig.spacing : -2}px
            </span>
          </div>
          <input
            type="range"
            min={-4}
            max={4}
            step={1}
            value={styleConfig.spacing !== undefined ? styleConfig.spacing : -2}
            onChange={(e) => handleFieldChange('spacing', parseInt(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Uppercase Toggle */}
        <div className="flex items-center justify-between py-1">
          <div>
            <span className="text-xs text-zinc-300 font-medium block">Uppercase All Caps</span>
            <span className="text-[10px] text-zinc-500">TikTok/Shorts energetic style</span>
          </div>
          <button
            onClick={() => handleFieldChange('uppercase', !styleConfig.uppercase)}
            className={`w-10 h-5 rounded-full transition-colors relative cursor-pointer ${
              styleConfig.uppercase ? 'bg-white' : 'bg-zinc-800'
            }`}
          >
            <div
              className={`w-3.5 h-3.5 rounded-full bg-zinc-950 absolute top-0.5 transition-transform ${
                styleConfig.uppercase ? 'left-5' : 'left-1'
              }`}
            />
          </button>
        </div>
      </div>

      {/* Colors Section */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Palette className="w-3.5 h-3.5 text-zinc-400" />
          <span>Colors & Highlights</span>
        </label>

        <div className="grid grid-cols-2 gap-3">
          {/* Primary Text Color */}
          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <span className="text-[11px] text-zinc-400 block mb-1.5">Base Text Color</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styleConfig.primary_color || '#FFFFFF'}
                onChange={(e) => handleFieldChange('primary_color', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-300">
                {styleConfig.primary_color || '#FFFFFF'}
              </span>
            </div>
          </div>

          {/* Active Highlight Color */}
          <div className="p-2.5 rounded-xl border border-zinc-800 bg-zinc-950/60">
            <span className="text-[11px] text-zinc-400 block mb-1.5">Active Word Pop</span>
            <div className="flex items-center gap-2">
              <input
                type="color"
                value={styleConfig.highlight_color || '#FFD700'}
                onChange={(e) => handleFieldChange('highlight_color', e.target.value)}
                className="w-7 h-7 rounded border border-zinc-700 bg-transparent cursor-pointer"
              />
              <span className="text-xs font-mono text-zinc-300">
                {styleConfig.highlight_color || '#FFD700'}
              </span>
            </div>
          </div>
        </div>

        {/* Outline & Shadow Controls */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Outline Stroke Width</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.outline_width_pct || 0.08) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.16}
            step={0.01}
            value={styleConfig.outline_width_pct || 0.08}
            onChange={(e) => handleFieldChange('outline_width_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Shadow Depth</span>
            <span className="font-mono text-zinc-300">
              {Math.round((styleConfig.shadow_depth_pct || 0.03) * 100)}%
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={0.1}
            step={0.005}
            value={styleConfig.shadow_depth_pct || 0.03}
            onChange={(e) => handleFieldChange('shadow_depth_pct', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>

        {/* Ambient Blur / Diffused Shadow */}
        <div>
          <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1.5">
            <span>Cinematic Ambient Blur</span>
            <span className="font-mono text-zinc-300">
              {styleConfig.blur !== undefined ? styleConfig.blur : 2.5}px
            </span>
          </div>
          <input
            type="range"
            min={0.0}
            max={5.0}
            step={0.5}
            value={styleConfig.blur !== undefined ? styleConfig.blur : 2.5}
            onChange={(e) => handleFieldChange('blur', parseFloat(e.target.value))}
            className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
          />
        </div>
      </div>

      {/* Animation & Hierarchy Section */}
      <div className="space-y-4 pt-2 border-t border-zinc-800/80">
        <label className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-zinc-400">
          <Sliders className="w-3.5 h-3.5 text-zinc-400" />
          <span>Animation & Hierarchy</span>
        </label>

        <select
          value={styleConfig.animation_type || 'editorial'}
          onChange={(e) => handleFieldChange('animation_type', e.target.value)}
          className="w-full bg-zinc-900 border border-zinc-800 hover:border-zinc-700 focus:border-zinc-500 rounded-lg px-3 py-2 text-xs text-zinc-200 outline-none transition-all cursor-pointer"
        >
          <option value="editorial">✨ Aesthetic Editorial (Two-Tier Hero Keyword)</option>
          <option value="pop">Scale Pop (80% → 112% active word)</option>
          <option value="karaoke">Karaoke (\k continuous word color-sweep)</option>
          <option value="neon">Neon Outer Glow</option>
          <option value="fade">Typewriter / Sequential Fade-in</option>
          <option value="box">Boxed Backdrop (High Legibility)</option>
          <option value="none">None (Clean Minimal)</option>
        </select>

        {/* Two-Tier Scaling when Editorial is active */}
        {styleConfig.animation_type === 'editorial' && (
          <div className="space-y-3 p-3 rounded-xl bg-zinc-900/50 border border-zinc-800/80">
            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Top Context Line Scale</span>
                <span className="font-mono text-zinc-300">
                  {styleConfig.editorial_top_scale || 75}%
                </span>
              </div>
              <input
                type="range"
                min={50}
                max={100}
                step={5}
                value={styleConfig.editorial_top_scale || 75}
                onChange={(e) => handleFieldChange('editorial_top_scale', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>

            <div>
              <div className="flex items-center justify-between text-[11px] text-zinc-400 mb-1">
                <span>Bottom Hero Keyword Scale</span>
                <span className="font-mono text-blue-400">
                  {styleConfig.editorial_hero_scale || 140}%
                </span>
              </div>
              <input
                type="range"
                min={110}
                max={180}
                step={5}
                value={styleConfig.editorial_hero_scale || 140}
                onChange={(e) => handleFieldChange('editorial_hero_scale', parseInt(e.target.value))}
                className="w-full h-1.5 bg-zinc-800 rounded-full appearance-none cursor-pointer accent-white"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
