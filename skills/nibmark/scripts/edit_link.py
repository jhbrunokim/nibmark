#!/usr/bin/env python3
"""Encode a Nibmark v1 edit link; does not validate DSL or render an image."""
import argparse
import base64
import json
from pathlib import Path


def edit_link(source: str, locale: str) -> str:
    payload = json.dumps({'source': source, 'locale': locale}, ensure_ascii=False, separators=(',', ':')).encode('utf-8')
    if len(payload) > 50 * 1024:
        raise ValueError('Recipe exceeds the share payload limit; share the source file instead.')
    encoded = base64.urlsafe_b64encode(payload).decode('ascii').rstrip('=')
    url = 'https://jhbrunokim.github.io/nibmark/#nibmark=v1.' + encoded
    if len(url) > 12_000:
        raise ValueError('Edit link exceeds 12,000 characters; share the source file instead.')
    return url


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('source', type=Path)
    parser.add_argument('--locale', choices=('en', 'ko'), default='en')
    args = parser.parse_args()
    try:
        source = args.source.read_bytes().decode('utf-8')
        print(edit_link(source, args.locale))
    except (OSError, UnicodeError, ValueError) as error:
        parser.exit(2, f'{error}\n')


if __name__ == '__main__':
    main()
