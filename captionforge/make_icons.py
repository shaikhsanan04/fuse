from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path
import math

def create_fuse_icon():
    size = 512
    # Create master image with transparent background
    img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    draw = ImageDraw.Draw(img)

    # 1. Rounded squircle background
    radius = 110
    squircle_box = (24, 24, size - 24, size - 24)
    
    # Outer dark glow/shadow
    shadow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sdraw = ImageDraw.Draw(shadow)
    sdraw.rounded_rectangle(squircle_box, radius=radius, fill=(10, 10, 12, 220))
    shadow = shadow.filter(ImageFilter.GaussianBlur(8))
    img.paste(shadow, (0, 0), shadow)

    # Base dark gradient background
    base = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    bdraw = ImageDraw.Draw(base)
    bdraw.rounded_rectangle(squircle_box, radius=radius, fill=(18, 18, 22, 255), outline=(42, 42, 48, 255), width=4)
    img.paste(base, (0, 0), base)

    # Inner subtle highlight gradient on squircle top
    top_box = (26, 26, size - 26, size // 2)
    top_mask = Image.new('L', (size, size), 0)
    tdraw = ImageDraw.Draw(top_mask)
    tdraw.rounded_rectangle(squircle_box, radius=radius, fill=255)
    
    highlight = Image.new('RGBA', (size, size), (255, 255, 255, 12))
    img.paste(highlight, (0, 0), top_mask)

    # 2. Main 4-point Sparkle / Ignition Spark
    cx, cy = size // 2, size // 2
    spark_len = 160
    spark_width = 32

    # Draw glow behind sparkle
    glow = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    gdraw = ImageDraw.Draw(glow)
    gdraw.ellipse((cx - 80, cy - 80, cx + 80, cy + 80), fill=(255, 215, 120, 80))
    glow = glow.filter(ImageFilter.GaussianBlur(30))
    img.paste(glow, (0, 0), glow)

    # Sparkle polygon points
    # 4 points: top, right, bottom, left with concave arcs towards center
    spark_pts = [
        (cx, cy - spark_len),                  # Top tip
        (cx + spark_width // 2, cy - spark_width // 2),
        (cx + spark_len, cy),                  # Right tip
        (cx + spark_width // 2, cy + spark_width // 2),
        (cx, cy + spark_len),                  # Bottom tip
        (cx - spark_width // 2, cy + spark_width // 2),
        (cx - spark_len, cy),                  # Left tip
        (cx - spark_width // 2, cy - spark_width // 2),
    ]

    spark_img = Image.new('RGBA', (size, size), (0, 0, 0, 0))
    sp_draw = ImageDraw.Draw(spark_img)
    sp_draw.polygon(spark_pts, fill=(255, 255, 255, 255))

    # Diagonal secondary micro-sparks
    d_len = 55
    d_w = 12
    diag_pts = [
        (cx - d_len, cy - d_len),
        (cx, cy - d_w),
        (cx + d_len, cy - d_len),
        (cx + d_w, cy),
        (cx + d_len, cy + d_len),
        (cx, cy + d_w),
        (cx - d_len, cy + d_len),
        (cx - d_w, cy),
    ]
    sp_draw.polygon(diag_pts, fill=(255, 235, 190, 200))
    
    # Center bright core
    sp_draw.ellipse((cx - 24, cy - 24, cx + 24, cy + 24), fill=(255, 255, 255, 255))
    
    img.paste(spark_img, (0, 0), spark_img)

    # 3. Export formats
    assets_dir = Path("captionforge/assets")
    assets_dir.mkdir(parents=True, exist_ok=True)

    png_path = assets_dir / "fuse.png"
    ico_path = assets_dir / "fuse.ico"

    img.save(png_path, format="PNG")
    print(f"Saved PNG to {png_path}")

    # Generate multi-size ICO
    icon_sizes = [(256, 256), (128, 128), (64, 64), (48, 48), (32, 32), (16, 16)]
    img.save(ico_path, format="ICO", sizes=icon_sizes)
    print(f"Saved ICO to {ico_path}")

    # Also copy to frontend public
    public_favicon = Path("captionforge/frontend/public/favicon.ico")
    img.save(public_favicon, format="ICO", sizes=icon_sizes)
    print(f"Updated public favicon at {public_favicon}")

if __name__ == "__main__":
    create_fuse_icon()
