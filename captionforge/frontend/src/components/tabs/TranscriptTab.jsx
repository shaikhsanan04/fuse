import React, { useState } from 'react';
import { Play, Split, Merge, Check, Clock } from 'lucide-react';

export default function TranscriptTab({
  transcript,
  onUpdateTranscript,
  onSeek,
  currentTime
}) {
  const [editingSegmentId, setEditingSegmentId] = useState(null);
  const segments = transcript?.segments || [];
  const words = transcript?.words || [];

  // Handle direct text edit of a segment
  const handleSegmentTextChange = (segId, newText) => {
    const updatedSegments = segments.map((seg) => {
      if (seg.id === segId) {
        return { ...seg, text: newText };
      }
      return seg;
    });

    // Also update words corresponding to this segment if words exist
    const newWords = [...words];
    const seg = segments.find((s) => s.id === segId);
    if (seg && seg.words && seg.words.length > 0) {
      const splitTokens = newText.trim().split(/\s+/).filter(Boolean);
      // Map existing word timings or interpolate
      const segStart = seg.start;
      const segEnd = seg.end;
      const duration = Math.max(0.2, segEnd - segStart);
      const tokenDuration = duration / Math.max(1, splitTokens.length);

      // Replace or update words for this segment
      // Find range of words in all_words
      const firstWordStart = seg.words[0].start;
      const lastWordEnd = seg.words[seg.words.length - 1].end;

      const startIndex = newWords.findIndex((w) => Math.abs(w.start - firstWordStart) < 0.05);
      if (startIndex !== -1) {
        const replacementWords = splitTokens.map((tok, idx) => ({
          word: tok,
          start: round3(segStart + idx * tokenDuration),
          end: round3(segStart + (idx + 1) * tokenDuration),
          probability: 0.95
        }));
        newWords.splice(startIndex, seg.words.length, ...replacementWords);
      }
    }

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

  const round3 = (num) => Math.round(num * 1000) / 1000;

  const formatSec = (s) => {
    const m = Math.floor(s / 60);
    const sec = (s % 60).toFixed(1);
    return `${m}:${sec < 10 ? '0' : ''}${sec}`;
  };

  return (
    <div className="flex flex-col h-full space-y-3 p-4 overflow-y-auto">
      <div className="flex items-center justify-between pb-2 border-b border-zinc-800/80">
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
            Segments & Timestamps
          </h4>
          <p className="text-[11px] text-zinc-500">
            Click segment to seek • Edit text • Split or merge lines
          </p>
        </div>
        <div className="text-[11px] font-mono text-zinc-400 bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
          {segments.length} segments • {words.length} words
        </div>
      </div>

      <div className="space-y-2.5">
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
                  className="flex items-center gap-1.5 px-2 py-0.5 rounded-full bg-zinc-800/80 hover:bg-zinc-700 text-[10px] font-mono text-zinc-300 transition-colors"
                  title="Seek to segment"
                >
                  <Clock className="w-3 h-3 text-zinc-400" />
                  <span>
                    {formatSec(seg.start)} → {formatSec(seg.end)}
                  </span>
                </button>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleSplitSegment(idx)}
                    disabled={(seg.words || []).length <= 1}
                    className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors disabled:opacity-30 disabled:hover:bg-transparent"
                    title="Split line into two"
                  >
                    <Split className="w-3.5 h-3.5" />
                  </button>
                  {idx < segments.length - 1 && (
                    <button
                      onClick={() => handleMergeNext(idx)}
                      className="p-1 rounded text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800 transition-colors"
                      title="Merge with next line"
                    >
                      <Merge className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              </div>

              {/* Editable Text Area */}
              <textarea
                value={seg.text}
                onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                rows={2}
                className="w-full bg-zinc-950 border border-zinc-800/80 focus:border-zinc-600 rounded-lg p-2 text-xs text-zinc-200 resize-none outline-none font-sans leading-relaxed"
                placeholder="Enter caption text..."
              />

              {/* Word Tokens preview */}
              {seg.words && seg.words.length > 0 && (
                <div className="flex flex-wrap gap-1 mt-2">
                  {seg.words.map((w, wIdx) => {
                    const isWordActive = currentTime >= w.start && currentTime <= w.end;
                    return (
                      <span
                        key={wIdx}
                        onClick={() => onSeek(w.start)}
                        className={`cursor-pointer px-1.5 py-0.5 rounded text-[10px] font-mono transition-all ${
                          isWordActive
                            ? 'bg-amber-400 text-black font-semibold'
                            : 'bg-zinc-800/60 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-200'
                        }`}
                        title={`${w.start}s - ${w.end}s`}
                      >
                        {w.word}
                      </span>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
