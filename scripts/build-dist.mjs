#!/usr/bin/env node
/**
 * Assemble `dist/cli-anything/` — the only tree Elftia installs.
 *
 * The tree is a pure-data agent plugin: manifest + skill + commands + license
 * files, no code entries, so nothing to stamp. Upstream-derived bytes are
 * verified against `upstream.json` before anything is staged.
 */
import { createHash } from "node:crypto";
import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import { PLUGIN_ID, repoRoot, sha256, verifyUpstreamPins } from "./upstream.mjs";

const SOURCE_ENTRIES = [
  "elftia-plugin.json",
  "LICENSE",
  "NOTICE.md",
  "skills",
  "commands",
];

async function assertSourcesPresent() {
  const missing = [];
  for (const entry of SOURCE_ENTRIES) {
    try {
      await stat(join(repoRoot, entry));
    } catch {
      missing.push(entry);
    }
  }
  if (missing.length > 0) {
    throw new Error(`missing source entries: ${missing.join(", ")}`);
  }
}

async function treeFingerprint(root) {
  const { readdir, readFile: read } = await import("node:fs/promises");
  const files = [];
  const walk = async (dir, prefix = "") => {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
      if (entry.isDirectory()) await walk(join(dir, entry.name), relative);
      else if (entry.isFile()) files.push(relative);
    }
  };
  await walk(root);
  files.sort();
  const hash = createHash("sha256");
  for (const file of files) {
    hash.update(file);
    hash.update(sha256(await read(join(root, file))));
  }
  return { fileCount: files.length, sha256: hash.digest("hex") };
}

const target = join(repoRoot, "dist", PLUGIN_ID);
try {
  const { pinned } = await verifyUpstreamPins();
  await assertSourcesPresent();

  await rm(join(repoRoot, "dist", ".stage-" + PLUGIN_ID), {
    recursive: true,
    force: true,
  });
  const stage = join(repoRoot, "dist", ".stage-" + PLUGIN_ID);
  await mkdir(stage, { recursive: true });
  for (const entry of SOURCE_ENTRIES) {
    await cp(join(repoRoot, entry), join(stage, entry), { recursive: true });
  }

  // Validate the manifest BEFORE swapping it in: it must parse and name itself
  // the way the install tree expects.
  const manifest = JSON.parse(await readFile(join(stage, "elftia-plugin.json"), "utf8"));
  if (manifest.name !== PLUGIN_ID) {
    throw new Error(`manifest name ${manifest.name} does not match dist id ${PLUGIN_ID}`);
  }
  if (manifest.kind !== "agent") {
    throw new Error(`expected kind "agent", found "${manifest.kind}"`);
  }

  await rm(target, { recursive: true, force: true });
  await cp(stage, target, { recursive: true });
  await rm(stage, { recursive: true, force: true });

  const fingerprint = await treeFingerprint(target);
  console.info(
    `build-dist: upstream OK (${Object.keys(pinned.files).length} files @ ${pinned.commit.slice(0, 7)})`,
  );
  console.info(
    `build-dist: PASS (${fingerprint.fileCount} files, ${fingerprint.sha256}) -> dist/${PLUGIN_ID}`,
  );
} catch (error) {
  console.error(`build-dist: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
