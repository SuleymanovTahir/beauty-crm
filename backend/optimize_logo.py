#!/usr/bin/env python3
from PIL import Image
import os

def optimize_logo():
    files_to_optimize = [
        "/Users/tahir/Desktop/beauty-crm/frontend/src/pages/public/logo.png",
        "/Users/tahir/Desktop/beauty-crm/frontend/public_landing/assets/logo.png"
    ]
    
    for input_path in files_to_optimize:
        if not os.path.exists(input_path):
            print(f"❌ File not found: {input_path}")
            continue
            
        output_path = input_path.replace('.png', '.webp')

    try:
        img = Image.open(input_path)
        print(f"Original size: {img.size}")
        
        # Resize if too large (e.g., max width 500px is usually enough for a logo)
        # But let's check aspect ratio. If it's high res, maybe 800px width is safe.
        max_width = 800
        if img.width > max_width:
            ratio = max_width / img.width
            new_height = int(img.height * ratio)
            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
            print(f"Resized to: {img.size}")
            
        img.save(output_path, "WEBP", quality=90)
        
        original_size = os.path.getsize(input_path)
        new_size = os.path.getsize(output_path)
        
        print(f"✅ Optimized: {original_size/1024:.1f}KB -> {new_size/1024:.1f}KB")
        
    except Exception as e:
        print(f"❌ Error: {e}")

if __name__ == "__main__":
    optimize_logo()
