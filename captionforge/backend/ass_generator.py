"""
CaptionForge - ASS Generator Module

Converts word tokens and style options into fully-featured ASS (Advanced SubStation Alpha)
subtitles. Guarantees 100% visual parity between JASSUB browser preview and FFmpeg burn-in.
"""

import re
from typing import List, Dict, Any, Optional
from pathlib import Path
from .styles import get_preset

def contains_devanagari(text: str) -> bool:
    """Check if string contains any Devanagari characters (U+0900 to U+097F)."""
    return any("\u0900" <= ch <= "\u097f" for ch in text)


def hex_to_ass_color(color_str: str, default: str = "&H00FFFFFF") -> str:
    """
    Convert CSS/UI hex color (#RRGGBB or #RRGGBBAA) or existing ASS color
    to standardized ASS color format: &HAABBGGRR.
    
    Examples:
    #FFFFFF    -> &H00FFFFFF
    #FFD700    -> &H0000D7FF (BGR: R=FF, G=D7, B=00)
    #FF000080  -> &H800000FF (Alpha=80, B=00, G=00, R=FF)
    """
    if not color_str:
        return default

    color_str = color_str.strip()

    # Already ASS format
    if color_str.startswith("&H") or color_str.startswith("&h"):
        cleaned = color_str.rstrip("&")
        # Ensure 8 hex digits after &H
        raw = cleaned[2:]
        if len(raw) == 6:
            return f"&H00{raw.upper()}"
        elif len(raw) == 8:
            return f"&H{raw.upper()}"
        return cleaned

    # Web Hex format #RRGGBB or #RRGGBBAA
    if color_str.startswith("#"):
        hex_val = color_str[1:]
        if len(hex_val) == 6:
            r = hex_val[0:2]
            g = hex_val[2:4]
            b = hex_val[4:6]
            return f"&H00{b.upper()}{g.upper()}{r.upper()}"
        elif len(hex_val) == 8:
            r = hex_val[0:2]
            g = hex_val[2:4]
            b = hex_val[4:6]
            a = hex_val[6:8]
            return f"&H{a.upper()}{b.upper()}{g.upper()}{r.upper()}"

    return default


def format_ass_time(seconds: float) -> str:
    """
    Format seconds into ASS timestamp: H:MM:SS.cs
    Example: 65.432 -> 0:01:05.43
    """
    if seconds < 0:
        seconds = 0.0
    h = int(seconds // 3600)
    m = int((seconds % 3600) // 60)
    s = int(seconds % 60)
    cs = int(round((seconds - int(seconds)) * 100))
    if cs >= 100:
        cs = 0
        s += 1
        if s >= 60:
            s = 0
            m += 1
            if m >= 60:
                m = 0
                h += 1
    return f"{h}:{m:02d}:{s:02d}.{cs:02d}"


def group_words_into_chunks(
    words: List[Dict[str, Any]],
    max_words: int = 3,
    max_chars: int = 24,
    max_pause: float = 0.45
) -> List[List[Dict[str, Any]]]:
    """
    Partition words into consecutive subtitle lines without time overlap.
    """
    if not words:
        return []

    chunks = []
    current_chunk = []
    current_chars = 0

    for w in words:
        word_text = str(w.get("word", "")).strip()
        if not word_text:
            continue

        word_len = len(word_text)
        pause = 0.0
        if current_chunk:
            pause = float(w.get("start", 0.0)) - float(current_chunk[-1].get("end", 0.0))

        should_split = (
            len(current_chunk) >= max_words or
            (current_chars + word_len + 1 > max_chars and len(current_chunk) > 0) or
            pause > max_pause
        )

        if should_split and current_chunk:
            chunks.append(current_chunk)
            current_chunk = []
            current_chars = 0

        current_chunk.append(w)
        current_chars += word_len + 1

    if current_chunk:
        chunks.append(current_chunk)

    return chunks


def generate_ass_content(
    words: List[Dict[str, Any]],
    video_width: int,
    video_height: int,
    style_id: str = "hormozi_pop",
    font: Optional[str] = None,
    font_size: Optional[int] = None,
    overrides: Optional[Dict[str, Any]] = None,
    grouping: Optional[Dict[str, Any]] = None
) -> str:
    """
    Generate full ASS file content for live preview and video rendering.
    """
    preset = get_preset(style_id)
    overrides = overrides or {}
    grouping = grouping or {}

    # Merge configuration
    font_name = font or overrides.get("font") or preset.get("font", "Montserrat")
    
    # Auto-fallback to Noto Sans Devanagari if text has Devanagari characters
    has_devanagari = any(contains_devanagari(str(w.get("word", ""))) for w in words)
    if has_devanagari and font_name not in ["Noto Sans Devanagari"]:
        font_name = "Noto Sans Devanagari"

    # Font sizing: priority = explicit font_size > override font_size_pct > preset font_size_pct
    font_size_pct = overrides.get("font_size_pct", preset.get("font_size_pct", 0.052))
    calculated_font_size = font_size or int(video_height * font_size_pct)
    calculated_font_size = max(18, calculated_font_size)

    # Outline & Shadow
    outline_pct = overrides.get("outline_width_pct", preset.get("outline_width_pct", 0.08))
    outline_width = overrides.get("outline_width", max(1, int(calculated_font_size * outline_pct)))
    
    shadow_pct = overrides.get("shadow_depth_pct", preset.get("shadow_depth_pct", 0.03))
    shadow_depth = overrides.get("shadow_depth", max(0, int(calculated_font_size * shadow_pct)))

    # Colors
    primary_color = hex_to_ass_color(overrides.get("primary_color", preset.get("primary_color", "&H00FFFFFF")))
    highlight_color = hex_to_ass_color(overrides.get("highlight_color", preset.get("highlight_color", "&H0000D7FF")))
    outline_color = hex_to_ass_color(overrides.get("outline_color", preset.get("outline_color", "&H00000000")))
    shadow_color = hex_to_ass_color(overrides.get("shadow_color", preset.get("shadow_color", "&H80000000")))

    # Alignment & Margins
    alignment = int(overrides.get("alignment", preset.get("alignment", 2)))
    
    # Vertical position (% from bottom/top)
    v_margin_pct = overrides.get("vertical_margin_pct", preset.get("vertical_margin_pct", 0.18))
    margin_v = int(video_height * v_margin_pct)
    margin_l = int(video_width * 0.05)
    margin_r = margin_l

    border_style = int(overrides.get("border_style", preset.get("border_style", 1)))
    uppercase = bool(overrides.get("uppercase", preset.get("uppercase", True)))
    animation_type = overrides.get("animation_type", preset.get("animation_type", "pop"))
    scale_pop_pct = int(overrides.get("scale_pop_pct", preset.get("scale_pop_pct", 112)))

    # Grouping parameters
    preset_grouping = preset.get("grouping", {})
    max_words = int(grouping.get("max_words") or overrides.get("max_words") or preset_grouping.get("max_words", 3))
    max_chars = int(grouping.get("max_chars") or overrides.get("max_chars") or preset_grouping.get("max_chars", 22))
    max_pause = float(grouping.get("max_pause") or overrides.get("max_pause") or preset_grouping.get("max_pause", 0.45))

    bold_val = -1 if overrides.get("bold", preset.get("bold", True)) else 0
    italic_val = -1 if overrides.get("italic", preset.get("italic", False)) else 0
    spacing_val = int(overrides.get("spacing", preset.get("spacing", 0)))

    # Build Header
    header = f"""[Script Info]
Title: CaptionForge Subtitles
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {video_width}
PlayResY: {video_height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,{font_name},{calculated_font_size},{primary_color},{highlight_color},{outline_color},{shadow_color},{bold_val},{italic_val},0,0,100,100,{spacing_val},0,{border_style},{outline_width},{shadow_depth},{alignment},{margin_l},{margin_r},{margin_v},1
Style: Glow,{font_name},{calculated_font_size},{outline_color},{highlight_color},{outline_color},{shadow_color},{bold_val},{italic_val},0,0,100,100,{spacing_val},0,1,{outline_width * 2},0,{alignment},{margin_l},{margin_r},{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
"""

    chunks = group_words_into_chunks(words, max_words=max_words, max_chars=max_chars, max_pause=max_pause)
    events = []

    def clean_word_text(w_str: str) -> str:
        s = str(w_str).strip()
        if uppercase and not contains_devanagari(s):
            s = s.upper()
        # Escape ASS special characters { and }
        s = s.replace("{", "(").replace("}", ")")
        return s

    if animation_type == "editorial":
        # Aesthetic Editorial: two-tier hierarchy
        # Top tier: context words at ~75% scale
        # Bottom tier: hero keyword at ~140% scale with active highlight color
        # Tight tracking \fsp and soft ambient shadow \blur
        blur_val = overrides.get("blur", preset.get("blur", 2.5))
        top_scale = int(overrides.get("editorial_top_scale", 75))
        hero_scale = int(overrides.get("editorial_hero_scale", 140))
        spacing_val = int(overrides.get("spacing", preset.get("spacing", -2)))

        for chunk in chunks:
            if not chunk:
                continue
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            num_words = len(chunk)
            if num_words == 1:
                split_idx = 0
            elif num_words <= 4:
                split_idx = num_words - 1
            else:
                split_idx = num_words - 2

            for active_idx, active_word in enumerate(chunk):
                w_start = float(active_word.get("start", chunk_start))
                if active_idx + 1 < len(chunk):
                    w_end = float(chunk[active_idx + 1].get("start", chunk_end))
                else:
                    w_end = chunk_end
                if w_end <= w_start:
                    w_end = w_start + 0.15

                top_words = chunk[:split_idx]
                bot_words = chunk[split_idx:]

                # Format top tier tokens
                top_tokens = []
                for idx, w in enumerate(top_words):
                    w_text = clean_word_text(w.get("word", ""))
                    if idx == active_idx:
                        top_tokens.append(f"{{\\c{highlight_color}&}}{w_text}{{\\c{primary_color}&}}")
                    else:
                        top_tokens.append(w_text)

                # Format bottom tier tokens
                bot_tokens = []
                for b_idx, w in enumerate(bot_words):
                    actual_idx = split_idx + b_idx
                    w_text = clean_word_text(w.get("word", ""))
                    if actual_idx == active_idx:
                        bot_tokens.append(f"{{\\c{highlight_color}&}}{w_text}{{\\c{primary_color}&}}")
                    else:
                        bot_tokens.append(w_text)

                blur_tag = f"{{\\blur{blur_val}\\fsp{spacing_val}}}" if blur_val else f"{{\\fsp{spacing_val}}}"

                if top_tokens and bot_tokens:
                    top_part = f"{{\\fscx{top_scale}\\fscy{top_scale}}}{' '.join(top_tokens)}"
                    bot_part = f"{{\\fscx{hero_scale}\\fscy{hero_scale}}}{' '.join(bot_tokens)}"
                    line_text = f"{blur_tag}{top_part}\\N{bot_part}"
                elif bot_tokens:
                    line_text = f"{blur_tag}{{\\fscx{hero_scale}\\fscy{hero_scale}}}{' '.join(bot_tokens)}"
                else:
                    line_text = f"{blur_tag}{{\\fscx{top_scale}\\fscy{top_scale}}}{' '.join(top_tokens)}"

                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    elif animation_type == "karaoke":
        # Classic karaoke timing tags: \k<centiseconds>
        for chunk in chunks:
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            k_tokens = []
            for w in chunk:
                w_start = float(w.get("start", chunk_start))
                w_end = float(w.get("end", w_start + 0.2))
                duration_cs = max(1, int(round((w_end - w_start) * 100)))
                w_text = clean_word_text(w.get("word", ""))
                k_tokens.append(f"{{\\k{duration_cs}}}{w_text}")

            line_text = " ".join(k_tokens)
            events.append(
                f"Dialogue: 0,{format_ass_time(chunk_start)},{format_ass_time(chunk_end)},Default,,0,0,0,,{line_text}"
            )

    elif animation_type == "none":
        # Clean minimal: static line display during chunk interval
        for chunk in chunks:
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            line_text = " ".join(clean_word_text(w.get("word", "")) for w in chunk)
            events.append(
                f"Dialogue: 0,{format_ass_time(chunk_start)},{format_ass_time(chunk_end)},Default,,0,0,0,,{line_text}"
            )

    elif animation_type == "neon":
        # Neon glow: layered blurred halo behind the text + active word highlight
        for chunk in chunks:
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            for active_idx, active_word in enumerate(chunk):
                w_start = float(active_word.get("start", chunk_start))
                if active_idx + 1 < len(chunk):
                    w_end = float(chunk[active_idx + 1].get("start", chunk_end))
                else:
                    w_end = chunk_end
                if w_end <= w_start:
                    w_end = w_start + 0.15

                tokens = []
                for idx, w in enumerate(chunk):
                    w_text = clean_word_text(w.get("word", ""))
                    if idx == active_idx:
                        tokens.append(f"{{\\c{highlight_color}&\\blur3}}{w_text}{{\\r}}")
                    else:
                        tokens.append(w_text)

                line_text = " ".join(tokens)
                # Outer blurred glow layer
                glow_text = f"{{\\blur6\\be2\\3c{outline_color}&}}{' '.join(clean_word_text(w.get('word', '')) for w in chunk)}"
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Glow,,0,0,0,,{glow_text}"
                )
                # Inner crisp layer
                events.append(
                    f"Dialogue: 1,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    elif animation_type == "fade":
        # Typewriter / Fade: active word fades in smoothly
        for chunk in chunks:
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            for active_idx, active_word in enumerate(chunk):
                w_start = float(active_word.get("start", chunk_start))
                if active_idx + 1 < len(chunk):
                    w_end = float(chunk[active_idx + 1].get("start", chunk_end))
                else:
                    w_end = chunk_end
                if w_end <= w_start:
                    w_end = w_start + 0.15

                tokens = []
                for idx, w in enumerate(chunk):
                    w_text = clean_word_text(w.get("word", ""))
                    if idx == active_idx:
                        tokens.append(f"{{\\fad(100,0)\\c{highlight_color}&}}{w_text}{{\\r}}")
                    elif idx < active_idx:
                        tokens.append(w_text)
                    else:
                        # Future words in chunk dim or hidden
                        tokens.append(f"{{\\alpha&HAA&}}{w_text}{{\\r}}")

                line_text = " ".join(tokens)
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    else:
        # Default: Hormozi Pop / Boxed (active word highlight with scale pop)
        pop_x = scale_pop_pct
        pop_y = scale_pop_pct
        for chunk in chunks:
            chunk_start = float(chunk[0].get("start", 0.0))
            chunk_end = float(chunk[-1].get("end", chunk_start + 0.5))
            if chunk_end <= chunk_start:
                chunk_end = chunk_start + 0.5

            for active_idx, active_word in enumerate(chunk):
                w_start = float(active_word.get("start", chunk_start))
                if active_idx + 1 < len(chunk):
                    w_end = float(chunk[active_idx + 1].get("start", chunk_end))
                else:
                    w_end = chunk_end
                if w_end <= w_start:
                    w_end = w_start + 0.15

                tokens = []
                for idx, w in enumerate(chunk):
                    w_text = clean_word_text(w.get("word", ""))
                    if idx == active_idx:
                        tokens.append(f"{{\\c{highlight_color}&\\fscx{pop_x}\\fscy{pop_y}}}{w_text}{{\\r}}")
                    else:
                        tokens.append(w_text)

                line_text = " ".join(tokens)
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    return header + "\n".join(events) + "\n"
