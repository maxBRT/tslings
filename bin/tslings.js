#!/usr/bin/env node
// The `tslings` command. Plain JavaScript that even old Node.js versions can
// parse, so that they print a helpful message instead of a syntax error.

var version = process.versions.node.split(".").map(Number);
if (version[0] < 22 || (version[0] === 22 && version[1] < 18)) {
  console.error(
    "tslings needs Node.js 22.18 or newer: it runs your TypeScript files with Node's built-in type stripping.\n" +
      "You are using Node.js v" + process.versions.node + ". Install a recent version from https://nodejs.org and try again.",
  );
  process.exit(1);
}

import("../dist/main.js").catch(function (error) {
  if (error && error.code === "ERR_MODULE_NOT_FOUND" && String(error.message).indexOf("dist/main.js") !== -1) {
    console.error("tslings isn't built yet. Run `npm run build` in the tslings directory first.");
  } else {
    console.error(error);
  }
  process.exit(1);
});
