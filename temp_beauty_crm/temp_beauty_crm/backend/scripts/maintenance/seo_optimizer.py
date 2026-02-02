"""
SEO Optimization Script
Handles image optimization, alt attribute checking, and performance improvements
"""
import os
import sys
from pathlib import Path
from PIL import Image
import re

# Add backend to path
backend_dir = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(backend_dir))

from utils.logger import log_info, log_error

def optimize_all_images():
    """Convert all images to WebP and optimize"""
    log_info("🖼️ Starting image optimization...", "seo")
    
    frontend_dir = backend_dir.parent / "frontend"
    
    # Directories to optimize
    dirs_to_optimize = [
        frontend_dir / "public_landing" / "assets",
        backend_dir / "static" / "uploads",
    ]
    
    total_saved = 0
    images_optimized = 0
    
    for directory in dirs_to_optimize:
        if not directory.exists():
            log_info(f"⏭️  Skipping {directory} (doesn't exist)", "seo")
            continue
            
        for img_path in directory.rglob("*"):
            if img_path.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                try:
                    # Open image
                    img = Image.open(img_path)
                    
                    # Get original size
                    original_size = img_path.stat().st_size
                    
                    # Convert to WebP
                    webp_path = img_path.with_suffix('.webp')
                    
                    # Skip if WebP already exists and is smaller
                    if webp_path.exists():
                        webp_size = webp_path.stat().st_size
                        if webp_size < original_size:
                            log_info(f"⏭️  Skipping {img_path.name} (WebP already exists)", "seo")
                            continue
                    
                    # Optimize and save
                    img.save(webp_path, 'WebP', quality=85, method=6)
                    
                    new_size = webp_path.stat().st_size
                    saved = original_size - new_size
                    total_saved += saved
                    images_optimized += 1
                    
                    log_info(f"✓ Optimized {img_path.name}: {original_size/1024:.1f}KB → {new_size/1024:.1f}KB (saved {saved/1024:.1f}KB)", "seo")
                    
                    # Remove original if WebP is smaller
                    if new_size < original_size:
                        img_path.unlink()
                        log_info(f"🗑️  Removed original {img_path.name}", "seo")
                        
                except Exception as e:
                    log_error(f"Failed to optimize {img_path}: {e}", "seo")
    
    if images_optimized > 0:
        log_info(f"✓ Optimized {images_optimized} images, saved {total_saved/1024/1024:.2f}MB total", "seo")
    else:
        log_info("ℹ️  No images needed optimization", "seo")

def check_alt_attributes():
    """Scan HTML and TSX files for images missing alt attributes"""
    log_info("🔍 Checking for missing alt attributes...", "seo")
    
    frontend_dir = backend_dir.parent / "frontend"
    
    # Find all HTML and TSX files
    html_files = list(frontend_dir.rglob("*.html"))
    tsx_files = list(frontend_dir.rglob("*.tsx"))
    
    all_files = html_files + tsx_files
    
    issues = []
    
    for file_path in all_files:
        try:
            content = file_path.read_text(encoding='utf-8')
            
            # Skip tracking pixels and analytics
            if 'facebook.com/tr' in content or 'google-analytics' in content:
                # Check if it's a tracking pixel (1x1 invisible image)
                tracking_pattern = r'<img[^>]*(?:facebook\.com/tr|google-analytics)[^>]*>'
                content = re.sub(tracking_pattern, '', content, flags=re.IGNORECASE)
            
            # Find img tags - handle multiline tags
            # Use DOTALL to match across newlines
            img_tags = re.findall(r'<img[^>]*>', content, re.IGNORECASE | re.DOTALL)
            
            for tag in img_tags:
                # Skip if has alt attribute (even empty alt="")
                if 'alt=' not in tag.lower():
                    # Skip tracking pixels (1x1 hidden images)
                    if 'display:none' in tag or 'display: none' in tag:
                        continue
                    if 'height="1"' in tag and 'width="1"' in tag:
                        continue
                    
                    # Extract src for better reporting
                    src_match = re.search(r'src=["\']([^"\']+)["\']', tag, re.DOTALL)
                    if not src_match:
                        # Try to find src in dynamic expressions
                        src_match = re.search(r'src=\{([^}]+)\}', tag)
                    
                    src = src_match.group(1) if src_match else "unknown"
                    
                    # Clean up multiline tags for display
                    clean_tag = ' '.join(tag.split())
                    
                    issues.append({
                        'file': file_path.relative_to(frontend_dir),
                        'src': src,
                        'tag': clean_tag[:80] + '...' if len(clean_tag) > 80 else clean_tag
                    })
        except Exception as e:
            log_error(f"Error checking {file_path}: {e}", "seo")
    
    if issues:
        log_error(f"❌ Found {len(issues)} images without alt attributes:", "seo")
        for issue in issues[:10]:  # Show first 10
            print(f"  📄 {issue['file']}")
            print(f"     🖼️  {issue['src']}")
            print(f"     {issue['tag']}\n")
        
        if len(issues) > 10:
            print(f"  ... and {len(issues) - 10} more")
    else:
        log_info("✓ All images have alt attributes", "seo")
    
    return len(issues)

def optimize_seo():
    """Alias for main() - для совместимости с run_all_fixes"""
    main()

def main():
    """Run all SEO optimizations"""
    log_info("🚀 Starting SEO Optimization Suite", "seo")
    
    # 1. Optimize images
    optimize_all_images()
    
    # 2. Check alt attributes
    missing_alts = check_alt_attributes()
    
    log_info("✓ SEO Optimization Complete!", "seo")
    
    if missing_alts > 0:
        log_info(f"⚠️  Action required: Fix {missing_alts} images missing alt attributes", "seo")

if __name__ == "__main__":
    main()
