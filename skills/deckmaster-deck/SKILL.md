---
name: deckmaster-deck
description: Use this skill whenever the user wants to create, edit, or generate a presentation/slide deck as a DeckMaster .deckpkg or deck.json file -- as opposed to a PowerPoint file made some other way. Trigger this for requests like "make me a deck about X", "create a presentation as JSON", "write a DeckMaster deck", "generate slides for...", or any request that mentions .deckpkg, deck.json, or the DeckMaster format by name. Also use this if the user has DeckMaster's CLI (deckmaster-cli) installed and wants to pack, validate, or export a deck. Do NOT use this for general PowerPoint creation via python-pptx or other tools -- only when DeckMaster specifically is the target format.
---

# Authoring a DeckMaster deck

DeckMaster represents a presentation as one JSON document (`deck.json`)
plus a folder of image files (`assets/`). You write the JSON by hand, in
your own response, the same way you'd write any other structured output.
There is no special tool call for this -- it's just text you produce.

A finished deck is either:
- **`deck.json` + an `assets/` folder** sitting next to each other on disk, or
- those two zipped together into a single **`.deckpkg`** file (via `deckmaster pack`, see "Packing and exporting" below).

Both are point-in-time snapshots of the same document. Neither is a
program or a template -- it's closer to a structured document format
like an SVG or a `.docx`'s underlying XML: you write the values that
describe what's on each slide.

## Why this format is easy to write

The one rule that matters most: **images are never inline.** A
`deck.json` never contains base64 image data or a `data:` URL. Every
image on a slide is a short reference -- an `asset_id` -- that points at
a real file in `assets/`. This is what keeps `deck.json` small enough to
write directly in a chat response even for a 20-slide deck: you're never
encoding pixels as text.

If you don't have actual image bytes to put in `assets/` (a common case
-- you're asked to draft a deck's content, not source its photography),
just don't add any Image elements. A clean text-only deck is a completely
normal, finished thing in this format. Don't invent placeholder image
files or fake asset ids "just in case."

## The schema

Every `deck.json` has this shape. Required fields are not optional --
omitting one will fail validation.

```jsonc
{
  "id": "<uuid>",
  "metadata": {
    "title": "string",
    "author": "string or null"
  },
  "theme": {
    "name": "Default",
    "background": { "value": "#FFFFFF" },
    "foreground": { "value": "#111111" }
  },
  "assets": [
    // one entry per image used anywhere in the deck -- see "Images" below
  ],
  "slides": [
    // one entry per slide, in display order -- see "Slides" below
  ]
}
```

Generate a fresh random UUID (v4 format, e.g.
`a1b2c3d4-e5f6-4789-a012-3456789abcde`) for every `id` field anywhere in
the document -- the top-level deck id, every slide id, every element id,
every asset id. Never reuse a UUID across two different things, and
never invent a non-UUID id like `"slide-1"`. If you're unsure whether a
UUID you generated is properly formatted, that's fine -- close enough is
fine here, nothing parses it as a number or looks up a real UUID
registry. What matters is that it's unique within the document.

### Slides

```jsonc
{
  "id": "<uuid>",
  "name": "Title Slide",          // a short human label, or null
  "size": { "width": 960.0, "height": 540.0 },
  "elements": [ /* see below */ ]
}
```

`size` is almost always `{ "width": 960.0, "height": 540.0 }` -- that's
the canonical 16:9 widescreen size, in points (1 point = 1/72 inch; 960pt
= 13.333in). Don't change it unless the user specifically asks for a
different aspect ratio or size.

Every slide needs at least an empty `elements` array. An empty deck (no
slides) is invalid -- a deck needs at least one slide.

### Elements

Each slide's `elements` array holds Text and Image elements (Shape,
Table, and Chart element types exist in the schema but aren't fully
supported by the exporter yet -- stick to Text and Image for now).

**Text element:**

```jsonc
{
  "type": "Text",
  "id": "<uuid>",
  "bounds": { "x": 100.0, "y": 80.0, "width": 600.0, "height": 90.0 },
  "text": "The actual words on the slide",
  "font_size": 32.0,
  "color": { "value": "#111111" }
}
```

**Image element:**

```jsonc
{
  "type": "Image",
  "id": "<uuid>",
  "bounds": { "x": 100.0, "y": 200.0, "width": 320.0, "height": 180.0 },
  "asset_id": "<uuid -- must match an id in the top-level assets[] array>",
  "alt": "A short description of the image, or null"
}
```

`bounds` is always `{x, y, width, height}` in points, measured from the
slide's top-left corner. A slide is 960×540pt, so `x` typically ranges
0–960 and `y` ranges 0–540 (elements can extend past the edge, but
center your layout within that box).

### Images and the assets array

If a slide has an Image element, its `asset_id` must match an entry in
the top-level `assets[]` array:

```jsonc
{
  "id": "<uuid -- same value as the Image element's asset_id>",
  "media_type": "image/png",
  "alt": "Default alt text for this image, or null"
}
```

`media_type` must match the actual file you'll place at
`assets/<id>.<ext>` (`image/png` → `.png`, `image/jpeg` → `.jpeg`,
`image/gif` → `.gif`, `image/webp` → `.webp`, `image/bmp` → `.bmp`).

Two different Image elements can reference the same `asset_id` if they
should show the same picture (a repeated logo, say) -- you don't need to
declare a duplicate asset entry for that, just point both elements at
the one asset id.

## Layout guidance

You're placing boxes on a 960×540 canvas, not flowing text like a word
processor -- think in terms of deliberate rectangles, not paragraphs.

- Leave real margins. 60–100pt from each edge reads as "designed"; edge-to-edge text reads as a bug.
- A title is usually one Text element near the top (`y` around 60–90), larger `font_size` (32–44).
- Body content goes below the title with its own Text element(s); don't cram title and body into one element with a newline -- separate elements give you independent control of size/position later.
- Don't overlap elements unless that's the intended effect. Check that one element's `y + height` doesn't run into the next element's `y`.
- A slide with one big idea is usually better than a slide with five small ones. Splitting into more slides is free.

## Worked examples

See `references/examples.md` for complete, valid `deck.json` documents:
a single-slide text-only deck, a multi-slide deck, and a deck with an
image. Read that file if you want to check your output against a known-
good shape before finishing, especially the first few times you use this
skill.

## Validating before you're done

If you have access to a sandboxed Python environment, run
`scripts/validate_deck.py` against the `deck.json` you wrote before
presenting it as finished. It checks the same things DeckMaster's own
`deckmaster validate` command checks (see "Packing and exporting" below)
without needing Rust installed:

```bash
python3 scripts/validate_deck.py path/to/deck.json --assets-dir path/to/assets
```

It exits non-zero and prints what's wrong if anything is invalid: a
missing required field, an Image element whose `asset_id` isn't
declared, an asset file that doesn't exist, non-positive bounds, and so
on. If you don't have a way to run scripts in your current context,
re-read your `deck.json` against the schema above by eye instead --
it's a flat enough format that a careful read-through catches most
mistakes.

## Packing and exporting

`deck.json` plus `assets/` is the source; a few DeckMaster CLI commands
turn that into other things, if the user has the `deckmaster-cli` crate
built (run via `cargo run -p deckmaster-cli --`, or a release binary at
`target/release/deckmaster-cli` if they've built one):

```bash
# Zip deck.json + assets/ into a single .deckpkg file
cargo run -p deckmaster-cli -- pack deck.json output.deckpkg

# Check a .deckpkg for problems (this needs an actual packed .deckpkg,
# not a bare deck.json -- pack first if you only have deck.json)
cargo run -p deckmaster-cli -- validate output.deckpkg

# Convert a .deckpkg to a real PowerPoint file
cargo run -p deckmaster-cli -- export-pptx output.deckpkg output.pptx

# Convert a .deckpkg to a single JSON file with images inlined as data:
# URLs -- useful for pasting a whole deck into a chat message, but this
# direction only, it's not meant to be read back in
cargo run -p deckmaster-cli -- export-embedded-json output.deckpkg output.embedded.json
```

`pack` will refuse to write a `.deckpkg` if validation fails, so running
`pack` is itself a reasonable final check even without the standalone
validator script.

If the user doesn't have `deckmaster-cli` available and just wants the
deck content, producing the `deck.json` (and any asset files) as your
answer is a complete, useful deliverable on its own -- packing and
exporting are conveniences, not requirements.