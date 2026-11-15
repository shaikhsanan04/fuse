"""
CaptionForge - Style Presets Definition with Multi-Role Typography

Each style preset defines:
- id: unique identifier
- name: display name
- description: description of visual effect
- font: default font family
- font_size_pct: relative font size as fraction of video height (e.g. 0.055)
- bold, italic: font weight and styling
- primary_color: primary text color (&HAABBGGRR)
- highlight_color: active-word highlight color (&HAABBGGRR)
- outline_color: text stroke color (&HAABBGGRR)
- outline_width_pct: stroke thickness relative to font size (e.g. 0.08)
- shadow_color: shadow color (&HAABBGGRR)
- shadow_depth_pct: shadow distance relative to font size (e.g. 0.04)
- alignment: ASS alignment (2=bottom center, 5=middle center, 8=top center)
- vertical_margin_pct: margin from bottom/top as fraction of video height
- border_style: 1=outline+shadow, 3=opaque/translucent bounding box
- uppercase: whether to auto-uppercase words
- animation_type: 'pop', 'karaoke', 'none', 'neon', 'fade', 'box', 'editorial'
- roles: multi-role typography dictionary with 'base', 'accent', and 'soft'
- grouping: default word grouping rules (max_words, max_chars, max_pause)
"""

from typing import Dict, Any, List, Optional
from pathlib import Path
import json

WORKSPACE_PRESETS_DIR = Path(__file__).resolve().parent.parent / "workspace" / "presets"
WORKSPACE_PRESETS_DIR.mkdir(parents=True, exist_ok=True)

STYLE_PRESETS: Dict[str, Dict[str, Any]] = {
    # -------------------------------------------------------------------------
    # NEW MULTI-ROLE TYPOGRAPHY PRESETS
    # -------------------------------------------------------------------------
    "editorial_mix": {
        "id": "editorial_mix",
        "name": "Editorial Mix",
        "description": "High-contrast pairing: clean sans-serif base, prominent high-fashion serif accent, and delicate italic soft emphasis.",
        "font": "Inter",
        "font_size_pct": 0.054,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FFD4A8",    # Soft Ice Blue
        "outline_color": "&H40000000",
        "outline_width_pct": 0.02,
        "shadow_color": "&HA0000000",
        "shadow_depth_pct": 0.04,
        "spacing": -1,
        "blur": 2.0,
        "alignment": 2,
        "vertical_margin_pct": 0.20,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "pop",
        "roles": {
            "base": {
                "font": "Inter",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "accent": {
                "font": "Playfair Display",
                "weight": 400,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.35,
                "color": "&H00FFD4A8",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "soft": {
                "font": "Instrument Serif",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.88,
                "color": "&H00D5D5D5",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 4,
            "max_chars": 26,
            "max_pause": 0.45
        }
    },
    "soft_minimal": {
        "id": "soft_minimal",
        "name": "Soft Minimal",
        "description": "Whispered luxury aesthetic with light neutral body, warm serif accents, and muted italic nuances.",
        "font": "Inter",
        "font_size_pct": 0.048,
        "bold": False,
        "italic": False,
        "primary_color": "&H00F0F0F0",
        "highlight_color": "&H00FFD7B0",    # Soft Peach / Warm Champagne
        "outline_color": "&H30000000",
        "outline_width_pct": 0.015,
        "shadow_color": "&H80000000",
        "shadow_depth_pct": 0.035,
        "spacing": 0,
        "blur": 1.5,
        "alignment": 2,
        "vertical_margin_pct": 0.16,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "none",
        "roles": {
            "base": {
                "font": "Inter",
                "weight": 400,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00F0F0F0",
                "outline": "&H30000000",
                "shadow": "&H80000000"
            },
            "accent": {
                "font": "DM Serif Display",
                "weight": 400,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.25,
                "color": "&H00FFD7B0",
                "outline": "&H30000000",
                "shadow": "&H80000000"
            },
            "soft": {
                "font": "Inter",
                "weight": 300,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H00A0A0A0",
                "outline": "&H30000000",
                "shadow": "&H80000000"
            }
        },
        "grouping": {
            "mode": "medium",
            "max_words": 5,
            "max_chars": 34,
            "max_pause": 0.5
        }
    },
    "italic_whisper": {
        "id": "italic_whisper",
        "name": "Italic Whisper",
        "description": "Bold modern grotesk body contrasted with expressive cursive serif accents that float off the screen.",
        "font": "Montserrat",
        "font_size_pct": 0.052,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00B5B5FF",    # Pastel Coral / Rose
        "outline_color": "&H40000000",
        "outline_width_pct": 0.02,
        "shadow_color": "&HA0000000",
        "shadow_depth_pct": 0.04,
        "spacing": -1,
        "blur": 2.0,
        "alignment": 2,
        "vertical_margin_pct": 0.18,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "pop",
        "roles": {
            "base": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "accent": {
                "font": "Instrument Serif",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 1.40,
                "color": "&H00B5B5FF",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "soft": {
                "font": "Playfair Display",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H00CCCCCC",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 4,
            "max_chars": 26,
            "max_pause": 0.45
        }
    },
    "weight_ladder": {
        "id": "weight_ladder",
        "name": "Weight Ladder",
        "description": "Unified neo-grotesque family that steps dramatically from 300 Light to 700 Bold uppercase.",
        "font": "Inter",
        "font_size_pct": 0.050,
        "bold": False,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00D5FF00",    # Electric Cyan / Lime
        "outline_color": "&H00000000",
        "outline_width_pct": 0.05,
        "shadow_color": "&H80000000",
        "shadow_depth_pct": 0.03,
        "spacing": -1,
        "blur": 1.0,
        "alignment": 2,
        "vertical_margin_pct": 0.18,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "pop",
        "roles": {
            "base": {
                "font": "Inter",
                "weight": 400,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "accent": {
                "font": "Inter",
                "weight": 700,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.30,
                "color": "&H00D5FF00",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "soft": {
                "font": "Inter",
                "weight": 300,
                "italic": False,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H008E8E93",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 3,
            "max_chars": 22,
            "max_pause": 0.4
        }
    },

    # -------------------------------------------------------------------------
    # EXISTING PRESETS (Updated with default roles)
    # -------------------------------------------------------------------------
    "aesthetic_editorial": {
        "id": "aesthetic_editorial",
        "name": "Aesthetic Editorial",
        "description": "Modern creator look: two-tier hierarchy with tight tracking, soft ice-blue keyword emphasis, and subtle cinematic shadow.",
        "font": "Montserrat",
        "font_size_pct": 0.058,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FFD4A8",    # Soft Ice Blue
        "outline_color": "&H40000000",
        "outline_width_pct": 0.015,
        "shadow_color": "&HA0000000",
        "shadow_depth_pct": 0.045,
        "spacing": -2,
        "blur": 2.5,
        "alignment": 2,
        "vertical_margin_pct": 0.22,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "editorial",
        "roles": {
            "base": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "accent": {
                "font": "Montserrat",
                "weight": 900,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.35,
                "color": "&H00FFD4A8",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            },
            "soft": {
                "font": "Instrument Serif",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H00D0D0D0",
                "outline": "&H40000000",
                "shadow": "&HA0000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 4,
            "max_chars": 28,
            "max_pause": 0.45
        }
    },
    "hormozi_pop": {
        "id": "hormozi_pop",
        "name": "Hormozi Pop",
        "description": "1-3 bold uppercase words with thick black outline, bright gold active word, and scale-pop animation.",
        "font": "Montserrat",
        "font_size_pct": 0.055,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000D7FF",    # Bright Gold (BGR)
        "outline_color": "&H00000000",
        "outline_width_pct": 0.085,
        "shadow_color": "&H80000000",
        "shadow_depth_pct": 0.03,
        "alignment": 2,
        "vertical_margin_pct": 0.18,
        "border_style": 1,
        "uppercase": True,
        "animation_type": "pop",
        "scale_pop_pct": 112,
        "roles": {
            "base": {
                "font": "Montserrat",
                "weight": 800,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "accent": {
                "font": "Montserrat",
                "weight": 900,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.25,
                "color": "&H0000D7FF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "soft": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": True,
                "size_mult": 0.85,
                "color": "&H00CCCCCC",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 3,
            "max_chars": 22,
            "max_pause": 0.4
        }
    },
    "karaoke": {
        "id": "karaoke",
        "name": "Karaoke Highlight",
        "description": "Full phrase visible; current word smoothly color-swaps using precise timing tags.",
        "font": "Poppins",
        "font_size_pct": 0.050,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FF00",    # Vibrant Neon Green
        "outline_color": "&H00000000",
        "outline_width_pct": 0.075,
        "shadow_color": "&H80000000",
        "shadow_depth_pct": 0.03,
        "alignment": 2,
        "vertical_margin_pct": 0.16,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "karaoke",
        "roles": {
            "base": {
                "font": "Poppins",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "accent": {
                "font": "Poppins",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.20,
                "color": "&H0000FF00",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "soft": {
                "font": "Poppins",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H00BBBBBB",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            }
        },
        "grouping": {
            "mode": "medium",
            "max_words": 5,
            "max_chars": 32,
            "max_pause": 0.5
        }
    },
    "clean_minimal": {
        "id": "clean_minimal",
        "name": "Clean Minimal",
        "description": "Single line, bottom-aligned, subtle soft shadow, zero jitter. Ideal for podcasts and long-form video.",
        "font": "Inter",
        "font_size_pct": 0.040,
        "bold": False,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FFFFFF",
        "outline_color": "&H99000000",
        "outline_width_pct": 0.040,
        "shadow_color": "&HAA000000",
        "shadow_depth_pct": 0.035,
        "alignment": 2,
        "vertical_margin_pct": 0.10,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "none",
        "roles": {
            "base": {
                "font": "Inter",
                "weight": 400,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H99000000",
                "shadow": "&HAA000000"
            },
            "accent": {
                "font": "Inter",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.15,
                "color": "&H00FFFFFF",
                "outline": "&H99000000",
                "shadow": "&HAA000000"
            },
            "soft": {
                "font": "Inter",
                "weight": 300,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.90,
                "color": "&H00CCCCCC",
                "outline": "&H99000000",
                "shadow": "&HAA000000"
            }
        },
        "grouping": {
            "mode": "long",
            "max_words": 7,
            "max_chars": 48,
            "max_pause": 0.6
        }
    },
    "boxed": {
        "id": "boxed",
        "name": "Boxed",
        "description": "Crisp text rendered over a semi-transparent dark rounded backdrop for 100% legibility on noisy video.",
        "font": "Montserrat",
        "font_size_pct": 0.048,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0000FFFF",    # Bright Yellow
        "outline_color": "&H80000000",
        "outline_width_pct": 0.12,
        "shadow_color": "&H00000000",
        "shadow_depth_pct": 0.0,
        "alignment": 2,
        "vertical_margin_pct": 0.16,
        "border_style": 3,
        "uppercase": True,
        "animation_type": "box",
        "roles": {
            "base": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H80000000",
                "shadow": "&H00000000"
            },
            "accent": {
                "font": "Montserrat",
                "weight": 900,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.25,
                "color": "&H0000FFFF",
                "outline": "&H80000000",
                "shadow": "&H00000000"
            },
            "soft": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": True,
                "size_mult": 0.85,
                "color": "&H00CCCCCC",
                "outline": "&H80000000",
                "shadow": "&H00000000"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 3,
            "max_chars": 24,
            "max_pause": 0.4
        }
    },
    "neon_glow": {
        "id": "neon_glow",
        "name": "Neon Glow",
        "description": "High-energy cyber aesthetic with intense blurred neon outer glow.",
        "font": "Montserrat",
        "font_size_pct": 0.056,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H00FFFF00",    # Electric Cyan (BGR)
        "outline_color": "&H00FF00FF",      # Magenta/Purple neon outline
        "outline_width_pct": 0.09,
        "shadow_color": "&H00FF00FF",
        "shadow_depth_pct": 0.06,
        "alignment": 2,
        "vertical_margin_pct": 0.18,
        "border_style": 1,
        "uppercase": True,
        "animation_type": "neon",
        "roles": {
            "base": {
                "font": "Montserrat",
                "weight": 800,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H00FF00FF",
                "shadow": "&H00FF00FF"
            },
            "accent": {
                "font": "Montserrat",
                "weight": 900,
                "italic": False,
                "uppercase": True,
                "size_mult": 1.30,
                "color": "&H00FFFF00",
                "outline": "&H00FF00FF",
                "shadow": "&H00FF00FF"
            },
            "soft": {
                "font": "Montserrat",
                "weight": 700,
                "italic": False,
                "uppercase": True,
                "size_mult": 0.85,
                "color": "&H00DDDDDD",
                "outline": "&H00FF00FF",
                "shadow": "&H00FF00FF"
            }
        },
        "grouping": {
            "mode": "short",
            "max_words": 3,
            "max_chars": 20,
            "max_pause": 0.35
        }
    },
    "typewriter": {
        "id": "typewriter",
        "name": "Typewriter / Fade",
        "description": "Words smoothly appear and fade in sequentially with clean alpha transitions.",
        "font": "Poppins",
        "font_size_pct": 0.048,
        "bold": True,
        "italic": False,
        "primary_color": "&H00FFFFFF",
        "highlight_color": "&H0033CCFF",    # Coral/Gold accent
        "outline_color": "&H00000000",
        "outline_width_pct": 0.070,
        "shadow_color": "&H80000000",
        "shadow_depth_pct": 0.035,
        "alignment": 2,
        "vertical_margin_pct": 0.16,
        "border_style": 1,
        "uppercase": False,
        "animation_type": "fade",
        "roles": {
            "base": {
                "font": "Poppins",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.0,
                "color": "&H00FFFFFF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "accent": {
                "font": "Poppins",
                "weight": 700,
                "italic": False,
                "uppercase": False,
                "size_mult": 1.25,
                "color": "&H0033CCFF",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            },
            "soft": {
                "font": "Poppins",
                "weight": 400,
                "italic": True,
                "uppercase": False,
                "size_mult": 0.85,
                "color": "&H00CCCCCC",
                "outline": "&H00000000",
                "shadow": "&H80000000"
            }
        },
        "grouping": {
            "mode": "medium",
            "max_words": 4,
            "max_chars": 28,
            "max_pause": 0.45
        }
    }
}


def load_custom_presets() -> Dict[str, Dict[str, Any]]:
    """Load all custom JSON presets from workspace/presets/."""
    custom = {}
    if not WORKSPACE_PRESETS_DIR.exists():
        return custom
    for p in WORKSPACE_PRESETS_DIR.glob("*.json"):
        try:
            data = json.loads(p.read_text(encoding="utf-8"))
            if isinstance(data, dict) and "id" in data:
                data["is_custom"] = True
                custom[data["id"]] = data
        except Exception:
            continue
    return custom


def save_custom_preset(preset_data: Dict[str, Any]) -> Dict[str, Any]:
    """Save a user-defined preset to workspace/presets/{id}.json."""
    WORKSPACE_PRESETS_DIR.mkdir(parents=True, exist_ok=True)
    preset_id = str(preset_data.get("id", "")).strip().lower()
    if not preset_id:
        import uuid
        preset_id = f"custom_{uuid.uuid4().hex[:6]}"
    preset_data["id"] = preset_id
    preset_data["is_custom"] = True
    out_file = WORKSPACE_PRESETS_DIR / f"{preset_id}.json"
    out_file.write_text(json.dumps(preset_data, indent=2, ensure_ascii=False), encoding="utf-8")
    return preset_data


def delete_custom_preset(preset_id: str) -> bool:
    """Delete a user-defined preset from workspace/presets/."""
    target = WORKSPACE_PRESETS_DIR / f"{preset_id}.json"
    if target.exists():
        target.unlink()
        return True
    return False


def get_preset(style_id: str) -> Dict[str, Any]:
    """Retrieve preset by ID, checking custom presets then built-ins."""
    custom = load_custom_presets()
    if style_id in custom:
        return custom[style_id].copy()
    return STYLE_PRESETS.get(style_id, STYLE_PRESETS["editorial_mix"]).copy()


def list_presets() -> List[Dict[str, Any]]:
    """Return all style presets (built-ins + user custom) as a list."""
    built_in = [dict(p, is_custom=False) for p in STYLE_PRESETS.values()]
    custom = list(load_custom_presets().values())
    return built_in + custom
