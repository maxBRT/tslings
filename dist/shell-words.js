// Split a command line into words like a POSIX shell does (rustlings uses the
// `shlex` crate for `--edit-cmd`). Handles single quotes, double quotes and
// backslash escapes; no variables or globbing.
export function splitShellWords(command) {
    const words = [];
    let word = "";
    let inWord = false;
    let quote;
    for (let index = 0; index < command.length; index++) {
        const char = command.charAt(index);
        if (quote === "'") {
            if (char === "'")
                quote = undefined;
            else
                word += char;
            continue;
        }
        if (quote === '"') {
            if (char === '"') {
                quote = undefined;
            }
            else if (char === "\\" && index + 1 < command.length && '"\\$`\n'.includes(command.charAt(index + 1))) {
                index++;
                word += command.charAt(index);
            }
            else {
                word += char;
            }
            continue;
        }
        if (char === "'" || char === '"') {
            quote = char;
            inWord = true;
        }
        else if (char === "\\") {
            if (index + 1 >= command.length)
                throw new Error("The command ends with a lone backslash");
            index++;
            word += command.charAt(index);
            inWord = true;
        }
        else if (/\s/.test(char)) {
            if (inWord)
                words.push(word);
            word = "";
            inWord = false;
        }
        else {
            word += char;
            inWord = true;
        }
    }
    if (quote !== undefined)
        throw new Error(`Unclosed ${quote === "'" ? "single" : "double"} quote`);
    if (inWord)
        words.push(word);
    return words;
}
