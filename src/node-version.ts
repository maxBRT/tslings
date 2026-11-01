// tslings runs exercises with Node's built-in TypeScript support (type
// stripping), which works without flags since Node.js 22.18.

export const MIN_NODE_VERSION = [22, 18] as const;

/** `undefined` when this Node.js is recent enough, the message to show otherwise. */
export function nodeVersionError(version: string = process.versions.node): string | undefined {
  const [major = 0, minor = 0] = version.split(".").map(Number);
  const [minMajor, minMinor] = MIN_NODE_VERSION;
  if (major > minMajor || (major === minMajor && minor >= minMinor)) return undefined;
  return `tslings needs Node.js ${minMajor}.${minMinor} or newer: it runs your TypeScript files with Node's built-in type stripping.
You are using Node.js v${version}. Install a recent version from https://nodejs.org and try again.`;
}
