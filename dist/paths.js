// Paths in tslings' output: relative to the exercises' root, with `/` on every system.
//
// Windows can spell the same folder two ways: a long name (`C:\Users\runneradmin`)
// and a short 8.3 name (`C:\Users\RUNNER~1`). TypeScript reports long names, while
// the current directory may use the short one. Comparing them as text would give
// paths like `../../runneradmin/...`, so both sides are resolved first.
import { realpathSync } from "node:fs";
import { relative, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";
/** The absolute path, with Windows short names expanded. Unchanged elsewhere, or if the file doesn't exist. */
export function longPath(path) {
    const absolute = resolve(path);
    if (sep === "/")
        return absolute;
    try {
        return realpathSync.native(absolute);
    }
    catch {
        return absolute;
    }
}
/** `file` relative to `root`, with `/` separators. */
export function displayRelative(root, file) {
    return relative(longPath(root), longPath(file)).split(sep).join("/");
}
/**
 * Replace each `file://` URL that points inside `root` with its relative path,
 * as in `at exercises/tests.ts:2:7`. URLs outside `root` are left alone.
 */
export function relativizeFileUrls(text, root) {
    return text.replace(/file:\/\/[^\s()'"`]+?(?=(:\d+)*[\s)'"`]|(:\d+)*$)/g, (url) => {
        let path;
        try {
            path = fileURLToPath(url);
        }
        catch {
            return url;
        }
        const shown = displayRelative(root, path);
        return shown.startsWith("..") ? url : shown;
    });
}
