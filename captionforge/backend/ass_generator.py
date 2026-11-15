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
Title: Fuse Subtitles
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

    # -------------------------------------------------------------------------
    # Multi-Role Typography configuration (base, accent, soft)
    # -------------------------------------------------------------------------
    roles_cfg = overrides.get("roles") or preset.get("roles") or {}

    default_base_role = {
        "font": font_name,
        "weight": 700 if bold_val == -1 else 400,
        "italic": bool(italic_val == -1),
        "uppercase": uppercase,
        "size_mult": 1.0,
        "color": primary_color,
        "outline": outline_color,
        "shadow": shadow_color
    }

    roles = {
        "base": dict(default_base_role, **(roles_cfg.get("base") or {})),
        "accent": dict({
            **default_base_role,
            "weight": 900,
            "size_mult": 1.30,
            "color": highlight_color
        }, **(roles_cfg.get("accent") or {})),
        "soft": dict({
            **default_base_role,
            "weight": 400,
            "italic": True,
            "size_mult": 0.85,
            "color": "&H00D0D0D0"
        }, **(roles_cfg.get("soft") or {}))
    }

    def render_role_line(
        chunk_words: List[Dict[str, Any]],
        active_idx: Optional[int] = None,
        active_tags: str = "",
        prefix_tag: str = ""
    ) -> str:
        """
        Renders words with multi-role typography:
        When a word's role differs from previous word, emits an override block:
        {\\fn<font>\\b<weight>\\i<0|1>\\fs<size>\\c<color>&} before it,
        and {\\r} at the end of the line.
        """
        if not chunk_words:
            return ""

        tokens = []
        prev_role = None

        for idx, w in enumerate(chunk_words):
            emp = str(w.get("emphasis") or "base").lower()
            if emp not in roles:
                emp = "base"

            r = roles[emp]
            s = str(w.get("word", "")).strip()
            is_upper = r.get("uppercase", uppercase)
            if is_upper and not contains_devanagari(s):
                s = s.upper()
            w_text = s.replace("{", "(").replace("}", ")")

            r_font = "Noto Sans Devanagari" if contains_devanagari(w_text) else r.get("font", font_name)
            r_weight = int(r.get("weight", 700))
            r_italic = 1 if r.get("italic") else 0
            r_size = max(14, int(round(calculated_font_size * float(r.get("size_mult", 1.0)))))
            r_color = hex_to_ass_color(r.get("color", primary_color))

            role_override = f"\\fn{r_font}\\b{r_weight}\\i{r_italic}\\fs{r_size}\\c{r_color}&"

            if idx == active_idx and active_tags:
                tokens.append(f"{{{role_override}{active_tags}}}{w_text}")
                prev_role = None
            else:
                if emp != prev_role or idx == 0:
                    tokens.append(f"{{{role_override}}}{w_text}")
                    prev_role = emp
                else:
                    tokens.append(w_text)

        body = " ".join(tokens)
        if prefix_tag:
            return f"{prefix_tag}{body}{{\\r}}"
        return f"{body}{{\\r}}"

    if animation_type == "editorial":
        blur_val = overrides.get("blur", preset.get("blur", 2.5))
        top_scale = int(overrides.get("editorial_top_scale", 75))
        hero_scale = int(overrides.get("editorial_hero_scale", 140))
        spacing_val = int(overrides.get("spacing", preset.get("spacing", -2)))
        blur_tag = f"{{\\blur{blur_val}\\fsp{spacing_val}}}" if blur_val else f"{{\\fsp{spacing_val}}}"

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

            top_words = chunk[:split_idx]
            bot_words = chunk[split_idx:]

            for active_idx, active_word in enumerate(chunk):
                w_start = float(active_word.get("start", chunk_start))
                if active_idx + 1 < len(chunk):
                    w_end = float(chunk[active_idx + 1].get("start", chunk_end))
                else:
                    w_end = chunk_end
                if w_end <= w_start:
                    w_end = w_start + 0.15

                top_act = active_idx if active_idx < len(top_words) else None
                bot_act = (active_idx - len(top_words)) if active_idx >= len(top_words) else None

                top_line = render_role_line(top_words, active_idx=top_act, active_tags=f"\\c{highlight_color}&")
                bot_line = render_role_line(bot_words, active_idx=bot_act, active_tags=f"\\c{highlight_color}&")

                if top_words and bot_words:
                    line_text = f"{blur_tag}{{\\fscx{top_scale}\\fscy{top_scale}}}{top_line}\\N{{\\fscx{hero_scale}\\fscy{hero_scale}}}{bot_line}"
                elif bot_words:
                    line_text = f"{blur_tag}{{\\fscx{hero_scale}\\fscy{hero_scale}}}{bot_line}"
                else:
                    line_text = f"{blur_tag}{{\\fscx{top_scale}\\fscy{top_scale}}}{top_line}"

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
            prev_role = None
            for idx, w in enumerate(chunk):
                w_start = float(w.get("start", chunk_start))
                w_end = float(w.get("end", w_start + 0.2))
                duration_cs = max(1, int(round((w_end - w_start) * 100)))

                emp = str(w.get("emphasis") or "base").lower()
                r = roles.get(emp, roles["base"])
                s = str(w.get("word", "")).strip()
                if r.get("uppercase", uppercase) and not contains_devanagari(s):
                    s = s.upper()
                w_text = s.replace("{", "(").replace("}", ")")

                r_font = "Noto Sans Devanagari" if contains_devanagari(w_text) else r.get("font", font_name)
                r_weight = int(r.get("weight", 700))
                r_italic = 1 if r.get("italic") else 0
                r_size = max(14, int(round(calculated_font_size * float(r.get("size_mult", 1.0)))))
                r_color = hex_to_ass_color(r.get("color", primary_color))
                role_tag = f"\\fn{r_font}\\b{r_weight}\\i{r_italic}\\fs{r_size}\\c{r_color}&"

                if emp != prev_role or idx == 0:
                    k_tokens.append(f"{{{role_tag}\\k{duration_cs}}}{w_text}")
                    prev_role = emp
                else:
                    k_tokens.append(f"{{\\k{duration_cs}}}{w_text}")

            line_text = " ".join(k_tokens) + "{\\r}"
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

            line_text = render_role_line(chunk)
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

                line_text = render_role_line(chunk, active_idx=active_idx, active_tags=f"\\c{highlight_color}&\\blur3")
                glow_text = f"{{\\blur6\\be2\\3c{outline_color}&}}{render_role_line(chunk)}"
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Glow,,0,0,0,,{glow_text}"
                )
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

                line_text = render_role_line(chunk, active_idx=active_idx, active_tags=f"\\fad(100,0)\\c{highlight_color}&")
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    else:
        # Default: Pop / Boxed (active word highlight with scale pop)
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

                active_tags = f"\\c{highlight_color}&\\fscx{pop_x}\\fscy{pop_y}"
                line_text = render_role_line(chunk, active_idx=active_idx, active_tags=active_tags)
                events.append(
                    f"Dialogue: 0,{format_ass_time(w_start)},{format_ass_time(w_end)},Default,,0,0,0,,{line_text}"
                )

    return header + "\n".join(events) + "\n"
