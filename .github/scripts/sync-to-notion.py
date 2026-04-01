"""
Sync CLAUDE.md content to a Notion page.

Reads CLAUDE.md, converts it to Notion blocks, clears the existing page,
and appends the new content. Handles Notion API limits:
- 2000 chars per rich_text element
- 100 blocks per append request
"""

import os
import re
import sys
import time
import requests

NOTION_API = "https://api.notion.com/v1"
NOTION_VERSION = "2022-06-28"
MAX_RT_LEN = 2000  # Notion rich_text character limit
MAX_BLOCKS_PER_REQ = 100  # Notion append children limit

TOKEN = os.environ.get("NOTION_TOKEN", "")
PAGE_ID = os.environ.get("NOTION_PAGE_ID", "")


def headers():
    return {
        "Authorization": f"Bearer {TOKEN}",
        "Content-Type": "application/json",
        "Notion-Version": NOTION_VERSION,
    }


def rich_text(text):
    """Split text into rich_text array, each element <= 2000 chars."""
    if not text:
        return [{"type": "text", "text": {"content": ""}}]
    chunks = []
    while text:
        chunks.append({"type": "text", "text": {"content": text[:MAX_RT_LEN]}})
        text = text[MAX_RT_LEN:]
    return chunks


def make_block(block_type, text, **kwargs):
    """Create a single Notion block."""
    block = {
        "object": "block",
        "type": block_type,
        block_type: {"rich_text": rich_text(text)},
    }
    # Add language for code blocks
    if block_type == "code" and "language" in kwargs:
        block["code"]["language"] = kwargs["language"]
    return block


def parse_md_to_blocks(md_text):
    """
    Convert markdown to Notion blocks.
    Handles: headings (h1-h3), code fences, horizontal rules, tables, paragraphs.
    Notion only supports h1-h3, so h4+ become h3.
    """
    blocks = []
    lines = md_text.split("\n")
    i = 0

    while i < len(lines):
        line = lines[i]

        # Horizontal rule
        if re.match(r"^-{3,}$", line.strip()):
            blocks.append({"object": "block", "type": "divider", "divider": {}})
            i += 1
            continue

        # Code fence
        if line.strip().startswith("```"):
            lang_match = re.match(r"^```(\w*)", line.strip())
            lang = lang_match.group(1) if lang_match else "plain text"
            # Map common languages to Notion's accepted values
            lang_map = {
                "": "plain text", "cmd": "shell", "bash": "shell",
                "sh": "shell", "zsh": "shell", "js": "javascript",
                "ts": "typescript", "py": "python", "md": "markdown",
                "yml": "yaml", "json": "json", "html": "html",
                "css": "css", "sql": "sql", "java": "java",
                "jsx": "javascript", "tsx": "typescript",
            }
            lang = lang_map.get(lang, lang if lang else "plain text")
            # Collect code lines
            code_lines = []
            i += 1
            while i < len(lines) and not lines[i].strip().startswith("```"):
                code_lines.append(lines[i])
                i += 1
            i += 1  # skip closing ```
            code_text = "\n".join(code_lines)
            if not code_text:
                code_text = " "  # Notion doesn't allow empty code blocks
            blocks.append(make_block("code", code_text, language=lang))
            continue

        # Headings
        heading_match = re.match(r"^(#{1,6})\s+(.+)$", line)
        if heading_match:
            level = min(len(heading_match.group(1)), 3)  # Notion max h3
            text = heading_match.group(2)
            block_type = f"heading_{level}"
            blocks.append(make_block(block_type, text))
            i += 1
            continue

        # Table (collect all | lines)
        if line.strip().startswith("|") and "|" in line[1:]:
            table_lines = []
            while i < len(lines) and lines[i].strip().startswith("|"):
                stripped = lines[i].strip()
                # Skip separator rows like |---|---|
                if re.match(r"^\|[\s\-:|]+\|$", stripped):
                    i += 1
                    continue
                cells = [c.strip() for c in stripped.split("|")[1:-1]]
                table_lines.append(cells)
                i += 1
            if table_lines:
                # Determine column count from widest row
                col_count = max(len(row) for row in table_lines)
                table_block = {
                    "object": "block",
                    "type": "table",
                    "table": {
                        "table_width": col_count,
                        "has_column_header": True,
                        "has_row_header": False,
                        "children": [],
                    },
                }
                for row in table_lines:
                    # Pad row to col_count
                    while len(row) < col_count:
                        row.append("")
                    table_row = {
                        "type": "table_row",
                        "table_row": {
                            "cells": [rich_text(cell) for cell in row[:col_count]]
                        },
                    }
                    table_block["table"]["children"].append(table_row)
                blocks.append(table_block)
            continue

        # Blank line -> skip (don't create empty paragraphs)
        if not line.strip():
            i += 1
            continue

        # Bulleted list
        bullet_match = re.match(r"^(\s*)[-*]\s+(.+)$", line)
        if bullet_match:
            text = bullet_match.group(2)
            blocks.append(make_block("bulleted_list_item", text))
            i += 1
            continue

        # Numbered list
        num_match = re.match(r"^(\s*)\d+[.)]\s+(.+)$", line)
        if num_match:
            text = num_match.group(2)
            blocks.append(make_block("numbered_list_item", text))
            i += 1
            continue

        # Default: paragraph (collect consecutive non-special lines)
        para_lines = [line]
        i += 1
        while i < len(lines):
            next_line = lines[i]
            if (not next_line.strip() or
                next_line.strip().startswith("#") or
                next_line.strip().startswith("```") or
                next_line.strip().startswith("|") or
                re.match(r"^-{3,}$", next_line.strip()) or
                re.match(r"^[-*]\s+", next_line.strip()) or
                re.match(r"^\d+[.)]\s+", next_line.strip())):
                break
            para_lines.append(next_line)
            i += 1
        text = "\n".join(para_lines)
        blocks.append(make_block("paragraph", text))

    return blocks


def get_existing_blocks(page_id):
    """Get all existing block IDs on the page."""
    block_ids = []
    url = f"{NOTION_API}/blocks/{page_id}/children?page_size=100"
    while url:
        resp = requests.get(url, headers=headers())
        resp.raise_for_status()
        data = resp.json()
        for block in data.get("results", []):
            block_ids.append(block["id"])
        url = None
        if data.get("has_more"):
            cursor = data.get("next_cursor")
            url = f"{NOTION_API}/blocks/{page_id}/children?page_size=100&start_cursor={cursor}"
    return block_ids


def delete_blocks(block_ids):
    """Delete blocks by ID."""
    for bid in block_ids:
        resp = requests.delete(f"{NOTION_API}/blocks/{bid}", headers=headers())
        if resp.status_code == 429:
            retry_after = float(resp.headers.get("Retry-After", 1))
            time.sleep(retry_after)
            requests.delete(f"{NOTION_API}/blocks/{bid}", headers=headers())
        elif resp.status_code not in (200, 404):
            print(f"Warning: failed to delete block {bid}: {resp.status_code}")


def append_blocks(page_id, blocks):
    """Append blocks in batches of MAX_BLOCKS_PER_REQ."""
    for i in range(0, len(blocks), MAX_BLOCKS_PER_REQ):
        batch = blocks[i : i + MAX_BLOCKS_PER_REQ]
        resp = requests.patch(
            f"{NOTION_API}/blocks/{page_id}/children",
            headers=headers(),
            json={"children": batch},
        )
        if resp.status_code == 429:
            retry_after = float(resp.headers.get("Retry-After", 1))
            print(f"Rate limited, waiting {retry_after}s...")
            time.sleep(retry_after)
            resp = requests.patch(
                f"{NOTION_API}/blocks/{page_id}/children",
                headers=headers(),
                json={"children": batch},
            )
        if resp.status_code != 200:
            print(f"Error appending blocks (batch starting at {i}):")
            print(f"  Status: {resp.status_code}")
            print(f"  Response: {resp.text[:500]}")
            sys.exit(1)
        # Small delay to avoid rate limits
        if i + MAX_BLOCKS_PER_REQ < len(blocks):
            time.sleep(0.5)


def main():
    if not TOKEN or not PAGE_ID:
        print("Error: NOTION_TOKEN and NOTION_PAGE_ID must be set")
        sys.exit(1)

    # Read CLAUDE.md
    md_path = os.path.join(os.environ.get("GITHUB_WORKSPACE", "."), "CLAUDE.md")
    if not os.path.exists(md_path):
        print(f"Error: {md_path} not found")
        sys.exit(1)

    with open(md_path, "r", encoding="utf-8") as f:
        md_content = f.read()

    print(f"Read CLAUDE.md: {len(md_content)} chars, {md_content.count(chr(10))} lines")

    # Convert to Notion blocks
    blocks = parse_md_to_blocks(md_content)
    print(f"Parsed into {len(blocks)} Notion blocks")

    # Clear existing page content
    print("Clearing existing page content...")
    existing = get_existing_blocks(PAGE_ID)
    print(f"  Found {len(existing)} existing blocks to remove")
    delete_blocks(existing)

    # Append new content
    print("Appending new content...")
    append_blocks(PAGE_ID, blocks)
    print(f"Done! Synced {len(blocks)} blocks to Notion page {PAGE_ID}")


if __name__ == "__main__":
    main()
