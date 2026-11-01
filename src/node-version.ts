// tslings runs exercises with Node's built-in TypeScript support (type
// stripping), and some exercises use `using` declarations (explicit resource
// management), which Node.js runs since version 24.

export const MIN_NODE_MAJOR = 24;

/** `undefined` when this Node.js is recent enough, the message to show otherwise. */
export function nodeVersionError(version: string = process.versions.node): string | undefined {
  const major = Number(version.split(".")[0]) || 0;
  if (major >= MIN_NODE_MAJOR) return undefined;
  return `tslings needs Node.js ${MIN_NODE_MAJOR} or newer: it runs your TypeScript files directly and some exercises use \`using\` declarations.
You are using Node.js v${version}. Install a recent version from https://nodejs.org and try again.`;
}
