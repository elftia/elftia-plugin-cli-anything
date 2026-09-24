#!/usr/bin/env node
/**
 * Verify `dist/cli-anything/` against the source tree and the upstream pin:
 * every expected file present, no extras, dist bytes identical to source bytes,
 * and the SKILL.md the manifest points at actually exists.
 */
import { createHash } from "node:crypto";
import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";
import process from "node:process";

import { PLUGIN_ID, repoRoot, sha256, verifyUpstreamPins } from "./upstream.mjs";

async function listFiles(root, prefix = "") {
  const out = [];
  for (const entry of await readdir(root, { withFileTypes: true })) {
    const relative = prefix ? `${prefix}/${entry.name}` : entry.name;
    if (entry.isDirectory()) out.push(...(await listFiles(join(root, entry.name), relative)));
    else if (entry.isFile()) out.push(relative);
  }
  return out.sort();
}

const distRoot = join(repoRoot, "dist", PLUGIN_ID);
const problems = [];

try {
  const { ok, pinned } = await verifyUpstreamPins();
  if (!ok) {
    problems.push("upstream pins fail — run npm run verify:upstream for detail");
  }

  const distExists = await stat(distRoot).then(
    (s) => s.isDirectory(),
    () => false,
  );
  if (!distExists) {
    problems.push(`dist/${PLUGIN_ID} does not exist — run npm run build first`);
  } else {
    for (const entry of ["elftia-plugin.json", "LICENSE", "NOTICE.md", "skills", "commands"]) {
      await stat(join(distRoot, entry)).catch(() => problems.push(`dist missing: ${entry}`));
    }

    const skillDist = await listFiles(join(distRoot, "skills"));
    const skillSrc = await listFiles(join(repoRoot, "skills"));
    const srcSet = new Set(skillSrc);
    for (const file of skillDist) {
      if (!srcSet.has(file)) problems.push(`dist-only file: skills/${file}`);
    }
    for (const file of skillSrc) {
      if (!skillDist.includes(file)) problems.push(`dist missing: skills/${file}`);
    }

    const cmdDist = await listFiles(join(distRoot, "commands"));
    const cmdSrc = await listFiles(join(repoRoot, "commands"));
    if (cmdDist.join("\n") !== cmdSrc.join("\n")) {
      problems.push("dist commands/ tree differs from source commands/ tree");
    }

    // Byte-identity for every skill + command file.
    for (const file of [...skillSrc, ...cmdSrc.map((f) => `commands/${f}`)]) {
      const srcPath = join(repoRoot, file);
      const distPath = join(distRoot, file);
      let a, b;
      try {
        a = await readFile(srcPath);
        b = await readFile(distPath);
      } catch {
        continue; // presence already reported above
      }
      if (sha256(a) !== sha256(b)) problems.push(`byte drift in dist: ${file}`);
    }

    // Manifest must still parse and its skill path must resolve.
    const manifest = JSON.parse(await readFile(join(distRoot, "elftia-plugin.json"), "utf8"));
    const skillPath = manifest.contributes?.agent?.skills?.[0]?.path ?? "./skills";
    await stat(join(distRoot, skillPath, "SKILL.md")).catch(() =>
      problems.push(`manifest skill path ${skillPath} has no SKILL.md in dist`),
    );
  }

  if (problems.length > 0) {
    for (const problem of problems) console.error(`verify-dist: ${problem}`);
    process.exitCode = 1;
  } else {
    const hash = createHash("sha256");
    for (const file of await listFiles(distRoot)) {
      hash.update(file);
      hash.update(sha256(await readFile(join(distRoot, file))));
    }
    console.info(
      `verify-dist: PASS (@${pinned.commit.slice(0, 7)}, tree ${hash.digest("hex").slice(0, 16)})`,
    );
  }
} catch (error) {
  console.error(`verify-dist: FAIL: ${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
