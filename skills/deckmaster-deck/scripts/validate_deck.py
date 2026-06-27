#!/usr/bin/env python3
"""Validate a DeckMaster deck.json (optionally with its assets/ folder)
without needing Rust installed.

This intentionally mirrors deckmaster-core's validate() function and the
checklist in docs/DECKPKG_SPEC.md section 6, check for check, so a model
authoring a deck.json gets the same answer here as `deckmaster validate`
would give later. If you change one, change the other.

Usage:
    python3 validate_deck.py path/to/deck.json
    python3 validate_deck.py path/to/deck.json --assets-dir path/to/assets

Exit code is 0 if there are no errors (informational notes don't affect
the exit code), 1 otherwise.
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

MEDIA_TYPE_TO_EXTENSION = {
    "image/png": "png",
    "image/jpeg": "jpeg",
    "image/jpg": "jpeg",
    "image/gif": "gif",
    "image/webp": "webp",
    "image/bmp": "bmp",
}


class Issue:
    def __init__(self, severity: str, message: str) -> None:
        self.severity = severity
        self.message = message

    def __str__(self) -> str:
        return f"{self.severity.upper()}: {self.message}"


def extension_for_media_type(media_type: str) -> str:
    return MEDIA_TYPE_TO_EXTENSION.get(media_type, "png")


def asset_file_name(asset: dict[str, Any]) -> str:
    return f"{asset.get('id')}.{extension_for_media_type(asset.get('media_type', ''))}"


def require_fields(obj: dict[str, Any], fields: list[str], where: str) -> list[Issue]:
    issues = []
    for field in fields:
        if field not in obj:
            issues.append(Issue("error", f"{where} is missing required field '{field}'"))
    return issues


def validate_document_shape(document: Any) -> list[Issue]:
    """Structural checks that come before the deeper semantic checks --
    catches a model having produced something that isn't even the right
    shape (wrong field names, wrong types) with a clear message instead
    of a confusing exception further down."""
    issues: list[Issue] = []

    if not isinstance(document, dict):
        return [Issue("error", "deck.json root must be a JSON object")]

    issues += require_fields(document, ["id", "metadata", "theme", "assets", "slides"], "deck.json")

    if "metadata" in document and isinstance(document["metadata"], dict):
        issues += require_fields(document["metadata"], ["title"], "metadata")

    if "assets" in document and not isinstance(document["assets"], list):
        issues.append(Issue("error", "assets must be an array"))

    if "slides" in document and not isinstance(document["slides"], list):
        issues.append(Issue("error", "slides must be an array"))

    return issues


def validate_deck(document: dict[str, Any], assets_dir: Path | None) -> list[Issue]:
    issues: list[Issue] = []

    slides = document.get("slides", [])
    assets = document.get("assets", [])

    if not isinstance(slides, list) or len(slides) == 0:
        issues.append(Issue("error", "presentation has no slides"))
        slides = []

    if not isinstance(assets, list):
        assets = []

    declared_asset_ids = {asset.get("id") for asset in assets if isinstance(asset, dict)}
    referenced_asset_ids: set[str] = set()

    for slide in slides:
        if not isinstance(slide, dict):
            issues.append(Issue("error", "a slide entry is not an object"))
            continue

        slide_id = slide.get("id", "<missing id>")
        size = slide.get("size", {})

        width = size.get("width") if isinstance(size, dict) else None
        height = size.get("height") if isinstance(size, dict) else None

        if not isinstance(width, (int, float)) or not isinstance(height, (int, float)) or width <= 0 or height <= 0:
            issues.append(
                Issue(
                    "error",
                    f"slide {slide_id} has a non-positive or missing size ({width} x {height})",
                )
            )

        elements = slide.get("elements", [])
        if not isinstance(elements, list):
            issues.append(Issue("error", f"slide {slide_id} elements is not an array"))
            elements = []

        for element in elements:
            if not isinstance(element, dict):
                issues.append(Issue("error", f"an element on slide {slide_id} is not an object"))
                continue

            element_id = element.get("id", "<missing id>")
            bounds = element.get("bounds", {})

            bwidth = bounds.get("width") if isinstance(bounds, dict) else None
            bheight = bounds.get("height") if isinstance(bounds, dict) else None

            if isinstance(bwidth, (int, float)) and bwidth < 0:
                issues.append(
                    Issue("error", f"element {element_id} on slide {slide_id} has negative width")
                )
            if isinstance(bheight, (int, float)) and bheight < 0:
                issues.append(
                    Issue("error", f"element {element_id} on slide {slide_id} has negative height")
                )

            element_type = element.get("type")

            if element_type == "Text":
                issues += require_fields(element, ["text", "font_size", "color", "bounds"], f"text element {element_id}")

            if element_type == "Image":
                issues += require_fields(element, ["asset_id", "bounds"], f"image element {element_id}")

                asset_id = element.get("asset_id")
                referenced_asset_ids.add(asset_id)

                if asset_id not in declared_asset_ids:
                    issues.append(
                        Issue(
                            "error",
                            f"image element {element_id} references asset_id {asset_id} "
                            "which is not declared in assets[]",
                        )
                    )
                elif assets_dir is not None:
                    asset = next((a for a in assets if isinstance(a, dict) and a.get("id") == asset_id), None)
                    if asset is not None:
                        expected_path = assets_dir / asset_file_name(asset)
                        if not expected_path.is_file():
                            issues.append(
                                Issue(
                                    "error",
                                    f"asset {asset_id} ({asset_file_name(asset)}) is declared but "
                                    f"missing from the package -- expected a file at {expected_path}",
                                )
                            )

    for asset in assets:
        if not isinstance(asset, dict):
            issues.append(Issue("error", "an assets[] entry is not an object"))
            continue

        issues += require_fields(asset, ["id", "media_type"], "asset")

        asset_id = asset.get("id")

        if asset_id not in referenced_asset_ids:
            issues.append(
                Issue(
                    "info",
                    f"asset {asset_id} ({asset_file_name(asset)}) is declared but not referenced "
                    "by any element",
                )
            )

        if assets_dir is not None and asset_id in declared_asset_ids:
            expected_path = assets_dir / asset_file_name(asset)
            if not expected_path.is_file() and asset_id not in referenced_asset_ids:
                # Already reported via the element-side check above if
                # this asset IS referenced; only add it here if nothing
                # referenced it yet, to avoid a duplicate message.
                issues.append(
                    Issue(
                        "error",
                        f"asset {asset_id} ({asset_file_name(asset)}) is declared in assets[] but "
                        f"missing from the package -- expected a file at {expected_path}",
                    )
                )

    return issues


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("deck_json", type=Path, help="Path to a deck.json file")
    parser.add_argument(
        "--assets-dir",
        type=Path,
        default=None,
        help="Path to the assets/ folder to check referenced images actually exist. "
        "If omitted, asset *references* are still checked for internal consistency, "
        "just not against real files on disk.",
    )
    args = parser.parse_args()

    if not args.deck_json.is_file():
        print(f"ERROR: {args.deck_json} does not exist or is not a file", file=sys.stderr)
        return 1

    try:
        document = json.loads(args.deck_json.read_text())
    except json.JSONDecodeError as error:
        print(f"ERROR: {args.deck_json} is not valid JSON: {error}", file=sys.stderr)
        return 1

    shape_issues = validate_document_shape(document)

    if any(issue.severity == "error" for issue in shape_issues):
        for issue in shape_issues:
            print(issue)
        print(f"\n{args.deck_json}: {len(shape_issues)} error(s) found", file=sys.stderr)
        return 1

    issues = validate_deck(document, args.assets_dir)

    errors = [issue for issue in issues if issue.severity == "error"]
    infos = [issue for issue in issues if issue.severity == "info"]

    for issue in errors:
        print(issue)
    for issue in infos:
        print(issue)

    if errors:
        print(f"\n{args.deck_json}: {len(errors)} error(s) found", file=sys.stderr)
        return 1

    print(f"{args.deck_json}: valid ({len(infos)} note(s))")
    return 0


if __name__ == "__main__":
    sys.exit(main())
