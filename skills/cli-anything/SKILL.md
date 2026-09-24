---
name: cli-anything
description: Build, refine, test, validate, and inventory agent-native CLI harnesses for arbitrary software (GIMP, Blender, LibreOffice, Inkscape, Shotcut, or any GUI app / open-source repo) using the CLI-Anything 7-phase methodology. The generated CLI is a pip-installable Python package (Click, REPL, --json output, undo/redo) that drives the REAL software backend — never a reimplementation. Use when the user wants to turn software into a CLI, make software controllable by agents, create an agent harness, or work on an existing cli-anything-* CLI.
---

# CLI-Anything — turn any software into an agent-native CLI

You are executing the CLI-Anything methodology (ported from
[HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything), Apache-2.0): scan a
software codebase, then generate a production-ready, pip-installable Python CLI
that lets agents operate that software end to end.

**The one rule above all others: use the real software.** The generated CLI must
invoke the actual application for rendering and export (LibreOffice headless,
`blender --background`, `melt`, `inkscape --actions`, `sox`, …). Never
reimplement the software's functionality in Python. A CLI that renders with a
fallback library is a failure, not a graceful degradation.

## Prerequisites — check once per session

```bash
python3 --version    # need >= 3.10 (on Windows try: python --version, py -3 --version)
git --version        # needed when the target is a GitHub URL
```

If the target software itself is not installed, you can still BUILD the harness,
but real-backend E2E tests will fail by design — tell the user exactly what to
install before claiming completion. HARNESS.md forbids skipping tests when the
software is missing.

## This skill's directory

Paths below are relative to this skill's directory (`$SKILL_DIR`), shown in the
skill metadata trailer when you load it:

- `$SKILL_DIR/references/HARNESS.md` — **the authoritative SOP. Read it before
  any workflow.** All phases, architecture patterns, and quality gates live here.
- `$SKILL_DIR/references/commands/*.md` — per-workflow specs (build / refine /
  test / validate / list), phase by phase with success criteria.
- `$SKILL_DIR/references/guides/*.md` — on-demand deep dives (session locking,
  filter translation, timecode precision, preview methodology, PyPI publishing,
  skill generation, MCP backends, auto-save/--dry-run). HARNESS.md links to the
  right guide at the right phase.
- `$SKILL_DIR/assets/repl_skin.py` — unified REPL skin. Copy VERBATIM into every
  generated harness at `cli_anything/<software>/utils/repl_skin.py`.
- `$SKILL_DIR/assets/preview_bundle.py` — `preview-bundle/v1` implementation for
  preview-capable harnesses (see `guides/preview-methodology.md`).
- `$SKILL_DIR/assets/skill_generator.py` + `assets/templates/SKILL.md.template`
  — generate the per-software SKILL.md in Phase 6.5.
- `$SKILL_DIR/extensions/` — **Elftia-owned extensions** (not upstream,
  not byte-pinned). First entry: `blender-live.md`, the live-session MCP
  route for Blender.

## Workflows

| Workflow | When | Spec |
| --- | --- | --- |
| **build** | First harness for a software repo (local path or GitHub URL) | `references/commands/cli-anything.md` |
| **refine** | Harness exists; expand coverage (optionally focused) | `references/commands/refine.md` |
| **test** | Run a harness's suite, update TEST.md | `references/commands/test.md` |
| **validate** | Audit a harness against HARNESS.md (52 checks) | `references/commands/validate.md` |
| **list** | Inventory installed + generated `cli-anything-*` tools | `references/commands/list.md` |

Every workflow starts the same way: **read `references/HARNESS.md`, then the
workflow's spec.** Follow them literally — do not improvise your own pipeline.

### build (the 7 phases)

0. **Source acquisition** — clone GitHub URLs, verify the path holds source,
   derive the software name from the directory.
1. **Codebase analysis** — find the backend engine, map GUI actions to API
   calls, identify the data model and existing CLI tools.
2. **CLI architecture design** — command groups per domain, state model,
   `--json` output plan, software-specific SOP (`<SOFTWARE>.md`).
3. **Implementation** — `agent-harness/cli_anything/<software>/{core,utils,tests}`,
   Click CLI, REPL default (`invoke_without_command=True`), copy
   `assets/repl_skin.py` into `utils/`.
4. **Test planning** — write `tests/TEST.md` (part 1) BEFORE any test code.
5. **Test implementation** — unit (`test_core.py`), E2E real-backend
   (`test_full_e2e.py`), `TestCLISubprocess` via `_resolve_cli()`.
6. **Test documentation** — run `pytest -v --tb=no`, append results to TEST.md.
   6.5. **SKILL.md generation** — via `assets/skill_generator.py`.
7. **PyPI packaging** — `setup.py` with `find_namespace_packages`, PEP 420
   namespace (`cli_anything/` has NO `__init__.py`), `pip install -e .`,
   `which cli-anything-<software>`.

The build succeeds only when all 11 success criteria in the build spec hold —
100% test pass rate included.

## Blender: choosing the backend

Blender has TWO usable agent backends — pick per task, they compose:

- **Headless CLI harness** (default, all 7 phases) — final renders, batch
  pipelines, reproducible artifacts.
- **Live MCP session** (`extensions/blender-live.md`) — the user's OPEN
  Blender, interactive mutation + viewport screenshots in a tight loop. Setup
  is fully scriptable on the Blender side (the addon auto-starts its server);
  the Elftia side is one JSON paste in Settings → MCP Servers. Read that
  extension before any live-session work — it carries the safety rules for
  `execute_blender_code`.

### Generated harness layout (what you must produce)

```
<software>/
└── agent-harness/
    ├── <SOFTWARE>.md            # software-specific SOP
    ├── setup.py
    └── cli_anything/            # NO __init__.py here (PEP 420)
        └── <software>/          # HAS __init__.py
            ├── README.md  <software>_cli.py
            ├── core/  utils/  tests/
```

## Working inside Elftia

- Run everything through your shell tool in the session's working directory.
  Clone targets into the workspace, not the plugin directory.
- The user watches the session; keep them posted at each phase boundary and
  before long E2E runs (real renders can take minutes).
- Long pipelines: if a phase needs many independent analyses of a large repo,
  use your subagent tools to fan out, then fold results into the SOP doc.
- Windows hosts: prefer `python` / `py -3` when `python3` is absent; quote
  Windows paths; `pip install -e .` works from any shell you spawn.

## Non-negotiables (from HARNESS.md)

1. Real software is a hard dependency — no fallbacks, no skips.
2. Every command supports `--json`.
3. REPL is the default entry (`cli-anything-<software>` with no args).
4. Verify rendered outputs programmatically (magic bytes, ZIP structure, pixel
   probes) — exit code 0 proves nothing.
5. Tests: unit + real-backend E2E + subprocess tests through `_resolve_cli()`,
   `CLI_ANYTHING_FORCE_INSTALLED=1` for release verification.
6. Namespace discipline: `cli_anything/` never gets `__init__.py`;
   imports always `cli_anything.<software>.*`.
7. Timecodes: `round()` not `int()`; ±1 frame tolerance in tests.

## Provenance

All files under `references/` and `assets/` are byte-identical copies from the
upstream plugin tree `HKUDS/CLI-Anything@810c18b` (`cli-anything-plugin/`),
Apache-2.0. See the plugin's `NOTICE.md`. When upstream evolves, re-vendor and
re-pin rather than editing those files in place.
