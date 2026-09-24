#!/usr/bin/env node
import process from "node:process";

import { verifyUpstreamPins } from "./upstream.mjs";

const { ok, problems, pinned } = await verifyUpstreamPins();
if (ok) {
  const count = Object.keys(pinned.files).length;
  console.info(
    `verify-upstream: PASS (${count} files pinned to ${pinned.repository}@${pinned.commit.slice(0, 7)})`,
  );
} else {
  for (const problem of problems) console.error(`verify-upstream: ${problem}`);
  process.exitCode = 1;
}
