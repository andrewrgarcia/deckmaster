<!-- LOGO -->
<p align="center">
    <img height="300" alt="deckmaster" src="https://github.com/user-attachments/assets/cc2a920e-e676-4a16-a5b8-f991a1900c80" />
</p>

<h1 align="center">DeckMaster</h1>


<p align="center">
  <img width="1536" height="1024" alt="ChatGPT Image Jun 14, 2026, 05_45_43 PM" src="https://github.com/user-attachments/assets/d103cbe3-af25-497d-b401-972800208ccb" />
</p>

**DeckMaster** is an open-source, local-first, bidirectional presentation engine written in Rust.

The goal is not to build another PowerPoint clone.

The goal is to give presentations a canonical object model that can move freely between:

```text
Source Files ↔ Presentation Model ↔ PPTX
                       ↕
                 Visual Editor
```

Every import, export, edit, and transformation passes through the same internal representation.

No representation is privileged.

The presentation model is the product.

PPTX, source files, the CLI, and the visual editor are interfaces.

---

## Why DeckMaster Exists

Most presentation tools privilege one representation.

PowerPoint privileges the `.pptx` file.

Google Slides privileges the cloud editor.

Beamer privileges source code.

Canva and Figma privilege the visual canvas.

DeckMaster is different.

DeckMaster treats a presentation as a structured document graph:

```text
Presentation
├── Slides
│   └── Elements
│       ├── Text
│       ├── Image
│       ├── Shape
│       ├── Table
│       └── Chart
└── Assets
```

That model can then be imported from PPTX, exported back to PPTX, edited visually, edited by CLI commands, serialized as JSON, and eventually represented as a human-readable `.deck` source file.

DeckMaster is not trying to replace PowerPoint.

DeckMaster is trying to make presentations behave more like structured software artifacts.

---

## AI-Conscious Presentation Engineering

DeckMaster is designed for an AI-conscious world.

An AI agent should not have to directly edit a zipped PPTX package full of XML relationships, EMU coordinates, theme parts, slide layouts, and content type declarations.

Instead of asking an AI to patch this:

```xml
<a:off x="1270000" y="2540000"/>
<a:ext cx="6350000" cy="1016000"/>
```

DeckMaster lets an AI, CLI, or editor operate on this:

```json
{
  "type": "Text",
  "bounds": {
    "x": 100.0,
    "y": 200.0,
    "width": 500.0,
    "height": 80.0
  },
  "text": "Revenue increased 24%",
  "font_size": 32.0,
  "color": {
    "value": "#111111"
  }
}
```

That is the core idea.

DeckMaster gives AI systems a small, typed, editable model of a presentation.

It is:

* structured
* local-first
* diffable
* serializable
* testable
* round-trippable
* operation-friendly
* independent of any single editor or file format

---

## Design Philosophy

A presentation is not a PowerPoint file.

A presentation is not source code.

A presentation is not a visual canvas.

Those are different views of the same document.

DeckMaster maintains a canonical presentation model as the single source of truth.

All transformations flow through the model.

Do not create direct conversions like:

```text
PPTX → GUI
GUI → PPTX
Source → PPTX
```

All conversions should go through:

```text
Presentation
```

---

## Comparison With Existing Presentation Systems

| System              | Source of Truth              |    AI Friendliness | Visual Editing | PPTX Compatibility | Git Friendliness |         Round-Trip Potential |
| ------------------- | ---------------------------- | -----------------: | -------------: | -----------------: | ---------------: | ---------------------------: |
| PowerPoint / PPTX   | Package/XML                  |                Low |           High |             Native |              Low | High inside Office ecosystem |
| Google Slides       | Cloud object model           |             Medium |           High |               Good |              Low |        Good, but cloud-owned |
| Beamer              | TeX source                   | High for text/math |            Low |                Low |             High |          Mostly source → PDF |
| Slidev / Marp       | Markdown source              |               High |     Medium-low |            Limited |             High |       Mostly source → render |
| Reveal / HTML decks | DOM/CSS/source               |             Medium |         Medium |            Limited |           Medium |            Hard semantically |
| Canva / Figma       | Proprietary canvas           |         Medium-low |      Very high |    Export-oriented |              Low |                  Proprietary |
| DeckMaster          | Canonical presentation model |               High |        Growing |            Growing |             High |              Designed for it |

DeckMaster is not better than every existing tool at every task.

It is worse than PowerPoint at full fidelity.

It is worse than Google Slides at collaboration.

It is worse than Beamer at math-heavy academic PDFs.

It is worse than Canva at visual design polish.

But DeckMaster is designed around a different question:

> Can a CLI, an AI agent, a source file, a visual editor, and a PPTX adapter all edit the same presentation without one representation becoming the master?

DeckMaster’s answer is yes:

```text
Everything goes through the model.
```

---

## Current Status

DeckMaster is an early but working prototype.

Implemented:

* Canonical presentation model
* JSON serialization and deserialization
* JSON round-trip tests
* PPTX package reader
* PPTX relationship parsing
* PPTX slide discovery
* PPTX text extraction
* PPTX → Presentation import
* Presentation → PPTX export
* Multi-slide PPTX export
* Text bounds import/export
* Text font size import/export
* Text color import/export
* CLI import/export
* CLI model inspection
* CLI element editing operations
* Core model editing operations
* Minimal visual editor
* Visual slide creation
* Visual text creation
* Visual text editing
* Visual text movement
* Visual text box resizing
* Visual font size editing
* Visual color editing
* JSON download from editor

Validated:

```text
PPTX
 ↓
DeckMaster Model
 ↓
PPTX
```

Also validated:

```text
PPTX
 ↓
DeckMaster Model / JSON
 ↓
Visual Editor
 ↓
DeckMaster Model / JSON
 ↓
PPTX
```

Exported presentations open successfully in Google Slides.

---

## Architecture

```text
                PPTX
                  ↕
          Import / Export
                  ↕

      Canonical Presentation Model

           ↕               ↕

      Source Files     Visual Editor
           ↕               ↕
          CLI          Local Editing
```

The model owns the document.

The visual editor is a client of the model.

The CLI is a client of the model.

PPTX import/export is an adapter around the model.

Source files will also be an adapter around the model.

Nothing should bypass the canonical representation.

---

## Project Structure

```text
deckmaster-core
    Canonical presentation model and editing operations

deckmaster-pptx
    PPTX import/export support

deckmaster-cli
    Command-line tooling

editor
    Local visual editor

examples
    Example DeckMaster JSON documents
```

---

## Canonical Model

```text
Presentation
├── Metadata
├── Theme
├── Assets
└── Slides
    └── Elements
        ├── Text
        ├── Image
        ├── Shape
        ├── Table
        └── Chart
```

The model is intentionally simple, stable, and extensible.

Current text model includes:

```text
TextElement
├── id
├── bounds
│   ├── x
│   ├── y
│   ├── width
│   └── height
├── text
├── font_size
└── color
```

Canonical slide geometry uses points.

A widescreen slide is represented as:

```json
{
  "width": 960.0,
  "height": 540.0
}
```

PPTX-specific units such as EMUs are handled inside the PPTX adapter, not exposed as the canonical model.

---

## Example Model

```json
{
  "metadata": {
    "title": "Quarterly Results",
    "author": "Andrew"
  },
  "theme": {
    "name": "Default",
    "background": {
      "value": "#FFFFFF"
    },
    "foreground": {
      "value": "#111111"
    }
  },
  "assets": [],
  "slides": [
    {
      "name": "Results",
      "size": {
        "width": 960.0,
        "height": 540.0
      },
      "elements": [
        {
          "type": "Text",
          "bounds": {
            "x": 100.0,
            "y": 200.0,
            "width": 500.0,
            "height": 80.0
          },
          "text": "Revenue increased 24%",
          "font_size": 32.0,
          "color": {
            "value": "#111111"
          }
        }
      ]
    }
  ]
}
```

---

## Rust Example

```rust
use deckmaster_core::{Presentation, Slide};

let mut presentation =
    Presentation::new("Demo");

let mut slide =
    Slide::new(Some("Introduction".to_string()));

slide.add_text(
    "Hello DeckMaster",
    100.0,
    100.0,
    500.0,
    80.0,
);

presentation.slides.push(slide);
```

---

## CLI Examples

Create a new DeckMaster JSON presentation:

```bash
cargo run -p deckmaster-cli -- new examples/hello.deck.json "My First Deck"
```

Inspect a DeckMaster JSON presentation:

```bash
cargo run -p deckmaster-cli -- inspect examples/hello.deck.json
```

Import PPTX into DeckMaster JSON:

```bash
cargo run -p deckmaster-cli -- import input.pptx output.deck.json
```

Export DeckMaster JSON to PPTX:

```bash
cargo run -p deckmaster-cli -- export input.deck.json output.pptx
```

Move an element:

```bash
cargo run -p deckmaster-cli -- move-element input.deck.json <SLIDE_ID> <ELEMENT_ID> 300 220
```

Resize an element:

```bash
cargo run -p deckmaster-cli -- resize-element input.deck.json <SLIDE_ID> <ELEMENT_ID> 640 90
```

Update text:

```bash
cargo run -p deckmaster-cli -- update-text input.deck.json <SLIDE_ID> <ELEMENT_ID> "Updated text"
```

---

## Visual Editor

The visual editor is a local web editor for DeckMaster JSON files.

It currently supports:

* loading `.deck.json`
* rendering slides
* selecting slides
* adding slides
* adding text elements
* editing text content
* moving text elements
* resizing text boxes
* changing font size
* changing text color
* downloading updated `.deck.json`

Run it with:

```bash
cd editor
npm install
npm run dev
```

Build it with:

```bash
cd editor
npm run build
```

The editor does not own the document.

It edits the DeckMaster model.

---

## Development Commands

Run Rust tests:

```bash
cargo test
```

Run editor build:

```bash
cd editor
npm run build
```

Typical full check:

```bash
cargo test
cd editor && npm run build
```

---

## Roadmap

### Phase 1 — Core Engine

* [x] Canonical model
* [x] JSON round-trip
* [x] PPTX package reader
* [x] PPTX relationship parsing
* [x] PPTX text import
* [x] Basic PPTX export
* [x] Multi-slide PPTX export
* [x] Text bounds round-trip
* [x] Text font size round-trip
* [x] Text color round-trip

### Phase 2 — CLI

* [x] Create presentation
* [x] Inspect presentation
* [x] Add slide
* [x] Add text
* [x] Import PPTX
* [x] Export PPTX
* [x] Move element
* [x] Resize element
* [x] Update text

### Phase 3 — Visual Editor MVP

* [x] Open DeckMaster JSON
* [x] Render slides
* [x] Add slides
* [x] Add text
* [x] Edit text
* [x] Move elements
* [x] Resize text boxes
* [x] Change font size
* [x] Change color
* [x] Download updated JSON
* [ ] Duplicate slide
* [ ] Delete slide
* [ ] Rename slide
* [ ] Delete selected element
* [ ] Duplicate selected element
* [ ] Keyboard nudging
* [ ] Undo/redo

### Phase 4 — Source Format

* [ ] `.deck` source language
* [ ] Parser
* [ ] Generator
* [ ] Source → Presentation
* [ ] Presentation → Source
* [ ] Round-trip tests

### Phase 5 — Images and Shapes

* [ ] Image model polish
* [ ] Add image in editor
* [ ] Export images to PPTX
* [ ] Import images from PPTX
* [ ] Shape export
* [ ] Shape import
* [ ] Shape editing controls

### Phase 6 — Interoperability

* [ ] Better PPTX layout fidelity
* [ ] Text alignment
* [ ] Font family
* [ ] Bold / italic / underline
* [ ] Slide backgrounds
* [ ] Themes
* [ ] Tables
* [ ] Charts
* [ ] PDF export
* [ ] HTML export
* [ ] ODP support

---

## Long-Term Goal

Enable workflows such as:

```text
presentation.deck
        ↓
   Presentation Model
        ↓
   Visual Editor
        ↓
   Presentation Model
        ↓
presentation.deck
        ↓
    Export PPTX
        ↓
    Export PDF
        ↓
    Export HTML
```

And:

```text
existing.pptx
        ↓
  PPTX Importer
        ↓
 Presentation Model
        ↓
 Visual Editor
        ↓
 Presentation Model
        ↓
  PPTX Exporter
        ↓
 edited.pptx
```

The long-term goal is not to replace PowerPoint.

The long-term goal is to make presentations portable across source, visual editing, programmatic editing, and existing presentation formats.

---

## Non-Goals

DeckMaster is not trying to be:

* a PowerPoint clone
* a SaaS platform
* a collaboration suite
* a template marketplace
* a cloud editor
* an animation engine

DeckMaster is a local-first presentation engine with a canonical model.

---

## v1 Definition

DeckMaster should not be called v1 until it can:

* import a simple PPTX with text and images
* show it in the visual editor
* move text and images
* resize text and images
* edit text content
* add new text
* add new slides
* save back to PPTX
* reopen successfully in Google Slides or PowerPoint
* preserve the canonical model as the source of truth

That is the real v1 target.

Not full Office compatibility.

Not animations.

Not collaboration.

Just simple real decks round-tripping through the model.

---

## License

Licensed under the Apache License, Version 2.0.

See [LICENSE](LICENSE) for details.