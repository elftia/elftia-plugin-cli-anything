# NOTICE

This Elftia plugin (`cli-anything`) is a port of the
[HKUDS/CLI-Anything](https://github.com/HKUDS/CLI-Anything) agent methodology
into the Elftia plugin format.

## Upstream provenance

- **Repository:** https://github.com/HKUDS/CLI-Anything
- **Pinned commit:** `810c18b0d1ab9b234bc996c9fd999318523a3ef0` (2026-08-21)
- **Upstream source tree:** `cli-anything-plugin/`
- **License:** Apache License 2.0 (see `LICENSE`, copied from upstream)

Every file under `skills/cli-anything/references/` and
`skills/cli-anything/assets/` is a **byte-identical** copy of the upstream file
at the pinned commit; `upstream.json` pins their SHA-256 hashes and
`npm run verify:upstream` enforces them. To take upstream changes, re-download
the files and update the pin — do not edit them in place.

## What is original to this repo

- `elftia-plugin.json` (Elftia manifest), `commands/*.md` (TinyElf slash-command
  routers), `skills/cli-anything/SKILL.md` (Elftia-native entry point),
  `skills/cli-anything/extensions/` (Elftia-owned extras; first entry:
  `blender-live.md`, the Blender live-session MCP route — references
  ahujasid/blender-mcp `addon.py` @ `c5f35d9cc54451d785ac4c00c48bf9e98a2e8db9`,
  MIT, but bundles none of its code), the producer toolchain under `scripts/`,
  `tests/`, and this notice.

## Upstream authors

CLI-Anything is by Yuhao Yang, Tianyu Fan, and Chao Huang (HKU Data
Intelligence Lab). Technical report: arXiv:2606.03854.
