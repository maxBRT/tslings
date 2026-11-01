// Welcome to tslings! You'll learn TypeScript by fixing small programs like this one.
//
// Each time you save an exercise file, tslings checks it in three steps:
//
//   1. Type-check: TypeScript reads the file and reports every type error.
//   2. Lint: a few rules stop you from switching the type checker off. `any`, `as`
//      casts, `value!` assertions and `@ts-ignore` comments are not allowed, so the
//      only way through is to fix the code. Style rules, like "use `const` for a value
//      that never changes", only show warnings: they don't block you, but fix them.
//   3. Run: Node runs the file. Most exercises end with tests, and they must pass.
//
// Node runs `.ts` files directly by erasing the types: it removes every annotation, like
// the `: string` parts below, and runs the plain JavaScript that's left. Types don't exist
// while your code runs. TypeScript does its job before that, when it checks the file.
//
// In the terminal where tslings runs, use these keys:
//
//   h   show a hint for the current exercise
//   l   list all the exercises
//   n   move on to the next exercise, once the current one passes
//   x   reset the exercise file to its starting state (tslings asks to confirm)
//   q   quit
//
// TODO: This exercise already passes. Change the name passed to `welcome` below, save the
// file, and watch the output change. When you're ready, enter `n`.

function welcome(name: string): string {
  return `Welcome to tslings, ${name}!`;
}

const banner = [
  "  _       _ _",
  " | |_ ___| (_)_ __   __ _ ___",
  " | __/ __| | | '_ \\ / _` / __|",
  " | |_\\__ \\ | | | | | (_| \\__ \\",
  "  \\__|___/_|_|_| |_|\\__, |___/",
  "                    |___/",
];

console.log(banner.join("\n"));
console.log();
console.log(welcome("TypeScript learner"));
console.log();
console.log("This exercise type-checks and runs. The next ones don't: each one contains a type");
console.log("error or a failing test, and your job is to fix it. Read the errors carefully,");
console.log("TypeScript usually tells you exactly what's wrong.");
console.log();
console.log("The file of this exercise is `exercises/00_intro/intro1.ts`. Have a look!");
