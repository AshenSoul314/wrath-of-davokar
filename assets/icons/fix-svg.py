'''
Quick script to fix the SVG tag for foundry compatibility
'''
import os
import re
from pathlib import Path

# 🔧 Folder with your SVG files
FOLDER = Path('./')
WIDTH = '512px'
HEIGHT = '512px'

# Regex patterns
svg_tag_pattern = re.compile(r'<svg([^>]*)>', re.IGNORECASE)
style_attr_pattern = re.compile(r'style="[^"]*"', re.IGNORECASE)
has_width = re.compile(r'width="\d+px"', re.IGNORECASE)
has_height = re.compile(r'height="\d+px"', re.IGNORECASE)

paths_to_search = [FOLDER,]

while len(paths_to_search) > 0:
    folder = paths_to_search.pop()

    for filePath in folder.iterdir():

        if filePath.is_dir():
            paths_to_search.append(filePath)
            continue

        if not filePath.suffix == '.svg':
            continue

        with open(filePath, 'r', encoding='utf-8') as file:
            content = file.read()

        match = svg_tag_pattern.search(content)
        if not match:
            print(f'⚠️ No <svg> tag found in {filePath}, skipping.')
            continue

        tag_content = match.group(1)

        # Skip if valid width/height are already present
        if has_width.search(tag_content) and has_height.search(tag_content):
            print(f'⏩ Already valid: {filePath}')
            continue

        # Remove inline style if needed
        tag_content_cleaned = style_attr_pattern.sub('', tag_content).strip()

        # Add width and height explicitly
        new_svg_tag = f'<svg {tag_content_cleaned} width="{WIDTH}" height="{HEIGHT}">'
        new_content = svg_tag_pattern.sub(new_svg_tag, content, count=1)

        # Only write if content actually changed
        if new_content != content:
            with open(filePath, 'w', encoding='utf-8') as file:
                file.write(new_content)
            print(f'✅ Fixed: {filePath}')
        else:
            print(f'⏭️ No changes needed for {filePath}')
