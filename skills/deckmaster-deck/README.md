# deckmaster-deck Skill

`deckmaster-deck` is the AI-facing authoring skill for DeckMaster presentations.

It teaches a model how to write a valid DeckMaster `deck.json` document: slides, text elements, image asset references, layout bounds, metadata, themes, and validation rules.

Use this skill when an AI agent needs to create or edit a DeckMaster deck directly, instead of generating a PowerPoint through another library.

## Files

```text
skills/deckmaster-deck/
├── SKILL.md
├── README.md
├── references/
│   └── examples.md
├── evals/
│   └── evals.json
└── scripts/
    ├── validate_deck.py
    └── test-skill-with-ollama.sh
```

* `SKILL.md` is the actual instruction packet given to the model.
* `references/examples.md` contains complete valid `deck.json` examples.
* `evals/evals.json` contains expected behavior tests for the skill.
* `scripts/validate_deck.py` validates generated `deck.json` files without requiring Rust.
* `scripts/test-skill-with-ollama.sh` is the end-to-end cold-test harness — see "Cold-test with Ollama" below.

## Manual usage

To use the skill in a normal AI chat, give the model:

1. `SKILL.md`
2. Optionally `references/examples.md`
3. A task prompt describing the deck you want

Example prompt:

```text
Using the DeckMaster skill below, create a valid deck.json for a 5-slide
presentation about onboarding new hires. No images needed. Output only
the deck.json.
```

For a text-only deck, the model should output a complete `deck.json` with:

* top-level metadata
* a theme
* an empty `assets` array
* one or more slides
* Text elements with bounds, text, font size, and color

For image decks, the model should reference image files through `asset_id` entries. It should not inline base64 image data into `deck.json`.

## Validate generated output

Validate a generated deck with:

```bash
python3 skills/deckmaster-deck/scripts/validate_deck.py deck.json
```

If the deck has image assets, also pass the assets directory:

```bash
python3 skills/deckmaster-deck/scripts/validate_deck.py deck.json --assets-dir assets
```

## Pack and export with DeckMaster

If the `deckmaster-cli` crate is built, the generated deck can be packed and exported (run via `cargo run -p deckmaster-cli --`, or a release binary if you've built one):

```bash
cargo run -p deckmaster-cli -- pack deck.json output.deckpkg
cargo run -p deckmaster-cli -- export-pptx output.deckpkg output.pptx
```

The `pack` step validates the deck before creating the `.deckpkg`.

## Cold-test with Ollama

The skill includes its own end-to-end cold-test harness, right alongside it:

```bash
./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh [model] [task]
```

Example:

```bash
./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh qwen2.5-coder:latest "Make a 4-slide deck about onboarding new hires"
```

This test gives the model only the skill document, examples, and task prompt. It then checks whether the model can produce a valid DeckMaster deck without conversation history or hidden help.

The test pipeline checks:

1. The model responds
2. The output parses as JSON
3. The deck passes `validate_deck.py`
4. The deck packs into `.deckpkg`
5. The deck exports to `.pptx`

A passing run means the skill is self-contained enough for that model and task.

### Verified results

| | |
|---|---|
| Pipeline stages passed | **5 / 5** |
| Validation errors across both runs | **0** |
| Distinct tasks cold-tested | **2** — a 3-slide pitch deck, a 4-slide onboarding deck |
| Model | `qwen2.5-coder:latest` — **4.7GB**, runs locally |
| Conversation history given to the model | **None** |

Both runs used the model's `format: json` structured-output mode, which
is also why the JSON never fails to parse — it's enforced at generation
time, not patched afterward. These are real, individually-reproducible
runs from skill development, not a large benchmark suite; if you want
more confidence on a different model or task, the harness above is the
same one used to produce these numbers — point it at whatever you want
to check.

## Recommended model behavior

A model using this skill should:

* output only valid JSON when asked for `deck.json`
* avoid markdown fences unless explicitly requested
* use valid UUID-shaped IDs
* keep image references external through `asset_id`
* avoid unsupported element types unless the user explicitly asks for experimental output
* validate the JSON before calling it finished when a validator is available

## Negative trigger

Do not use this skill when the user asks for a generic PowerPoint made with another tool, such as `python-pptx`.

This skill is specifically for DeckMaster `deck.json` / `.deckpkg` authoring.