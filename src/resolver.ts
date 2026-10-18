import type { Dependencies } from './dependencies.js';
import { makeDependencies } from './dependencies.js';
import type {
  CanonicalKey, ComponentTypes, Providers, ProvidersObject, ResolvedComponents, ResolverKey, ValueOf,
} from './types.js';

// Exported, so that the type of a resolver can be named in the declarations of the consumer's modules.
// A numeric key can be passed in both forms: `0` or `'0'`. `C` may be not canonical, e.g. `Record<'0', V>`,
// so the component is found by both forms of the key.
// `out`: the variance of `C` can't be measured through the overloads, and the signatures would be compared loosely,
// so that a resolver of `{ a: number }` could be assigned to `Resolver<{ a: string }>`.
export type Resolver<out C> = {
  <K extends ResolverKey<C>>(key: K): ValueOf<C, CanonicalKey<K>>;
  <const Keys extends readonly [ResolverKey<C>, ResolverKey<C>, ...ResolverKey<C>[]]>(
    ...keys: Keys
  ): ResolvedComponents<C, Keys>;
};

// Arrays, functions and classes are rejected in the parameter type: a conditional type in the constraint would be
// circular.
export const makeTypedProviders = <const T extends object & Providers<T>>(
  providers: T & ProvidersObject<T>,
): T => providers;

export const makeDependencyResolver = <const T extends object & Providers<T>>(
  providers: T & ProvidersObject<T>,
): Resolver<ComponentTypes<T>> =>
  makeResolver<ComponentTypes<T>>(makeDependencies(providers));

// `dependencies` is dropped on the first call: it forbids repeated calls and lets the components be garbage collected.
const makeResolver = <C>(dependencies: Dependencies | undefined): Resolver<C> => {
  const resolve = (keys: string[]): unknown => {
    if (dependencies === undefined) {
      throw new Error('Repeated resolve calls are not allowed.');
    }

    // Checked before `dependencies` is dropped, so that the call can be repeated with keys.
    if (keys.length === 0) {
      throw new Error('At least one key must be passed to resolve.');
    }

    const target = dependencies;
    dependencies = undefined;

    return keys.length === 1
      ? target[keys[0]]
      : Object.fromEntries(keys.map(key => [key, target[key]]));
  };

  return ((...keys: string[]) => resolve(keys)) as Resolver<C>;
};
