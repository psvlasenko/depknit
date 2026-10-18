# depknit

A simple, lightweight, and type-safe dependency injection library.

## Features

* **Injection via factory parameters:** A factory receives its dependencies as an object and destructures them: `({ dep1, dep2 }) => component`. No decorators, classes or tokens.
* **Aliases:** A factory parameter can receive a component with a different name.
* **Multi-factories:** One factory can provide several components at once.
* **Singletons:** Each component is created at most once per resolver.
* **Lazy creation:** Factories of components that are not needed for the requested ones are not called.
* **Resolving several components in one call:** `resolve('a', 'b')` returns `{ a, b }`.
* **Type safety:** The types of factory parameters, aliases and multi-factory keys are checked against the provided components; missing components, duplicate components, class providers and functions with several parameters are compile-time errors.
* **Circular dependency detection:** A cycle throws an error with the dependency chain, e.g. `Circular dependency: a -> b -> a`.

## Installation

```sh
npm install depknit
```

## Requirements

* Node.js `>=22`. The package has no runtime dependencies and uses no Node.js-specific APIs, so it also works via a bundler in browsers supporting ES2022.
* The package is published as an ES module only (`import`). Node.js `>=22.12` can also load it with `require()`.
* TypeScript declarations are included. TypeScript `>=5.4` is required for `import`. A CommonJS module can `require()` the package with TypeScript `>=5.8` and `"module": "NodeNext"`: with `"module": "Node16"`, the import is an error ([TypeScript 5.8 release notes](https://www.typescriptlang.org/docs/handbook/release-notes/typescript-5-8.html)).
* The type checks require `strict` (at least `strictFunctionTypes`) in `tsconfig.json`. Without it, a missing alias is not reported, and accessing the missing component throws at runtime.

## Usage example

```typescript
import assert from 'node:assert';
import { makeDependencyResolver } from 'depknit';

const configSymbol = Symbol('config symbol');
const userServiceSymbol = Symbol('user service');
const nameServiceSymbol = Symbol('name service');
const idServiceSymbol = Symbol('id service');

type Config = { kind: typeof configSymbol };
type NameService = { kind: typeof nameServiceSymbol };
type IdService = { kind: typeof idServiceSymbol };

type UserService = {
  kind: typeof userServiceSymbol;
  getConfig: () => Config;
  getIdService: () => IdService;
  getNameService: () => NameService;
};

type UserServiceParams = {
  config: Config;
  names: NameService;
  idService: IdService;
};

const createUserService = ({ names, idService, config }: UserServiceParams): UserService => ({
  kind: userServiceSymbol,
  getConfig: () => config,
  getIdService: () => idService,
  getNameService: () => names,
});

const createNameService = (): NameService => ({ kind: nameServiceSymbol });
const createIdService = (): IdService => ({ kind: idServiceSymbol });

const config: Config = { kind: configSymbol };

const resolve = makeDependencyResolver({
  config, // value
  nameService: createNameService, // factory
  idService: createIdService, // factory
  userService: { // factory with aliases
    factory: createUserService,
    aliases: {
      names: 'nameService', // the parameter `names` receives the component `nameService`
    },
  },
});

const userService = resolve('userService');

assert.equal(userService.kind, userServiceSymbol);
assert.equal(userService.getIdService().kind, idServiceSymbol);
assert.equal(userService.getNameService().kind, nameServiceSymbol);
assert.equal(userService.getConfig().kind, configSymbol);
```

### Multi-factory example

```typescript
import assert from 'node:assert';
import { makeDependencyResolver } from 'depknit';

type Db = { query: (sql: string) => string[] };
type UserRepository = { findNames: () => string[] };
type OrderRepository = { count: () => number };
type Repositories = { userRepository: UserRepository; orderRepository: OrderRepository };

type ReportServiceParams = { userRepository: UserRepository; orderRepository: OrderRepository };
type ReportService = { summary: () => string };

const createDb = (): Db => ({ query: sql => [`row from: ${sql}`] });

// One multi-factory provides two components, `userRepository` and `orderRepository`.
const createRepositories = ({ database }: { database: Db }): Repositories => ({
  userRepository: { findNames: () => database.query('select name from users') },
  orderRepository: { count: () => database.query('select id from orders').length },
});

// Components of a multi-factory are injected by their own names like any other component.
const createReportService = ({ userRepository, orderRepository }: ReportServiceParams): ReportService => ({
  summary: () => `${userRepository.findNames().length} users, ${orderRepository.count()} orders`,
});

const resolve = makeDependencyResolver({
  db: createDb,
  repositories: { // multi-factory with aliases
    multiFactory: createRepositories,
    keys: ['userRepository', 'orderRepository'], // the components it provides
    aliases: {
      database: 'db',
    },
  },
  reportService: createReportService,
});

const { reportService, userRepository } = resolve('reportService', 'userRepository');

assert.equal(reportService.summary(), '1 users, 1 orders');
assert.deepEqual(userRepository.findNames(), ['row from: select name from users']);
```

## API

The package exports two functions, `makeDependencyResolver` and `makeTypedProviders`, and the type `Resolver<C>` of the `resolve` function, e.g. to annotate an exported resolver.

### `makeDependencyResolver(providers)`

Takes an object whose keys are component names and values are providers, and returns a `resolve` function.

A provider is one of:

| Provider | Example | Description |
| --- | --- | --- |
| Value | `config: { port: 80 }` | Used as is. |
| Factory | `idService: createIdService` | Called once with the [dependencies object](#dependencies-object). |
| Factory with aliases | `userService: { factory, aliases: { paramKey: 'componentKey' } }` | The factory parameter `paramKey` receives the component `componentKey`. The parameters that are not aliased are injected by their own names. |
| Multi-factory | `repositories: { multiFactory, keys, aliases? }` | Returns an object; each of its `keys` becomes a separate component. See [details](#multi-factory-provider). |

#### What is a value

Any function is treated as a factory, even when it has a `factory` or `multiFactory` property. Any other object with a `factory` or `multiFactory` function property is treated as a provider of the corresponding kind; an object with both is an error. A `factory` or `multiFactory` property that may be a function or not, e.g. an optional one or `(() => T) | undefined`, is a compile-time error: the kind of the provider would depend on the value. A class is not a provider: it is a compile-time error, and `makeDependencyResolver` throws. A function with more than one required parameter is not a factory either: it is a compile-time error. A factory that requires `this`, e.g. `function (this: Config, deps) {}`, is a compile-time error: the runtime doesn't pass it. An overloaded factory is a compile-time error too ([with a limitation](#limitations)): its result type would be taken from the last signature, while the runtime may match another one. Wrap such values in a factory:

```typescript
const resolve = makeDependencyResolver({
  config,
  log: () => logFn, // the component is the function `logFn`
  add: () => (a: number, b: number) => a + b, // the component is the function
  userService: ({ config }: { config: Config }) => new UserService(config), // an instance of the class
  options: () => ({ factory: 'not a provider' }), // the component is the object itself
});
```

Provider keys must be strings: a symbol key is a compile-time error, and `makeDependencyResolver` throws. The providers must be a plain object, e.g. an object literal, an object without a prototype or a module namespace object (`import * as providers`). `null`, a primitive, an array, a function or a class is a compile-time error and throws as well. The prototype of the providers must be `Object.prototype` or `null`: otherwise, e.g. for an instance of a class or an object from another realm (`node:vm`, an iframe), `makeDependencyResolver` throws, because inherited members, e.g. methods, are not registered as providers. Non-enumerable own properties are registered; non-enumerable symbol keys, e.g. `Symbol.toStringTag` of a module namespace object, are ignored.

A provider key can't be optional, e.g. `port?: number` in the type of the providers: it is a compile-time error, because the provider may be missing at runtime. A key whose value may be `undefined`, `port: number | undefined`, is allowed.

A provider can be a union, e.g. `condition ? createService : value`: each case is checked, and the component type is the union of their component types. A union of a multi-factory with a provider of another kind is a compile-time error, because it is unknown which components it provides. The providers object can be a union too, e.g. `condition ? providers1 : providers2`: each case is checked, and only the components provided by every case can be resolved, with the union of their types.

Values are inferred as `const`, so an array value has a readonly tuple type. Declare array parameters of factories as `readonly string[]` or annotate the value: `hosts: ['a', 'b'] as string[]`.

#### Dependencies object

A factory receives an object that creates components on access. Destructure it in the factory parameter: it can't be spread or enumerated (`{ ...deps }` and `Object.keys(deps)` are empty). The `in` operator tells whether a component is provided, also through an alias. Accessing a component that is not provided throws an error, also for the members of `Object.prototype`, e.g. `constructor` or `toString`; a provider with such a name is allowed. A factory parameter with such a name and no component is a compile-time error.

#### Aliases

A factory parameter that doesn't match any component of a suitable type requires an alias. Without it, the factory is a type error, for example:

```text
Type '({ ids }: { ids: IdService; }) => UserService' is not assignable to type '(providers: {}) => UserService'.
  Types of parameters '__0' and 'providers' are incompatible.
    Property 'ids' is missing in type '{}' but required in type '{ ids: IdService; }'.
```

To fix it, turn the factory into a factory with aliases: `userService: { factory: createUserService, aliases: { ids: 'idService' } }`. An alias can refer to any component of a suitable type except the one being created.

An alias is also allowed for a parameter that matches a component by name, to inject another component of a suitable type instead:

```typescript
const resolve = makeDependencyResolver({
  idService: createIdService,
  testIdService: createTestIdService,
  userService: {
    factory: createUserService, // ({ idService }: { idService: IdService }) => UserService
    aliases: {
      idService: 'testIdService',
    },
  },
});
```

The `aliases` field can be omitted when no alias is required. An alias that is not required may be optional in the provider type, e.g. `aliases?: { count?: 'otherCount' }`: when it is missing or `undefined`, the parameter is injected by its own name; such an alias may be `undefined` without `?` as well. Every alias is type checked: an alias to a component of a wrong type, or a key that is not a parameter of the factory, is a compile-time error. A parameter with a symbol key, e.g. `{ [token]: number }`, can receive a component only through an alias: `aliases: { [token]: 'value' }`. The aliases must be a plain object, like the providers: a function or an array is a compile-time error, and for an instance of a class `makeDependencyResolver` throws, because inherited aliases, e.g. getters, are not seen.

#### Optional parameters

Optional factory parameters are treated as required: a component is injected into them like into any other parameter. An optional parameter without a component is a compile-time error, also when the dependencies parameter has a default value, e.g. `({ port = 8080 }: { port?: number } = {}) => ...`. Wrap the factory to omit the parameter, or provide the value explicitly:

```typescript
type UrlParams = { port: number; host?: string };
const createUrl = ({ port, host = 'localhost' }: UrlParams) => `${host}:${port}`;

const resolve = makeDependencyResolver({
  port: 8080,
  url: ({ port }: { port: number }) => createUrl({ port }), // or `host: undefined as string | undefined`
});
```

#### Union parameters

A factory function can take a union parameter, e.g. `(deps: { count: number } | { name: string }) => ...`: it receives the components of the keys of all cases, and at least one case must be provided. The factory may choose a case by a key, `'name' in deps`, so a component must match every case that declares its key. A factory with aliases and a multi-factory can't take a union parameter: wrap the factory. A union of functions, e.g. `{ factory: condition ? createA : createB, aliases }`, is checked like a union of providers: each function with the same aliases, so an alias must be a parameter of every function. The property with a function is the maker, like at runtime: in `{ factory: 'metadata', multiFactory: condition ? createA : createB, keys }` it's `multiFactory`.

#### Multi-factory provider

A multi-factory returns an object, and `keys` lists the components it provides: each of them becomes a separate component. The multi-factory key itself (`repositories` in the example) can't be resolved. A multi-factory is called once, and only when one of its components is needed. A multi-factory can't depend on its own components.

`keys` must list exactly the keys of the returned object: a missing, an extra or a duplicate key is a compile-time error, and a mismatch with the actual result throws at runtime. The components must be own properties of the result: an inherited one, e.g. a getter of a class, is not seen. The result must always have all of them: a result type with optional properties, or a union of objects with different keys, is a compile-time error. `keys` must have a tuple type without optional or rest elements: an array type, e.g. `('a' | 'b')[]` or `string[]`, doesn't tell which components are provided and is a compile-time error. A numeric key of the result, e.g. `{ 0: value }`, is listed as a string, `keys: ['0']`, and `0` and `'0'` are the same component: it can be resolved, injected and aliased by both forms, and a resolved object has the numeric key. Each element must be a single key: in `keys: [key]` with `key: 'a' | 'b'` or `key: string` only one key is listed, so a key of the result may be missing. When a multi-factory provider is declared outside the `makeDependencyResolver` call, declare its `keys` `as const`, or use [`makeTypedProviders`](#maketypedprovidersproviders).

The cases of a union result are merged: `{ value: number } | { value: string }` provides the component `value` of the type `number | string`. The result must be an object with string keys: `null`, a promise, an array or a function is a compile-time error and throws at runtime. A component named `then` is allowed. Each component is read from the result once, so a getter in the result is called once too. The components are cached only when all of them are read: if a getter throws, the next access to a component calls the multi-factory again.

Each component must be provided once. A key listed by a multi-factory that is also provided by another provider is a compile-time error, and `makeDependencyResolver` throws.

### `resolve(...keys)`

* `resolve('a')` returns the component `a`.
* `resolve('a', 'b')` returns an object `{ a, b }`.

At least one key is required: `resolve()` is a compile-time error and throws without using up the call. A key of a union type, e.g. `key: 'a' | 'b'` in `resolve(key, 'c')`, gives optional fields `a` and `b` in the result: only one of them is resolved. A key of a wide type, e.g. `key: string`, gives an optional index signature, while the literal keys passed next to it stay required. The keys of the rest part of a tuple, e.g. `...keys` of the type `['a', 'b', ...'c'[]]`, give optional fields too, as well as keys missing in some case of a union of tuples, e.g. `b` and `c` for `['a', 'b'] | ['a', 'c']`.

Only the requested components and their dependencies are created. `resolve` can be called only once: the repeated call throws an error, so request all the needed components in one call at the composition root.

### `makeTypedProviders(providers)`

Returns `providers` unchanged and applies the same type checks as `makeDependencyResolver`. Use it to declare providers separately from the resolver:

```typescript
import { makeDependencyResolver, makeTypedProviders } from 'depknit';

const providers = makeTypedProviders({
  port: 8080,
  server: ({ port }: { port: number }) => ({ url: `http://localhost:${port}` }),
});

const resolve = makeDependencyResolver(providers);
const server = resolve('server');
```

The providers must be complete: a factory can depend only on components declared in the same call.

### Errors

| Error message | Cause |
| --- | --- |
| `Circular dependency: a -> b -> a` | The components depend on each other. |
| `Component "x" is not provided, required by a -> b` | A factory or an alias refers to a missing component, or `resolve` is called with a missing key, e.g. `toString`. |
| `Component "x" is provided by both "m1" and "m2"` | Two providers provide the same component. |
| `Provider "x" is a class. Wrap it in a factory: deps => new Class(deps)` | A class is used as a provider. |
| `Provider "x" has both "factory" and "multiFactory"` | The provider form is ambiguous. |
| `Multi-factory "m" must list the keys of its components in "keys"` | `keys` is missing or is not an array of strings. |
| `Multi-factory "m" lists the key "x" more than once` | `keys` contains a duplicate. |
| `Multi-factory "m" must return an object, got null` | The result is `null`, a promise, an array, a function or a primitive. |
| `Multi-factory "m" returned the symbol key Symbol(x). Component keys must be strings` | The result has a symbol key. |
| `Multi-factory "m" didn't return the component "x" listed in "keys"` | A listed key is missing in the result or is not its own property. |
| `Multi-factory "m" returned the component "x" that is not listed in "keys"` | The result has a key that is not listed. |
| `Provider key Symbol(x) is a symbol. Provider keys must be strings` | A symbol is used as a provider key. |
| `Providers must be an object, got null` | The providers are `null`, a primitive, an array, a function or a class. |
| `Providers must be a plain object, inherited providers are not supported` | The prototype of the providers is not `Object.prototype` or `null`, e.g. of an instance of a class. |
| `Aliases of provider "x" must be a plain object, inherited aliases are not supported` | The aliases are not an object, or their prototype is not `Object.prototype` or `null`. |
| `Repeated resolve calls are not allowed.` | `resolve` is called more than once. |
| `At least one key must be passed to resolve.` | `resolve` is called without keys. |

An error thrown by a factory is propagated as is.

## Limitations

* Provider detection reads the `factory` and `multiFactory` properties of object values. A proxy that returns functions for arbitrary properties or throws on unknown properties may be mistaken for a provider or fail during registration. Wrap such values in a factory: `client: () => client`.
* Factories are synchronous. An `async` factory makes a component a `Promise`; create asynchronous resources before calling `makeDependencyResolver` and pass them as values.
* There are no scopes or disposal: each resolver creates its own set of singletons.
* Overloaded factories are found by their last four signatures: an incompatible overload followed by four identical signatures is not reported.
* A method provider that uses `this` without declaring it, e.g. `url() { return this.port; }` in the providers object, is not reported: its type has no `this` parameter. The runtime calls it without `this`; use a factory parameter instead.
* A factory parameter with an index signature, e.g. `Record<string, number>`, allows reading any key, so a missing component is not reported.

## Development

```sh
npm ci
npm run lint
npm test      # build src/ to dist/ and run tests from dist/
npm run build # build only
```

## Versioning

The package follows [Semantic Versioning](https://semver.org/). While the version is `0.x`, a minor version bump (`0.1.0` → `0.2.0`) may contain breaking changes, and a patch version bump contains only backward-compatible fixes and features. See [CHANGELOG.md](CHANGELOG.md).

## License

[MIT](LICENSE) © Pavel Vlasenko
