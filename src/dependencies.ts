import { makeCreationChain } from './creation-chain.js';
import type { Aliases, MultiFactoryProvider } from './guards.js';
import {
  assertNoSymbolKeys,
  assertPlainObject,
  assertProvidersObject,
  assertValidMultiFactoryResult,
  assertValidProvider,
  isFactory,
  isFactoryWithAliases,
  isMultiFactory,
} from './guards.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Dependencies = Record<string, any>;

const findAlias = (aliases: Aliases, key: string | symbol) => Object.hasOwn(aliases, key) ? aliases[key] : undefined;

// Makes the object that factories receive: accessing its property creates the component.
export const makeDependencies = (providers: unknown): Dependencies => {
  assertProvidersObject(providers);
  assertPlainObject(providers);
  assertNoSymbolKeys(providers);

  // Without a prototype, keys like `toString` or `constructor` are not provided unless a provider defines them.
  const componentGetters: Dependencies = Object.create(null);
  const owners = new Map<string, string>();
  const components = new Map<string, unknown>();
  const creationChain = makeCreationChain();

  // An optional alias may be `undefined`: the parameter is injected by its own name then. Other falsy aliases,
  // `''` or `0`, are component keys.
  const makeAliasedDependencies = (aliases: Aliases = {}): Dependencies => new Proxy(dependencies, {
    get: (target, key) => Reflect.get(target, findAlias(aliases, key) ?? key),
    has: (target, key) => Reflect.has(target, findAlias(aliases, key) ?? key),
  });

  const createComponent = (provider: unknown): unknown => (
    isFactory(provider) ? provider(dependencies) :
    isFactoryWithAliases(provider) ? provider.factory(makeAliasedDependencies(provider.aliases)) :
    provider
  );

  // The components are read from the result once, so a getter in the result is called once too. They are cached only
  // when all of them are read: if a getter throws, a next access calls the multi-factory again and replaces none of
  // the components already given out.
  const createMultiFactoryComponents = (key: string, provider: MultiFactoryProvider) => {
    const result = provider.multiFactory(makeAliasedDependencies(provider.aliases)) as Record<string, unknown>;
    assertValidMultiFactoryResult(key, provider.keys, result);

    const entries = provider.keys.map(componentKey => [componentKey, result[componentKey]] as const);

    for (const [componentKey, component] of entries) {
      components.set(componentKey, component);
    }
  };

  const makeComponentGetter = (key: string, provider: unknown) => (): unknown => {
    if (!components.has(key)) {
      creationChain.track(key, () => components.set(key, createComponent(provider)));
    }

    return components.get(key);
  };

  const makeMultiFactoryComponentGetter = (componentKey: string, key: string, provider: MultiFactoryProvider) =>
    (): unknown => {
      if (!components.has(componentKey)) {
        creationChain.track(key, () => createMultiFactoryComponents(key, provider));
      }

      return components.get(componentKey);
    };

  const defineComponent = (componentKey: string, owner: string, get: () => unknown) => {
    const otherOwner = owners.get(componentKey);

    if (otherOwner !== undefined) {
      throw new Error(`Component "${componentKey}" is provided by both "${otherOwner}" and "${owner}"`);
    }

    owners.set(componentKey, owner);
    Object.defineProperty(componentGetters, componentKey, { get, configurable: false, enumerable: false });
  };

  const makeNotProvidedError = (key: string): Error => {
    const requiredBy = creationChain.isEmpty() ? '' : `, required by ${creationChain.format()}`;

    return new Error(`Component "${key}" is not provided${requiredBy}`);
  };

  // Symbol keys are passed through, so that inspecting the dependencies object doesn't throw.
  const dependencies: Dependencies = new Proxy(componentGetters, {
    get: (target, key) => {
      if (typeof key === 'symbol' || key in target) {
        return Reflect.get(target, key);
      }

      throw makeNotProvidedError(key);
    },
  });

  // Non-enumerable providers are registered too: the types don't tell them from enumerable ones.
  for (const key of Object.getOwnPropertyNames(providers)) {
    const provider: unknown = Reflect.get(providers, key);

    assertValidProvider(key, provider);

    if (isMultiFactory(provider)) {
      for (const componentKey of provider.keys) {
        defineComponent(componentKey, key, makeMultiFactoryComponentGetter(componentKey, key, provider));
      }
    } else {
      defineComponent(key, key, makeComponentGetter(key, provider));
    }
  }

  return dependencies;
};
