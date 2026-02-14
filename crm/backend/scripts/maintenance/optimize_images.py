import os
import sys
import json
import hashlib
from PIL import Image
from pathlib import Path

# Add backend directory to path
sys.path.append(os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__)))))

from core.config import UPLOAD_DIR

OPTIMIZATION_TRACKING_FILE = ".optimized_images.json"

def load_optimization_history(directory: str):
    """Load history of optimized images"""
    tracking_file = os.path.join(directory, OPTIMIZATION_TRACKING_FILE)
    if os.path.exists(tracking_file):
        try:
            with open(tracking_file, 'r') as f:
                return json.load(f)
        except:
            return {}
    return {}

def save_optimization_history(directory: str, history: dict):
    """Save history of optimized images"""
    tracking_file = os.path.join(directory, OPTIMIZATION_TRACKING_FILE)
    with open(tracking_file, 'w') as f:
        json.dump(history, f, indent=2)

def should_skip_file(file_path: str, file: str):
    """Check if file should be skipped"""
    # No files are skipped - all images can be optimized
    # PNG files with transparency will be preserved as PNG
    return False


def file_sha256(file_path: str) -> str:
    sha = hashlib.sha256()
    with open(file_path, 'rb') as f:
        while True:
            chunk = f.read(1024 * 1024)
            if not chunk:
                break
            sha.update(chunk)
    return sha.hexdigest()


def optimize_images(directory: str, max_size_kb: int = 500, max_width: int = 1920):
    """
    Optimize images in the given directory recursively.
    - Convert JPG/JPEG/PNG to WebP format (except transparent PNGs)
    - Resize if width > max_width
    - Compress to reduce size below max_size_kb (target)
    - Track optimized content hash to prevent re-optimization
    """
    print(f"🚀 Starting image optimization in {directory}...")
    print(f"Target: Convert to WebP, Max size: < {max_size_kb}KB, Max width: {max_width}px")
    
    # Load optimization history
    history = load_optimization_history(directory)
    
    count = 0
    saved_space = 0
    skipped = 0
    
    for root, _, files in os.walk(directory):
        for file in files:
            if file.lower().endswith(('.jpg', '.jpeg', '.png')):
                file_path = os.path.join(root, file)
                
                # Skip logo files
                if should_skip_file(file_path, file):
                    print(f"⏭️  Skipping {file} (logo file - preserving original)")
                    skipped += 1
                    continue
                
                # Check if already optimized
                file_hash_before = file_sha256(file_path)
                history_item = history.get(file_path, {})
                if isinstance(history_item, dict) and history_item.get("hash") == file_hash_before:
                    skipped += 1
                    continue
                
                original_size_kb = os.path.getsize(file_path) / 1024
                
                try:
                    with Image.open(file_path) as img:
                        # For PNG files, preserve transparency if present
                        if file.lower().endswith('.png') and img.mode in ('RGBA', 'LA', 'P'):
                            # Keep as PNG with transparency
                            if img.mode == 'P':
                                img = img.convert('RGBA')
                            
                            # Calculate new size if needed
                            width, height = img.size
                            if width > max_width:
                                ratio = max_width / width
                                new_height = int(height * ratio)
                                img = img.resize((max_width, new_height), Image.Resampling.LANCZOS)
                                print(f"📉 Resizing {file}: {width}x{height} -> {max_width}x{new_height}")
                            
                            # Save as optimized PNG
                            img.save(file_path, 'PNG', optimize=True)
                            new_size_kb = os.path.getsize(file_path) / 1024
                            saved = original_size_kb - new_size_kb
                            saved_space += saved
                            count += 1
                            history[file_path] = {
                                "hash": file_sha256(file_path),
                                "output": file_path,
                            }
                            print(f"✅ Optimized PNG {file}: {original_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                        else:
                            # Convert to RGB if needed (for PNG without transparency)
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
                            
                            # Track optimization
                            history[file_path] = {
                                "hash": file_hash_before,
                                "output": webp_path,
                            }
                            
                            # Delete original if it's not already webp
                            if not file.lower().endswith('.webp'):
                                os.remove(file_path)
                                print(f"✅ Converted {file} -> {os.path.basename(webp_path)}: {original_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                            else:
                                print(f"✅ Optimized {file}: {original_size_kb:.1f}KB -> {new_size_kb:.1f}KB (Saved {saved:.1f}KB)")
                        
                except Exception as e:
                    print(f"❌ Error processing {file}: {e}")

    # Save optimization history
    save_optimization_history(directory, history)

    print(f"\n🎉 Finished! Optimized {count} images, skipped {skipped} already optimized.")
    print(f"💾 Total space saved: {saved_space/1024:.2f} MB")

if __name__ == "__main__":
    import argparse
    
    parser = argparse.ArgumentParser(description="Optimize images in a directory")
    parser.add_argument("directory", nargs="?", help="Directory to scan")
    parser.add_argument("--max-size", type=int, default=500, help="Max size in KB")
    parser.add_argument("--max-width", type=int, default=1920, help="Max width in pixels")
    
    args = parser.parse_args()
    
    # Default directories to scan: project_root is one level above backend/
    backend_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    project_root = os.path.dirname(backend_dir)
    scan_dirs = [
        os.path.join(backend_dir, "static", "uploads"),
        os.path.join(project_root, "frontend", "public_landing", "styles", "img")
    ]
    
    if args.directory:
        scan_dirs = [args.directory]
    
    for target_dir in scan_dirs:
        if os.path.exists(target_dir):
            optimize_images(target_dir, max_size_kb=args.max_size, max_width=args.max_width)
        else:
            print(f"❌ Directory not found: {target_dir}")
