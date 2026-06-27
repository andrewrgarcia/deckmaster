#!/usr/bin/env bash
#
# test-skill-with-ollama.sh
#
# Reproducible end-to-end test of the deckmaster-deck skill against any
# local Ollama model: feeds the model the skill document plus a task
# prompt, extracts the deck.json it produces, validates it, and (if the
# Rust CLI is built) packs and exports it to a real .pptx.
#
# This is deliberately a cold test: the model gets nothing but the skill
# document and the task. No conversation history, no extra hints. If it
# passes, the skill is genuinely self-contained.
#
# This script lives alongside the skill it tests, at
# skills/deckmaster-deck/scripts/ -- not at the repo's top-level
# scripts/ folder -- since it's specifically about validating this one
# skill, the same way validate_deck.py lives right next to it.
#
# Usage (from anywhere, using the path to this script):
#   ./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh [model] [task]
#
# Examples:
#   ./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh
#   ./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh qwen2.5-coder:14b
#   ./skills/deckmaster-deck/scripts/test-skill-with-ollama.sh qwen2.5-coder:latest "Make a 4-slide deck about onboarding new hires"
#
# Requires: ollama (with the chosen model already pulled), python3.
# The pack/export step additionally requires deckmaster-cli to be built
# (cargo build --workspace from the repo root) -- if it isn't, this
# script still runs the validation step and tells you what it skipped.

set -euo pipefail

# ---------------------------------------------------------------------------
# Setup and argument handling
# ---------------------------------------------------------------------------

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
# This script is three directories below the repo root:
#   <repo_root>/skills/deckmaster-deck/scripts/test-skill-with-ollama.sh
# so REPO_ROOT needs three "../" hops, not one.
REPO_ROOT="$(cd "$SCRIPT_DIR/../../.." && pwd)"

DEFAULT_MODEL="qwen2.5-coder:latest"
DEFAULT_TASK="Make a 3-slide deck pitching a coffee subscription service called Roast Club. No images needed."

if [[ $# -eq 0 ]]; then
  MODEL="$DEFAULT_MODEL"
  TASK="$DEFAULT_TASK"
else
  MODEL="$1"
  shift
  TASK="${*:-$DEFAULT_TASK}"
fi

OLLAMA_URL="${OLLAMA_URL:-http://127.0.0.1:11434}"

SKILL_DIR="$REPO_ROOT/skills/deckmaster-deck"
SKILL_MD="$SKILL_DIR/SKILL.md"
EXAMPLES_MD="$SKILL_DIR/references/examples.md"
VALIDATOR="$SKILL_DIR/scripts/validate_deck.py"
CLI_BIN="$REPO_ROOT/target/debug/deckmaster-cli"

WORKDIR="$(mktemp -d -t deckmaster-skill-test-XXXXXX)"
PROMPT_FILE="$WORKDIR/prompt.txt"
RAW_OUTPUT_FILE="$WORKDIR/raw_output.txt"
DECK_JSON_FILE="$WORKDIR/deck.json"
DECKPKG_FILE="$WORKDIR/deck.deckpkg"
PPTX_FILE="$WORKDIR/deck.pptx"

# Track pass/fail per stage so the final summary is honest even if we
# can't run every stage (e.g. the CLI isn't built yet).
STAGE_OLLAMA="skip"
STAGE_EXTRACT="skip"
STAGE_VALIDATE="skip"
STAGE_PACK="skip"
STAGE_EXPORT="skip"

cleanup() {
  if [[ "${KEEP_WORKDIR:-0}" != "1" ]]; then
    rm -rf "$WORKDIR"
  fi
}
trap cleanup EXIT

log() { printf '\n\033[1m== %s ==\033[0m\n' "$1"; }
ok()  { printf '  \033[32m✓\033[0m %s\n' "$1"; }
bad() { printf '  \033[31m✗\033[0m %s\n' "$1"; }
note(){ printf '  %s\n' "$1"; }

# ---------------------------------------------------------------------------
# Preflight checks
# ---------------------------------------------------------------------------

log "Preflight"

if ! command -v ollama >/dev/null 2>&1; then
  bad "ollama is not installed or not on PATH"
  echo "Install it from https://ollama.com, or run this on a machine that has it."
  exit 1
fi
ok "ollama found: $(command -v ollama)"

if ! command -v python3 >/dev/null 2>&1; then
  bad "python3 is not installed or not on PATH"
  exit 1
fi
ok "python3 found: $(command -v python3)"

if [[ ! -f "$SKILL_MD" ]]; then
  bad "Could not find $SKILL_MD"
  echo "This script expects to live at skills/deckmaster-deck/scripts/"
  echo "relative to the repo root. If you moved it, the REPO_ROOT"
  echo "computation at the top of this script needs updating too."
  exit 1
fi
ok "skill found: $SKILL_MD"

if [[ -f "$EXAMPLES_MD" ]]; then
  ok "examples found: $EXAMPLES_MD"
else
  note "examples file not found at $EXAMPLES_MD -- continuing without it"
fi

if [[ ! -f "$VALIDATOR" ]]; then
  bad "Could not find validator at $VALIDATOR"
  exit 1
fi
ok "validator found: $VALIDATOR"

if ollama list 2>/dev/null | awk '{print $1}' | grep -qx "$MODEL"; then
  ok "model '$MODEL' is pulled and available"
else
  bad "model '$MODEL' was not found in 'ollama list'"
  echo "Pull it first with: ollama pull $MODEL"
  echo "Available models:"
  ollama list || true
  exit 1
fi

if [[ -x "$CLI_BIN" ]]; then
  ok "deckmaster-cli found at $CLI_BIN (pack/export stages will run)"
else
  note "deckmaster-cli not found at $CLI_BIN -- pack/export stages will be skipped."
  note "Build it with: (cd \"$REPO_ROOT\" && cargo build --workspace)"
fi

# ---------------------------------------------------------------------------
# Stage 1: build the prompt and run the model cold
# ---------------------------------------------------------------------------

log "Stage 1: asking $MODEL to author a deck from the skill alone"
note "Task: $TASK"

{
  echo "You are an expert at the DeckMaster deck format described in full below."
  echo "Read it carefully, then complete the task at the end."
  echo
  echo "CRITICAL OUTPUT RULES:"
  echo "- Output exactly one JSON object."
  echo "- The first non-whitespace character must be {."
  echo "- The last non-whitespace character must be }."
  echo "- Do not use markdown code fences."
  echo "- Do not include comments, explanations, prose, or trailing text."
  echo "- Every id must be a valid UUID string."
  echo "- UUIDs may contain only digits 0-9, letters a-f, and hyphens."
  echo "- Safe UUID pattern: 00000000-0000-4000-8000-000000000001, then increment the final digits."
  echo "- Do not invent fake UUIDs like 1a2b3c4d-5e6f-7g8h."
  echo
  echo "--- SKILL DOCUMENT START ---"
  cat "$SKILL_MD"
  echo
  if [[ -f "$EXAMPLES_MD" ]]; then
    cat "$EXAMPLES_MD"
  fi
  echo "--- SKILL DOCUMENT END ---"
  echo
  echo "TASK: $TASK"
} > "$PROMPT_FILE"

note "Full prompt is $(wc -l < "$PROMPT_FILE") lines (saved at $PROMPT_FILE)"

if OLLAMA_URL="$OLLAMA_URL" python3 - "$MODEL" "$PROMPT_FILE" "$RAW_OUTPUT_FILE" "$WORKDIR/ollama_stderr.txt" <<'PYEOF'
import json
import os
import sys
import urllib.error
import urllib.request

model, prompt_path, out_path, err_path = sys.argv[1:5]

base_url = os.environ.get("OLLAMA_URL", "http://127.0.0.1:11434").rstrip("/")
url = f"{base_url}/api/generate"

with open(prompt_path, encoding="utf-8") as f:
    prompt = f.read()

payload = {
    "model": model,
    "system": "You output strict JSON only. No markdown. No prose. No explanations.",
    "prompt": prompt,
    "stream": False,
    "format": "json",
    "options": {
        "temperature": 0,
        "num_ctx": int(os.environ.get("OLLAMA_NUM_CTX", "16384")),
    },
}

request = urllib.request.Request(
    url,
    data=json.dumps(payload).encode("utf-8"),
    headers={"Content-Type": "application/json"},
    method="POST",
)

try:
    with urllib.request.urlopen(request, timeout=600) as response:
        data = json.loads(response.read().decode("utf-8"))
except urllib.error.URLError as error:
    with open(err_path, "w", encoding="utf-8") as f:
        f.write(f"OLLAMA_API_ERROR: could not POST {url}: {error}\n")
    sys.exit(1)
except json.JSONDecodeError as error:
    with open(err_path, "w", encoding="utf-8") as f:
        f.write(f"OLLAMA_API_ERROR: Ollama returned non-JSON API response: {error}\n")
    sys.exit(1)

if "error" in data:
    with open(err_path, "w", encoding="utf-8") as f:
        f.write(f"OLLAMA_MODEL_ERROR: {data['error']}\n")
    sys.exit(1)

text = data.get("response")
if not isinstance(text, str) or not text.strip():
    with open(err_path, "w", encoding="utf-8") as f:
        f.write("OLLAMA_API_ERROR: response field was empty or missing\n")
    sys.exit(1)

with open(out_path, "w", encoding="utf-8") as f:
    f.write(text.strip())
    f.write("\n")
PYEOF
then
  STAGE_OLLAMA="pass"
  ok "model responded ($(wc -l < "$RAW_OUTPUT_FILE") lines of output)"
else
  STAGE_OLLAMA="fail"
  bad "ollama run failed -- see $WORKDIR/ollama_stderr.txt"
  cat "$WORKDIR/ollama_stderr.txt" >&2 || true
fi

# ---------------------------------------------------------------------------
# Stage 2: extract a JSON object from whatever the model said
# ---------------------------------------------------------------------------

log "Stage 2: extracting deck.json from the model's raw output"

if [[ "$STAGE_OLLAMA" == "pass" ]]; then
  if python3 - "$RAW_OUTPUT_FILE" "$DECK_JSON_FILE" <<'PYEOF'
import json
import re
import sys

raw_path, out_path = sys.argv[1], sys.argv[2]
text = open(raw_path, encoding="utf-8").read()

# Smaller models often wrap output in ```json ... ``` despite being told
# not to -- strip fences if present, then grab the first balanced-looking
# {...} block as a fallback.
fenced = re.search(r"```(?:json)?\s*\n(.*?)```", text, re.DOTALL)
candidate = fenced.group(1) if fenced else text

if not fenced:
    brace_match = re.search(r"\{.*\}", text, re.DOTALL)
    if brace_match:
        candidate = brace_match.group(0)


def try_parse(s):
    try:
        return json.loads(s), None
    except json.JSONDecodeError as error:
        return None, error


def strip_trailing_commas(s):
    # "...}.," / "...],\n]" -- a trailing comma right before a closing
    # bracket is the single most common small-model JSON mistake.
    return re.sub(r",(\s*[}\]])", r"\1", s)


def normalize_smart_quotes(s):
    # Curly/smart quotes from a model that's been trained on a lot of
    # prose tend to leak into otherwise-correct JSON syntax (not just
    # inside string contents, but occasionally replacing structural
    # quotes too). Normalizing globally is safe here because deck.json
    # never needs a literal curly quote character.
    return (
        s.replace("\u201c", '"')
        .replace("\u201d", '"')
        .replace("\u2018", "'")
        .replace("\u2019", "'")
    )


def escape_unescaped_inner_quotes(s):
    """Best-effort fix for the most common real failure: a string value
    containing an unescaped " in natural-language text, e.g.
        "text": "Welcome to "Acme Corp"!"
    instead of
        "text": "Welcome to \"Acme Corp\"!"

    This walks the text character by character tracking whether we're
    inside a JSON string, and treats a `"` as a real string-closer only
    if (after skipping whitespace) the next non-space character is one
    of the JSON structural characters that legitimately follow a closed
    string (`,` `}` `]` `:`) or it's the end of input. Any other `"`
    found while "inside" a string is assumed to be an unescaped literal
    quote and gets backslash-escaped instead.

    This is a heuristic, not a real parser -- it can't be, since the
    input is malformed by definition. It exists to recover the common
    case, not every case.
    """
    result = []
    in_string = False
    i = 0
    n = len(s)

    while i < n:
        ch = s[i]

        if ch == "\\" and in_string and i + 1 < n:
            # Already-escaped sequence -- copy both characters through
            # untouched so we don't double-escape something correct.
            result.append(ch)
            result.append(s[i + 1])
            i += 2
            continue

        if ch == '"':
            if not in_string:
                in_string = True
                result.append(ch)
                i += 1
                continue

            # We're inside a string and saw an unescaped quote. Decide:
            # is this the real end of the string, or a literal quote
            # inside the text?
            j = i + 1
            while j < n and s[j] in " \t\r\n":
                j += 1

            closes_string = j >= n or s[j] in ",}]:"

            if closes_string:
                in_string = False
                result.append(ch)
            else:
                result.append('\\"')

            i += 1
            continue

        result.append(ch)
        i += 1

    return "".join(result)


parsed, error = try_parse(candidate)

if parsed is None:
    repaired = normalize_smart_quotes(candidate)
    repaired = strip_trailing_commas(repaired)
    parsed, error = try_parse(repaired)

if parsed is None:
    repaired = escape_unescaped_inner_quotes(repaired)
    parsed, error = try_parse(repaired)

if parsed is None:
    print(f"JSON_PARSE_ERROR: {error}", file=sys.stderr)
    sys.exit(1)

with open(out_path, "w", encoding="utf-8") as f:
    json.dump(parsed, f, indent=2)
PYEOF
  then
    STAGE_EXTRACT="pass"
    ok "extracted valid JSON to $DECK_JSON_FILE"
  else
    STAGE_EXTRACT="fail"
    bad "could not extract valid JSON from the model's output, even after attempting repairs"
    note "Raw output saved at: $RAW_OUTPUT_FILE -- inspect it by hand."
    KEEP_WORKDIR=1
  fi
else
  note "skipped (stage 1 did not succeed)"
fi

# ---------------------------------------------------------------------------
# Stage 3: validate against the skill's own checklist
# ---------------------------------------------------------------------------

log "Stage 3: validating with scripts/validate_deck.py"

if [[ "$STAGE_EXTRACT" == "pass" ]]; then
  if python3 "$VALIDATOR" "$DECK_JSON_FILE"; then
    STAGE_VALIDATE="pass"
    ok "deck.json is valid"
  else
    STAGE_VALIDATE="fail"
    bad "deck.json failed validation (see errors above)"
    KEEP_WORKDIR=1
  fi
else
  note "skipped (stage 2 did not succeed)"
fi

# ---------------------------------------------------------------------------
# Stage 4 + 5: pack and export to a real .pptx, if the CLI is available
# ---------------------------------------------------------------------------

log "Stage 4: packing into a .deckpkg"

if [[ "$STAGE_VALIDATE" == "pass" && -x "$CLI_BIN" ]]; then
  if "$CLI_BIN" pack "$DECK_JSON_FILE" "$DECKPKG_FILE"; then
    STAGE_PACK="pass"
    ok "packed to $DECKPKG_FILE"
  else
    STAGE_PACK="fail"
    bad "deckmaster pack failed"
    KEEP_WORKDIR=1
  fi
else
  note "skipped ($([ "$STAGE_VALIDATE" != "pass" ] && echo "validation didn't pass" || echo "deckmaster-cli not built"))"
fi

log "Stage 5: exporting to .pptx"

if [[ "$STAGE_PACK" == "pass" ]]; then
  if "$CLI_BIN" export-pptx "$DECKPKG_FILE" "$PPTX_FILE"; then
    STAGE_EXPORT="pass"
    ok "exported to $PPTX_FILE"
    KEEP_WORKDIR=1
    note "Open it with: open \"$PPTX_FILE\"  (or your OS equivalent)"
  else
    STAGE_EXPORT="fail"
    bad "deckmaster export-pptx failed"
    KEEP_WORKDIR=1
  fi
else
  note "skipped (pack stage did not succeed)"
fi

# ---------------------------------------------------------------------------
# Summary
# ---------------------------------------------------------------------------

log "Summary"

print_stage() {
  local name="$1" status="$2"
  case "$status" in
    pass) printf "  \033[32m✓ PASS\033[0m  %s\n" "$name" ;;
    fail) printf "  \033[31m✗ FAIL\033[0m  %s\n" "$name" ;;
    skip) printf "  \033[33m- SKIP\033[0m  %s\n" "$name" ;;
  esac
}

print_stage "1. Model responds                " "$STAGE_OLLAMA"
print_stage "2. Output parses as JSON         " "$STAGE_EXTRACT"
print_stage "3. Passes deck.json validation   " "$STAGE_VALIDATE"
print_stage "4. Packs into a .deckpkg         " "$STAGE_PACK"
print_stage "5. Exports to a real .pptx       " "$STAGE_EXPORT"

echo
if [[ "$STAGE_VALIDATE" == "pass" ]]; then
  echo "Model: $MODEL"
  echo "Result files kept at: $WORKDIR"
  echo "  - $DECK_JSON_FILE"
  [[ -f "$DECKPKG_FILE" ]] && echo "  - $DECKPKG_FILE"
  [[ -f "$PPTX_FILE" ]] && echo "  - $PPTX_FILE"
else
  echo "Validation did not pass -- inspect $WORKDIR for the raw model output and"
  echo "whatever JSON could be extracted from it."
fi

# Exit non-zero overall if validation (the core skill-correctness check)
# didn't pass, so this is CI-friendly.
[[ "$STAGE_VALIDATE" == "pass" ]]