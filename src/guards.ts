import type { Factory } from './types.js';

// Numeric component keys, e.g. `0`, can be aliases too, and a parameter key may be a symbol.
export type Aliases = Record<PropertyKey, string | number | undefined>;
export type FactoryWithAliasesProvider = { factory: Factory; aliases?: Aliases };
export type MultiFactoryProvider = { multiFactory: Factory; keys: readonly string[]; aliases?: Aliases };

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
const isFunction = (value: unknown): value is Function => typeof value === 'function';

const isObject = (value: unknown): value is Record<string, unknown> => typeof value === 'object' && value !== null;

// Native and bound classes can't be detected: their source text doesn't start with `class`.
const isClass = (value: unknown): boolean =>
  isFunction(value) && /^class\b/.test(Function.prototype.toString.call(value));

export const isFactory = (value: unknown): value is Factory => isFunction(value);

export const isFactoryWithAliases = (value: unknown): value is FactoryWithAliasesProvider =>
  isObject(value) && isFunction(value.factory);

export const isMultiFactory = (value: unknown): value is MultiFactoryProvider =>
  isObject(value) && isFunction(value.multiFactory);

export const assertProvidersObject: (providers: unknown) => asserts providers is object = (providers) => {
  if (!isObject(providers) || Array.isArray(providers)) {
    throw new Error(`Providers must be an object, got ${describeValue(providers)}`);
  }
};

// The prototype must be `Object.prototype` of this realm or `null`, e.g. of a module namespace object.
const isPlainObject = (value: object): boolean => {
  const prototype: unknown = Object.getPrototypeOf(value);

  return prototype === null || prototype === Object.prototype;
};

// Inherited providers, e.g. methods of a class instance, are not supported: the types don't tell them from own ones.
export const assertPlainObject = (providers: object) => {
  if (!isPlainObject(providers)) {
    throw new Error('Providers must be a plain object, inherited providers are not supported');
  }
};

// Non-enumerable symbol keys are ignored: they are not providers, e.g. `Symbol.toStringTag` of a module namespace
// object. The types report any symbol key.
export const assertNoSymbolKeys = (providers: object) => {
  const symbol = Object.getOwnPropertySymbols(providers)
    .find(key => Object.prototype.propertyIsEnumerable.call(providers, key));

  if (symbol !== undefined) {
    throw new Error(`Provider key ${String(symbol)} is a symbol. Provider keys must be strings`);
  }
};

export const assertValidProvider = (key: string, provider: unknown) => {
  const makers = isObject(provider) ? [provider.factory, provider.multiFactory] : [provider];

  if (makers.some(isClass)) {
    throw new Error(`Provider "${key}" is a class. Wrap it in a factory: deps => new Class(deps)`);
  }

  if (isFactoryWithAliases(provider) && isMultiFactory(provider)) {
    throw new Error(`Provider "${key}" has both "factory" and "multiFactory"`);
  }

  if (isMultiFactory(provider)) {
    assertValidKeys(key, provider.keys);
  }

  if (isFactoryWithAliases(provider) || isMultiFactory(provider)) {
    assertValidAliases(key, provider.aliases);
  }
};

// Inherited aliases, e.g. getters of a class instance, are not supported, like inherited providers: looking them up
// in the prototype chain would find members of `Object.prototype` of another realm.
const assertValidAliases = (key: string, aliases: unknown) => {
  if (aliases !== undefined && (!isObject(aliases) || !isPlainObject(aliases))) {
    throw new Error(`Aliases of provider "${key}" must be a plain object, inherited aliases are not supported`);
  }
};

const assertValidKeys = (key: string, keys: unknown) => {
  if (!Array.isArray(keys) || !keys.every(k => typeof k === 'string')) {
    throw new Error(`Multi-factory "${key}" must list the keys of its components in "keys"`);
  }

  const duplicate = keys.find((k, index) => keys.indexOf(k) !== index);

  if (duplicate !== undefined) {
    throw new Error(`Multi-factory "${key}" lists the key "${duplicate}" more than once`);
  }
};

const describeValue = (value: unknown): string => {
  return (
    value === null ? 'null' :
    Array.isArray(value) ? 'an array' :
    value instanceof Promise ? 'a promise' :
    typeof value
  );
};

// The result must be an object with exactly the listed keys. The checks don't call getters of the result,
// and a component named `then` is allowed: only a native promise is rejected.
export const assertValidMultiFactoryResult = (key: string, keys: readonly string[], result: unknown) => {
  if (!isObject(result) || Array.isArray(result) || result instanceof Promise) {
    throw new Error(`Multi-factory "${key}" must return an object, got ${describeValue(result)}`);
  }

  const [symbol] = Object.getOwnPropertySymbols(result);

  if (symbol !== undefined) {
    throw new Error(`Multi-factory "${key}" returned the symbol key ${String(symbol)}. Component keys must be strings`);
  }

  // An inherited property is not a component: e.g. `{ __proto__: 42 }` has the type `{ __proto__: number }`, while
  // `__proto__` is found on `Object.prototype`.
  const missing = keys.find(k => !Object.hasOwn(result, k));

  if (missing !== undefined) {
    throw new Error(`Multi-factory "${key}" didn't return the component "${missing}" listed in "keys"`);
  }

  // Non-enumerable properties are checked too: the types don't tell them from enumerable ones.
  const unlisted = Object.getOwnPropertyNames(result).find(k => !keys.includes(k));

  if (unlisted !== undefined) {
    throw new Error(`Multi-factory "${key}" returned the component "${unlisted}" that is not listed in "keys"`);
  }
};
