#!/usr/bin/env python3
"""
Скрипт для конвертации изображений в WebP формат (для frontend папки)
"""
import os
from pathlib import Path
from PIL import Image
import sys

def convert_to_webp(image_path, quality=85):
    """Конвертирует изображение в WebP формат"""
    try:
        img = Image.open(image_path)
        
        # Конвертируем в RGB если нужно
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
        
        original_size = os.path.getsize(image_path)
        webp_size = os.path.getsize(webp_path)
        reduction = ((original_size - webp_size) / original_size) * 100
        
        print(f"✅ {image_path.name}")
        print(f"   {original_size / 1024:.1f} KB → {webp_size / 1024:.1f} KB ({reduction:.1f}% меньше)")
        
        os.remove(image_path)
        print(f"   🗑️  Удален оригинал")
        
        return True
    except Exception as e:
        print(f"❌ Ошибка: {image_path.name}: {e}")
        return False

def main():
    target_dir = Path("/Users/tahir/Desktop/beauty-crm/frontend/public_landing/styles/M le Diamant  портфолио")
    
    if not target_dir.exists():
        print(f"❌ Папка не найдена!")
        return
    
    image_extensions = ['.jpg', '.jpeg', '.png', '.JPG', '.JPEG', '.PNG']
    images = []
    
    for ext in image_extensions:
        images.extend(target_dir.rglob(f'*{ext}'))
    
    if not images:
        print("ℹ️  Изображения не найдены")
        return
    
    print(f"🔍 Найдено {len(images)} изображений")
    print("=" * 60)
    
    success_count = 0
    total_original_size = 0
    total_webp_size = 0
    
    for image_path in images:
        original_size = os.path.getsize(image_path)
        total_original_size += original_size
        
        if convert_to_webp(image_path):
            success_count += 1
            webp_path = image_path.with_suffix('.webp')
            if webp_path.exists():
                total_webp_size += os.path.getsize(webp_path)
        print()
    
    print("=" * 60)
    print(f"✅ Успешно: {success_count}/{len(images)}")
    print(f"📊 До:  {total_original_size / 1024 / 1024:.2f} MB")
    print(f"📊 После: {total_webp_size / 1024 / 1024:.2f} MB")
    if total_original_size > 0:
        reduction = ((total_original_size - total_webp_size) / total_original_size) * 100
        print(f"💾 Экономия: {reduction:.1f}%")

if __name__ == "__main__":
    main()
