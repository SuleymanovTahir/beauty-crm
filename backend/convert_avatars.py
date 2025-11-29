#!/usr/bin/env python3
import os
from pathlib import Path
from PIL import Image

def convert_to_webp(image_path, quality=85):
    try:
        img = Image.open(image_path)
        if img.mode in ('RGBA', 'LA', 'P'):
            background = Image.new('RGB', img.size, (255, 255, 255))
            if img.mode == 'P':
                img = img.convert('RGBA')
            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
            img = background
        elif img.mode != 'RGB':
            img = img.convert('RGB')
        
        webp_path = image_path.with_suffix('.webp')
        img.save(webp_path, 'WEBP', quality=quality, method=6)
        
        print(f"✅ {image_path.name} -> {webp_path.name}")
        # os.remove(image_path) # Keep original for now until code is updated
        return True
    except Exception as e:
        print(f"❌ Error converting {image_path.name}: {e}")
        return False

def main():
    avatars_dir = Path(__file__).parent / "static" / "avatars"
    if not avatars_dir.exists():
        print(f"❌ {avatars_dir} not found")
        return

    for ext in ['.png', '.jpg', '.jpeg']:
        for img_path in avatars_dir.glob(f"*{ext}"):
            convert_to_webp(img_path)

if __name__ == "__main__":
    main()
