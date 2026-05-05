#!/usr/bin/env python3
"""Sync notes from a designated Obsidian vault folder into content/.

Default behavior: every .md file under VAULT_PUBLISH_DIR is published. Only
notes whose frontmatter contains `publish: true` are included. Before copying,
the script always prints the list of excluded notes; if any exist, it
requires interactive confirmation to proceed (override with --yes).

Attachments referenced from published notes (via ![[file]] or ![alt](path))
are searched across the entire vault by basename and copied along. Files 
under {VAULT_PUBLISH_DIR}/statc/ are always copied, even when no note
references them. Deletes from content/ anything no longer in the published
set.

Usage:
    ./publish.py            # interactive: prompts y/N if any notes are excluded
    ./publish.py --yes      # skip the confirmation prompt
    ./publish.py --dry-run  # preview only, no writes, no prompt
"""

import re
import shutil
import sys
from pathlib import Path

# Keep this in sync with vault location
VAULT_ROOT = Path.home() / "Documents" / "Zettelkasten"
VAULT_PUBLISH_DIR = VAULT_ROOT / "cormorant.earth"   # the designated publish folder

REPO_ROOT = Path(__file__).resolve().parent
CONTENT_DIR = REPO_ROOT / "content"

FRONTMATTER_RE = re.compile(r"\A---\s*\n(.*?)\n---\s*\n", re.DOTALL)
PUBLISH_TRUE_RE = PUBLISH_TRUE_RE = re.compile(r"""^\s*publish\s*:\s*["']?true["']?\s*$""", re.MULTILINE | re.IGNORECASE)
EMBED_RE = re.compile(r"!\[\[([^\]|#]+?)(?:#[^\]|]*)?(?:\|[^\]]*)?\]\]")
MD_IMG_RE = re.compile(r"!\[[^\]]*\]\(([^)]+?)\)")
WIKILINK_IMG_RE = re.compile(r"!\[\[([^\]]+?)\]\]")
HTML_IMG_ALT_RE = re.compile(r'<img[^>]*\salt\s*=\s*["\']([^"\']*)["\']', re.IGNORECASE)
IMG_EXT_RE = re.compile(r"\.(jpe?g|png|gif|webp|svg|mp4|mov)$", re.IGNORECASE)

FRONTMATTER_IMAGE_FIELDS = ("map_image",)  # extend if you add more later
FRONTMATTER_IMAGE_REGEXES = [
    re.compile(
        rf'^\s*{re.escape(f)}\s*:\s*["\']?([^"\'\n]+?)["\']?\s*$',
        re.MULTILINE,
    )
    for f in FRONTMATTER_IMAGE_FIELDS
]


def is_hidden(rel: Path) -> bool:
    return any(part.startswith(".") for part in rel.parts)


def has_publish_true(md_path: Path) -> bool:
    try:
        text = md_path.read_text(encoding="utf-8")
    except (UnicodeDecodeError, OSError):
        return False
    m = FRONTMATTER_RE.match(text)
    return bool(m and PUBLISH_TRUE_RE.search(m.group(1)))


def relpath_for_dest(src: Path) -> Path:
    """Files inside the publish dir use publish-dir-relative paths so the
    publish folder name doesn't appear in URLs. Files elsewhere in the vault
    (attachments) use vault-relative paths."""
    try:
        return src.relative_to(VAULT_PUBLISH_DIR)
    except ValueError:
        return src.relative_to(VAULT_ROOT)


def find_attachment_refs(md_files: set[Path]) -> set[Path]:
    """Resolve attachment references by basename match across the whole vault."""
    by_name: dict[str, list[Path]] = {}
    for f in VAULT_ROOT.rglob("*"):
        if not f.is_file():
            continue
        rel = f.relative_to(VAULT_ROOT)
        if is_hidden(rel) or f.suffix.lower() == ".md":
            continue
        by_name.setdefault(f.name, []).append(f)

    found: set[Path] = set()
    for md in md_files:
        text = md.read_text(encoding="utf-8", errors="ignore")
        refs = []

        # Frontmatter image fields (map_image, etc.)
        fm_match = FRONTMATTER_RE.match(text)
        if fm_match:
            fm_text = fm_match.group(1)
            for fre in FRONTMATTER_IMAGE_REGEXES:
                refs.extend(r.strip() for r in fre.findall(fm_text))

        for ref in EMBED_RE.findall(text):
            ref = ref.strip()
            if not ref.endswith(".md"):
                refs.append(ref)
        for ref in MD_IMG_RE.findall(text):
            ref = ref.strip()
            if ref.startswith(("http://", "https://", "data:")):
                continue
            refs.append(ref)
        for ref in refs:
            for hit in by_name.get(Path(ref).name, []):
                found.add(hit)
    return found

def warn_missing_eager(md_files: set[Path]) -> None:
    """Non-blocking warning: published notes with body images but no `eager`
    alt-token are unlikely to have a marked LCP candidate."""
    warnings: list[Path] = []
    for md in md_files:
        text = md.read_text(encoding="utf-8", errors="ignore")
        body = FRONTMATTER_RE.sub("", text, count=1)

        has_image = False
        has_eager = False

        for target in WIKILINK_IMG_RE.findall(body):
            if not IMG_EXT_RE.search(target.split("|", 1)[0]):
                continue
            has_image = True
            alias = target.split("|", 1)[1] if "|" in target else ""
            if "eager" in alias.split():
                has_eager = True

        for m in MD_IMG_RE.finditer(body):
            url = m.group(1).strip()
            if url.startswith(("http://", "https://", "data:")):
                continue
            has_image = True
            # Markdown image alt is between [ and ]; re-extract:
            full = re.match(r"!\[([^\]]*)\]", body[m.start():])
            if full and "eager" in full.group(1).split():
                has_eager = True

        for alt in HTML_IMG_ALT_RE.findall(body):
            has_image = True
            if "eager" in alt.split():
                has_eager = True

        if has_image and not has_eager:
            warnings.append(md)

    if warnings:
        print(f"\n!!! {len(warnings)} note(s) have images but no |eager token (LCP candidate not marked):")
        for md in sorted(warnings):
            print(f"  - {md.relative_to(VAULT_PUBLISH_DIR)}")
        print("    Add |eager to the LCP image's wikilink alias to opt into eager-loading.")

def collect_static_files() -> set[Path]:
    """Always-include all non-markdown files under {VAULT_PUBLISH_DIR}/static/,
    regardless of whether they’re referenced by a published note. Useful for
    favicons, fonts, og-images, and any reusable static assets that may not
    yet be linked from any note."""
    static_dir = VAULT_PUBLISH_DIR / "static"
    if not static_dir.is_dir():
        return set()
    found: set[Path] = set()
    for p in static_dir.rglob("*"):
        if not p.is_file():
            continue
        # Don’t force-include markdown files in static/ — they still need publish: true.
        if p.suffix.lower() == ".md":
            continue
        rel = p.relative_to(VAULT_PUBLISH_DIR)
        if is_hidden(rel):
            continue
        found.add(p)
    return found

def main() -> int:
    dry = "--dry-run" in sys.argv
    yes = "--yes" in sys.argv or "-y" in sys.argv

    if not VAULT_PUBLISH_DIR.is_dir():
        print(f"Publish folder not found: {VAULT_PUBLISH_DIR}", file=sys.stderr)
        return 1

    # Partition .md files in the publish dir into included vs excluded
    all_md: set[Path] = set()
    included: set[Path] = set()
    for md in VAULT_PUBLISH_DIR.rglob("*.md"):
        if is_hidden(md.relative_to(VAULT_PUBLISH_DIR)):
            continue
        all_md.add(md)
        if has_publish_true(md):
            included.add(md)
    excluded = all_md - included
    published_md = included

    # Always show what's being held back, even when the list is empty
    if excluded:
        print(f"\n!!! {len(excluded)} note(s) not marked publish: true (will NOT be published):")
        for md in sorted(excluded):
            print(f"  - {md.relative_to(VAULT_PUBLISH_DIR)}")
        print()
    else:
        print("All notes marked publish: true in publish folder.")

    warn_missing_eager(published_md)

    # Confirmation gate: only fires when there are exclusions to review
    if excluded and not dry and not yes:
        prompt = f"Confirm: publish {len(published_md)} note(s) and skip the {len(excluded)} above? [y/N]: "
        resp = input(prompt).strip().lower()
        if resp != "y":
            print("Aborted.")
            return 1

    attachments = find_attachment_refs(published_md)
    static_files = collect_static_files()
    sources = published_md | attachments | static_files
    desired_rel = {relpath_for_dest(p) for p in sources}

    print(f"Publishing {len(published_md)} note(s) + {len(attachments)} attachment(s) + {len(static_files)} static file(s)")

    for src in sources:
        rel = relpath_for_dest(src)
        dst = CONTENT_DIR / rel
        if dry:
            print(f"  COPY   {rel}")
        else:
            dst.parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dst)

    if CONTENT_DIR.is_dir():
        for existing in CONTENT_DIR.rglob("*"):
            if not existing.is_file():
                continue
            rel = existing.relative_to(CONTENT_DIR)
            if rel not in desired_rel:
                if existing.name.startswith("."):
                    continue            # preserve .gitkeep etc
                if dry:
                    print(f"  DELETE {rel}")
                else:
                    existing.unlink()
        if not dry:
            for d in sorted([p for p in CONTENT_DIR.rglob("*") if p.is_dir()], reverse=True):
                try:
                    d.rmdir()
                except OSError:
                    pass

    return 0


if __name__ == "__main__":
    sys.exit(main())