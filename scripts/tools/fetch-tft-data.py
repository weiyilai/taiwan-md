#!/usr/bin/env python3
"""Fetch Teach For Taiwan challenge content into data/TFT."""

from __future__ import annotations

import json
import os
import re
from dataclasses import dataclass, field
from datetime import datetime, timezone
from html import unescape
from html.parser import HTMLParser
from pathlib import Path
from typing import Dict, Iterable, List, Optional
from urllib.parse import unquote, urlencode, urljoin, urlparse
from urllib.request import Request, urlopen


SITE_ROOT = "https://www.teach4taiwan.org"
API_ROOT = f"{SITE_ROOT}/wp-json/wp/v2"
USER_AGENT = "taiwan-md-tft-fetcher/1.0"
OUT_DIR = Path(__file__).resolve().parents[2] / "data" / "TFT"
RAW_DIR = OUT_DIR / "raw"
PAGES_DIR = OUT_DIR / "pages"
THINKINGS_DIR = OUT_DIR / "thinkings"
STORIES_DIR = OUT_DIR / "stories"
RESEARCHES_DIR = OUT_DIR / "researches"
TIMEOUT = 30
MAX_SAFE_PER_PAGE = 15

VOID_TAGS = {
    "area",
    "base",
    "br",
    "col",
    "embed",
    "hr",
    "img",
    "input",
    "link",
    "meta",
    "param",
    "source",
    "track",
    "wbr",
}
SKIP_TAGS = {"script", "style", "svg", "noscript"}


@dataclass
class Node:
    tag: str
    attrs: Dict[str, str] = field(default_factory=dict)
    children: List[object] = field(default_factory=list)


class TreeBuilder(HTMLParser):
    def __init__(self) -> None:
        super().__init__(convert_charrefs=True)
        self.root = Node("root")
        self.stack: List[Node] = [self.root]
        self.skip_depth = 0

    def handle_starttag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        if self.skip_depth:
            self.skip_depth += 1
            return
        if tag in SKIP_TAGS:
            self.skip_depth = 1
            return
        node = Node(tag, {k: (v or "") for k, v in attrs})
        self.stack[-1].children.append(node)
        if tag not in VOID_TAGS:
            self.stack.append(node)

    def handle_startendtag(self, tag: str, attrs: List[tuple[str, Optional[str]]]) -> None:
        self.handle_starttag(tag, attrs)
        if tag not in VOID_TAGS and self.skip_depth == 0:
            self.handle_endtag(tag)

    def handle_endtag(self, tag: str) -> None:
        if self.skip_depth:
            self.skip_depth -= 1
            return
        for idx in range(len(self.stack) - 1, 0, -1):
            if self.stack[idx].tag == tag:
                del self.stack[idx:]
                break

    def handle_data(self, data: str) -> None:
        if self.skip_depth or not data:
            return
        self.stack[-1].children.append(data)


class MarkdownRenderer:
    def __init__(self) -> None:
        self.footnote_counter = 0

    def render(self, html: str) -> str:
        if not html:
            return ""
        parser = TreeBuilder()
        parser.feed(html)
        parser.close()
        text = self.render_children(parser.root.children)
        text = text.replace("\r\n", "\n").replace("\r", "\n")
        text = self.normalize_lines(text)
        text = re.sub(r"\n{3,}", "\n\n", text)
        return text.strip()

    def render_children(self, children: Iterable[object], indent: str = "") -> str:
        parts: List[str] = []
        for child in children:
            parts.append(self.render_node(child, indent=indent))
        return "".join(parts)

    def render_node(self, node: object, indent: str = "") -> str:
        if isinstance(node, str):
            return self.clean_text(node)

        tag = node.tag.lower()
        attrs = node.attrs

        if tag in {"div", "section", "article", "main", "header", "footer"}:
            return self.render_children(node.children, indent=indent)

        if tag in {"p", "figcaption"}:
            text = self.inline(node.children).strip()
            return f"{text}\n\n" if text else ""

        if tag in {"h1", "h2", "h3", "h4", "h5", "h6"}:
            level = int(tag[1])
            text = self.inline(node.children).strip()
            return f"{'#' * level} {text}\n\n" if text else ""

        if tag == "blockquote":
            text = self.render_children(node.children, indent=indent).strip()
            if not text:
                return ""
            lines = [f"> {line}" if line.strip() else ">" for line in text.splitlines()]
            return "\n".join(lines) + "\n\n"

        if tag == "ul":
            return self.render_list(node, ordered=False, indent=indent)

        if tag == "ol":
            classes = attrs.get("class", "")
            if "wp-block-footnotes" in classes:
                return self.render_footnotes(node)
            return self.render_list(node, ordered=True, indent=indent)

        if tag == "li":
            text = self.render_children(node.children, indent=indent).strip()
            return text + "\n" if text else ""

        if tag == "hr":
            return "---\n\n"

        if tag == "table":
            return self.render_table(node)

        if tag in {"figure"}:
            return self.render_children(node.children, indent=indent)

        if tag in {"iframe", "video"}:
            src = attrs.get("src", "").strip()
            return f"{src}\n\n" if src else ""

        if tag in {"a", "span", "strong", "b", "em", "i", "code", "sup", "img", "br"}:
            return self.inline([node])

        return self.render_children(node.children, indent=indent)

    def render_list(self, node: Node, ordered: bool, indent: str = "") -> str:
        items = [child for child in node.children if isinstance(child, Node) and child.tag.lower() == "li"]
        if not items:
            return ""

        lines: List[str] = []
        for idx, item in enumerate(items, start=1):
            rendered = self.render_children(item.children, indent=indent + "  ").strip()
            if not rendered:
                continue
            split = rendered.splitlines()
            marker = f"{idx}. " if ordered else "- "
            lines.append(marker + split[0].strip())
            for extra in split[1:]:
                if extra.strip():
                    lines.append("   " + extra.strip())
        return "\n".join(lines) + "\n\n"

    def render_footnotes(self, node: Node) -> str:
        notes: List[str] = []
        for idx, item in enumerate(
            [child for child in node.children if isinstance(child, Node) and child.tag.lower() == "li"],
            start=1,
        ):
            text = self.render_children(item.children).strip()
            text = re.sub(r"\s*\[↩︎?\]\(#.*?\)", "", text).strip()
            text = re.sub(r"\s*↩︎?$", "", text).strip()
            text = re.sub(rf"^{idx}\.\s*", "", text)
            if text:
                notes.append(f"[^{idx}]: {text}")
        return "\n".join(notes) + ("\n\n" if notes else "")

    def render_table(self, node: Node) -> str:
        rows: List[List[str]] = []
        for child in node.children:
            if not isinstance(child, Node):
                continue
            if child.tag.lower() not in {"thead", "tbody", "tr"}:
                continue
            if child.tag.lower() == "tr":
                rows.append(self.table_row(child))
                continue
            for grand in child.children:
                if isinstance(grand, Node) and grand.tag.lower() == "tr":
                    rows.append(self.table_row(grand))
        if not rows:
            return ""

        width = max(len(row) for row in rows)
        rows = [row + [""] * (width - len(row)) for row in rows]
        header = rows[0]
        divider = ["---"] * width
        lines = [
            "| " + " | ".join(header) + " |",
            "| " + " | ".join(divider) + " |",
        ]
        for row in rows[1:]:
            lines.append("| " + " | ".join(row) + " |")
        return "\n".join(lines) + "\n\n"

    def table_row(self, node: Node) -> List[str]:
        cells: List[str] = []
        for child in node.children:
            if isinstance(child, Node) and child.tag.lower() in {"td", "th"}:
                cells.append(self.inline(child.children).strip())
        return cells

    def inline(self, children: Iterable[object]) -> str:
        parts: List[str] = []
        for child in children:
            parts.append(self.inline_node(child))
        return self.clean_inline("".join(parts))

    def inline_node(self, node: object) -> str:
        if isinstance(node, str):
            return self.clean_text(node)

        tag = node.tag.lower()
        attrs = node.attrs

        if tag == "a":
            href = attrs.get("href", "").strip()
            text = self.inline(node.children).strip() or href
            if not href:
                return text
            if href.startswith("#") and text.isdigit():
                return f"[^{text}]"
            return f"[{text}]({href})"

        if tag in {"strong", "b"}:
            text = self.inline(node.children).strip()
            return f"**{text}**" if text else ""

        if tag in {"em", "i"}:
            text = self.inline(node.children).strip()
            return f"*{text}*" if text else ""

        if tag == "code":
            text = self.inline(node.children).strip()
            return f"`{text}`" if text else ""

        if tag == "br":
            return "\n"

        if tag == "img":
            src = attrs.get("src", "").strip()
            alt = attrs.get("alt", "").strip() or "image"
            return f"![{alt}]({src})" if src else ""

        if tag == "sup":
            text = self.inline(node.children).strip()
            if text.isdigit():
                return f"[^{text}]"
            return text

        if tag in {"span", "small", "mark"}:
            return self.inline(node.children)

        return self.inline(node.children)

    @staticmethod
    def clean_text(text: str) -> str:
        text = unescape(text).replace("\xa0", " ")
        text = re.sub(r"\s+", " ", text)
        return text

    @staticmethod
    def clean_inline(text: str) -> str:
        text = text.replace(" ](", "](")
        text = re.sub(r" +\n", "\n", text)
        text = re.sub(r"\n +", "\n", text)
        text = re.sub(r" {2,}", " ", text)
        return text

    @staticmethod
    def normalize_lines(text: str) -> str:
        lines: List[str] = []
        for line in text.splitlines():
            if not line.strip():
                lines.append("")
                continue
            lines.append(line.strip())
        return "\n".join(lines)


def fetch_json(path: str, params: Optional[Dict[str, object]] = None) -> object:
    if path.startswith("http://") or path.startswith("https://"):
        url = path
    else:
        url = f"{API_ROOT}/{path.lstrip('/')}"
    if params:
        query = urlencode(params, doseq=True)
        sep = "&" if "?" in url else "?"
        url = f"{url}{sep}{query}"
    request = Request(url, headers={"User-Agent": USER_AGENT, "Accept": "application/json"})
    with urlopen(request, timeout=TIMEOUT) as response:
        return json.load(response)


def fetch_paginated(path: str, params: Optional[Dict[str, object]] = None) -> List[dict]:
    params = dict(params or {})
    per_page = min(int(params.get("per_page", MAX_SAFE_PER_PAGE)), MAX_SAFE_PER_PAGE)
    params["per_page"] = per_page
    page = 1
    results: List[dict] = []
    while True:
        params["page"] = page
        batch = fetch_json(path, params)
        if not isinstance(batch, list) or not batch:
            break
        results.extend(batch)
        if len(batch) < per_page:
            break
        page += 1
    return results


def write_json(path: Path, data: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def write_text(path: Path, content: str) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(content.rstrip() + "\n", encoding="utf-8")


def decode_slug(item: dict) -> str:
    link = item.get("link", "")
    path = urlparse(link).path.rstrip("/")
    if not path:
        return unquote(item.get("slug", ""))
    return unquote(path.split("/")[-1])


def collect_links(html: str) -> Dict[str, List[str]]:
    parser = TreeBuilder()
    parser.feed(html or "")
    parser.close()
    internal: List[str] = []
    external: List[str] = []

    def walk(children: Iterable[object]) -> None:
        for child in children:
            if isinstance(child, str):
                continue
            if child.tag.lower() == "a":
                href = child.attrs.get("href", "").strip()
                if not href:
                    continue
                if href.startswith("#"):
                    continue
                href = urljoin(SITE_ROOT, href)
                if urlparse(href).netloc.endswith("teach4taiwan.org"):
                    internal.append(href)
                else:
                    external.append(href)
            walk(child.children)

    walk(parser.root.children)
    return {
        "internal": sorted(dict.fromkeys(internal)),
        "external": sorted(dict.fromkeys(external)),
    }


def extract_plain_excerpt(html: str, renderer: MarkdownRenderer) -> str:
    text = renderer.render(html)
    text = re.sub(r"\[Read More .*?\]\(.*?\)", "", text, flags=re.I).strip()
    return text


def format_item_markdown(
    item: dict,
    *,
    item_type: str,
    api_url: str,
    author_name: str,
    category_names: List[str],
    tag_names: List[str],
    featured_image: str,
    renderer: MarkdownRenderer,
) -> str:
    title = unescape(item.get("title", {}).get("rendered", "")).strip() or item.get("slug", "")
    excerpt = extract_plain_excerpt(item.get("excerpt", {}).get("rendered", ""), renderer)
    content_md = renderer.render(item.get("content", {}).get("rendered", ""))
    links = collect_links(item.get("content", {}).get("rendered", ""))

    lines = [f"# {title}", ""]
    lines.extend(
        [
            f"- Source: {item.get('link', '').strip()}",
            f"- API: {api_url}",
            f"- Type: {item_type}",
            f"- WordPress ID: {item.get('id')}",
            f"- Slug: {decode_slug(item)}",
        ]
    )
    if item.get("date"):
        lines.append(f"- Published: {item['date']}")
    if item.get("modified"):
        lines.append(f"- Modified: {item['modified']}")
    if author_name:
        lines.append(f"- Author: {author_name}")
    if category_names:
        lines.append(f"- Categories: {', '.join(category_names)}")
    if tag_names:
        lines.append(f"- Tags: {', '.join(tag_names)}")
    if featured_image:
        lines.append(f"- Featured Image: {featured_image}")

    if excerpt:
        lines.extend(["", "## Excerpt", "", excerpt])
    if content_md:
        lines.extend(["", "## Content", "", content_md])
    if links["internal"]:
        lines.extend(["", "## Internal Links", ""])
        lines.extend([f"- {link}" for link in links["internal"]])
    if links["external"]:
        lines.extend(["", "## External Links", ""])
        lines.extend([f"- {link}" for link in links["external"]])
    return "\n".join(lines).strip() + "\n"


def get_embedded_author_name(item: dict) -> str:
    embedded = item.get("_embedded", {})
    author_list = embedded.get("author") or []
    if author_list and isinstance(author_list[0], dict) and author_list[0].get("name"):
        return author_list[0]["name"]
    return item.get("yoast_head_json", {}).get("author", "")


def get_embedded_featured_image(item: dict) -> str:
    embedded = item.get("_embedded", {})
    media_list = embedded.get("wp:featuredmedia") or []
    if media_list and isinstance(media_list[0], dict) and media_list[0].get("source_url"):
        return media_list[0]["source_url"]
    og_images = item.get("yoast_head_json", {}).get("og_image") or []
    if og_images and isinstance(og_images[0], dict):
        return og_images[0].get("url", "")
    return ""


def get_embedded_terms(item: dict, taxonomy: str) -> List[dict]:
    embedded = item.get("_embedded", {})
    term_groups = embedded.get("wp:term") or []
    terms: List[dict] = []
    for group in term_groups:
        for term in group:
            if isinstance(term, dict) and term.get("taxonomy") == taxonomy:
                terms.append(term)
    return terms


def collect_block_nodes(html: str) -> List[Node]:
    parser = TreeBuilder()
    parser.feed(html or "")
    parser.close()
    blocks: List[Node] = []

    def walk(children: Iterable[object]) -> None:
        for child in children:
            if isinstance(child, str):
                continue
            tag = child.tag.lower()
            if tag in {"h1", "h2", "h3", "h4", "p", "ul", "ol"}:
                blocks.append(child)
            walk(child.children)

    walk(parser.root.children)
    return blocks


def slugify_text(text: str) -> str:
    text = re.sub(r"\s+", "-", text.strip().lower())
    text = re.sub(r"[^0-9a-z\u4e00-\u9fff-]", "", text)
    text = re.sub(r"-{2,}", "-", text).strip("-")
    return text or "item"


def simple_html_text(html: str) -> str:
    text = re.sub(r"<br\s*/?>", "\n", html, flags=re.I)
    text = re.sub(r"</p>", "\n\n", text, flags=re.I)
    text = re.sub(r"<[^>]+>", "", text)
    text = unescape(text).replace("\xa0", " ")
    text = re.sub(r"\s+", " ", text)
    return text.strip()


def extract_research_entries(item: dict, renderer: MarkdownRenderer) -> List[dict]:
    html = item.get("content", {}).get("rendered", "")
    report_start = html.find("完整研究報告")
    if report_start == -1:
        return []
    report_end = html.find("與 TFT 合作進行研究計畫")
    section_html = html[report_start:report_end] if report_end != -1 else html[report_start:]

    heading_pattern = re.compile(r"<h4[^>]*>(.*?)</h4>", re.I | re.S)
    matches = list(heading_pattern.finditer(section_html))
    entries: List[dict] = []

    for idx, match in enumerate(matches):
        title_html = match.group(1)
        title = renderer.render(title_html).replace("\n", " ").strip()
        chunk_end = matches[idx + 1].start() if idx + 1 < len(matches) else len(section_html)
        chunk_html = section_html[match.end() : chunk_end]

        downloads = []
        for href, label in re.findall(r'<a[^>]+href="(https?://[^"]+)"[^>]*>.*?<span[^>]*button-text[^>]*>(.*?)</span>', chunk_html, re.I | re.S):
            clean_label = renderer.render(label).strip() or "下載"
            downloads.append({"label": clean_label, "url": href})

        paragraphs = [simple_html_text(p) for p in re.findall(r"<p[^>]*>(.*?)</p>", chunk_html, re.I | re.S)]
        chunk_markdown = "\n\n".join(part for part in paragraphs if part).strip()

        entries.append(
            {
                "title": title,
                "summary": chunk_markdown,
                "downloads": downloads,
            }
        )

    normalized: List[dict] = []
    for idx, entry in enumerate(entries, start=1):
        normalized.append(
            {
                "index": idx,
                "title": entry["title"],
                "slug": slugify_text(entry["title"]),
                "summary": simple_html_text(entry["summary"]),
                "downloads": entry["downloads"],
            }
        )
    return normalized


def build_readme(
    *,
    generated_at: str,
    challenge_page: dict,
    child_pages: List[dict],
    thinkings_posts: List[dict],
    stories_posts: List[dict],
    research_entries: List[dict],
) -> str:
    lines = [
        "# TFT 資料集",
        "",
        f"- Generated: {generated_at}",
        "- Source page: https://www.teach4taiwan.org/challenge/",
        "- Source page: https://www.teach4taiwan.org/challenge/thinkings/",
        f"- Challenge page ID: {challenge_page['id']}",
        f"- Challenge child pages: {len(child_pages)}",
        f"- Thinkings posts: {len(thinkings_posts)}",
        f"- Stories posts: {len(stories_posts)}",
        f"- Research entries: {len(research_entries)}",
        "",
        "## Structure",
        "",
        "- `pages/`: `challenge` 與其直屬子頁整理成 markdown",
        "- `thinkings/`: `TFT 觀點` 分類文章整理成 markdown",
        "- `stories/`: `TFT 故事棧` 分類文章整理成 markdown",
        "- `researches/`: `TFT 研究報告` 頁面拆出的研究項目 markdown",
        "- `raw/`: WordPress API 原始 JSON（頁面、文章、作者、分類、標籤、媒體、manifest）",
        "",
        "## Challenge Tree",
        "",
        f"- {challenge_page['title']['rendered']} (`pages/{challenge_page['id']}-challenge.md`)",
    ]

    for page in child_pages:
        lines.append(f"  - {page['title']['rendered']} (`pages/{page['id']}-{page['slug']}.md`)")

    lines.extend(["", "## Thinkings Articles", ""])
    for post in thinkings_posts:
        lines.append(f"- {post['title']['rendered']} (`thinkings/{post['id']}.md`)")

    lines.extend(["", "## Stories Articles", ""])
    for post in stories_posts:
        lines.append(f"- {post['title']['rendered']} (`stories/{post['id']}.md`)")

    lines.extend(["", "## Research Entries", ""])
    for entry in research_entries:
        lines.append(f"- {entry['title']} (`researches/{entry['index']:02d}-{entry['slug']}.md`)")

    return "\n".join(lines).strip() + "\n"


def build_page_index(pages: List[dict]) -> str:
    lines = ["# TFT 頁面索引", ""]
    for page in pages:
        lines.extend(
            [
                f"- {page['title']['rendered']}",
                f"  - Source: {page['link']}",
                f"  - File: `{page['id']}-{page['slug']}.md`",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def build_thinkings_index(posts: List[dict]) -> str:
    lines = ["# TFT 觀點索引", ""]
    for post in posts:
        lines.extend(
            [
                f"- {post['title']['rendered']}",
                f"  - Source: {post['link']}",
                f"  - File: `{post['id']}.md`",
                f"  - Published: {post.get('date', '')}",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def build_stories_index(posts: List[dict]) -> str:
    lines = ["# TFT 故事棧索引", ""]
    for post in posts:
        lines.extend(
            [
                f"- {post['title']['rendered']}",
                f"  - Source: {post['link']}",
                f"  - File: `{post['id']}.md`",
                f"  - Published: {post.get('date', '')}",
            ]
        )
    return "\n".join(lines).strip() + "\n"


def build_researches_index(entries: List[dict]) -> str:
    lines = ["# TFT 研究報告索引", ""]
    for entry in entries:
        lines.append(f"- {entry['title']}")
        lines.append(f"  - File: `{entry['index']:02d}-{entry['slug']}.md`")
        for download in entry["downloads"]:
            lines.append(f"  - Download: {download['url']}")
    return "\n".join(lines).strip() + "\n"


def build_research_entry_markdown(entry: dict, page: dict) -> str:
    lines = [
        f"# {entry['title']}",
        "",
        f"- Source Page: {page['link']}",
        f"- Source API: {API_ROOT}/pages/{page['id']}",
        f"- Entry Index: {entry['index']}",
    ]
    if entry["summary"]:
        lines.extend(["", "## Summary", "", entry["summary"]])
    if entry["downloads"]:
        lines.extend(["", "## Downloads", ""])
        for download in entry["downloads"]:
            lines.append(f"- [{download['label']}]({download['url']})")
    return "\n".join(lines).strip() + "\n"


def main() -> None:
    generated_at = datetime.now(timezone.utc).isoformat()
    renderer = MarkdownRenderer()

    challenge_candidates = fetch_json("pages", {"slug": "challenge", "per_page": 10, "_embed": 1})
    if not challenge_candidates:
        raise SystemExit("Could not find challenge page")
    challenge_page = challenge_candidates[0]

    child_pages = fetch_paginated(
        "pages",
        {"parent": challenge_page["id"], "per_page": MAX_SAFE_PER_PAGE, "_embed": 1},
    )
    pages = [challenge_page] + sorted(child_pages, key=lambda item: item["menu_order"])

    thinkings_category_candidates = fetch_json("categories", {"slug": "thinkings", "per_page": 10})
    if not thinkings_category_candidates:
        raise SystemExit("Could not find thinkings category")
    thinkings_category = thinkings_category_candidates[0]
    stories_category_candidates = fetch_json("categories", {"slug": "stories", "per_page": 10})
    if not stories_category_candidates:
        raise SystemExit("Could not find stories category")
    stories_category = stories_category_candidates[0]

    thinkings_posts = fetch_paginated(
        "posts",
        {
            "categories": thinkings_category["id"],
            "per_page": MAX_SAFE_PER_PAGE,
            "_embed": 1,
            "orderby": "date",
            "order": "desc",
        },
    )
    stories_posts = fetch_paginated(
        "posts",
        {
            "categories": stories_category["id"],
            "per_page": MAX_SAFE_PER_PAGE,
            "_embed": 1,
            "orderby": "date",
            "order": "desc",
        },
    )
    research_page = next((page for page in child_pages if page.get("slug") == "researches"), None)
    research_entries = extract_research_entries(research_page, renderer) if research_page else []

    author_names = sorted(
        {name for item in pages + thinkings_posts + stories_posts if (name := get_embedded_author_name(item))}
    )
    media_items = {}
    category_items = {
        thinkings_category["id"]: thinkings_category,
        stories_category["id"]: stories_category,
    }
    tag_items = {}

    for item in pages + thinkings_posts + stories_posts:
        for media in item.get("_embedded", {}).get("wp:featuredmedia") or []:
            if isinstance(media, dict) and media.get("id"):
                media_items[int(media["id"])] = media
        for category in get_embedded_terms(item, "category"):
            if category.get("id"):
                category_items[int(category["id"])] = category
        for tag in get_embedded_terms(item, "post_tag"):
            if tag.get("id"):
                tag_items[int(tag["id"])] = tag

    OUT_DIR.mkdir(parents=True, exist_ok=True)
    RAW_DIR.mkdir(parents=True, exist_ok=True)
    PAGES_DIR.mkdir(parents=True, exist_ok=True)
    THINKINGS_DIR.mkdir(parents=True, exist_ok=True)
    STORIES_DIR.mkdir(parents=True, exist_ok=True)
    RESEARCHES_DIR.mkdir(parents=True, exist_ok=True)
    for old_file in RESEARCHES_DIR.glob("*.md"):
        old_file.unlink()

    write_json(RAW_DIR / "challenge-page.json", challenge_page)
    write_json(RAW_DIR / "challenge-child-pages.json", child_pages)
    write_json(RAW_DIR / "thinkings-category.json", thinkings_category)
    write_json(RAW_DIR / "thinkings-posts.json", thinkings_posts)
    write_json(RAW_DIR / "stories-category.json", stories_category)
    write_json(RAW_DIR / "stories-posts.json", stories_posts)
    write_json(RAW_DIR / "researches-items.json", research_entries)
    write_json(RAW_DIR / "authors.json", [{"name": name} for name in author_names])
    write_json(RAW_DIR / "media.json", list(media_items.values()))
    write_json(RAW_DIR / "categories.json", list(category_items.values()))
    write_json(RAW_DIR / "tags.json", list(tag_items.values()))
    write_json(
        RAW_DIR / "manifest.json",
        {
            "generatedAt": generated_at,
            "challengePageId": challenge_page["id"],
            "challengeChildPageIds": [page["id"] for page in child_pages],
            "thinkingsCategoryId": thinkings_category["id"],
            "thinkingsPostIds": [post["id"] for post in thinkings_posts],
            "storiesCategoryId": stories_category["id"],
            "storiesPostIds": [post["id"] for post in stories_posts],
            "researchPageId": research_page["id"] if research_page else None,
            "researchEntryTitles": [entry["title"] for entry in research_entries],
            "counts": {
                "pages": len(pages),
                "thinkingsPosts": len(thinkings_posts),
                "storiesPosts": len(stories_posts),
                "researchEntries": len(research_entries),
                "authors": len(author_names),
                "media": len(media_items),
                "categories": len(category_items),
                "tags": len(tag_items),
            },
        },
    )

    for page in pages:
        author_name = get_embedded_author_name(page)
        featured_image = get_embedded_featured_image(page)
        markdown = format_item_markdown(
            page,
            item_type="page",
            api_url=f"{API_ROOT}/pages/{page['id']}",
            author_name=author_name,
            category_names=[],
            tag_names=[],
            featured_image=featured_image,
            renderer=renderer,
        )
        write_text(PAGES_DIR / f"{page['id']}-{page['slug']}.md", markdown)

    for post in thinkings_posts:
        author_name = get_embedded_author_name(post)
        featured_image = get_embedded_featured_image(post)
        category_names = [term["name"] for term in get_embedded_terms(post, "category")]
        tag_names = [term["name"] for term in get_embedded_terms(post, "post_tag")]
        markdown = format_item_markdown(
            post,
            item_type="post",
            api_url=f"{API_ROOT}/posts/{post['id']}",
            author_name=author_name,
            category_names=category_names,
            tag_names=tag_names,
            featured_image=featured_image,
            renderer=renderer,
        )
        write_text(THINKINGS_DIR / f"{post['id']}.md", markdown)

    for post in stories_posts:
        author_name = get_embedded_author_name(post)
        featured_image = get_embedded_featured_image(post)
        category_names = [term["name"] for term in get_embedded_terms(post, "category")]
        tag_names = [term["name"] for term in get_embedded_terms(post, "post_tag")]
        markdown = format_item_markdown(
            post,
            item_type="post",
            api_url=f"{API_ROOT}/posts/{post['id']}",
            author_name=author_name,
            category_names=category_names,
            tag_names=tag_names,
            featured_image=featured_image,
            renderer=renderer,
        )
        write_text(STORIES_DIR / f"{post['id']}.md", markdown)

    if research_page:
        for entry in research_entries:
            write_text(
                RESEARCHES_DIR / f"{entry['index']:02d}-{entry['slug']}.md",
                build_research_entry_markdown(entry, research_page),
            )

    write_text(
        OUT_DIR / "README.md",
        build_readme(
            generated_at=generated_at,
            challenge_page=challenge_page,
            child_pages=child_pages,
            thinkings_posts=thinkings_posts,
            stories_posts=stories_posts,
            research_entries=research_entries,
        ),
    )
    write_text(PAGES_DIR / "INDEX.md", build_page_index(pages))
    write_text(THINKINGS_DIR / "INDEX.md", build_thinkings_index(thinkings_posts))
    write_text(STORIES_DIR / "INDEX.md", build_stories_index(stories_posts))
    write_text(RESEARCHES_DIR / "INDEX.md", build_researches_index(research_entries))

    print(f"Wrote TFT dataset to {OUT_DIR}")
    print(f"Pages: {len(pages)}")
    print(f"Thinkings posts: {len(thinkings_posts)}")
    print(f"Stories posts: {len(stories_posts)}")
    print(f"Research entries: {len(research_entries)}")


if __name__ == "__main__":
    main()
