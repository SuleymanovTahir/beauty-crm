import os

def add_path_comment(root_dir):
    for dirpath, dirnames, filenames in os.walk(root_dir):
        # Exclude node_modules
        if 'node_modules' in dirnames:
            dirnames.remove('node_modules')
        
        for filename in filenames:
            if filename.endswith('.tsx'):
                file_path = os.path.join(dirpath, filename)
                abs_path = os.path.abspath(file_path)
                
                with open(file_path, 'r', encoding='utf-8') as f:
                    content = f.read()
                
                # Calculate relative path
                rel_path = os.path.relpath(file_path, "/Users/tahir/Desktop/beauty-crm")
                # Ensure it starts with / if desired, or just use rel_path. 
                # User asked to remove /Users/tahir/Desktop/beauty-crm, so /frontend/... is likely expected.
                expected_comment = f"// /{rel_path}"
                
                # Check if the first line is already the path comment
                first_line = content.split('\n')[0] if content else ''

                # Check if the first line is already the path comment (absolute or relative)
                # We need to update it if it's the old absolute path OR if it's missing
                
                # If the first line starts with // and contains .tsx, we might want to replace it
                if first_line.startswith("// ") and first_line.strip().endswith(".tsx"):
                    if first_line.strip() == expected_comment.strip():
                        print(f"Skipping {filename}: already has correct path comment")
                        continue
                    else:
                        # It has a comment but it's different (e.g. absolute path), so we replace it
                        lines = content.split('\n')
                        lines[0] = expected_comment
                        new_content = '\n'.join(lines)
                else:
                    # No comment, prepend it
                    new_content = f"{expected_comment}\n{content}"
                
                with open(file_path, 'w', encoding='utf-8') as f:
                    f.write(new_content)
                
                print(f"Updated {filename}")

if __name__ == "__main__":
    frontend_dir = "/Users/tahir/Desktop/beauty-crm/frontend"
    add_path_comment(frontend_dir)
