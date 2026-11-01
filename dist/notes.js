// Plain-English explanations for the TypeScript errors learners hit most.
//
// TypeScript's messages are precise but terse. These notes play the role of
// rustc's `help:` lines: they say what usually causes the error and how to fix
// it. Exercises can override a note for one exercise with `error_notes` in
// `info.toml`, keyed by the error code and optionally by a part of the message:
//
//   [exercises.error_notes]
//   TS2339 = "..."            # any TS2339
//   "TS2339 'radius'" = "..." # only a TS2339 whose message contains `radius`
const NOTES = {
    TS1005: "The parser expected a specific token here, often a missing bracket, comma or semicolon just before this spot.",
    TS1294: "Node runs TypeScript by erasing the types, so syntax that generates JavaScript (`enum`, `namespace`, constructor parameter properties) isn't allowed. Use a union of literals, an `as const` object, plain modules, or explicit class fields instead.",
    TS1484: "With `verbatimModuleSyntax`, imports that only bring in types must say so: write `import type { Name } from ...` (or `import { type Name } from ...`). The import is then erased before Node runs the file.",
    TS2304: "TypeScript can't find anything with this name in scope. Check the spelling, and whether it needs to be declared or imported first.",
    TS2307: "TypeScript can't find this module. Check the path, and that relative imports end in `.ts`.",
    TS2322: "The value on the right doesn't fit the type on the left. Read the message from the end: it names the exact property or member that doesn't match.",
    TS2339: "This property doesn't exist on the type TypeScript sees. If the value is a union, the property must exist on every member: narrow it first (with `typeof`, `in`, or a discriminant check). If its type is a type parameter like `T`, say what `T` must have where it's declared: `<T extends { id: string }>`.",
    TS2344: "A type argument doesn't satisfy its constraint. In tslings, `Expect<Equal<A, B>>` reports this when `A` (found) isn't exactly the same type as `B` (expected): compare them carefully.",
    TS2345: "The argument doesn't match what the function accepts. Check the value you pass, or, if you wrote the function, its parameter type.",
    TS2349: "You're calling something that isn't a function, or a union where not every member is callable.",
    TS2355: "A function whose declared return type isn't `void` or `any` must return a value on every path.",
    TS2366: "Some code path of this function ends without a `return`. Add the missing case, or make the last branch exhaustive.",
    TS2367: "This comparison can never be true: the two types have nothing in common. Often a typo in a string literal, or a check TypeScript has already ruled out.",
    TS2393: "Two functions with the same name. Overloads are written as several signatures without bodies, followed by one implementation.",
    TS2416: "A class member doesn't match the type it has in the base class or interface it implements.",
    TS2420: "The class says it `implements` an interface but is missing members, or has members with the wrong type.",
    TS2448: "The variable is used before the line that declares it. `let` and `const` are not hoisted like `var`.",
    TS2454: "TypeScript can't prove the variable has a value here: some path reaches this line without assigning it. Give it a value where it's declared, or assign it in every branch (a missing `else` or `default` is the usual cause).",
    TS2531: "The value might be `null`. Check it first (`if (value !== null)`), or use `?.` and `??`.",
    TS2532: "The value might be `undefined`. Check it first, or use `?.` and `??`. With `noUncheckedIndexedAccess`, reading `array[i]` or `record[key]` can also be `undefined`.",
    TS2533: "The value might be `null` or `undefined`. Check it first, or use `?.` and `??`.",
    TS2540: "This property is `readonly`. Create a new object with the change (`{ ...old, key: value }`) instead of mutating.",
    TS2515: "A class that extends an abstract class must implement each of its `abstract` members. Add the missing member with the same signature, or mark this class `abstract` too.",
    TS2551: "This property doesn't exist on the type, and TypeScript suggests a similar name. The name may be misspelled, or the type doesn't have this property yet: check where the type is declared.",
    TS2552: "TypeScript can't find this name and suggests a similar one. The name may be misspelled, or what it names isn't declared or imported yet.",
    TS2554: "The function is called with the wrong number of arguments. Check its signature: optional parameters end with `?` or have a default value.",
    TS2556: "Spreading an array into a call only works if TypeScript knows its exact length. A tuple type (or `as const`) fixes this.",
    TS2561: "This property isn't part of the object's type, and TypeScript suggests a similar name. The name may be misspelled, or the type doesn't have this property yet: check where the type is declared.",
    TS2564: "Give the field a value where it's declared or in the constructor. If it can really be missing, make it optional (`name?: string`) and check it before use.",
    TS2588: "`const` bindings can't be reassigned. Use `let` if the value really changes, or build a new value instead.",
    TS2589: "The type recurses too deeply. Recursive types need a base case that stops the recursion.",
    TS2741: "An object is missing a property that its type requires. Add it, or make it optional with `?` in the type.",
    TS2769: "None of the overloads of this function accept these arguments. The error lists the closest overload and why it failed.",
    TS2739: "The object is missing several required properties of the target type.",
    TS2353: "Object literals may only list known properties. This catches typos in property names: check the spelling against the type.",
    TS2365: "This operator can't be applied to these types, for example `+` between a number and an object.",
    TS2362: "The left side of an arithmetic operation must be a `number`, `bigint` or an enum.",
    TS2363: "The right side of an arithmetic operation must be a `number`, `bigint` or an enum.",
    TS2375: "With `exactOptionalPropertyTypes`, an optional property can be left out, but not set to `undefined` explicitly. Either omit it, or add `| undefined` to its type.",
    TS2379: "With `exactOptionalPropertyTypes`, passing `undefined` for an optional property isn't the same as leaving it out.",
    TS2653: "A class that extends an abstract class must implement each of its `abstract` members. Add the missing member with the same signature.",
    TS2654: "A class that extends an abstract class must implement each of its `abstract` members. Add the missing members with the same signatures, or mark this class `abstract` too.",
    TS2677: "A type predicate's type must be assignable to its parameter's type.",
    TS2683: "`this` has type `any` here. Use an arrow function, or declare `this` as the first parameter of the function.",
    TS2698: "Only object types can be spread with `...`.",
    TS2763: "Iterating with `for await` needs an async iterable.",
    TS2774: "This condition is always true because the function exists. Did you mean to call it?",
    TS2775: "Assertion functions need an explicit type annotation where they're declared.",
    TS2801: "This condition always passes because a Promise is always truthy. Did you forget `await`?",
    TS2835: "Relative imports need the file extension. Node runs the `.ts` files directly, so write `./money.ts`, not `./money.js` or `./money`.",
    TS4113: "`override` says this member replaces one of the base class, but the base class has no member with this name. Remove `override` if it's a new member, or fix the name.",
    TS4114: "This member overrides a member of the base class, so it must be marked with the `override` keyword.",
    TS4117: "`override` says this member replaces one of the base class, but the base class has no member with this name. TypeScript suggests a similar one: the name is probably misspelled.",
    TS7006: "This parameter has no type, so TypeScript would silently treat it as `any`. Annotate it, unless its type should come from elsewhere: a callback gets its parameter types from the function it's passed to, so that function may be what needs fixing.",
    TS7031: "This destructured property has no type. Annotate the whole object pattern: `({ a, b }: { a: string; b: number })`.",
    TS7053: "TypeScript can't prove this key exists on the object. Narrow the key to `keyof typeof obj`, or give the object an index signature or `Record` type.",
    TS18046: "The value has type `unknown`: TypeScript knows nothing about it, so it won't let you use it yet. Narrow it first with `typeof`, `instanceof`, `in`, or a type guard.",
    TS18047: "The value might be `null`. Check it first, or use `?.` and `??`.",
    TS18048: "The value might be `undefined`. Check it first, or use `?.` and `??`. With `noUncheckedIndexedAccess`, reading `array[i]` or `record[key]` can be `undefined`.",
    TS18049: "The value might be `null` or `undefined`. Check it first, or use `?.` and `??`.",
};
export function noteFor(code) {
    const note = NOTES[code];
    return note === undefined || note === "" ? undefined : note;
}
/**
 * Split an `error_notes` key into its code and its message filter. Returns
 * `undefined` for a malformed key: an empty code or filter.
 *
 * A filter wrapped in matching quotes (`TS2339 'all'`) has them removed. Any
 * other filter is taken literally, so `TS2339 'radius' does not` matches
 * messages containing `'radius' does not`, quotes included.
 */
export function parseNoteKey(key) {
    const space = key.indexOf(" ");
    if (space === -1)
        return key === "" ? undefined : { code: key, filter: undefined };
    const code = key.slice(0, space);
    let filter = key.slice(space + 1).trim();
    const quote = filter[0];
    if ((quote === "'" || quote === '"') && filter.length >= 2 && filter.endsWith(quote)) {
        filter = filter.slice(1, -1);
    }
    return code === "" || filter === "" ? undefined : { code, filter };
}
/**
 * The exercise's note for a problem, from its `error_notes`. A key with a
 * message filter wins over the plain code, and a longer filter over a shorter
 * one: the more specific note is the more helpful.
 */
export function exerciseNoteFor(notes, problem) {
    if (notes === undefined)
        return undefined;
    const text = [problem.message, ...problem.details].join("\n");
    let best;
    for (const [key, note] of Object.entries(notes)) {
        const parsed = parseNoteKey(key);
        if (parsed === undefined || parsed.code !== problem.code)
            continue;
        if (parsed.filter !== undefined && !text.includes(parsed.filter))
            continue;
        const specificity = parsed.filter === undefined ? -1 : parsed.filter.length;
        if (best === undefined || specificity > best.specificity)
            best = { note, specificity };
    }
    return best?.note;
}
