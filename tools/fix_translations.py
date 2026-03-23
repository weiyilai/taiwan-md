#!/usr/bin/env python3
"""
Batch-fix knowledge/_translations.json by scanning all zh/en/es/ja articles
and matching them via frontmatter title or filename patterns.

Format: { "en/Category/english-name.md": "Category/中文名.md" }
"""

import json
import os
import re
from pathlib import Path

KNOWLEDGE_DIR = Path("knowledge")
TRANSLATIONS_FILE = KNOWLEDGE_DIR / "_translations.json"

def read_frontmatter(filepath):
    """Extract frontmatter fields from a markdown file."""
    try:
        with open(filepath, 'r', encoding='utf-8') as f:
            content = f.read(3000)
        if not content.startswith('---'):
            return {}
        end = content.find('---', 3)
        if end == -1:
            return {}
        fm = content[3:end]
        result = {}
        for line in fm.split('\n'):
            if ':' in line:
                key, _, val = line.partition(':')
                key = key.strip()
                val = val.strip().strip("'\"")
                if key in ('title', 'original_title', 'zh_title'):
                    result[key] = val
        return result
    except Exception:
        return {}

def get_relative_path(filepath, prefix="knowledge/"):
    s = str(filepath)
    if s.startswith(prefix):
        return s[len(prefix):]
    return s

def find_all_articles(lang_prefix=""):
    """Find all .md files under knowledge/{lang_prefix}{Category}/"""
    articles = {}
    base = KNOWLEDGE_DIR / lang_prefix if lang_prefix else KNOWLEDGE_DIR
    if not base.exists():
        return articles
    
    for cat_dir in sorted(base.iterdir()):
        if not cat_dir.is_dir():
            continue
        if not lang_prefix and cat_dir.name in ('en', 'es', 'ja', 'resources'):
            continue
        for md_file in sorted(cat_dir.glob('*.md')):
            rel = get_relative_path(str(md_file))
            fm = read_frontmatter(str(md_file))
            articles[rel] = fm
    
    # Stray .md files directly in knowledge/ (no category)
    if not lang_prefix:
        for md_file in sorted(KNOWLEDGE_DIR.glob('*.md')):
            if md_file.name == '_translations.json' or 'translations' in md_file.name.lower():
                continue
            if md_file.name.endswith('.json'):
                continue
            rel = get_relative_path(str(md_file))
            fm = read_frontmatter(str(md_file))
            articles[rel] = fm
    
    return articles

def normalize_title(title):
    """Normalize a title for fuzzy matching."""
    if not title:
        return ""
    # Remove punctuation, spaces, convert to lowercase
    t = title.strip("'\" ")
    # Remove common decorations
    for sep in ('：', ':', '—', '──', ' - ', '｜', '|'):
        t = t.split(sep)[0].strip()
    return t

def main():
    with open(TRANSLATIONS_FILE, 'r', encoding='utf-8') as f:
        translations = json.load(f)
    
    print(f"Existing mappings: {len(translations)}")
    
    # Scan all articles
    zh_articles = find_all_articles("")
    en_articles = find_all_articles("en/")
    es_articles = find_all_articles("es/")
    ja_articles = find_all_articles("ja/")
    
    print(f"Chinese articles: {len(zh_articles)}")
    print(f"English articles: {len(en_articles)}")
    print(f"Spanish articles: {len(es_articles)}")
    print(f"Japanese articles: {len(ja_articles)}")
    
    # Build zh lookup: title -> zh_path, stem -> zh_path
    zh_by_title = {}
    zh_by_norm_title = {}
    zh_by_stem = {}  # filename stem -> zh_path (within category)
    zh_by_cat_stem = {}  # (category, stem) -> zh_path
    
    for zh_path, zh_fm in zh_articles.items():
        title = zh_fm.get('title', '')
        if title:
            zh_by_title[title] = zh_path
            norm = normalize_title(title)
            if norm:
                zh_by_norm_title[norm] = zh_path
        
        stem = Path(zh_path).stem
        parts = zh_path.split('/')
        category = parts[0] if len(parts) >= 2 else ""
        zh_by_stem[stem] = zh_path
        zh_by_cat_stem[(category, stem)] = zh_path
    
    # Build reverse lookup from existing translations
    existing_reverse = {}  # zh_path -> [en_paths]
    for en_path, zh_path in translations.items():
        existing_reverse.setdefault(zh_path, []).append(en_path)
    
    new_mappings = 0
    
    def try_match_to_zh(lang_path, lang_fm, lang_prefix):
        """Try to find the matching zh article for a translated article."""
        nonlocal new_mappings
        
        if lang_path in translations:
            return  # Already mapped
        
        parts = lang_path.split('/')
        if len(parts) >= 3:
            category = parts[1]
        elif len(parts) == 2:
            category = parts[0].replace(lang_prefix.rstrip('/'), '')
        else:
            category = ""
        
        stem = Path(lang_path).stem
        
        # Method 1: If the filename IS Chinese (e.g. en/People/蔡依林.md)
        if any('\u4e00' <= c <= '\u9fff' for c in stem):
            # The stem itself is a Chinese name
            # Try to find zh article with same stem in same category
            zh_match = zh_by_cat_stem.get((category, stem))
            if not zh_match:
                zh_match = zh_by_stem.get(stem)
            if zh_match:
                translations[lang_path] = zh_match
                new_mappings += 1
                return
        
        # Method 2: original_title or zh_title in frontmatter
        for key in ('original_title', 'zh_title'):
            target = lang_fm.get(key, '')
            if not target:
                continue
            # Direct title match
            if target in zh_by_title:
                translations[lang_path] = zh_by_title[target]
                new_mappings += 1
                return
            # Normalized match
            norm = normalize_title(target)
            if norm and norm in zh_by_norm_title:
                translations[lang_path] = zh_by_norm_title[norm]
                new_mappings += 1
                return
            # Try as filename stem
            if target in zh_by_stem:
                translations[lang_path] = zh_by_stem[target]
                new_mappings += 1
                return
            if (category, target) in zh_by_cat_stem:
                translations[lang_path] = zh_by_cat_stem[(category, target)]
                new_mappings += 1
                return
        
        # Method 3: Same category, match en title to zh title patterns
        en_title = lang_fm.get('title', '')
        if not en_title:
            return
        
        # For each zh article in same category, check if titles are related
        for zh_path, zh_fm in zh_articles.items():
            zh_parts = zh_path.split('/')
            zh_cat = zh_parts[0] if len(zh_parts) >= 2 else ""
            if zh_cat != category:
                continue
            
            zh_title = zh_fm.get('title', '')
            zh_stem_name = Path(zh_path).stem
            
            # Check various match patterns
            # e.g. en title "Taiwanese Cinema" matching zh "台灣電影"
            # This is hard without a dictionary, so we rely on frontmatter
    
    # Process all en articles
    for en_path, en_fm in en_articles.items():
        try_match_to_zh(en_path, en_fm, "en/")
    
    # Process all es articles
    for es_path, es_fm in es_articles.items():
        try_match_to_zh(es_path, es_fm, "es/")
    
    # Process all ja articles
    for ja_path, ja_fm in ja_articles.items():
        try_match_to_zh(ja_path, ja_fm, "ja/")
    
    print(f"New mappings added: {new_mappings}")
    print(f"Total mappings: {len(translations)}")
    
    # Sort by key
    sorted_translations = dict(sorted(translations.items()))
    
    # Write
    with open(TRANSLATIONS_FILE, 'w', encoding='utf-8') as f:
        json.dump(sorted_translations, f, ensure_ascii=False, indent=2)
    
    print(f"Written to {TRANSLATIONS_FILE}")
    
    # Report unmapped
    mapped_zh = set(sorted_translations.values())
    unmapped_zh = [p for p in zh_articles if p not in mapped_zh]
    
    mapped_en_keys = set(sorted_translations.keys())
    unmapped_en = [p for p in en_articles if p not in mapped_en_keys]
    unmapped_es = [p for p in es_articles if p not in mapped_en_keys]
    unmapped_ja = [p for p in ja_articles if p not in mapped_en_keys]
    
    if unmapped_zh:
        print(f"\nUnmapped Chinese articles ({len(unmapped_zh)}):")
        for p in sorted(unmapped_zh):
            print(f"  {p}")
    
    if unmapped_en:
        print(f"\nUnmapped English articles ({len(unmapped_en)}):")
        for p in sorted(unmapped_en):
            fm = en_articles[p]
            orig = fm.get('original_title', fm.get('zh_title', ''))
            print(f"  {p}  (orig: {orig})")

if __name__ == '__main__':
    main()
