const user = { firstName: "Ada", lastName: "Lovelace" };

// TypeScript inferred the type `{ firstName: string; lastName: string }` from the object,
// so it knew `fristName` was a typo and suggested `firstName`.
console.log(`Hello, ${user.firstName}!`);
