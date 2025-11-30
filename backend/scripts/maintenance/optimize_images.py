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
    - Convert to WebP (if not already)
    - Resize if width > max_width
    - Compress to reduce size below max_size_kb (target)
    """
    print(f"🚀 Starting image optimization in {directory}...")
    print(f"Target size: < {max_size_kb}KB, Max width: {max_width}px")
    
    count = 0
    saved_space = 0
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png', '.webp')):
                file_path = os.path.join(root, file)
                file_size_kb = os.path.getsize(file_path) / 1024
                
                if file_size_kb > max_size_kb:
                    try:
                        with Image.open(file_path) as img:
                            # Calculate new size
                            width, height = img.size
                            if width > max_width:
                                ratio = max_width / width
                                new_height = int(height * ratio)
                                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                                print(f"📉 Resizing {file}: {width}x{height} -> {max_width}x{new_height}")
                            
                            # Save as WebP
                            # If original was not webp, we might want to keep original name to avoid DB break?
                            # Or just overwrite content if it's already webp.
                            # If it's jpg/png, we should probably convert to webp and update DB? 
                            # Updating DB is complex. Let's just optimize the file in place (keep extension if jpg/png but compress? No, webp is better).
                            
                            # Strategy:
                            # 1. If webp: overwrite with optimized webp.
                            # 2. If jpg/png: overwrite with optimized jpg/png (to keep DB links working).
                            
                            output_format = img.format if img.format else 'WEBP'
                            if file.lower().endswith('.webp'):
                                output_format = 'WEBP'
                            elif file.lower().endswith(('.jpg', '.jpeg')):
                                output_format = 'JPEG'
                            elif file.lower().endswith('.png'):
                                output_format = 'PNG'
                                
                            img.save(file_path, format=output_format, quality=80, optimize=True)
                            
                            new_size_kb = os.path.getsize(file_path) / 1024
                            saved = file_size_kb - new_size_kb
                            saved_space += saved
                            count += 1
                            print(f"✅ Optimized {file}: {file_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                            
                    except Exception as e:
                        print(f"❌ Error optimizing {file}: {e}")

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
