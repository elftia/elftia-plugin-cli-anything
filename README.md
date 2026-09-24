# elftia-plugin-cli-anything

An [Elftia](https://github.com/elftia/elftia) agent plugin porting
[HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything): the methodology
that turns any GUI software (GIMP, Blender, LibreOffice, Shotcut, … or any
repo) into an **agent-native CLI harness** — a pip-installable Python package
(Click, REPL, `--json`, undo/redo) that drives the **real** software backend.

Pure-data plugin: one skill, no code entries, no host permissions.

## What ships

| Path | Content |
| --- | --- |
| `skills/cli-anything/SKILL.md` | Elftia-native entry point: prerequisites, workflow map, non-negotiables |
| `skills/cli-anything/references/HARNESS.md` | The authoritative 7-phase SOP (upstream, byte-identical) |
| `skills/cli-anything/references/commands/*.md` | Build / refine / test / validate / list workflow specs (upstream) |
| `skills/cli-anything/references/guides/*.md` | Deep dives: session locking, filter translation, timecode precision, preview methodology, PyPI publishing, skill generation, MCP backends, auto-save (upstream) |
| `skills/cli-anything/assets/` | `repl_skin.py`, `preview_bundle.py`, `skill_generator.py`, `templates/SKILL.md.template` — copied into every generated harness (upstream) |
| `skills/cli-anything/extensions/blender-live.md` | Elftia-owned: the Blender **live-session MCP route** — scriptable addon install, one-paste MCP server JSON, decision matrix vs the headless harness |

Usage inside Elftia (any agent session with the skill enabled): just ask
"用 CLI-Anything 给这个仓库生成一个 CLI" — the skill triggers and walks the
workflow map in `SKILL.md`.

## Provenance

`skills/cli-anything/{references,assets}/` are byte-identical copies of
`HKUDS/CLI-Anything@810c18b` (`cli-anything-plugin/` tree), pinned by SHA-256
in `upstream.json` and enforced by `npm run verify:upstream`. Take upstream
changes by re-vendoring and re-pinning — never edit those files in place. See
`NOTICE.md`; license is Apache-2.0.

## Producer chain

```bash
npm install
npm run verify      # test + verify:upstream + build + verify:dist
npm run release     # -> release/<version>/cli-anything.epkg + sidecar (immutable)
npm run pack        # flat one-shot pack for local smoke; remove old output before re-packing changed bytes
```

Dev-install into a running Elftia: developer mode → install from local folder
→ pick `dist/cli-anything/`.

Changing any shipped content requires bumping `version` in
`elftia-plugin.json` (it is also the dist manifest).
