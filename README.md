# DeckMaster

<p align="center">
<img width="950" alt="Screenshot from 2026-06-09 00-23-38" src="https://github.com/user-attachments/assets/d1a991a9-fed0-493f-a976-43bce0936f50" />
<img  width="950" alt="Screenshot from 2026-06-09 00-56-30" src="https://github.com/user-attachments/assets/f1b9c572-df53-4872-a3b7-cfd24e8f4fb0" />
</p>

**DeckMaster** is an open-source bidirectional presentation engine written in Rust.

The goal is not to build another PowerPoint clone.

The goal is to create a canonical presentation model that can move freely between multiple representations:

```text
Source Files ↔ Presentation Model ↔ PPTX
                       ↕
                 Visual Editor
```

Every import, export, edit, and transformation passes through the same internal representation.

No representation is privileged.

---

## Vision

A presentation is not a PowerPoint file.

A presentation is not source code.

A presentation is not a visual canvas.

These are simply different views of the same document.

DeckMaster maintains a canonical presentation model that serves as the single source of truth.

---

## Current Status

Early prototype.

Implemented:

* Canonical presentation model
* JSON serialization
* PPTX package reader
* PPTX relationship parsing
* Slide discovery
* Slide text extraction
* PPTX → Presentation import
* Presentation → PPTX export (prototype)

Validated:

```text
PPTX
 ↓
DeckMaster Model
 ↓
PPTX
```

Exported presentations successfully open in Google Slides.

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
```

All transformations pass through the model.

Nothing talks directly to anything else.

---

## Project Structure

```text
deckmaster-core
    Canonical document model

deckmaster-pptx
    PPTX import/export support

deckmaster-cli
    Command-line tooling
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

---

## Roadmap

### Phase 1 — Core Engine

* [x] Canonical model
* [x] JSON round-trip
* [x] PPTX package reader
* [x] PPTX text import
* [x] Basic PPTX export

### Phase 2 — CLI

* [ ] Import command
* [ ] Export command
* [ ] Model inspection tools

### Phase 3 — Source Format

* [ ] `.deck` source language
* [ ] Parser
* [ ] Generator
* [ ] Round-trip tests

### Phase 4 — Visual Editor

* [ ] Open presentations
* [ ] Edit text
* [ ] Move elements
* [ ] Resize elements
* [ ] Save changes

### Phase 5 — Interoperability

* [ ] Improved PPTX fidelity
* [ ] Images
* [ ] Tables
* [ ] Themes
* [ ] ODP support
* [ ] PDF export

---

## Example

```rust
let mut presentation =
    Presentation::new("Demo");

let mut slide =
    Slide::new(Some(
        "Introduction".to_string(),
    ));

slide.add_text(
    "Hello DeckMaster",
    0.0,
    0.0,
    100.0,
    100.0,
);

presentation.slides.push(slide);
```

---

## Long-Term Goal

Enable seamless workflows such as:

```text
presentation.deck
        ↓
   Visual Editor
        ↓
     Save
        ↓
presentation.deck
        ↓
    Export PPTX
        ↓
    Export PDF
        ↓
    Export HTML
```

while preserving as much information as possible through every transformation.

---

## License

MIT or Apache-2.0.
