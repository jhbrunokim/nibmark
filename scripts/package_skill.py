#!/usr/bin/env python3
"""Build the portable Nibmark skill ZIP using only the Python standard library."""
import argparse
from pathlib import Path
from zipfile import ZipFile, ZipInfo, ZIP_STORED

ROOT = Path(__file__).resolve().parent.parent
FILES = ('SKILL.md', 'LICENSE', 'agents/openai.yaml', 'references/syntax.md',
         'references/spdx.md', 'scripts/edit_link.py')


def package(output: Path) -> None:
    contents = [(name, (ROOT / 'skills/nibmark' / name).read_bytes()) for name in FILES]
    output.parent.mkdir(parents=True, exist_ok=True)
    with ZipFile(output, 'w', compression=ZIP_STORED) as archive:
        for name, data in contents:
            info = ZipInfo('nibmark/' + name, date_time=(2020, 1, 1, 0, 0, 0))
            info.create_system = 3
            info.external_attr = 0o100644 << 16
            archive.writestr(info, data)


if __name__ == '__main__':
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', type=Path, default=ROOT / 'public/downloads/nibmark-skill.zip')
    args = parser.parse_args()
    package(args.output)
    print(args.output)
