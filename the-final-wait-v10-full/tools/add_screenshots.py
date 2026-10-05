#!/usr/bin/env python3
"""Add new 16:9 screenshots to The Final Wait.

Usage (from the project root):
    python tools/add_screenshots.py incoming/image1.png incoming/image2.jpg

Requires Pillow:
    py -m pip install Pillow

The script optimizes images for GitHub Pages, appends them to assets/scenes.json,
and skips exact duplicate files already recorded in assets/source-hashes.json.
"""
from __future__ import annotations

import hashlib
import json
import sys
from pathlib import Path
from PIL import Image, ImageOps, ImageStat

ROOT = Path(__file__).resolve().parents[1]
SCENES_FILE = ROOT / "assets" / "scenes.json"
HASHES_FILE = ROOT / "assets" / "source-hashes.json"
DESKTOP_DIR = ROOT / "assets" / "screenshots" / "desktop"
MOBILE_DIR = ROOT / "assets" / "screenshots" / "mobile"


def tone_for(img: Image.Image) -> str:
    tiny = img.convert("L").resize((32, 18))
    mean = ImageStat.Stat(tiny).mean[0]
    if mean < 78:
        return "night"
    if mean > 166:
        return "bright"
    return "mid"


def accent_for(img: Image.Image) -> str:
    # A restrained scene tint; the site's primary GTA VI palette stays fixed.
    tiny = img.convert("RGB").resize((1, 1))
    r, g, b = tiny.getpixel((0, 0))
    # Pull the average slightly toward a richer midtone.
    r = max(32, min(220, int(r * .85 + 24)))
    g = max(32, min(220, int(g * .85 + 24)))
    b = max(32, min(220, int(b * .85 + 24)))
    return f"#{r:02x}{g:02x}{b:02x}"


def sha256(path: Path) -> str:
    h = hashlib.sha256()
    with path.open("rb") as f:
        for chunk in iter(lambda: f.read(1024 * 1024), b""):
            h.update(chunk)
    return h.hexdigest()


def main(paths: list[str]) -> int:
    if not paths:
        print("Pass one or more image paths.")
        return 2

    scenes = json.loads(SCENES_FILE.read_text(encoding="utf-8"))
    known = json.loads(HASHES_FILE.read_text(encoding="utf-8")) if HASHES_FILE.exists() else []
    known_hashes = {item["sha256"] for item in known}
    next_id = max((int(s["id"].split("-")[1]) for s in scenes), default=0) + 1

    for raw in paths:
        src = Path(raw).expanduser().resolve()
        if not src.exists():
            print(f"SKIP: not found: {src}")
            continue
        digest = sha256(src)
        if digest in known_hashes:
            print(f"SKIP: exact duplicate: {src.name}")
            continue

        with Image.open(src) as opened:
            image = opened.convert("RGB")
            scene_id = f"scene-{next_id:02d}"
            desktop = ImageOps.fit(image, (1920, 1080), method=Image.Resampling.LANCZOS)
            mobile = ImageOps.fit(image, (960, 540), method=Image.Resampling.LANCZOS)
            desktop_path = DESKTOP_DIR / f"{scene_id}.webp"
            mobile_path = MOBILE_DIR / f"{scene_id}.webp"
            desktop.save(desktop_path, "WEBP", quality=82, method=6)
            mobile.save(mobile_path, "WEBP", quality=76, method=6)

            avg = ImageStat.Stat(image.resize((1, 1))).mean
            avg_hex = "#%02x%02x%02x" % tuple(int(v) for v in avg[:3])
            scenes.append({
                "id": scene_id,
                "desktop": f"assets/screenshots/desktop/{scene_id}.webp",
                "mobile": f"assets/screenshots/mobile/{scene_id}.webp",
                "tone": tone_for(image),
                "avg": avg_hex,
                "accent": accent_for(image),
                "category": "misc",
                "desktopPosition": "50% 50%",
                "mobilePosition": "50% 50%"
            })

        known.append({"sha256": digest, "original": src.name})
        known_hashes.add(digest)
        print(f"ADDED: {src.name} -> {scene_id}")
        next_id += 1

    SCENES_FILE.write_text(json.dumps(scenes, indent=2), encoding="utf-8")
    HASHES_FILE.write_text(json.dumps(known, indent=2), encoding="utf-8")
    print(f"Total scenes: {len(scenes)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
