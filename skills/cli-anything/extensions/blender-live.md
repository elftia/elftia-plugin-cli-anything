# Blender live session — the MCP route (Elftia extension)

This is an **Elftia-owned extension** to the cli-anything skill (not upstream
CLI-Anything content). It adds a second Blender backend alongside the headless
CLI harness: a **live-session MCP bridge** into a running Blender, so you can
interact with the user's open scene, take viewport screenshots, and iterate in
a tight feedback loop.

Protocol facts below were verified against
[ahujasid/blender-mcp](https://github.com/ahujasid/blender-mcp) `addon.py` @
`c5f35d9cc54451d785ac4c00c48bf9e98a2e8db9` (addon v1.6, protocol v5,
Blender ≥ 3.0.0, MIT).

## When to use which backend

| Task shape | Backend | Why |
| --- | --- | --- |
| Final renders, batch pipelines, CI, reproducible artifacts | **Headless CLI harness** (`cli-anything-blender`, `blender --background`) | Deterministic, verifiable outputs, no GUI session held hostage, composable |
| Exploring/building in the user's OPEN scene, quick look-arounds, scene cleanup/renaming | **Live MCP** | State already in memory, user watches the viewport, sub-second round trips |
| Interactive look-dev before a final render | **Both** | Iterate live, then bake the result and render headless |

Never use the live session for long renders — it blocks the user's editor.
Bake first (`bpy.ops.wm.save_as_mainfile`), render headless.

## Setup — fully scriptable

### Step 1: install the addon into Blender (agent can do this via shell)

The addon is a single `addon.py` that must live in Blender's user addons
directory as `blendermcp.py`. Derive the directory from `blender --version`
(`<ver>` is major.minor, e.g. `4.2`):

| OS | Addons directory |
| --- | --- |
| Windows | `%APPDATA%\Blender Foundation\Blender\<ver>\scripts\addons\` |
| macOS | `~/Library/Application Support/Blender/<ver>/scripts/addons/` |
| Linux | `~/.config/blender/<ver>/scripts/addons/` |

```bash
# 1. Confirm Blender and its version (ask the user for the path if not on PATH)
blender --version

# 2. Download the pinned addon build and install it
curl -sf "https://raw.githubusercontent.com/ahujasid/blender-mcp/c5f35d9cc54451d785ac4c00c48bf9e98a2e8db9/addon.py" \
  -o "<addons-dir>/blendermcp.py"

# 3. Enable it and persist the preference (headless, exits immediately)
blender --background --python-expr "import addon_utils; addon_utils.enable('blendermcp', default_set=True); import bpy; bpy.ops.wm.save_userpref()"
```

**Ask the user before writing into their Blender profile** — this modifies
their editor configuration. The addon's "Auto-Start Server" option defaults to
**on**, so every subsequent Blender launch opens the socket server on
`localhost:9876` by itself; no clicking Connect needed. If Blender is already
running, it must be restarted once (or the user flips
View3D → Sidebar (N) → *MCP for Blender* → Start manually).

### Step 2: add the MCP server in Elftia (user pastes once)

You cannot edit Elftia's MCP settings from a session — hand the user this
exact JSON for **Settings → MCP Servers → 本地/Local → 添加 → JSON 导入**:

```json
{
  "mcpServers": {
    "blender": { "command": "uvx", "args": ["blender-mcp"] }
  }
}
```

- Requires [`uv`](https://docs.astral.sh/uv/) (`uvx`). Without it:
  `pip install blender-mcp` and use `{ "command": "blender-mcp", "args": [] }`.
- Non-default host/port: add `"env": { "BLENDER_HOST": "...", "BLENDER_PORT": "..." }`.
- Then open the server's **管理 (Manage)** dialog → **Add to Agent** →
  associate it with the agent(s) that should see the tools, and hit
  **测试连接 (Test)**.

### Step 3: verify end to end

1. Blender is running (the server auto-started — port 9876 listening).
2. Call a cheap MCP tool (e.g. `get_scene_info` / a `ping` over the bridge)
   and read the scene name back to the user.

Connection refused → checklist: Blender restarted after install? Auto-Start
toggled on in the addon panel? Port 9876 not taken? Step-2 `env` matches the
addon's host/port? `uvx blender-mcp` runs in a plain terminal?

## Using the live session

Tool surface (names as the blender MCP server reports them): scene/object
inspection (`get_scene_info`, `get_object_info`), **`execute_blender_code`**
(arbitrary bpy Python in the live session), `get_viewport_screenshot`, plus
opt-in asset sources (Poly Haven / Sketchfab / Hyper3D / Poly Pizza — toggle
them in the addon panel before they appear).

The interactive loop that works:

1. `get_scene_info` → orient (objects, materials, world).
2. `execute_blender_code` → one small mutation at a time (create, modify,
   reposition). Keep code snippets short; on error the addon returns the
   traceback — fix and resend.
3. `get_viewport_screenshot` → **requires a filepath parameter**; the addon
   renders the viewport offscreen (works even when the Blender window is in
   the background) and returns `{width, height, filepath, method}` — view the
   file to judge the result before the next mutation.
4. Repeat 2–3 until good, then hand off: save the file and/or express the
   final scene through the harness contract and render headless.

### Safety — read this every session

`execute_blender_code` runs **arbitrary Python inside the user's open Blender
process** (the official Blender MCP server carries the same warning). Before
the first mutation: tell the user to save (`bpy.ops.wm.save_mainfile()` only
if they consent to overwriting). One bad script can destroy an unsaved scene —
that cost is on you, not the user.

## Relationship to the harness

The harness (`references/commands/cli-anything.md`, HARNESS.md Phase 3
`utils/_backend.py`) stays **headless-only** — this extension does not modify
the generated CLI. The two compose at the project level: the live session is
for exploration and look-dev; the harness remains the reproducible,
verifiable, CI-able render/export path. Upstream HARNESS.md also has a generic
`guides/mcp-backend.md` pattern for software that has ONLY an MCP server and
no native CLI — Blender is the opposite case (native CLI exists, MCP is the
optional interactive channel).
