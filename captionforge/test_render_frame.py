from pathlib import Path
import subprocess

fonts_dir = Path('captionforge/fonts').resolve()
ass_file = Path('captionforge/workspace/test_editorial.ass').resolve()
input_mp4 = Path('C:/Users/sanan/Downloads/s1.mp4').resolve()
output_png = Path('captionforge/workspace/test_editorial_frame.png').resolve()

width = 720
height = 1280
font_size = int(height * 0.062) # ~80px
outline = 1
shadow = 3
margin_v = int(height * 0.35)

ass_content = f"""[Script Info]
Title: Aesthetic Editorial Test
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
YCbCr Matrix: TV.601
PlayResX: {width}
PlayResY: {height}

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,{font_size},&H00FFFFFF,&H00FDE6BA,&H40000000,&HA0000000,-1,0,0,0,100,100,-2,0,1,{outline},{shadow},5,40,40,{margin_v},1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:01.00,0:00:04.00,Default,,0,0,0,,{{\\blur2}}{{\\fscx75\\fscy75}}to make videos\\N{{\\fscx145\\fscy145\\c&H00FDE6BA&}}en{{\\c&H00FFFFFF&}}gaging
"""
ass_file.write_text(ass_content, encoding='utf-8')

def escape_path(p: Path) -> str:
    s = str(p.resolve()).replace('\\', '/')
    s = s.replace(':', r'\:')
    s = s.replace("'", r"\'")
    return s

filter_str = f"ass=filename='{escape_path(ass_file)}':fontsdir='{escape_path(fonts_dir)}'"
cmd = [
    'ffmpeg', '-y',
    '-ss', '00:00:02.500',
    '-i', str(input_mp4),
    '-vf', filter_str,
    '-vframes', '1',
    str(output_png)
]
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
print("PNG created:", output_png.exists())
