# Changelog

All notable changes to this project are documented in this file. The project follows [Semantic Versioning](https://semver.org/); while the version is `0.x`, a minor version bump may contain breaking changes.

## 0.1.0

Initial release.

* `makeDependencyResolver` with values, factories, factories with aliases and multi-factories; a multi-factory lists its components in a `keys` tuple.
* `makeTypedProviders` for declaring providers separately from the resolver.
* Lazy singleton components, resolving several components at once, circular dependency detection.
* Type checks of all aliases: optional aliases to components of a suitable type, compile-time errors for missing aliases, aliases to a component of a wrong type or to the component itself, and keys that are not factory parameters.
* Optional factory parameters are treated as required: an optional parameter without a component is a compile-time error.
* Compile-time errors for components provided more than once, class providers, functions with several parameters, symbol provider keys, providers with both `factory` and `multiFactory`, multi-factory keys that don't match the result, may be missing in it or are listed twice, aliases that are functions or arrays, and multi-factory results that are not objects, also functions or classes.
* Compile-time errors for optional provider keys, providers objects that are arrays, functions or classes, `factory` or `multiFactory` properties that may be not a function, overloaded factories and factories that require `this`.
* A factory function can take a union parameter; a component must match every case that declares its key. A function provider is a factory even with a `factory` or `multiFactory` property.
* Runtime errors for not provided components, components provided more than once, class providers, symbol provider keys, providers or aliases objects that are not plain objects, ambiguous providers and invalid multi-factory keys or results. Members of `Object.prototype` are not provided unless a provider defines them.
* A union of providers objects, e.g. `condition ? providers1 : providers2`: only the components of every case are resolved, with unions of their types.
* Members of `Object.prototype`, e.g. `toString`, can be provided, injected, aliased and returned by a multi-factory; a factory parameter with such a name and no component is a compile-time error.
* `resolve` returns optional fields for keys that may be not requested: a key of a union type, the keys of the rest part of a tuple, or keys missing in some case of a union of tuples.
* Numeric component keys: `0` and `'0'` are the same component, resolved, injected and aliased by both forms. Symbol parameter keys of factories can be aliased.
* Union providers, e.g. `condition ? factory : value`: each case is checked, and the component type is the union of their component types. A union of functions in `factory` or `multiFactory` is checked the same way, with the aliases and the keys of the provider. The cases of a union multi-factory result are merged into unions of component types.
* The `Resolver<C>` type is exported, so that an exported resolver can be named in declarations.
* `exports` field: only the package root and `package.json` are importable.
