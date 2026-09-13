"""Validate and export the 192-frame Neuraz black-oil animation.

Requires Pillow and NumPy. Does not render Blender frames or touch older assets.
Run only after approving the visual preview. Pass --wait to poll missing PNGs.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import math
from pathlib import Path
import shutil
import struct
import subprocess
import time

import numpy as np
from PIL import Image


ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / "design" / "neuraz-aceite"
FRAME_COUNT = 192
FPS = 24
RESOLUTION = (1080, 1080)


def inspect_frames(frames: Path) -> dict:
    missing, invalid = [], []
    for index in range(1, FRAME_COUNT + 1):
        path = frames / f"{index:04d}.png"
        if not path.exists():
            missing.append(index)
            continue
        try:
            with Image.open(path) as image:
                image.verify()
            with Image.open(path) as image:
                image.load()
                if image.size != RESOLUTION:
                    raise ValueError(f"Expected {RESOLUTION}; found {image.size}")
                if image.convert("RGBA").getchannel("A").getextrema() != (255, 255):
                    raise ValueError("MP4 source contains transparent pixels")
        except Exception as error:
            invalid.append({"frame": index, "error": str(error)})
    return {"missing": missing, "invalid": invalid}


def run(command: list[str], *, binary: bool = False) -> subprocess.CompletedProcess:
    result = subprocess.run(command, capture_output=True, text=not binary)
    if result.returncode:
        message = result.stderr.decode(errors="replace") if binary else result.stderr
        raise RuntimeError(message.strip() or f"Command exited with {result.returncode}")
    return result


def faststart_is_valid(path: Path) -> bool:
    offsets = {}
    with path.open("rb") as stream:
        total = path.stat().st_size
        while stream.tell() + 8 <= total:
            offset = stream.tell()
            size, name = struct.unpack(">I4s", stream.read(8))
            if size == 1:
                size = struct.unpack(">Q", stream.read(8))[0]
            elif size == 0:
                size = total - offset
            if size < 8:
                raise ValueError("Invalid MP4 atom size")
            offsets.setdefault(name, offset)
            stream.seek(offset + size)
    return b"moov" in offsets and b"mdat" in offsets and offsets[b"moov"] < offsets[b"mdat"]


def export() -> dict:
    ffmpeg = shutil.which("ffmpeg") or "/usr/local/bin/ffmpeg"
    ffprobe = shutil.which("ffprobe") or "/usr/local/bin/ffprobe"
    frames = OUT / "frames"
    output = OUT / "neuraz-aceite-negro.mp4"
    temporary = OUT / "neuraz-aceite-negro.encoding.mp4"
    first, last = frames / "0001.png", frames / "0192.png"
    with Image.open(first) as image:
        first_rgba = image.convert("RGBA").tobytes()
        source_rgb = np.asarray(image.convert("RGB"), dtype=np.float64)
    with Image.open(last) as image:
        last_rgba = image.convert("RGBA").tobytes()
    if first_rgba != last_rgba:
        raise ValueError("First and last PNG differ; validate the intended loop before export")

    run([
        ffmpeg, "-y", "-hide_banner", "-loglevel", "error",
        "-framerate", str(FPS), "-start_number", "1", "-i", str(frames / "%04d.png"),
        "-frames:v", str(FRAME_COUNT),
        "-vf", "scale=in_range=pc:out_range=tv:out_color_matrix=bt709,format=yuv420p",
        "-c:v", "libx264", "-crf", "17", "-preset", "slow", "-profile:v", "high",
        "-color_range", "tv", "-colorspace", "bt709", "-color_primaries", "bt709",
        "-color_trc", "iec61966-2-1", "-movflags", "+faststart", "-an", str(temporary),
    ])
    probe = json.loads(run([
        ffprobe, "-v", "error", "-count_frames", "-show_entries",
        "stream=codec_name,codec_type,width,height,pix_fmt,nb_read_frames,avg_frame_rate,"
        "color_range,color_space,color_transfer,color_primaries:format=duration",
        "-of", "json", str(temporary),
    ]).stdout)
    streams = probe["streams"]
    if len(streams) != 1 or streams[0]["codec_type"] != "video":
        raise ValueError(f"Expected one video stream and no audio: {streams}")
    video = streams[0]
    expected = {
        "codec_name": "h264", "width": 1080, "height": 1080, "pix_fmt": "yuv420p",
        "nb_read_frames": str(FRAME_COUNT), "avg_frame_rate": "24/1",
        "color_range": "tv", "color_space": "bt709", "color_transfer": "iec61966-2-1",
        "color_primaries": "bt709",
    }
    for key, value in expected.items():
        if video.get(key) != value:
            raise ValueError(f"Unexpected {key}: {video.get(key)}; expected {value}")
    duration = float(probe["format"]["duration"])
    if abs(duration - 8.0) > 0.001:
        raise ValueError(f"Unexpected duration: {duration}")
    if not faststart_is_valid(temporary):
        raise ValueError("MP4 moov atom does not precede video data")
    decode = run([ffmpeg, "-hide_banner", "-v", "error", "-xerror", "-i", str(temporary), "-f", "null", "-"])
    if decode.stderr.strip():
        raise ValueError(decode.stderr.strip())
    decoded = run([
        ffmpeg, "-hide_banner", "-v", "error", "-i", str(temporary), "-frames:v", "1",
        "-vf", "scale=in_range=tv:out_range=pc:in_color_matrix=bt709,format=rgb24",
        "-f", "rawvideo", "-",
    ], binary=True)
    decoded_rgb = np.frombuffer(decoded.stdout, dtype=np.uint8).reshape(1080, 1080, 3).astype(np.float64)
    difference = decoded_rgb - source_rgb
    mse = float(np.mean(difference ** 2))
    mae = float(np.mean(np.abs(difference)))
    first_hash = hashlib.sha256(first.read_bytes()).hexdigest()
    last_hash = hashlib.sha256(last.read_bytes()).hexdigest()
    checks = {
        "status": "passed",
        "source_frames": {"count": FRAME_COUNT, "resolution": list(RESOLUTION), "all_png_crc_and_pixels_valid": True, "all_opaque": True},
        "video": {
            "file": output.name, "codec": "h264", "pixel_format": "yuv420p", "frames": FRAME_COUNT,
            "fps": FPS, "duration_seconds": duration, "audio": False, "crf": 17, "preset": "slow",
            "faststart": True, "color_range": "tv", "color_space": "bt709",
            "color_transfer": "iec61966-2-1", "color_primaries": "bt709",
            "full_decode_errors": 0, "bytes": temporary.stat().st_size,
        },
        "fidelity": {"first_frame_rgb_mae_0_255": round(mae, 6), "first_frame_rgb_psnr_db": round(10 * math.log10(255 ** 2 / mse), 4) if mse else None},
        "loop": {"first_png": first.name, "last_png": last.name, "pixels_identical": True, "files_identical": first_hash == last_hash, "first_sha256": first_hash, "last_sha256": last_hash},
    }
    temporary.replace(output)
    (OUT / "export-checks.json").write_text(json.dumps(checks, indent=2) + "\n")
    return checks


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--wait", action="store_true", help="Poll incomplete source frames every 45 seconds")
    options = parser.parse_args()
    while True:
        inspection = inspect_frames(OUT / "frames")
        if not inspection["missing"] and not inspection["invalid"]:
            break
        if not options.wait:
            raise SystemExit(json.dumps({"status": "incomplete", **inspection}))
        time.sleep(45)
    print(json.dumps(export()), flush=True)


if __name__ == "__main__":
    main()
