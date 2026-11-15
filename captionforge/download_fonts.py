"""
Download required fonts from Google Fonts repository into fonts/
Bundles: Montserrat, Poppins, Bebas Neue, Anton, Inter, Roboto, Noto Sans Devanagari
"""
import os
import urllib.request
from pathlib import Path

FONTS = {
    # Montserrat
    "Montserrat-Variable.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/montserrat/Montserrat%5Bwght%5D.ttf",
    # Poppins
    "Poppins-Bold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Bold.ttf",
    "Poppins-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-Regular.ttf",
    "Poppins-SemiBold.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/poppins/Poppins-SemiBold.ttf",
    # Bebas Neue
    "BebasNeue-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/bebasneue/BebasNeue-Regular.ttf",
    # Anton
    "Anton-Regular.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/anton/Anton-Regular.ttf",
    # Inter
    "Inter-Variable.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/inter/Inter%5Bopsz%2Cwght%5D.ttf",
    # Roboto
    "Roboto-Variable.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/roboto/Roboto%5Bwdth%2Cwght%5D.ttf",
    # Noto Sans Devanagari
    "NotoSansDevanagari-Variable.ttf": "https://raw.githubusercontent.com/google/fonts/main/ofl/notosansdevanagari/NotoSansDevanagari%5Bwdth%2Cwght%5D.ttf",
}

def download_fonts():
    fonts_dir = Path(__file__).resolve().parent / "fonts"
    fonts_dir.mkdir(parents=True, exist_ok=True)
    
    headers = {"User-Agent": "Mozilla/5.0"}
    for filename, url in FONTS.items():
        dest = fonts_dir / filename
        if dest.exists() and dest.stat().st_size > 1000:
            print(f"[OK] {filename} already exists ({dest.stat().st_size} bytes)")
            continue
        print(f"Downloading {filename}...")
        try:
            req = urllib.request.Request(url, headers=headers)
            with urllib.request.urlopen(req) as resp, open(dest, "wb") as out_f:
                out_f.write(resp.read())
            print(f"[Downloaded] {filename} ({dest.stat().st_size} bytes)")
        except Exception as e:
            print(f"[Failed] {filename}: {e}")

if __name__ == "__main__":
    download_fonts()
