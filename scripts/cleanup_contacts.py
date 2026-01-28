import os
import re

def replace_in_file(file_path, replacements):
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
            
        original_content = content
        for old, new in replacements.items():
            content = content.replace(old, new)
            
        if content != original_content:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            print(f"✅ Updated: {file_path}")
    except Exception as e:
        # Skip binary or problematic files
        pass

def main():
    replacements = {
        "971526961100": "971526961100",
        "971526961100": "971526961100",
        "mladiamontuae@gmail.com": "mladiamontuae@gmail.com",
    }
    
    exclude_dirs = {'.git', 'node_modules', 'venv', 'dist', '__pycache__', '.cache'}
    
    for root, dirs, files in os.walk('.'):
        dirs[:] = [d for d in dirs if d not in exclude_dirs]
        for file in files:
            if file.endswith(('.json', '.tsx', '.ts', '.js', '.py', '.txt', '.ini', '.md')):
                file_path = os.path.join(root, file)
                replace_in_file(file_path, replacements)

if __name__ == "__main__":
    main()
