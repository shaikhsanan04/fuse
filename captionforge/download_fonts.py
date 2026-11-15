"""
CaptionForge - Font Acquisition Script
Downloads and generates STATIC TrueType font files (no variable fonts)
Bundles: Montserrat (Black, ExtraBold, Bold), Inter (Light, Regular, Bold),
Playfair Display (Regular, Italic), DM Serif Display (Regular, Italic),
Instrument Serif (Regular, Italic), Noto Sans Devanagari (Regular, Bold),
Poppins, Bebas Neue, and Anton.
"""
import os
import urllib.request
from pathlib import Path

def download_and_setup_fonts():
    fonts_dir = Path(__file__).resolve().parent / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    headers = {"User-Agent": "Mozilla/5.0"}

    def fetch(url: str, dest: Path):
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"[OK] {dest.name} already exists.")
            return
        print(f"Downloading {dest.name}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp, open(dest, "wb") as out_f:
                out_f.write(resp.read())
            print(f"[Downloaded] {dest.name} ({dest.stat().st_size} bytes)")
        except Exception as e:
            print(f"[Error] Failed {dest.name}: {e}")

    # 1. Direct Static Fonts
    DIRECT_FONTS = {
        # DM Serif Display
        "DMSerifDisplay-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/dmserifdisplay/DMSerifDisplay-Regular.ttf",
        "DMSerifDisplay-Italic.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/dmserifdisplay/DMSerifDisplay-Italic.ttf",
        # Instrument Serif
        "InstrumentSerif-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Regular.ttf",
        "InstrumentSerif-Italic.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/instrumentserif/InstrumentSerif-Italic.ttf",
        # Montserrat Static
        "Montserrat-Bold.ttf": "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Bold.ttf",
        "Montserrat-ExtraBold.ttf": "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-ExtraBold.ttf",
        "Montserrat-Black.ttf": "https://raw.githubusercontent.com/JulietaUla/Montserrat/master/fonts/ttf/Montserrat-Black.ttf",
        # Poppins, Anton, Bebas
        "Poppins-Bold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf",
        "Poppins-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf",
        "Poppins-SemiBold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf",
        "BebasNeue-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
        "Anton-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf",
    }

    for name, url in DIRECT_FONTS.items():
        fetch(url, fonts_dir / name)

    # 2. Instantiated Static Fonts via fonttools
    try:
        from fontTools.ttLib import TTFont
        from fontTools.varLib.instancer import instantiateVariableFont

        # Playfair Display
        if not (fonts_dir / "PlayfairDisplay-Regular.ttf").exists():
            temp_pf = fonts_dir / "temp_pf.ttf"
            fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay%5Bwght%5D.ttf", temp_pf)
            instantiateVariableFont(TTFont(temp_pf), {"wght": 400}).save(fonts_dir / "PlayfairDisplay-Regular.ttf")
            temp_pf.unlink(missing_ok=True)

        if not (fonts_dir / "PlayfairDisplay-Italic.ttf").exists():
            temp_pfi = fonts_dir / "temp_pfi.ttf"
            fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/playfairdisplay/PlayfairDisplay-Italic%5Bwght%5D.ttf", temp_pfi)
            instantiateVariableFont(TTFont(temp_pfi), {"wght": 400}).save(fonts_dir / "PlayfairDisplay-Italic.ttf")
            temp_pfi.unlink(missing_ok=True)

        # Inter Static (Light 300, Regular 400, Bold 700)
        if not ((fonts_dir / "Inter-Light.ttf").exists() and (fonts_dir / "Inter-Regular.ttf").exists() and (fonts_dir / "Inter-Bold.ttf").exists()):
            temp_inter = fonts_dir / "temp_inter.ttf"
            fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf", temp_inter)
            vf = TTFont(temp_inter)
            instantiateVariableFont(vf, {"wght": 300, "opsz": 14}).save(fonts_dir / "Inter-Light.ttf")
            instantiateVariableFont(vf, {"wght": 400, "opsz": 14}).save(fonts_dir / "Inter-Regular.ttf")
            instantiateVariableFont(vf, {"wght": 700, "opsz": 14}).save(fonts_dir / "Inter-Bold.ttf")
            temp_inter.unlink(missing_ok=True)

        # Noto Sans Devanagari Static
        if not ((fonts_dir / "NotoSansDevanagari-Regular.ttf").exists() and (fonts_dir / "NotoSansDevanagari-Bold.ttf").exists()):
            temp_noto = fonts_dir / "temp_noto.ttf"
            fetch("https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf", temp_noto)
            nvf = TTFont(temp_noto)
            instantiateVariableFont(nvf, {"wght": 400}).save(fonts_dir / "NotoSansDevanagari-Regular.ttf")
            instantiateVariableFont(nvf, {"wght": 700}).save(fonts_dir / "NotoSansDevanagari-Bold.ttf")
            temp_noto.unlink(missing_ok=True)

    except Exception as e:
        print(f"[Warning] fonttools instancer step: {e}")

    # Remove any lingering variable fonts
    for var_font in fonts_dir.glob("*-Variable.ttf"):
        try:
            var_font.unlink()
            print(f"[Removed legacy variable font] {var_font.name}")
        except Exception:
            pass

    print("[Success] All fonts verified.")

if __name__ == "__main__":
    download_and_setup_fonts()
