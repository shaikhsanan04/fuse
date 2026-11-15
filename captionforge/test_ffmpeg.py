from pathlib import Path
import subprocess

fonts_dir = Path('captionforge/fonts').resolve()
ass_file = Path('captionforge/workspace/test.ass').resolve()
input_mp4 = Path('captionforge/workspace/test_input.mp4').resolve()
output_mp4 = Path('captionforge/workspace/test_output.mp4').resolve()

ass_content = """[Script Info]
Title: Test
ScriptType: v4.00+
WrapStyle: 0
ScaledBorderAndShadow: yes
PlayResX: 1080
PlayResY: 1920

[V4+ Styles]
Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding
Style: Default,Montserrat,90,&H00FFFFFF,&H0000FFFF,&H00000000,&H80000000,-1,0,0,0,100,100,0,0,1,6,2,2,40,40,300,1

[Events]
Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text
Dialogue: 0,0:00:00.50,0:00:02.00,Default,,0,0,0,,{\\c&H0000D7FF&}CAPTIONFORGE{\\r} IS LIVE
Dialogue: 0,0:00:02.00,0:00:04.00,Default,,0,0,0,,FAST & {\\c&H0000D7FF&}BEAUTIFUL{\\r}
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
    '-i', str(input_mp4),
    '-vf', filter_str,
    '-c:v', 'libx264', '-crf', '18', '-preset', 'veryfast',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'copy',
    '-movflags', '+faststart',
    str(output_mp4)
]
print("Running command...")
res = subprocess.run(cmd, capture_output=True, text=True)
print("Return code:", res.returncode)
if res.returncode != 0:
    print("STDERR tail:\n", res.stderr[-800:])
else:
    print("Success! Output size:", output_mp4.stat().st_size)
