#!/usr/bin/env python3
"""
Comprehensive script to find and fix ALL boolean integer issues for PostgreSQL
Finds: True if x else False patterns that should be True if x else False
"""
import os
import re
from pathlib import Path

def find_boolean_integer_issues(root_dir):
    """Find ALL boolean integer issues"""
    
    results = []
    
    for py_file in Path(root_dir).rglob('*.py'):
        if 'venv' in str(py_file) or '__pycache__' in str(py_file):
            continue
            
        try:
            with open(py_file, 'r', encoding='utf-8') as f:
                content = f.read()
                lines = content.split('\n')
                
                for line_num, line in enumerate(lines, 1):
                    if line.strip().startswith('#'):
                        continue
                    
                    # Pattern: True if ... else False or False if ... else True
                    if re.search(r'\b[01]\s+if\s+.*\s+else\s+[01]\b', line):
                        # Skip sys.exit patterns
                        if 'sys.exit' in line or 'exit(' in line:
                            continue
                        # Skip array index patterns
                        if 'proxy_urls' in line or '[attempt' in line:
                            continue
                        
                        results.append({
                            'file': str(py_file.relative_to(root_dir)),
                            'line': line_num,
                            'content': line.strip(),
                            'type': 'ternary'
                        })
        except Exception as e:
            pass
    
    return results

def fix_file(file_path):
    """Fix boolean integers in file"""
    
    try:
        with open(file_path, 'r', encoding='utf-8') as f:
            content = f.read()
        
        original = content
        changes = []
        
        # Pattern: True if condition else False
        pattern1 = re.compile(r'\b1\s+if\s+(.*?)\s+else\s+0\b')
        matches1 = pattern1.findall(content)
        if matches1:
            content = pattern1.sub(r'True if \1 else False', content)
            changes.append(f"True if ... else False → True if ... else False ({len(matches1)}x)")
        
        # Pattern: False if condition else True
        pattern2 = re.compile(r'\b0\s+if\s+(.*?)\s+else\s+1\b')
        matches2 = pattern2.findall(content)
        if matches2:
            content = pattern2.sub(r'False if \1 else True', content)
            changes.append(f"False if ... else True → False if ... else True ({len(matches2)}x)")
        
        # Save if changed
        if content != original:
            with open(file_path, 'w', encoding='utf-8') as f:
                f.write(content)
            return changes
        
        return []
        
    except Exception as e:
        print(f"❌ Error in {file_path}: {e}")
        return []

def main():
    backend_dir = Path(__file__).parent.parent.parent
    
    print("🔍 COMPREHENSIVE BOOLEAN INTEGER SCAN")
    print("=" * 80)
    
    # Step 1: Find all issues
    results = find_boolean_integer_issues(backend_dir)
    
    if not results:
        print("✅ No boolean integer issues found!")
        return
    
    print(f"\n⚠️  Found {len(results)} potential issues\n")
    
    # Group by file
    by_file = {}
    for r in results:
        if r['file'] not in by_file:
            by_file[r['file']] = []
        by_file[r['file']].append(r)
    
    # Show summary
    print("📋 FILES WITH ISSUES:")
    print("-" * 80)
    for file_path, issues in sorted(by_file.items()):
        print(f"  {file_path}: {len(issues)} issues")
    
    # Ask for confirmation
    print("\n" + "=" * 80)
    response = input(f"\nFix all {len(results)} issues automatically? (yes/no): ")
    if response.lower() not in ['yes', 'y', 'да']:
        print("Cancelled")
        return
    
    # Step 2: Fix all files
    print("\n🔧 FIXING FILES...")
    print("=" * 80)
    
    total_files = 0
    total_changes = 0
    
    for file_rel in by_file.keys():
        file_path = backend_dir / file_rel
        if not file_path.exists():
            continue
        
        changes = fix_file(file_path)
        if changes:
            total_files += 1
            total_changes += len(changes)
            print(f"\n✅ {file_rel}")
            for change in changes:
                print(f"   • {change}")
    
    print("\n" + "=" * 80)
    print(f"📊 SUMMARY: Fixed {total_changes} patterns in {total_files} files")
    print("=" * 80)

if __name__ == '__main__':
    main()
