#!/usr/bin/env python3
"""Generate ManageX desktop icons from the real logo."""

import shutil
import struct
import subprocess
import sys
import zlib
from pathlib import Path
from typing import Optional

ROOT = Path(__file__).resolve().parents[1]
BUILD = ROOT / "build"
ICONSET = BUILD / "icon.iconset"

LOGO_CANDIDATES = [
    ROOT / "frontend" / "public" / "managex_logo.png",
    ROOT / "managex_logo.png",
]


def find_logo() -> Optional[Path]:
    for path in LOGO_CANDIDATES:
        if path.is_file():
            return path
    return None


def png_chunk(tag: bytes, data: bytes) -> bytes:
    return struct.pack(">I", len(data)) + tag + data + struct.pack(">I", zlib.crc32(tag + data) & 0xFFFFFFFF)


def write_solid_png(path: Path, size: int, color=(37, 99, 235, 255)):
    path.parent.mkdir(parents=True, exist_ok=True)
    row = b"\x00" + bytes(color) * size
    raw = row * size
    compressed = zlib.compress(raw, 9)
    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    data = (
        b"\x89PNG\r\n\x1a\n"
        + png_chunk(b"IHDR", ihdr)
        + png_chunk(b"IDAT", compressed)
        + png_chunk(b"IEND", b"")
    )
    path.write_bytes(data)


def resize_with_pillow(logo: Path, size: int, dest: Path):
    from PIL import Image

    img = Image.open(logo).convert("RGBA")
    img = img.resize((size, size), Image.Resampling.LANCZOS)
    dest.parent.mkdir(parents=True, exist_ok=True)
    img.save(dest, format="PNG")


def resize_with_sips(logo: Path, size: int, dest: Path):
    dest.parent.mkdir(parents=True, exist_ok=True)
    shutil.copy2(logo, dest)
    subprocess.run(["sips", "-z", str(size), str(size), str(dest)], check=True, capture_output=True)


def write_icon_png(logo: Optional[Path], size: int, dest: Path):
    if logo:
        try:
            resize_with_pillow(logo, size, dest)
            return
        except ImportError:
            if sys.platform == "darwin":
                try:
                    resize_with_sips(logo, size, dest)
                    return
                except (subprocess.CalledProcessError, FileNotFoundError):
                    pass
    write_solid_png(dest, size)


def build_icns(logo: Optional[Path]):
    if sys.platform != "darwin":
        return
    ICONSET.mkdir(parents=True, exist_ok=True)
    pairs = [(16, "16x16"), (32, "32x32"), (128, "128x128"), (256, "256x256"), (512, "512x512")]
    for size, name in pairs:
        write_icon_png(logo, size, ICONSET / f"icon_{name}.png")
        write_icon_png(logo, size * 2, ICONSET / f"icon_{name}@2x.png")
    icns_path = BUILD / "icon.icns"
    subprocess.run(["iconutil", "-c", "icns", str(ICONSET), "-o", str(icns_path)], check=True)
    shutil.rmtree(ICONSET, ignore_errors=True)


def main():
    BUILD.mkdir(parents=True, exist_ok=True)
    logo = find_logo()
    if not logo:
        print("Warning: managex_logo.png not found, using fallback color icon", file=sys.stderr)

    for size in (16, 32, 64, 128, 256, 512, 1024):
        write_icon_png(logo, size, BUILD / "icons" / f"{size}x{size}.png")

    write_icon_png(logo, 512, BUILD / "icon.png")
    write_icon_png(logo, 256, BUILD / "icons" / "256x256.png")

    build_icns(logo)
    print(f"Icons written to {BUILD}" + (f" from {logo}" if logo else ""))


if __name__ == "__main__":
    main()
