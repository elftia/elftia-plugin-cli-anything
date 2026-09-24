/**
 * Shared upstream-provenance helpers.
 *
 * `upstream.json` pins every file under skills/cli-anything/{references,assets}
 * to the exact bytes of HKUDS/CLI-Anything@<commit>. Any drift — modified,
 * missing, or newly added files in those trees — is a build failure: the point
 * of the pin is that upstream methodology content is re-vendored and re-pinned
 * upstream, never edited in place.
 */
import { createHash } from "node:crypto";
import { readFile, readdir } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const repoRoot = join(dirname(fileURLToPath(import.meta.url)), "..");
export const PLUGIN_ID = "cli-anything";
export const PINNED_ROOTS = ["references", "assets"];

export function sha256(bytes) {
  return createHash("sha256").update(bytes).digest("hex");
}

async function walk(dir, prefix = "") {
  const out = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) {
      out.push(...(await walk(join(dir, entry.name), relative)));
    } else if (entry.isFile()) {
      out.push(relative);
    }
  }
  return out.sort();
}

/**
 * Verify skills/cli-anything/{references,assets} byte-for-byte against the pin.
 * Returns `{ ok, problems, pinned }`.
 */
export async function verifyUpstreamPins() {
  const pin = JSON.parse(await readFile(join(repoRoot, "upstream.json"), "utf8"));
  const problems = [];
  const skillRoot = join(repoRoot, "skills", PLUGIN_ID);

  for (const [relative, expected] of Object.entries(pin.files)) {
    const root = relative.split("/")[0];
    if (!PINNED_ROOTS.includes(root)) continue;
    let bytes;
    try {
      bytes = await readFile(join(skillRoot, relative));
    } catch {
      problems.push(`missing pinned file: skills/${PLUGIN_ID}/${relative}`);
      continue;
    }
    if (sha256(bytes) !== expected) {
      problems.push(
        `byte drift: skills/${PLUGIN_ID}/${relative} no longer matches upstream ${pin.commit.slice(0, 7)} — re-vendor and update upstream.json instead of editing in place`,
      );
    }
  }

  for (const root of PINNED_ROOTS) {
    const present = await walk(join(skillRoot, root), root).catch(() => []);
    for (const relative of present) {
      if (!(relative in pin.files)) {
        problems.push(
          `unpinned file: skills/${PLUGIN_ID}/${relative} is not in upstream.json — either pin it (upstream byte-identical) or move it outside the pinned trees`,
        );
      }
    }
  }

  return { ok: problems.length === 0, problems, pinned: pin };
}
