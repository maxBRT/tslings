# Collections

JavaScript has two built-in collections besides arrays: `Map<K, V>`, a
dictionary whose keys can be of any type, and `Set<T>`, a group of unique
values. TypeScript gives both type parameters. Supply them when a collection
starts empty, since there's nothing to infer them from: `new Map<string, number>()`.

Plain objects can be dictionaries too, typed `Record<K, V>`. The usual split:
a `Record` when the keys are known in advance (a union of literal types), a
`Map` when the keys come from data. Reading a `Map` always gives `V | undefined`,
and so does reading a group from `Object.groupBy`: expect to handle missing
keys everywhere in this chapter.

Recent JavaScript versions added handy tools that TypeScript knows about:
`Object.groupBy` and `Map.groupBy` (ES2024), and set operations like
`union` and `intersection` (ES2025). Node 24 has them all.

## Further information

- [`Map`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map)
- [`Set` and its composition methods](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Set)
- [`Object.groupBy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/groupBy)
- [`Map.groupBy`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Map/groupBy)
- [`Object.entries`](https://developer.mozilla.org/en-US/docs/Web/JavaScript/Reference/Global_Objects/Object/entries)
- [`Record<Keys, Type>`](https://www.typescriptlang.org/docs/handbook/utility-types.html#recordkeys-type)
- [Why `Object.keys` returns `string[]` (Anders Hejlsberg on GitHub)](https://github.com/microsoft/TypeScript/pull/12253#issuecomment-263132208)
