// TypeScript checks your code before it runs. In plain JavaScript, this file would run
// and print "Hello, undefined!", and you'd have to spot the bug yourself.
//
// TypeScript knows which properties `user` has, so it refuses code that reads one that
// doesn't exist, and it suggests what you probably meant.
//
// TODO: Read the error tslings shows, then fix the code.

const user = { firstName: "Ada", lastName: "Lovelace" };

console.log(`Hello, ${user.fristName}!`);
