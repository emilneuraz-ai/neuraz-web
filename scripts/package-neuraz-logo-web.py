"""Package the reusable Astro logo components and their public assets."""

from pathlib import Path
import json
import zipfile


ROOT = Path(__file__).resolve().parents[1]
FILES = [
    "src/components/AnimatedLogo.astro",
    "src/components/NavbarBrand.astro",
    "src/components/PageLoader.astro",
    "src/components/MercuryLogo.astro",
    "src/scripts/animated-logo.ts",
    "src/scripts/mercury-logo.ts",
    "public/images/isotipo.svg",
    "public/images/neuraz-logo-animated.svg",
    "public/images/neuraz-mercury-poster.png",
    "public/models/neuraz-logo-motion.json",
    "public/models/neuraz-mercury.glb",
    "public/models/neuraz-mercury-fluid.json",
    "public/models/neuraz-mercury-fluid.bin.gz",
    "public/media/neuraz-mercury.mp4",
]


def main():
    output = ROOT / "public/models/neuraz-logo-web.zip"
    temporary = output.with_suffix(".tmp")
    for name in FILES:
        if not (ROOT / name).is_file():
            raise FileNotFoundError(name)
    with zipfile.ZipFile(temporary, "w", zipfile.ZIP_DEFLATED, compresslevel=9) as archive:
        for name in FILES:
            archive.write(ROOT / name, name)
        archive.write(ROOT / "design/neuraz-web-assets/README.md", "README.md")
    with zipfile.ZipFile(temporary) as archive:
        assert archive.testzip() is None
        assert len(archive.namelist()) == len(FILES) + 1
        for name in FILES:
            assert archive.read(name) == (ROOT / name).read_bytes(), name
    temporary.replace(output)
    print(json.dumps({"package": str(output), "files": len(FILES) + 1, "bytes": output.stat().st_size, "integrity": "passed"}))


if __name__ == "__main__":
    main()
