import React, { useState } from 'react';
import { Play, Split, Merge, Check, Clock, Sparkles, Wand2, Trash2, X, FileText } from 'lucide-react';

export default function TranscriptTab({
  transcript,
  onUpdateTranscript,
  onDeleteAllTranscripts,
  onSeek,
  currentTime
}) {
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const segments = transcript?.segments || [];
  const words = transcript?.words || [];

  const round3 = (num) => Math.round(num * 1000) / 1000;

  const formatSec = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  // Helper to parse markdown-style *word* or _word_ markers
  const parseToken = (tok) => {
    let text = tok.trim();
    let emphasis = null;
    if (text.startsWith('*') && text.endsWith('*') && text.length > 2) {
      text = text.slice(1, -1);
      emphasis = 'accent';
    } else if (text.startsWith('_') && text.endsWith('_') && text.length > 2) {
      text = text.slice(1, -1);
      emphasis = 'soft';
    }
    return { word: text, emphasis };
  };

  // Handle direct text edit of a segment
  const handleSegmentTextChange = (segId, newText) => {
    const updatedSegments = segments.map((seg) => {
      if (seg.id === segId) {
        return { ...seg, text: newText };
      }
      return seg;
    });

    const newWords = [...words];
    const seg = segments.find((s) => s.id === segId);
    if (seg && seg.words && seg.words.length > 0) {
      const splitTokens = newText.trim().split(/\s+/).filter(Boolean);
      const segStart = seg.start;
      const segEnd = seg.end;
      const duration = Math.max(0.2, segEnd - segStart);
      const tokenDuration = duration / Math.max(1, splitTokens.length);

      const firstWordStart = seg.words[0].start;
      const startIndex = newWords.findIndex((w) => Math.abs(w.start - firstWordStart) < 0.05);

      if (startIndex !== -1) {
        const replacementWords = splitTokens.map((tok, idx) => {
          const parsed = parseToken(tok);
          const existingWord = seg.words && seg.words[idx];
          const emp = parsed.emphasis || (existingWord && existingWord.emphasis) || 'base';
          return {
            word: parsed.word,
            start: round3(segStart + idx * tokenDuration),
            end: round3(segStart + (idx + 1) * tokenDuration),
            probability: 0.95,
            emphasis: emp
          };
        });
        newWords.splice(startIndex, seg.words.length, ...replacementWords);
      }
    }

    onUpdateTranscript({ segments: updatedSegments, words: newWords });
  };

  // On blur of textarea, strip * and _ from segment text while keeping emphasis
  const handleSegmentBlur = (segId) => {
    const seg = segments.find((s) => s.id === segId);
    if (!seg) return;

    const cleanedText = seg.text
      .split(/\s+/)
      .map((tok) => {
        if (tok.startsWith('*') && tok.endsWith('*') && tok.length > 2) return tok.slice(1, -1);
        if (tok.startsWith('_') && tok.endsWith('_') && tok.length > 2) return tok.slice(1, -1);
        return tok;
      })
      .join(' ');

    if (cleanedText !== seg.text) {
      const updatedSegments = segments.map((s) => (s.id === segId ? { ...s, text: cleanedText } : s));
      onUpdateTranscript({ segments: updatedSegments, words });
    }
  };

  // Cycle role on word click: base -> accent -> soft -> base
  const handleWordClick = (seg, wIdx, e) => {
    e.stopPropagation();

    // If Alt-click or Ctrl-click, seek to word
    if (e.altKey || e.ctrlKey) {
      onSeek(seg.words[wIdx].start);
      return;
    }

    const currentEmp = seg.words[wIdx]?.emphasis || 'base';
    const nextEmp = currentEmp === 'base' ? 'accent' : currentEmp === 'accent' ? 'soft' : 'base';

    const targetWord = seg.words[wIdx];

    // Update in segment
    const updatedSegments = segments.map((s) => {
      if (s.id === seg.id) {
        const newSegWords = [...s.words];
        newSegWords[wIdx] = { ...newSegWords[wIdx], emphasis: nextEmp };
        return { ...s, words: newSegWords };
      }
      return s;
    });

    // Update in global words array
    const updatedWords = words.map((w) => {
      if (Math.abs(w.start - targetWord.start) < 0.05 && w.word.trim() === targetWord.word.trim()) {
        return { ...w, emphasis: nextEmp };
      }
      return w;
    });

    onUpdateTranscript({ segments: updatedSegments, words: updatedWords });
  };

  // Delete an individual word token (e.g. unwanted filler words like "um", "uh")
  const handleDeleteWord = (seg, wIdx, e) => {
    e.stopPropagation();
    const targetWord = seg.words[wIdx];
    if (!targetWord) return;

    // Filter out the word from segment
    const updatedSegments = segments.map((s) => {
      if (s.id === seg.id) {
        const newSegWords = s.words.filter((_, idx) => idx !== wIdx);
        return {
          ...s,
          words: newSegWords,
          text: newSegWords.map((w) => w.word).join(' ')
        };
      }
      return s;
    });

    // Filter out from global words array
    const updatedWords = words.filter((w) => {
      const isMatch = Math.abs(w.start - targetWord.start) < 0.05 && w.word.trim() === targetWord.word.trim();
      return !isMatch;
    });

    onUpdateTranscript({ segments: updatedSegments, words: updatedWords });
  };

  // Delete an entire unwanted segment line
  const handleDeleteSegment = (index) => {
    const seg = segments[index];
    if (!seg) return;

    const newSegments = segments.filter((_, i) => i !== index);

    // Remove words corresponding to this segment
    const segStart = seg.start;
    const segEnd = seg.end;
    const newWords = words.filter((w) => {
      return !(w.start >= segStart - 0.05 && w.end <= segEnd + 0.05);
    });

    onUpdateTranscript({ segments: newSegments, words: newWords });
  };

  // Delete all transcripts for this video
  const handleDeleteAll = () => {
    if (window.confirm('Delete all transcripts for this video? This will clear the subtitles completely.')) {
      if (onDeleteAllTranscripts) {
        onDeleteAllTranscripts();
      } else {
        onUpdateTranscript({ segments: [], words: [] });
      }
    }
  };

  // Auto-emphasis algorithm:
  // 1. Numbers (\d+) -> accent
  // 2. Pause before word > 300ms (0.3s) -> accent
  // 3. Longest word per chunk -> accent
  const handleAutoEmphasis = () => {
    if (!words || words.length === 0) return;

    const newWords = words.map((w, idx) => {
      const text = (w.word || '').trim();
      const isNumber = /\d+/.test(text);

      let hasPause = false;
      if (idx > 0) {
        const prevWord = words[idx - 1];
        const pause = w.start - (prevWord.end || prevWord.start);
        if (pause > 0.3) {
          hasPause = true;
        }
      }

      return {
        ...w,
        emphasis: isNumber || hasPause ? 'accent' : w.emphasis || 'base'
      };
    });

    // Partition into chunks of ~4 words to find longest word per chunk
    const chunkSize = 4;
    for (let i = 0; i < newWords.length; i += chunkSize) {
      const chunk = newWords.slice(i, i + chunkSize);
      let longestWord = null;
      let maxLen = 0;
      for (const w of chunk) {
        const cleanLen = (w.word || '').replace(/[^\w]/g, '').length;
        if (cleanLen > maxLen && cleanLen >= 4) {
          maxLen = cleanLen;
          longestWord = w;
        }
      }
      if (longestWord && longestWord.emphasis === 'base') {
        longestWord.emphasis = 'accent';
      }
    }

    // Synchronize to segments
    const updatedSegments = (segments || []).map((seg) => {
      const segWords = (seg.words || []).map((sw) => {
        const matched = newWords.find(
          (nw) => Math.abs(nw.start - sw.start) < 0.05 && nw.word.trim() === sw.word.trim()
        );
        return matched ? { ...sw, emphasis: matched.emphasis } : sw;
      });
      return { ...seg, words: segWords };
    });

    onUpdateTranscript({ segments: updatedSegments, words: newWords });
  };

  // Merge segment with next segment
  const handleMergeNext = (index) => {
    if (index >= segments.length - 1) return;
    const current = segments[index];
    const next = segments[index + 1];

    const merged = {
      id: current.id,
      start: current.start,
      end: next.end,
      text: `${current.text} ${next.text}`.trim(),
      words: [...(current.words || []), ...(next.words || [])]
    };

    const newSegments = [...segments];
    newSegments.splice(index, 2, merged);
    onUpdateTranscript({ segments: newSegments, words });
  };

  // Split segment in half
  const handleSplitSegment = (index) => {
    const seg = segments[index];
    const segWords = seg.words || [];
    if (segWords.length <= 1) return;

    const mid = Math.ceil(segWords.length / 2);
    const firstWords = segWords.slice(0, mid);
    const secondWords = segWords.slice(mid);

    const seg1 = {
      id: seg.id,
      start: firstWords[0].start,
      end: firstWords[firstWords.length - 1].end,
      text: firstWords.map((w) => w.word).join(' '),
      words: firstWords
    };

    const seg2 = {
      id: Date.now(),
      start: secondWords[0].start,
      end: secondWords[secondWords.length - 1].end,
      text: secondWords.map((w) => w.word).join(' '),
      words: secondWords
    };

    const newSegments = [...segments];
    newSegments.splice(index, 1, seg1, seg2);
    onUpdateTranscript({ segments: newSegments, words });
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-4 overflow-y-auto">
      {/* Clean Header with Title, Auto-Highlight, and Clear All Button */}
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div>
          <h4 className="text-xs font-semibold text-zinc-200">
            Captions & Timing
          </h4>
          <p className="text-[11px] text-zinc-400">
            Click words to highlight • Use × to remove unwanted words
          </p>
        </div>
        <div className="flex items-center gap-2">
          {/* Auto-Highlight Button */}
          <button
            onClick={handleAutoEmphasis}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-500/10 border border-amber-500/30 hover:border-amber-400/60 text-amber-300 text-xs font-medium transition-all active:scale-95 cursor-pointer"
            title="Automatically highlight keywords, numbers, and key pauses"
          >
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Auto-Highlight</span>
          </button>

          {/* Delete All Transcripts Button */}
          <button
            onClick={handleDeleteAll}
            className="flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-zinc-900 hover:bg-red-500/10 border border-zinc-800 hover:border-red-500/30 text-zinc-400 hover:text-red-400 text-xs font-medium transition-all cursor-pointer"
            title="Delete all captions"
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Clear All</span>
          </button>
        </div>
      </div>

      {/* Minimal Legend Hint */}
      <div className="flex items-center justify-between px-3 py-1.5 rounded-lg bg-zinc-900/40 border border-zinc-800/50 text-[11px] text-zinc-400">
        <span>Click word to cycle style:</span>
        <div className="flex items-center gap-2.5 text-[11px]">
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-zinc-400" />
            <span className="text-zinc-300">Base</span>
          </span>
          <span className="text-zinc-600">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400" />
            <span className="text-amber-300 font-medium">Accent</span>
          </span>
          <span className="text-zinc-600">→</span>
          <span className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-purple-400" />
            <span className="text-purple-300 italic">Soft</span>
          </span>
        </div>
      </div>

      {/* Segments List or Empty State */}
      {segments.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-10 text-center rounded-2xl border border-dashed border-zinc-800 bg-zinc-950/40 space-y-2 my-auto">
          <FileText className="w-8 h-8 text-zinc-600 mb-1" />
          <p className="text-sm font-semibold text-zinc-300">All Transcripts Deleted</p>
          <p className="text-xs text-zinc-500 max-w-sm">
            There are no captions currently. You can clear and re-transcribe the video anytime.
          </p>
        </div>
      ) : (
        <div className="space-y-3">
          {segments.map((seg, idx) => {
            const isActive = currentTime >= seg.start && currentTime <= seg.end;

            return (
              <div
                key={seg.id || idx}
                className={`p-3 rounded-xl border transition-all ${
                  isActive
                    ? 'border-blue-500/50 bg-blue-500/10 shadow-glow-accent'
                    : 'border-zinc-800/80 bg-zinc-900/30 hover:border-zinc-700 hover:bg-zinc-900/60'
                }`}
              >
                {/* Header with timings and actions */}
                <div className="flex items-center justify-between mb-2">
                  <button
                    onClick={() => onSeek(seg.start)}
                    className="flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-zinc-800/90 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors cursor-pointer"
                    title="Seek video to segment start"
                  >
                    <Clock className="w-3 h-3 text-zinc-400" />
                    <span>
                      {formatSec(seg.start)} → {formatSec(seg.end)}
                    </span>
                  </button>

                  <div className="flex items-center gap-1">
                    {/* Split line */}
                    <button
                      onClick={() => handleSplitSegment(idx)}
                      disabled={(seg.words || []).length <= 1}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent cursor-pointer"
                      title="Split line into two"
                    >
                      <Split className="w-3.5 h-3.5" />
                    </button>

                    {/* Merge with next */}
                    {idx < segments.length - 1 && (
                      <button
                        onClick={() => handleMergeNext(idx)}
                        className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors cursor-pointer"
                        title="Merge with next line"
                      >
                        <Merge className="w-3.5 h-3.5" />
                      </button>
                    )}

                    {/* Delete this entire segment line */}
                    <button
                      onClick={() => handleDeleteSegment(idx)}
                      className="p-1 rounded text-zinc-500 hover:text-red-400 hover:bg-zinc-800 transition-colors cursor-pointer ml-1"
                      title="Delete this caption line"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Editable Text Area */}
                <textarea
                  value={seg.text}
                  onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                  onBlur={() => handleSegmentBlur(seg.id)}
                  rows={2}
                  className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-zinc-600 rounded-lg p-2 text-xs text-zinc-200 resize-none outline-none font-sans leading-relaxed"
                  placeholder="Edit caption text... (type *word* for Accent, _word_ for Soft)"
                />

                {/* Interactive Word Tokens with Role Cycling & Delete Button */}
                {seg.words && seg.words.length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2.5 pt-2 border-t border-zinc-800/50">
                    {seg.words.map((w, wIdx) => {
                      const isWordActive = currentTime >= w.start && currentTime <= w.end;
                      const emp = w.emphasis || 'base';

                      let roleClasses = 'bg-zinc-800/70 text-zinc-300 border-zinc-700/60 hover:border-zinc-500';
                      let roleLabel = 'Base';

                      if (emp === 'accent') {
                        roleClasses = 'bg-amber-500/20 text-amber-200 border-amber-500/50 font-semibold shadow-sm shadow-amber-500/10';
                        roleLabel = 'Accent';
                      } else if (emp === 'soft') {
                        roleClasses = 'bg-purple-500/20 text-purple-200 border-purple-500/40 italic';
                        roleLabel = 'Soft';
                      }

                      return (
                        <div
                          key={wIdx}
                          onClick={(e) => handleWordClick(seg, wIdx, e)}
                          className={`group inline-flex items-center gap-1.5 pl-2.5 pr-1.5 py-1 rounded-md text-xs font-sans border transition-all cursor-pointer select-none ${roleClasses} ${
                            isWordActive ? 'ring-2 ring-white scale-105 z-10' : ''
                          }`}
                          title={`Style: ${roleLabel} • Click to cycle (Base → Accent → Soft) • Click × to delete`}
                        >
                          <span className="leading-none">{w.word}</span>

                          {/* Delete individual word token button */}
                          <span
                            onClick={(e) => handleDeleteWord(seg, wIdx, e)}
                            className="text-zinc-500 hover:text-red-400 hover:bg-zinc-700/50 rounded w-3.5 h-3.5 flex items-center justify-center transition-colors text-xs ml-0.5"
                            title="Delete word"
                          >
                            ×
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
