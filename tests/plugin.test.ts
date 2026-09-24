import { execFileSync } from "node:child_process";
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

import { describe, expect, it } from "vitest";

const repoRoot = join(__dirname, "..");

function runScript(name: string): string {
  return execFileSync(process.execPath, [join(repoRoot, "scripts", name)], {
    encoding: "utf8",
  });
}

describe("manifest", () => {
  const manifest = JSON.parse(
    readFileSync(join(repoRoot, "elftia-plugin.json"), "utf8"),
  );

  it("is a pure-data agent plugin", () => {
    expect(manifest.name).toBe("cli-anything");
    expect(manifest.kind).toBe("agent");
    expect(manifest.contributes.main).toBeUndefined();
    expect(manifest.contributes.renderer).toBeUndefined();
    expect(manifest.permissions).toBeUndefined();
  });

  it("contributes the skill and the command root", () => {
    const skills = manifest.contributes.agent.skills;
    expect(Array.isArray(skills)).toBe(true);
    expect(skills[0].id).toBe("cli-anything");
    expect(existsSync(join(repoRoot, skills[0].path, "SKILL.md"))).toBe(true);

    const commands = manifest.contributes.agent.commands;
    expect(commands).toEqual(["./commands"]);
    expect(existsSync(join(repoRoot, "commands"))).toBe(true);
  });
});

describe("skill content", () => {
  const skill = readFileSync(
    join(repoRoot, "skills", "cli-anything", "SKILL.md"),
    "utf8",
  );

  it("has parseable frontmatter with name and description", () => {
    expect(skill.startsWith("---\n")).toBe(true);
    const frontmatter = skill.slice(4, skill.indexOf("\n---\n", 4));
    expect(frontmatter).toMatch(/^name: cli-anything$/m);
    expect(frontmatter).toMatch(/^description: \S/m);
  });

  it("points at the authoritative HARNESS.md and every workflow spec", () => {
    for (const reference of [
      "references/HARNESS.md",
      "references/commands/cli-anything.md",
      "references/commands/refine.md",
      "references/commands/test.md",
      "references/commands/validate.md",
      "references/commands/list.md",
      "assets/repl_skin.py",
    ]) {
      const base = join(repoRoot, "skills", "cli-anything");
      expect({
        reference,
        exists: existsSync(join(base, reference)),
      }).toEqual({ reference, exists: true });
    }
  });
});

describe("commands", () => {
  const commandFiles = [
    "cli-anything.md",
    "cli-anything-refine.md",
    "cli-anything-test.md",
    "cli-anything-validate.md",
    "cli-anything-list.md",
  ];

  it.each(commandFiles)("commands/%s has description + argument routing", (file) => {
    const content = readFileSync(join(repoRoot, "commands", file), "utf8");
    expect(content.startsWith("---\n")).toBe(true);
    const frontmatter = content.slice(4, content.indexOf("\n---\n", 4));
    expect(frontmatter).toMatch(/^description: \S/m);
    expect(content).toContain("$ARGUMENTS");
    expect(content).toContain("cli-anything");
  });
});

describe("Blender live extension (Elftia-owned)", () => {
  const ext = readFileSync(
    join(repoRoot, "skills", "cli-anything", "extensions", "blender-live.md"),
    "utf8",
  );

  it("pins the addon source it documents", () => {
    expect(ext).toContain(
      "c5f35d9cc54451d785ac4c00c48bf9e98a2e8db9",
    );
    expect(ext).toContain("ahujasid/blender-mcp");
  });

  it("carries the setup recipe and safety rules", () => {
    expect(ext).toContain("blendermcp.py");
    expect(ext).toContain("addon_utils.enable");
    expect(ext).toContain('"command": "uvx", "args": ["blender-mcp"]');
    expect(ext).toContain("execute_blender_code");
    expect(ext).toContain("get_viewport_screenshot");
  });

  it("lives OUTSIDE the upstream-pinned trees", () => {
    const pin = JSON.parse(readFileSync(join(repoRoot, "upstream.json"), "utf8"));
    const pinnedPaths = Object.keys(pin.files);
    expect(pinnedPaths.some((p) => p.startsWith("extensions/"))).toBe(false);
  });
});

describe("versioning", () => {
  it("producer package and manifest stay in lockstep", () => {
    const pkg = JSON.parse(readFileSync(join(repoRoot, "package.json"), "utf8"));
    const manifest = JSON.parse(
      readFileSync(join(repoRoot, "elftia-plugin.json"), "utf8"),
    );
    expect(pkg.version).toBe(manifest.version);
  });
});

describe("upstream provenance", () => {
  it("verify-upstream passes against the pin", () => {
    expect(runScript("verify-upstream.mjs")).toContain("verify-upstream: PASS");
  });

  it("pins every file under references/ and assets/", () => {
    const pin = JSON.parse(readFileSync(join(repoRoot, "upstream.json"), "utf8"));
    const roots = Object.keys(pin.files).map((file) => file.split("/")[0]);
    expect(new Set(roots)).toEqual(new Set(["references", "assets"]));
    expect(pin.commit).toMatch(/^[0-9a-f]{40}$/);
    expect(pin.license).toBe("Apache-2.0");
  });
});

describe("dist build", () => {
  it("build + verify:dist pass and produce the install tree", () => {
    expect(runScript("build-dist.mjs")).toContain("build-dist: PASS");
    expect(runScript("verify-dist.mjs")).toContain("verify-dist: PASS");
    const distManifest = join(repoRoot, "dist", "cli-anything", "elftia-plugin.json");
    expect(existsSync(distManifest)).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "cli-anything", "LICENSE"))).toBe(true);
    expect(existsSync(join(repoRoot, "dist", "cli-anything", "NOTICE.md"))).toBe(true);
  });
});
