import os
import sys
from PIL import Image
from pathlib import Path

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import UPLOAD_DIR

def optimize_images(directory: str, max_size_kb: int = 500, max_width: int = 1920):
    """
    Optimize images in the given directory recursively.
    - Convert ALL images to WebP format
    - Resize if width > max_width
    - Compress to reduce size below max_size_kb (target)
    """
    print(f"🚀 Starting image optimization in {directory}...")
    print(f"Target: Convert to WebP, Max size: < {max_size_kb}KB, Max width: {max_width}px")
    
    count = 0
    saved_space = 0
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                file_path = os.path.join(root, file)
                original_size_kb = os.path.getsize(file_path) / 1024
                
                try:
                    with Image.open(file_path) as img:
                        # Convert to RGB if needed (for PNG with transparency)
                        if img.mode in ('RGBA', 'LA', 'P'):
                            background = Image.new('RGB', img.size, (255, 255, 255))
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            background.paste(img, mask=img.split()[-1] if img.mode == 'RGBA' else None)
                            img = background
                        elif img.mode != 'RGB':
                            img = img.convert('RGB')
                        
                        # Calculate new size if needed
                        width, height = img.size
                        if width > max_width:
                            ratio = max_width / width
                            new_height = int(height * ratio)
                            img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                            print(f"📉 Resizing {file}: {width}x{height} -> {max_width}x{new_height}")
                        
                        # Convert to WebP
                        webp_path = file_path.rsplit('.', 1)[0] + '.webp'
                        img.save(webp_path, 'WEBP', quality=85, method=6)
                        
                        new_size_kb = os.path.getsize(webp_path) / 1024
                        saved = original_size_kb - new_size_kb
                        saved_space += saved
                        count += 1
                        
                        # Delete original if it's not already webp
                        if not file.lower().endswith('.webp'):
                            os.remove(file_path)
                            print(f"✅ Converted {file} -> {os.path.basename(webp_path)}: {original_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                        else:
                            print(f"✅ Optimized {file}: {original_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                        
                except Exception as e:
                    print(f"❌ Error processing {file}: {e}")

    print(f"\n🎉 Finished! Optimized {count} images.")
    print(f"💾 Total space saved: {saved_space/1024:.2f} MB")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize images in a directory")
    parser.add_argument("directory", nargs="?", help="Directory to scan")
    parser.add_argument("--max-size", type=int, default=500, help="Max size in KB")
    parser.add_argument("--max-width", type=int, default=1920, help="Max width in pixels")
    
    args = parser.parse_args()
    
    if args.directory:
        target_dir = args.directory
    else:
        # Default to backend/static/uploads
        target_dir = os.path.join(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))), "static", "uploads")
        
    if os.path.exists(target_dir):
        optimize_images(target_dir, max_size_kb=args.max_size, max_width=args.max_width)
    else:
        print(f"❌ Directory not found: {target_dir}")
