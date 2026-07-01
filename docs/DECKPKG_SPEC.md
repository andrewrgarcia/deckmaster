# DeckMaster Package Format (`.zip`) — v1

Status: **Canonical**. This document is the source of truth for the
DeckMaster data model. `deckmaster-core`, the editor, the CLI, and any LLM
authoring skill must all conform to this spec. Where code and this doc
disagree, the doc wins until the doc is updated.

DeckMaster packages are ordinary zip files. The preferred user-facing file
extension is `.zip`; `.deckpkg` is a legacy/specialized extension for the same
layout and may still be accepted by tools for backward compatibility.

---

## 1. Goals

1. One canonical on-disk representation for a presentation: a package, not
   a single bloated JSON file.
2. `deck.json` stays small and human/LLM-readable — it never embeds image
   bytes.
3. Raster images and PDF image assets are real files in `assets/`,
   referenced by id.
4. Equations remain semantic TeX source in `deck.json`, not flattened into
   screenshots.
5. The package is just a zip. No custom binary format, no surprises.
6. Unzip it and you get a plain folder you can `cat`, `grep`, diff in git,
   or hand to an LLM.

## 2. What changes from the old model

The old model allowed `ImageElement.src` to be either a `data:` URL or a
relative path, decided ad hoc per import mode. That is **deprecated as a
canonical form** as of this spec.

| | Old (deprecated as canonical) | New (canonical) |
|---|---|---|
| Image storage | inline base64 in `src` | real file in `assets/` |
| Image reference | `data:image/png;base64,...` or loose relative path | `asset_id` (UUID), resolved via `assets[]` |
| PDF image handling | flatten to screenshot or unsupported | preserve `.pdf` asset, render preview when needed |
| Equations | literal TeX inside Text or dead image | first-class `Math` element with raw TeX source |
| Top-level artifact | a single `.json` file | a `.zip` containing `deck.json` + `assets/` |
| Embedded data URLs | the default | a one-way **export convenience**, never canonical |

Embedded-data-URL JSON is not deleted from the system. It becomes an
**export target** (`deckmaster export embedded-json`) for cases like
pasting a whole deck into a single LLM message. It is never again the
thing `deckmaster-core` treats as the source of truth, and the importer
does not need to accept it going forward.

## 3. Package layout

```text
mydeck.zip                    (a zip file, this exact layout inside)
├── deck.json                 required, canonical document
└── assets/
    ├── 3f9a1c20.png
    ├── 7bb44e10.jpeg
    ├── 94ad0021.pdf
    └── ...
```

Rules:

- `deck.json` MUST be at the zip root, named exactly `deck.json`.
- All asset files MUST live directly under `assets/` (no subfolders in v1).
- Asset file names MUST be `{asset_id}.{ext}` where `asset_id` matches the
  `id` field of the corresponding entry in `deck.json`'s `assets[]` array,
  and `ext` is one of: `png`, `jpeg`, `gif`, `webp`, `bmp`, `pdf`.
- A package with no `assets/` directory is valid (text/math-only deck).
- Extra files in the zip (e.g. a future `thumbnail.png`) MUST be ignored
  by readers, not rejected — this keeps the format forward-extensible.

Preferred file extension: `.zip`. Legacy/specialized extension:
`.deckpkg`. MIME type (for future hosted use):
`application/vnd.deckmaster.package+zip`.

## 4. `deck.json` schema

This is additive to the existing `deckmaster-core` model, with one
breaking change from the old ad hoc JSON shape:
`ImageElement.src` → `ImageElement.asset_id`.

```jsonc
{
  "id": "uuid",
  "metadata": {
    "title": "string",
    "author": "string | null"
  },
  "theme": {
    "name": "string",
    "background": { "value": "#RRGGBB" },
    "foreground": { "value": "#RRGGBB" }
  },
  "assets": [
    {
      "id": "uuid",              // matches assets/{id}.{ext} in the package
      "media_type": "image/png", // image/png, image/jpeg, image/gif, image/webp, image/bmp, or application/pdf
      "alt": "string | null"     // default alt text for this asset
    }
  ],
  "slides": [
    {
      "id": "uuid",
      "name": "string | null",
      "size": { "width": 960.0, "height": 540.0 },   // points, 96pt = 1in
      "elements": [
        {
          "type": "Text",
          "id": "uuid",
          "bounds": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
          "text": "string",
          "font_size": 24.0,
          "color": { "value": "#RRGGBB" }
        },
        {
          "type": "Math",
          "id": "uuid",
          "bounds": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
          "tex": "\\frac{1}{1 + e^{-x}}",
          "font_size": 36.0,
          "color": { "value": "#RRGGBB" }
        },
        {
          "type": "Image",
          "id": "uuid",
          "bounds": { "x": 0.0, "y": 0.0, "width": 0.0, "height": 0.0 },
          "asset_id": "uuid",       // REQUIRED, must exist in top-level assets[]
          "alt": "string | null"    // overrides assets[].alt if present
        },
        { "type": "Shape", "...": "reserved/future" },
        { "type": "Table", "...": "reserved/future" },
        { "type": "Chart", "...": "reserved/future" }
      ]
    }
  ]
}
```

### Field notes

- **Units**: all `bounds`, `size`, and `font_size` stay in points (pt), as
  today. 1pt = 1/72in. Canonical widescreen slide = 960×540pt (13.333×7.5in).
- **Colors**: `#RRGGBB` hex string, always 6 digits, uppercase preferred
  but readers must accept lowercase.
- **Text elements**: plain text only. Do not use Text elements for equations
  unless the goal is to show TeX source literally.
- **Math elements**: `tex` is raw TeX math source without surrounding `$...$`,
  `$$...$$`, or `\[...\]`. Readers may normalize those delimiters if present,
  but writers should omit them. The `tex` string must be non-empty.
- **Image elements**: every `ImageElement.asset_id` MUST correspond to an
  entry in the top-level `assets[]` array, which in turn MUST correspond to a
  file in `assets/` inside the package.
- **PDF image assets**: an Image element may reference an asset whose
  `media_type` is `application/pdf`. GUI/web renderers may cache a raster
  preview for display, but the package preserves the original PDF bytes.
  TeX/PDF-oriented exporters may include the PDF directly.
- **No `data:` URLs in `asset_id`.** If a reader sees something that looks
  like a data URL where `asset_id` is expected, that's a malformed/legacy
  document, not a variant to support.
- **Unused assets** (declared in `assets[]`, file present, but no element
  references them) are legal — decks may keep spare/library assets. Not
  an error, just worth surfacing in `validate` output as a note.

## 5. Conversions

```text
                 deckmaster pack / unpack
   deck.json + assets/  <───────────────>  mydeck.zip

                 deckmaster import-pptx
   some.pptx  ───────────────────────────>  mydeck.zip

                 deckmaster export-pptx
   mydeck.zip  ──────────────────────────>  output.pptx

                 deckmaster export embedded-json   (convenience, one-way)
   mydeck.zip  ──────────────────────────>  fat-deck.json (data: URLs inline)

                 DeckMaster editor / TeX ZIP export
   Math.tex  ────────────────────────────>  native TeX equation in main.tex
   PDF asset ────────────────────────────>  preserved PDF in img/ for TeX/PDF paths
```

`embedded-json` export is **lossy in the reverse direction only** in the
sense that it's not re-imported by the core format — it exists purely so
a whole deck can be pasted into a single LLM chat message or stored as
one file when zip handling isn't available. The CLI does not need to
accept it as import input.

## 6. Validation

`deckmaster validate <path.zip>` checks, in order:

1. Zip opens and contains `deck.json` at root.
2. `deck.json` parses as valid JSON matching this schema.
3. Every slide has a valid `size` (width > 0, height > 0).
4. Every element has non-negative `bounds.width` / `bounds.height`.
5. Every `TextElement` has `text`, positive `font_size`, and valid `color`.
6. Every `MathElement` has non-empty `tex`, positive `font_size`, and valid
   `color`.
7. Every `ImageElement.asset_id` exists in `assets[]`.
8. Every `assets[]` entry has a corresponding file at
   `assets/{id}.{ext}` inside the package, where `ext` matches
   `media_type`.
9. (Informational, not a failure) any `assets[]` entry with zero
   referencing elements is reported as unused.

This is intentionally a flat, fast checklist — not a general-purpose
schema validator framework. Extend the list before reaching for a
dependency.

## 7. Why this is the right base for LLM authoring

An LLM authoring a deck only ever needs to:

1. Write `deck.json` (pure text, fits in context).
2. Use Text elements for prose.
3. Use Math elements for equations and formulas, preserving editable TeX.
4. Either supply asset files it has, or write a deck with zero images.
5. Hand `deck.json` and `assets/` to `deckmaster pack` to get a `.zip`.

It never needs to reason about base64, data URL prefixes, or where binary
bytes live inside a JSON string. Equations stay even simpler: the TeX
source lives directly in JSON because it is small, semantic text.

## 8. Versioning

This is v1. If the schema needs a breaking change later, add a top-level
`"deckpkg_version": 1` field (absent = 1, for backward compatibility with
decks written under this spec) and bump on actual breakage — not for
additive fields like `Math`.
