import type { Resolver } from '../index.js';
import type { makeDependencyResolver } from '../resolver.js';
import type { IsUnion, PickByValue, Simplify } from '../type-utils.js';
import type {
  RequiredAliases,
  ImpossibleAliases,
  ComponentTypes,
  ResolveAliases,
  PickCommonKeys,
  MultiFactoryKeysFrom,
  MultiFactoryComponentTypes,
  FactoryParams,
  Providers,
  CollidingKeys,
  WithoutCollisions,
  KeyCollisionError,
  ClassProviderError,
  OtherComponents,
  FactoryParametersError,
  SymbolKeyError,
  MultiFactoryResultError,
  SymbolComponentKeyError,
  MissingKeysError,
  DuplicateKeysError,
  AliasesObjectError,
  AmbiguousProviderError,
  OptionalParameterError,
  ResolvedComponents,
  VaryingKeysError,
  OptionalKeys,
  MixedMultiFactoryError,
  RegularComponentTypes,
  OptionalProviderError,
  UncertainMakerError,
  ProvidersObject,
  ProvidersObjectError,
  IsOverloaded,
  OverloadedFactoryError,
  ThisParameterError,
  UnionParameterError,
  UnionParameterAliasesError,
  CommonDefiniteKeys,
  GivenAliases,
  KeysTupleError,
  DefiniteKeys,
  MakerKey,
  KeyName,
  CanonicalKey,
  ValueOf,
  Alias,
  ObjectMemberParameterError,
} from '../types.js';

export type Factory<P, R = unknown> = (p: P) => R;

export type Equals<X, Y> = (<T>() => T extends X ? 1 : 2) extends (<T>() => T extends Y ? 1 : 2) ? true : false;
export type ExpectTrue<T extends true> = T;

export type Source = {
  a: 1;
  b: 2;
};

export type F = Factory<{ c: 1 }>;

export type Test1 = ExpectTrue<Equals<PickByValue<{ a: 1; b: 2 }, 1>, { a: 1 }>>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Test2 = ExpectTrue<Equals<PickByValue<{ a: 1; b: 2 }, 3>, {}>>;

export type Test3 = ExpectTrue<
  Equals<PickByValue<{ a: { c: 1; d: 2 }; b: 2 }, { c: 1 }>, { a: { c: 1; d: 2 } }>
>;

export type Test4 = ExpectTrue<Equals<
  RequiredAliases<{ a: 1; b: 2 }, { c: 1 }>,
  { c: 'a' }
>>;

export type Test5 = ExpectTrue<Equals<
  RequiredAliases<{ a: 1; b: 1 }, { c: 1 }>,
  { c: 'a' | 'b' }
>>;

export type Test6 = ExpectTrue<Equals<
  RequiredAliases<{ a: 1; b: 2 }, { a: 3 }>,
  ImpossibleAliases<'a'>
>>;

export type Test7 = ExpectTrue<Equals<
  RequiredAliases<{ a: 1; b: 2 }, { c: 3 }>,
  ImpossibleAliases<'c'>
>>;

export type Test8 = ExpectTrue<Equals<
  RequiredAliases<{ a: 1; b: 2 }, { c: 3; a: 4 }>,
  ImpossibleAliases<'c' | 'a'>
>>;

export type Test11 = ExpectTrue<Equals<
  ComponentTypes<{ a: () => 1; b: { factory: () => 2 }; c: 3; d: { multiFactory: () => { x: 4; y: 5 } } }>,
  { a: 1; b: 2; c: 3; x: 4; y: 5 }
>>;

export type Test12 = ExpectTrue<Equals<
  ResolveAliases<{ a: 'c' }, { c: 1; b: 2 }>,
  { a: 1 }
>>;

export type Test13 = ExpectTrue<Equals<
  PickCommonKeys<{ a: 1; b: 2; c: 3 }, { a: 1; b: 3 }>,
  { a: 1; b: 2 }
>>;

export type Test14 = ExpectTrue<Equals<
  MultiFactoryKeysFrom<{ a: 1; b: 2; c: { multiFactory: () => 3 } }>,
  'c'
>>;

export type Test15 = ExpectTrue<Equals<
  MultiFactoryComponentTypes<{ a: { multiFactory: () => { x: 1 } }; b: { multiFactory: () => { y: 2 } } }>,
  { x: 1; y: 2 }
>>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Test16 = ExpectTrue<Equals<FactoryParams<() => 1>, {}>>;

export type Test17 = ExpectTrue<Equals<FactoryParams<(p: { a: 1 }) => 1>, { a: 1 }>>;

export type Test18 = ExpectTrue<Equals<
  Parameters<Providers<{ m: { multiFactory: () => { x: 1; y: 2 } }; a: (p: { x: 1 }) => 3 }>['a']>[0],
  { x: 1 }
>>;

export type Test19 = ExpectTrue<Equals<
  Providers<{ m: { multiFactory: () => { x: 1 }; aliases: object } }>['m']['aliases'],
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} | undefined
>>;

export type Test20 = ExpectTrue<Equals<
  Providers<{ m: { multiFactory: (p: { x: 1 }) => { x: 1; y: 2 }; aliases: object } }>['m']['aliases'],
  ImpossibleAliases<'x'>
>>;

export type Test21 = ExpectTrue<
  { multiFactory: () => { x: 1 }; keys: readonly ['x'] } extends Providers<{
    m: { multiFactory: () => { x: 1 }; keys: readonly ['x'] };
  }>['m'] ? true : false
>;

export type Test22 = ExpectTrue<
  { factory: () => 1 } extends Providers<{ a: { factory: () => 1 } }>['a'] ? true : false
>;

export type Test23 = ExpectTrue<Equals<
  Providers<{ m: { multiFactory: (p: { x: 1 }) => { y: 2 } } }>['m']['aliases'],
  ImpossibleAliases<'x'>
>>;

// The same constraint as `makeDependencyResolver` applies to its argument.
export type IsValidProviders<P> = P extends Providers<P> ? true : false;

type SomeClass = new () => { c: 1 };
type SomeAbstractClass = abstract new () => { c: 1 };

type MultiX = { multiFactory: () => { x: 1 }; keys: readonly ['x'] };

// Key collisions

export type Test24 = ExpectTrue<Equals<CollidingKeys<{ m: MultiX; x: 2 }, 'm', { x: 1 }>, 'x'>>;

export type Test25 = ExpectTrue<Equals<
  CollidingKeys<{ m1: MultiX; m2: { multiFactory: () => { x: 2; y: 3 }; keys: readonly ['x', 'y'] } }, 'm2', { x: 2; y: 3 }>,
  'x'
>>;

export type Test26 = ExpectTrue<Equals<CollidingKeys<{ m: MultiX; y: 2 }, 'm', { x: 1 }>, never>>;

export type Test27 = ExpectTrue<Equals<CollidingKeys<{ m: MultiX; y: 2 }, 'm', Record<string, 1>>, never>>;

export type Test28 = ExpectTrue<Equals<WithoutCollisions<{ x: 1; y: 2 }, never>, { x: 1; y: 2 }>>;

export type Test29 = ExpectTrue<Equals<WithoutCollisions<{ x: 1; y: 2 }, 'x'>['x'], KeyCollisionError<'x'>>>;

export type Test30 = ExpectTrue<Equals<WithoutCollisions<{ x: 1; y: 2 }, 'x'>['y'], 2>>;

export type Test31 = ExpectTrue<Equals<
  ReturnType<Providers<{ m: MultiX; x: 2 }>['m']['multiFactory']>['x'],
  KeyCollisionError<'x'>
>>;

export type Test32 = ExpectTrue<Equals<IsValidProviders<{ m: MultiX; x: 1 }>, false>>;

export type Test33 = ExpectTrue<Equals<IsValidProviders<{ m1: MultiX; m2: MultiX }>, false>>;

// Class providers

export type Test34 = ExpectTrue<Equals<Providers<{ a: SomeClass }>['a'], ClassProviderError>>;

export type Test35 = ExpectTrue<Equals<Providers<{ a: SomeAbstractClass }>['a'], ClassProviderError>>;

export type Test36 = ExpectTrue<Equals<Providers<{ a: { factory: SomeClass } }>['a'], ClassProviderError>>;

export type Test37 = ExpectTrue<Equals<
  Providers<{ a: { multiFactory: SomeClass } }>['a'],
  ClassProviderError
>>;

// An object with a `factory` property that is not a function is a value.
export type Test38 = ExpectTrue<Equals<Providers<{ v: { factory: 'x' } }>['v'], { factory: 'x' }>>;

export type Test39 = ExpectTrue<Equals<ComponentTypes<{ v: { factory: 'x' } }>, { v: { factory: 'x' } }>>;

// Aliases

// The component being created is not offered as an alias target.
export type Test40 = ExpectTrue<Equals<
  Providers<{ a: () => number; s: { factory: (p: { id: number }) => number; aliases: { id: 'a' } } }>['s']['aliases'],
  { id: 'a' }
>>;

export type Test41 = ExpectTrue<Equals<
  IsValidProviders<{ a: () => number; s: { factory: (p: { id: number }) => number; aliases: { id: 's' } } }>,
  false
>>;

export type Test42 = ExpectTrue<Equals<
  IsValidProviders<{ a: () => number; s: (p: { id: number }) => number }>,
  false
>>;

// Valid providers are not rejected

export type Test43 = ExpectTrue<Equals<
  IsValidProviders<{
    m: { multiFactory: () => { x: number }; keys: readonly ['x'] };
    n: { multiFactory: (p: { x: number }) => { y: string }; keys: readonly ['y'] };
    z: (p: { x: number; y: string }) => boolean;
  }>,
  true
>>;

export type Test44 = ExpectTrue<Equals<
  ComponentTypes<{
    m: { multiFactory: () => { x: number } };
    n: { multiFactory: (p: { x: number }) => { y: string } };
    z: (p: { x: number; y: string }) => boolean;
  }>,
  { x: number; y: string; z: boolean }
>>;

// Keys that are not a tuple don't tell which components are provided.
export type Test45 = ExpectTrue<Equals<
  IsValidProviders<{ m: { multiFactory: () => Record<string, () => void>; keys: readonly string[] }; other: 1 }>,
  false
>>;

export type Test46 = ExpectTrue<Equals<
  IsValidProviders<{
    a: () => number;
    s: { factory: (p: { id: number }) => number; aliases: { id: 'a' } };
    v: { factory: 'x' };
    w: () => InstanceType<SomeClass>;
  }>,
  true
>>;

// Components available to a provider

export type Test47 = ExpectTrue<Equals<Simplify<OtherComponents<{ a: 1; b: () => 2; m: MultiX }, 'a'>>, { b: 2; x: 1 }>>;

export type Test48 = ExpectTrue<Equals<Simplify<OtherComponents<{ a: 1; b: () => 2; m: MultiX }, 'm'>>, { a: 1; b: 2 }>>;

// Optional aliases

type TwoNumbers = { a: () => number; b: () => number; s: () => string };

export type Test49 = ExpectTrue<Equals<
  Providers<TwoNumbers & { u: { factory: (p: { a: number }) => 1; aliases: { a: 'b' } } }>['u']['aliases'],
  { a: 'a' | 'b' | undefined } | undefined
>>;

export type Test50 = ExpectTrue<Equals<
  Providers<TwoNumbers & { u: { factory: (p: { a: number }) => 1; aliases: { other: 'b' } } }>['u']['aliases'],
  { other: { 'Error: "other" is not a parameter of the factory': never } } | undefined
>>;

export type Test51 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & { u: { factory: (p: { a: number }) => 1; aliases: { a: 'b' } } }>,
  true
>>;

export type Test52 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & { u: { factory: (p: { a: number }) => 1; aliases: { a: 's' } } }>,
  false
>>;

export type Test53 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & { u: { factory: (p: { a: number }) => 1; aliases: { other: 'b' } } }>,
  false
>>;

// A required alias doesn't make the other aliases unchecked.
export type Test54 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & {
    u: { factory: (p: { ids: number; a: number }) => 1; aliases: { ids: 'b'; a: 's' } };
  }>,
  false
>>;

export type Test55 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & { m: { multiFactory: (p: { a: number }) => { y: number }; keys: readonly ['y']; aliases: { a: 's' } } }>,
  false
>>;

export type Test56 = ExpectTrue<Equals<
  IsValidProviders<TwoNumbers & { m: { multiFactory: (p: { a: number }) => { y: number }; keys: readonly ['y']; aliases: { a: 'y' } } }>,
  false
>>;

// Functions with several parameters

export type Test57 = ExpectTrue<Equals<
  Providers<{ f: (a: number, b: number) => number }>['f'],
  FactoryParametersError
>>;

export type Test58 = ExpectTrue<Equals<
  Providers<{ f: { factory: (a: number, b: number) => number } }>['f'],
  FactoryParametersError
>>;

export type Test59 = ExpectTrue<Equals<
  Providers<{ f: { multiFactory: (a: number, b: number) => { x: number } } }>['f'],
  FactoryParametersError
>>;

// A second optional parameter doesn't prevent a function from being a factory.
export type Test60 = ExpectTrue<Equals<
  IsValidProviders<{ a: 1; f: (p: { a: 1 }, extra?: number) => number }>,
  true
>>;

// Symbol keys

declare const symbolKey: unique symbol;

export type Test61 = ExpectTrue<Equals<Providers<{ [symbolKey]: 1 }>[typeof symbolKey], SymbolKeyError>>;

// Resolver

type ResolverAB = ReturnType<typeof makeDependencyResolver<{ a: 1; b: 2 }>>;

// The last overload, resolving several components, requires at least two keys.
export type Test62 = ExpectTrue<Equals<[] extends Parameters<ResolverAB> ? true : false, false>>;

// Multi-factory results

type ResultOf<R> = Providers<{ m: { multiFactory: () => R; keys: readonly [] } }>['m'] extends {
  multiFactory: (...args: never) => infer Result;
} ? Result : never;

export type Test64 = ExpectTrue<Equals<ResultOf<null>, MultiFactoryResultError>>;

export type Test65 = ExpectTrue<Equals<ResultOf<Promise<{ x: 1 }>>, MultiFactoryResultError>>;

export type Test66 = ExpectTrue<Equals<ResultOf<number[]>, MultiFactoryResultError>>;

export type Test67 = ExpectTrue<Equals<ResultOf<() => 1>, MultiFactoryResultError>>;

export type Test68 = ExpectTrue<Equals<ResultOf<{ x: 1 } | null>, MultiFactoryResultError>>;

export type Test69 = ExpectTrue<Equals<ResultOf<{ x: 1 }>, { x: 1 }>>;

// Multi-factory keys

type KeysOf<R, Keys> = Providers<{ m: { multiFactory: () => R; keys: Keys } }>['m'] extends { keys: infer K } ? K : never;

export type Test70 = ExpectTrue<Equals<KeysOf<{ x: 1; y: 2 }, readonly ['x', 'y']>, readonly ('x' | 'y')[]>>;

export type Test71 = ExpectTrue<Equals<KeysOf<{ x: 1; y: 2 }, readonly ['x']>, MissingKeysError<'y'>>>;

export type Test72 = ExpectTrue<Equals<KeysOf<{ x: 1; [symbolKey]: 2 }, readonly ['x']>, SymbolComponentKeyError>>;

export type Test73 = ExpectTrue<Equals<
  IsValidProviders<{ m: { multiFactory: () => { x: 1 }; keys: readonly ['x', 'y'] } }>,
  false
>>;

export type Test74 = ExpectTrue<Equals<IsValidProviders<{ m: { multiFactory: () => { x: 1 } } }>, false>>;

// Provider form

export type Test75 = ExpectTrue<Equals<
  Providers<{ m: { factory: () => 1; multiFactory: () => { x: 1 }; keys: readonly ['x'] } }>['m'],
  AmbiguousProviderError
>>;

// Optional parameters are treated as required

type Url = (p: { port: number; host?: string }) => string;

export type Test76 = ExpectTrue<Equals<Providers<{ port: 80; url: Url }>['url'], OptionalParameterError<'host'>>>;

export type Test77 = ExpectTrue<Equals<IsValidProviders<{ port: 80; host: 'h'; url: Url }>, true>>;

export type Test78 = ExpectTrue<Equals<
  Providers<{ port: 80; h: 'h'; url: { factory: Url; aliases: object } }>['url']['aliases'],
  { host: 'h' }
>>;

export type Test79 = ExpectTrue<Equals<IsValidProviders<{ port: 80; url: { factory: Url } }>, false>>;

// Resolved components

type ABC = { a: 1; b: 2; c: 3 };

export type Test80 = ExpectTrue<Equals<ResolvedComponents<ABC, ['a', 'b']>, { a: 1; b: 2 }>>;

export type Test81 = ExpectTrue<Equals<ResolvedComponents<ABC, ['a' | 'b', 'c']>, { c: 3; a?: 1; b?: 2 }>>;

export type Test82 = ExpectTrue<Equals<ResolvedComponents<ABC, ['a' | 'b', 'a']>, { a: 1; b?: 2 }>>;

// Inference of the keys passed to `resolve`.
export const resolverInference = (resolve: ReturnType<typeof makeDependencyResolver<ABC>>, key: 'a' | 'b') => {
  const pair = resolve('a', 'b');
  const withUnion = resolve(key, 'c');

  const variadicKeys: ['a', 'b', ...'c'[]] = ['a', 'b'];
  const variadic = resolve(...variadicKeys);

  const checks: [
    Equals<typeof pair, { a: 1; b: 2 }>,
    Equals<typeof withUnion, { c: 3; a?: 1; b?: 2 }>,
    Equals<typeof variadic, { a: 1; b: 2; c?: 3 }>,
  ] = [true, true, true];

  return { pair, withUnion, variadic, checks };
};

// Keys of the rest part of the tuple are optional.
export type Test83 = ExpectTrue<Equals<ResolvedComponents<ABC, ['a', 'b', ...'c'[]]>, { a: 1; b: 2; c?: 3 }>>;

export type Test84 = ExpectTrue<Equals<ResolvedComponents<ABC, [...'c'[], 'a', 'b']>, { a: 1; b: 2; c?: 3 }>>;

// Multi-factory results with keys that may be missing

export type Test85 = ExpectTrue<Equals<KeysOf<{ a: 1 } | { b: 2 }, readonly []>, VaryingKeysError>>;

export type Test86 = ExpectTrue<Equals<KeysOf<{ a: 1 } | { b: 2 }, readonly ['a', 'b']>, VaryingKeysError>>;

export type Test87 = ExpectTrue<Equals<KeysOf<{ a: 1; b?: 2 }, readonly ['a', 'b']>, VaryingKeysError>>;

export type Test88 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 } | { a: 3; b: 4 }, readonly ['a', 'b']>, readonly ('a' | 'b')[]>>;

export type Test89 = ExpectTrue<Equals<KeysOf<Record<string, 1>, readonly string[]>, KeysTupleError>>;

// A default value of the dependencies parameter makes it optional: `(p = {}) => ...` has the type `(p?) => ...`.

export type Test90 = ExpectTrue<Equals<FactoryParams<(p?: { a?: 1 }) => 1>, { a?: 1 }>>;

export type Test91 = ExpectTrue<Equals<
  Providers<{ service: (p?: { port?: number }) => number }>['service'],
  OptionalParameterError<'port'>
>>;

// An index signature parameter is not an optional parameter.
export type Test92 = ExpectTrue<Equals<IsValidProviders<{ a: 1; f: (p: Record<string, 1>) => 1 }>, true>>;

// Long key tuples don't exceed the recursion limit.

type Repeat<T, N extends number, Acc extends unknown[] = []> = Acc['length'] extends N ? Acc : Repeat<T, N, [...Acc, T]>;

export type Test93 = ExpectTrue<Equals<ResolvedComponents<ABC, [...Repeat<'a', 300>, 'b']>, { a: 1; b: 2 }>>;

export type Test94 = ExpectTrue<Equals<ResolvedComponents<ABC, [...Repeat<'a', 300>, ...'c'[]]>, { a: 1; c?: 3 }>>;

// Optional properties declared next to an index signature

type IndexedDeps = { [key: string]: number | undefined; port?: number };

export type Test95 = ExpectTrue<Equals<OptionalKeys<IndexedDeps>, 'port'>>;

export type Test96 = ExpectTrue<Equals<OptionalKeys<Record<string, 1>>, never>>;

export type Test97 = ExpectTrue<Equals<
  Providers<{ service: (p: IndexedDeps) => number }>['service'],
  OptionalParameterError<'port'>
>>;

export type Test98 = ExpectTrue<Equals<IsValidProviders<{ port: 1; service: (p: IndexedDeps) => number }>, true>>;

// Optional properties in a union

type UnionDeps = { port?: number } | { port: number };

export type Test99 = ExpectTrue<Equals<OptionalKeys<UnionDeps>, 'port'>>;

export type Test100 = ExpectTrue<Equals<OptionalKeys<{ a?: 1 } | { b?: 2; c: 3 }>, 'a' | 'b'>>;

export type Test101 = ExpectTrue<Equals<
  Providers<{ service: (p: UnionDeps) => number }>['service'],
  OptionalParameterError<'port'>
>>;

export type Test102 = ExpectTrue<Equals<IsValidProviders<{ port: 1; service: (p: UnionDeps) => number }>, true>>;

// A union result of a multi-factory

type UnionModule = { multiFactory: () => { value: number } | { value: string }; keys: readonly ['value'] };

export type Test103 = ExpectTrue<Equals<ComponentTypes<{ m: UnionModule }>, { value: number | string }>>;

export type Test104 = ExpectTrue<Equals<
  ComponentTypes<{ m: UnionModule; n: MultiX }>,
  { value: number | string; x: 1 }
>>;

export type Test105 = ExpectTrue<Equals<IsValidProviders<{ m: UnionModule; f: (p: { value: number }) => 1 }>, false>>;

export type Test106 = ExpectTrue<Equals<
  IsValidProviders<{ m: UnionModule; f: (p: { value: number | string }) => 1 }>,
  true
>>;

// Union providers

export type Test107 = ExpectTrue<Equals<RegularComponentTypes<{ p: (() => 42) | 'text' }>, { p: 42 | 'text' }>>;

export type Test108 = ExpectTrue<Equals<IsValidProviders<{ p: ((d: { missing: 1 }) => 1) | 'text' }>, false>>;

export type Test109 = ExpectTrue<Equals<IsValidProviders<{ a: 1; p: ((d: { a: 1 }) => 1) | 'text' }>, true>>;

export type Test110 = ExpectTrue<Equals<Providers<{ p: MultiX | 1 }>['p'], MixedMultiFactoryError>>;

export type Test111 = ExpectTrue<Equals<
  IsValidProviders<{ p: MultiX | { multiFactory: () => { x: 1 }; keys: readonly ['x'] } }>,
  true
>>;

// The resolver type is exported, and providers must be an object.

export type Test112 = ExpectTrue<Equals<ReturnType<typeof makeDependencyResolver<{ a: 1 }>>, Resolver<{ a: 1 }>>>;

export type Test113 = ExpectTrue<Equals<null extends object & Providers<null> ? true : false, false>>;

// Unions whose cases are subtypes of each other

export type Test114 = ExpectTrue<Equals<IsUnion<{ value: string } | { value: string | number }>, true>>;

export type Test115 = ExpectTrue<Equals<IsUnion<'a' | 'b'>, true>>;

export type Test116 = ExpectTrue<Equals<IsUnion<'a'>, false>>;

export type Test117 = ExpectTrue<Equals<IsUnion<{ a: 1 }>, false>>;

type SubtypeUnionModule = {
  multiFactory: () => { value: string } | { value: string | number };
  keys: readonly ['value'];
};

export type Test118 = ExpectTrue<Equals<ComponentTypes<{ m: SubtypeUnionModule }>, { value: string | number }>>;

// Each case of a union provider is checked against its own checked form.

type Format = (p: { count: number }) => string;

export type Test119 = ExpectTrue<Equals<
  IsValidProviders<{
    count: 42;
    text: 'text';
    f: { factory: Format; aliases: { count: 'text' } } | { factory: Format };
  }>,
  false
>>;

export type Test120 = ExpectTrue<Equals<
  IsValidProviders<{
    count: 42;
    other: 7;
    f: { factory: Format; aliases: { count: 'other' } } | { factory: Format };
  }>,
  true
>>;

// A function is a regular factory, even with a `factory` or `multiFactory` property.

type PortFunction = ((p: { port: number }) => string) & { factory: () => 1; multiFactory: () => { x: 1 } };

export type Test121 = ExpectTrue<Equals<IsValidProviders<{ f: PortFunction }>, false>>;

export type Test122 = ExpectTrue<Equals<IsValidProviders<{ port: 80; f: PortFunction }>, true>>;

export type Test123 = ExpectTrue<Equals<ComponentTypes<{ port: 80; f: PortFunction }>, { port: 80; f: string }>>;

export type Test124 = ExpectTrue<Equals<MultiFactoryKeysFrom<{ f: PortFunction }>, never>>;

// A `factory` or `multiFactory` property that may be not a function

export type Test125 = ExpectTrue<Equals<
  Providers<{ a: { factory?: () => 1 } }>,
  { a: UncertainMakerError<'factory'> }
>>;

export type Test126 = ExpectTrue<Equals<
  Providers<{ a: { multiFactory: (() => { x: 1 }) | undefined; keys: readonly ['x'] } }>,
  { a: UncertainMakerError<'multiFactory'> }
>>;

export type Test127 = ExpectTrue<Equals<IsValidProviders<{ a: { factory: unknown } }>, false>>;

export type Test128 = ExpectTrue<Equals<IsValidProviders<{ a: { factory: 'none' }; b: { factory: undefined } }>, true>>;

// Optional providers

export type Test129 = ExpectTrue<Equals<Providers<{ port?: 80 }>, { port?: OptionalProviderError }>>;

export type Test130 = ExpectTrue<Equals<IsValidProviders<{ port: 80 | undefined }>, true>>;

export type Test131 = ExpectTrue<Equals<IsValidProviders<{ toString: () => string; constructor: 1 }>, true>>;

// Providers must be a plain object

export type Test132 = ExpectTrue<Equals<ProvidersObject<readonly [42]>, ProvidersObjectError>>;

export type Test133 = ExpectTrue<Equals<ProvidersObject<() => 42>, ProvidersObjectError>>;

export type Test134 = ExpectTrue<Equals<ProvidersObject<{ a: 42 }>, object>>;

// A function case is found also when the function has own properties.

type TaggedFactory = (() => 42) & { tag: 'factory' };

export type Test135 = ExpectTrue<Equals<
  Providers<{ a: { factory?: TaggedFactory } }>,
  { a: UncertainMakerError<'factory'> }
>>;

export type Test136 = ExpectTrue<Equals<
  Providers<{ a: { multiFactory: TaggedFactory | 'none'; keys: readonly [] } }>,
  { a: UncertainMakerError<'multiFactory'> }
>>;

export type Test137 = ExpectTrue<Equals<IsValidProviders<{ a: { factory: TaggedFactory } }>, true>>;

// Overloaded factories

type Overloaded = {
  (p: { count: number }): number;
  (p: { name: string }): string;
};

type Counter = (p: { count: number }) => number;

export type Test138 = ExpectTrue<Equals<IsOverloaded<Overloaded>, true>>;

export type Test139 = ExpectTrue<Equals<IsOverloaded<Counter & ((p: { name: string }) => string)>, true>>;

export type Test140 = ExpectTrue<Equals<IsOverloaded<Counter>, false>>;

export type Test141 = ExpectTrue<Equals<IsOverloaded<() => 1>, false>>;

export type Test142 = ExpectTrue<Equals<IsOverloaded<<T>(p: { value: T }) => T>, false>>;

export type Test143 = ExpectTrue<Equals<IsOverloaded<Counter & { tag: 'counter' }>, false>>;

export type Test144 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: Overloaded }>['f'],
  OverloadedFactoryError
>>;

export type Test145 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: { factory: Overloaded } }>['f'],
  OverloadedFactoryError
>>;

export type Test146 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: { multiFactory: Overloaded; keys: readonly [] } }>['f'],
  OverloadedFactoryError
>>;

// An earlier overload is found when the last ones have the same first parameter and result.
type OverloadedWithOption = {
  (p: { count: number }): number;
  (p: { name: string }): string;
  (p: { name: string }, option?: boolean): string;
};

export type Test147 = ExpectTrue<Equals<IsOverloaded<OverloadedWithOption>, true>>;

export type Test148 = ExpectTrue<Equals<
  IsOverloaded<{ (p: { a: 1 }): 1; (p: { a: 2 }): 2; (p: { a: 3 }): 3; (p: { a: 4 }): 4; (p: { a: 5 }): 5 }>,
  true
>>;

export type Test149 = ExpectTrue<Equals<IsOverloaded<{ (): 1; (p: { a: 1 }): 1 }>, true>>;

// A union factory type with an overloaded case

type UnionMaker = Overloaded | ((p: { name: string }) => string);

export type Test150 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: { factory: UnionMaker } }>['f'],
  OverloadedFactoryError
>>;

// The other case returns a valid multi-factory result, so that only the overloaded case is reported.
export type Test151 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: { multiFactory: Overloaded | ((p: { name: string }) => object); keys: readonly [] } }>['f'],
  OverloadedFactoryError
>>;

export type Test152 = ExpectTrue<Equals<
  IsValidProviders<{ count: 1; f: { factory: Counter | ((p: { count: number }) => 2) } }>,
  true
>>;

// Each slot is compared: a last signature that is a subtype of an earlier one is not the same signature.
export type Test153 = ExpectTrue<Equals<IsOverloaded<{ (p: { a: 1 }): 1 | 2; (p: { a: 1 }): 1 }>, true>>;

// Signatures are compared by identity: parameters that are only assignable to each other are different.
export type Test154 = ExpectTrue<Equals<
  IsOverloaded<{ (p: { port: number; host?: string }): string; (p: { port: number }): string }>,
  true
>>;

// Identical signatures declared separately are not overloads.
type Name = { name: string };

export type Test155 = ExpectTrue<Equals<IsOverloaded<{ (p: Name): string; (p: Name): string }>, false>>;

// The documented limitation: an overload behind four identical last signatures is missed.
type CountThenNames = {
  (p: { count: number }): number;
  (p: Name): string;
  (p: Name): string;
  (p: Name): string;
  (p: Name): string;
};

export type Test156 = ExpectTrue<Equals<IsOverloaded<CountThenNames>, false>>;

type CountThenThreeNames = {
  (p: { count: number }): number;
  (p: Name): string;
  (p: Name): string;
  (p: Name): string;
};

export type Test157 = ExpectTrue<Equals<IsOverloaded<CountThenThreeNames>, true>>;

// An optional aliases field

export type Test158 = ExpectTrue<Equals<GivenAliases<{ aliases?: { count: 'text' } }>, { count: 'text' }>>;

// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Test159 = ExpectTrue<Equals<GivenAliases<{ factory: () => 1 }>, {}>>;

export type Test160 = ExpectTrue<Equals<
  IsValidProviders<{ text: 'a'; f: { factory: (p: { count: number }) => 1; aliases?: { count: 'text' } } }>,
  false
>>;

// A union of key tuples

export type Test161 = ExpectTrue<Equals<CommonDefiniteKeys<['a', 'b'] | ['a', 'c']>, 'a'>>;

export type Test162 = ExpectTrue<Equals<
  ResolvedComponents<{ a: 1; b: 2; c: 3 }, ['a', 'b'] | ['a', 'c']>,
  { a: 1; b?: 2; c?: 3 }
>>;

export type Test163 = ExpectTrue<Equals<ResolvedComponents<{ a: 1; b: 2 }, ['a', 'b']>, { a: 1; b: 2 }>>;

// Factories requiring this

type UrlWithThis = (this: { port: number }, p: { host: string }) => string;

export type Test164 = ExpectTrue<Equals<Providers<{ host: 'h'; url: UrlWithThis }>['url'], ThisParameterError>>;

export type Test165 = ExpectTrue<Equals<
  Providers<{ host: 'h'; url: { factory: UrlWithThis } }>['url'],
  ThisParameterError
>>;

export type Test166 = ExpectTrue<Equals<
  IsValidProviders<{ host: 'h'; url: (this: void, p: { host: string }) => string }>,
  true
>>;

// Union parameters

type CountOrName = (p: { count: number } | { name: string }) => string;

export type Test167 = ExpectTrue<Equals<IsValidProviders<{ count: 1; name: 'a'; f: CountOrName }>, true>>;

export type Test168 = ExpectTrue<Equals<IsValidProviders<{ count: 1; f: CountOrName }>, true>>;

export type Test169 = ExpectTrue<Equals<IsValidProviders<{ other: 1; f: CountOrName }>, false>>;

export type Test170 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 7; f: CountOrName }>['f'],
  UnionParameterError<'name'>
>>;

export type Test171 = ExpectTrue<Equals<
  Providers<{ count: 1; name: 'a'; f: { factory: CountOrName } }>['f'],
  UnionParameterAliasesError
>>;

// A union type of a key in one case is kept.
export type Test172 = ExpectTrue<Equals<
  IsValidProviders<{ value: 'a'; f: (p: { value: string | number } | { other: 1 }) => 1 }>,
  true
>>;

// `this: void` is accepted in a factory with aliases and in a multi-factory.

type HostFactory = (this: void, p: { host: string }) => string;

export type Test173 = ExpectTrue<Equals<IsValidProviders<{ host: 'h'; url: { factory: HostFactory } }>, true>>;

export type Test174 = ExpectTrue<Equals<
  IsValidProviders<{ host: 'h'; urls: { multiFactory: (this: void, p: { host: string }) => { url: string }; keys: readonly ['url'] } }>,
  true
>>;

export type Test175 = ExpectTrue<Equals<
  IsValidProviders<{ host: 'h'; url: { factory: (this: { port: number }, p: { host: string }) => string } }>,
  false
>>;

// Optional alias keys stay optional.

type CountFormat = (p: { count: number }) => string;

export type Test176 = ExpectTrue<Equals<
  IsValidProviders<{ count: 1; otherCount: 2; f: { factory: CountFormat; aliases?: { count?: 'otherCount' } } }>,
  true
>>;

export type Test177 = ExpectTrue<Equals<
  IsValidProviders<{ count: 1; otherCount: 2; f: { factory: CountFormat; aliases: { count?: 'otherCount' } } }>,
  true
>>;

export type Test178 = ExpectTrue<Equals<
  IsValidProviders<{ otherCount: 2; f: { factory: CountFormat; aliases: { count?: 'otherCount' } } }>,
  false
>>;

export type Test179 = ExpectTrue<Equals<
  IsValidProviders<{ count: 1; text: 'a'; f: { factory: CountFormat; aliases: { count?: 'text' } } }>,
  false
>>;

// Only exactly `this: void` is accepted without matching the provider object.

export type Test180 = ExpectTrue<Equals<
  IsValidProviders<{ f: { factory: (this: { port: number } | undefined) => 1 } }>,
  false
>>;

export type Test181 = ExpectTrue<Equals<IsValidProviders<{ f: { factory: (this: undefined) => 1 } }>, false>>;

export type Test182 = ExpectTrue<Equals<IsValidProviders<{ f: (this: { port: number } | undefined) => 1 }>, true>>;

export type Test183 = ExpectTrue<Equals<IsValidProviders<{ f: { factory: (this: object) => 1 } }>, true>>;

// Keys must be a tuple without optional and rest elements.

export type Test184 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, ('a' | 'b')[]>, KeysTupleError>>;

export type Test185 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a', 'b'?]>, KeysTupleError>>;

export type Test186 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a', ...'b'[]]>, KeysTupleError>>;

export type Test187 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a'] | readonly ['b']>, MissingKeysError<'a' | 'b'>>>;

export type Test188 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['b', 'a']>, readonly ('a' | 'b')[]>>;

// A union of functions in a provider is split into a union of providers.

type CountValue = (p: { a: number }) => number;
type NameValue = (p: { b: string }) => string;

export type Test189 = ExpectTrue<Equals<IsValidProviders<{ a: 1; b: 'x'; s: { factory: CountValue | NameValue } }>, true>>;

export type Test190 = ExpectTrue<Equals<IsValidProviders<{ a: 1; s: { factory: CountValue | NameValue } }>, false>>;

export type Test191 = ExpectTrue<Equals<
  IsValidProviders<{ other: 1; s: { factory: CountValue | ((p: { a: number }) => string); aliases: { a: 'other' } } }>,
  true
>>;

// The aliases are used with each function, so an alias must be a parameter of every function.
export type Test193 = ExpectTrue<Equals<
  IsValidProviders<{ other: 1; b: 'x'; s: { factory: CountValue | NameValue; aliases: { a: 'other' } } }>,
  false
>>;

export type Test192 = ExpectTrue<Equals<
  ComponentTypes<{ a: 1; b: 'x'; s: { factory: CountValue | NameValue } }>,
  { a: 1; b: 'x'; s: number | string }
>>;

// Only a single key at a position of the tuple is surely listed.
export type Test194 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a' | 'b']>, MissingKeysError<'a' | 'b'>>>;

export type Test195 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a', 'a' | 'b']>, MissingKeysError<'b'>>>;

export type Test196 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly [string, string]>, MissingKeysError<'a' | 'b'>>>;

export type Test197 = ExpectTrue<Equals<DefiniteKeys<readonly ['a', string, `b${string}`, 'c' | 'd']>, 'a'>>;

// The property with the function is the maker, like the runtime chooses it.
export type Test198 = ExpectTrue<Equals<MakerKey<{ factory: 'metadata'; multiFactory: CountValue }>, 'multiFactory'>>;

export type Test199 = ExpectTrue<Equals<IsValidProviders<{
  a: 1; b: 'x'; s: { factory: 'metadata'; multiFactory: ((p: { a: number }) => { v: 1 }) | ((p: { b: string }) => { v: 2 }); keys: ['v'] };
}>, true>>;

export type Test200 = ExpectTrue<Equals<IsValidProviders<{
  a: 1; s: { factory: 'metadata'; multiFactory: ((p: { a: number }) => { v: 1 }) | ((p: { b: string }) => { v: 2 }); keys: ['v'] };
}>, false>>;

export type Test201 = ExpectTrue<Equals<
  IsValidProviders<{ a: 1; b: 'x'; s: { factory: CountValue | NameValue; multiFactory: 'metadata' } }>,
  true
>>;

// A wide key doesn't absorb the literal keys requested next to it.
export type Test202 = ExpectTrue<Equals<CommonDefiniteKeys<['a', string]>, 'a'>>;

export type Test203 = ExpectTrue<Equals<CommonDefiniteKeys<['a', string, 'b'] | ['a', `x${string}`]>, 'a'>>;

export type Test204 = ExpectTrue<Equals<
  ResolvedComponents<Record<string, number>, ['a', string]>,
  { [x: string]: number | undefined; a: number }
>>;

// A numeric key is kept in error messages and compared with string keys by name.
export type Test205 = ExpectTrue<Equals<KeysOf<{ 0: 1 }, readonly []>, MissingKeysError<0>>>;

export type Test206 = ExpectTrue<Equals<MissingKeysError<0>, { 'Error: "keys" must list the component "0"': never }>>;

export type Test207 = ExpectTrue<Equals<KeysOf<{ 0: 1; a: 2 }, readonly ['a', '0']>, readonly ('0' | 'a')[]>>;

export type Test208 = ExpectTrue<Equals<IsValidProviders<{ s: (p: { 0?: number }) => number }>, false>>;

export type Test209 = ExpectTrue<Equals<CollidingKeys<{ 0: 1; m: unknown }, 'm', Record<'0', 2>>, '0'>>;

export type Test210 = ExpectTrue<Equals<CollidingKeys<Record<'0', 1> & { m: unknown }, 'm', { 0: 2; a: 3 }>, 0>>;

export type Test211 = ExpectTrue<Equals<KeyName<0 | 'a' | symbol>, '0' | 'a' | '[symbol]'>>;

declare const token: unique symbol;

export type Test212 = ExpectTrue<Equals<
  IsValidProviders<{ value: 1; s: { factory: (p: { [token]: number }) => number; aliases: { [token]: 'value' } } }>,
  true
>>;

export type Test213 = ExpectTrue<Equals<
  IsValidProviders<{ value: 1; s: { factory: (p: { value: number }) => number; aliases: { [token]: 'value' } } }>,
  false
>>;

// Numeric string keys are canonical numbers: `0` and `'0'` are the same component.
export type Test214 = ExpectTrue<Equals<
  [CanonicalKey<'0'>, CanonicalKey<'-1'>, CanonicalKey<'1.5'>, CanonicalKey<'01'>, CanonicalKey<'1e3'>, CanonicalKey<'a'>],
  [0, -1, 1.5, '01', '1e3', 'a']
>>;

export type Test215 = ExpectTrue<Equals<ComponentTypes<Record<'0', 1> & { a: 2 }>, { 0: 1; a: 2 }>>;

export type Test216 = ExpectTrue<Equals<
  ComponentTypes<{ m: { multiFactory: () => Record<'0', 1>; keys: ['0'] } }>,
  { 0: 1 }
>>;

export type Test217 = ExpectTrue<Equals<IsValidProviders<Record<'0', 1> & { s: (p: { 0?: number }) => number }>, true>>;

export type Test218 = ExpectTrue<Equals<IsValidProviders<{ 0: 1; s: (p: Record<'0', number>) => number }>, true>>;

export type Test219 = ExpectTrue<Equals<
  IsValidProviders<{ 0: 1; s: { factory: (p: { x: number }) => number; aliases: { x: '0' } } }>,
  true
>>;

export type Test220 = ExpectTrue<Equals<ResolvedComponents<{ 0: 1; a: 2 }, ['0', 0, 'a']>, { 0: 1; a: 2 }>>;

export type Test221 = ExpectTrue<Equals<ResolvedComponents<{ 0: 1; a: 2 }, ['0' | 'a', 'a']>, { a: 2; 0?: 1 }>>;

export type Test222 = ExpectTrue<Equals<
  IsValidProviders<Record<'0', 1> & { b: 'x'; s: (p: { 0: number } | { b: string }) => number }>,
  true
>>;

export type Test223 = ExpectTrue<Equals<
  IsValidProviders<Record<'0', 'x'> & { s: (p: { 0: number } | { b: string }) => number }>,
  false
>>;

// Parameters and providers with a numeric string key, e.g. `Record<'0', V>`, match canonical components.
export type Test224 = ExpectTrue<Equals<IsValidProviders<{ 0: 1; s: (p: Partial<Record<'0', number>>) => number }>, true>>;

export type Test225 = ExpectTrue<Equals<
  IsValidProviders<{ 0: 1; a: 2; s: { factory: (p: Record<'0', number> & { x: number }) => number; aliases: { x: 'a' } } }>,
  true
>>;

export type Test226 = ExpectTrue<Equals<
  IsValidProviders<{ 0: 1; a: 2; s: { factory: (p: Record<'0', number>) => number; aliases: { 0: 'a' } } }>,
  true
>>;

export type Test227 = ExpectTrue<Equals<
  IsValidProviders<{ 0: 1; s: (p: Record<'0', number> | { b: string }) => number }>,
  true
>>;

// The component must match the case that declares the key in the string form too.
export type Test228 = ExpectTrue<Equals<
  IsValidProviders<{ 0: 1; b: 'x'; s: (p: { 0: number } | (Record<'0', string> & { b: string })) => number }>,
  false
>>;

export type Test229 = ExpectTrue<Equals<IsValidProviders<Record<'0', (p: { 0: number }) => number>>, false>>;

// The property of a canonical key is found in the string form and in index signatures.
export type Test230 = ExpectTrue<Equals<ValueOf<Record<'0', 1>, 0>, 1>>;

export type Test231 = ExpectTrue<Equals<ValueOf<Record<string, 1>, 0>, 1>>;

export type Test232 = ExpectTrue<Equals<ValueOf<Record<`${number}`, 1>, 0>, 1>>;

export type Test233 = ExpectTrue<Equals<ValueOf<{ a: 1 }, 0>, never>>;

export type Test234 = ExpectTrue<Equals<ResolvedComponents<Record<string, 1>, ['0', 'a']>, { 0: 1; a: 1 }>>;

export type Test235 = ExpectTrue<Equals<
  IsValidProviders<{ name: 'x'; marker: true; count: 1; s: (p: Record<string, string> | { name: string; marker: true }) => 1 }>,
  false
>>;

export type Test236 = ExpectTrue<Equals<
  IsValidProviders<{ count: 1; s: { factory: (p: Record<string, number>) => 1; aliases: { value: 'count' } } }>,
  true
>>;

// A resolver is covariant in its components.
export type Test237 = ExpectTrue<Equals<
  Resolver<{ readonly a: 42; 0: 1 }> extends Resolver<{ a: number; 0: number }> ? 1 : 0,
  1
>>;

export type Test238 = ExpectTrue<Equals<Resolver<{ 0: 1 }> extends Resolver<Record<'0', number>> ? 1 : 0, 1>>;

export type Test239 = ExpectTrue<Equals<ResolvedComponents<Record<string, 1>, ['0' | 'a', 'a']>, { a: 1; 0?: 1 }>>;

export type Test240 = ExpectTrue<Equals<Resolver<{ a: 42 }> extends Resolver<{ a: string }> ? 1 : 0, 0>>;

export type Test241 = ExpectTrue<Equals<Resolver<{ a: 1 }> extends Resolver<{ a: 1; b: 2 }> ? 1 : 0, 0>>;

export type Test242 = ExpectTrue<Equals<Resolver<{ 0: 1 }> extends Resolver<Record<'0', string>> ? 1 : 0, 0>>;

// Classes are functions at runtime

// The types of classes with a static field.
type StaticProviders = (new () => object) & { value: 42 };

type AbstractProviders = (abstract new () => object) & { value: 42 };

export type Test243 = ExpectTrue<Equals<ProvidersObject<StaticProviders>, ProvidersObjectError>>;

export type Test244 = ExpectTrue<Equals<ProvidersObject<AbstractProviders>, ProvidersObjectError>>;

export type Test245 = ExpectTrue<Equals<ResultOf<StaticProviders>, MultiFactoryResultError>>;

export type Test246 = ExpectTrue<Equals<ResultOf<AbstractProviders>, MultiFactoryResultError>>;

export type Test247 = ExpectTrue<Equals<ResultOf<{ x: 1 } | StaticProviders>, MultiFactoryResultError>>;

export type Test248 = ExpectTrue<Equals<
  Providers<{ a: { factory?: StaticProviders } }>,
  { a: UncertainMakerError<'factory'> }
>>;

export type Test249 = ExpectTrue<Equals<
  Providers<{ a: { multiFactory: StaticProviders | undefined; keys: readonly [] } }>,
  { a: UncertainMakerError<'multiFactory'> }
>>;

export type Test250 = ExpectTrue<Equals<
  Providers<{ a: { factory: AbstractProviders | 'none' } }>,
  { a: UncertainMakerError<'factory'> }
>>;

// A function case of a union result with the same keys is found too.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type Test251 = ExpectTrue<Equals<ResultOf<{} | (() => 1)>, MultiFactoryResultError>>;

// A forbidden case of a union of providers objects is found too.

export type Test252 = ExpectTrue<Equals<ProvidersObject<StaticProviders | { value: 42 }>, ProvidersObjectError>>;

export type Test253 = ExpectTrue<Equals<ProvidersObject<readonly [42] | { value: 42 }>, ProvidersObjectError>>;

export type Test254 = ExpectTrue<Equals<ProvidersObject<(() => 42) | { value: 42 }>, ProvidersObjectError>>;

export type Test255 = ExpectTrue<Equals<ProvidersObject<{ value: 42 } | { value: 'text' }>, object>>;

// A union of providers objects provides the common components of its cases.

type ValueNumber = { m: { multiFactory: () => { value: 42 }; keys: readonly ['value'] } };
type ValueText = { m: { multiFactory: () => { value: 'text' }; keys: readonly ['value'] } };

export type Test256 = ExpectTrue<Equals<ComponentTypes<ValueNumber | ValueText>, { value: 42 | 'text' }>>;

export type Test257 = ExpectTrue<Equals<
  ComponentTypes<{ m: { multiFactory: () => { a: 1 }; keys: readonly ['a'] } } | ValueNumber>,
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {}
>>;

export type Test258 = ExpectTrue<Equals<
  ComponentTypes<{ x: 1; m: { multiFactory: () => { a: 1 }; keys: readonly ['a'] } } | { x: 'text'; a: 2 }>,
  { x: 1 | 'text'; a: 1 | 2 }
>>;

export type Test259 = ExpectTrue<Equals<ComponentTypes<{ x: 1; y: 2 } | { x: 'text' }>, { x: 1 | 'text' }>>;

// Members of `Object`, e.g. `toString`, are compared by their declared types, not by the members every object has.

export type Test260 = ExpectTrue<Equals<Alias<{ toString: () => string; a: 1 }, () => string>, 'toString'>>;

export type Test261 = ExpectTrue<Equals<OptionalKeys<{ toString: () => string; valueOf: () => number }>, never>>;

export type Test262 = ExpectTrue<Equals<OptionalKeys<{ toString?: () => string }>, 'toString'>>;

export type Test263 = ExpectTrue<Equals<
  IsValidProviders<{ m: { multiFactory: () => { toString: () => string }; keys: readonly ['toString'] } }>,
  true
>>;

export type Test264 = ExpectTrue<Equals<
  IsValidProviders<{
    toString: () => () => string;
    service: { factory: (p: { format: () => string }) => string; aliases: { format: 'toString' } };
  }>,
  true
>>;

export type Test265 = ExpectTrue<Equals<
  Providers<{ service: (p: { toString: () => string; constructor: unknown }) => 1 }>['service'],
  ObjectMemberParameterError<'toString' | 'constructor'>
>>;

export type Test266 = ExpectTrue<Equals<
  IsValidProviders<{ toString: () => () => string; service: (p: { toString: () => string }) => string }>,
  true
>>;

export type Test267 = ExpectTrue<Equals<IsValidProviders<{ service: (p: Record<string, () => string>) => 1 }>, true>>;

// A case of a union parameter with a member of `Object` is provided only by its component.

type CountOrFormat = (deps: { count: number } | { toString: () => string }) => string;

export type Test268 = ExpectTrue<Equals<
  Providers<{ service: CountOrFormat }>['service'],
  ObjectMemberParameterError<'toString'>
>>;

export type Test269 = ExpectTrue<Equals<IsValidProviders<{ count: 1; service: CountOrFormat }>, true>>;

export type Test270 = ExpectTrue<Equals<
  IsValidProviders<{ toString: () => () => string; service: CountOrFormat }>,
  true
>>;

export type Test271 = ExpectTrue<Equals<
  Providers<{ count: 'text'; service: CountOrFormat }>['service'],
  UnionParameterError<'count'>
>>;

export type Test272 = ExpectTrue<Equals<
  Providers<{ service: (deps: { toString: () => string } | { valueOf: () => number }) => 1 }>['service'],
  ObjectMemberParameterError<'toString' | 'valueOf'>
>>;

// Union aliases are checked case by case: `keyof` of the union has only the common keys.

type CountName = { count: 1; name: 'text' };

type CountNameFormat = (p: { count: number; name: string }) => string;

export type Test273 = ExpectTrue<Equals<
  IsValidProviders<CountName & { f: { factory: CountNameFormat; aliases: { count: 'name' } | { name: 'count' } } }>,
  false
>>;

export type Test274 = ExpectTrue<Equals<
  Providers<CountName & { f: { factory: CountNameFormat; aliases: { count: 'name' } | { name: 'count' } } }>['f']['aliases'],
  { count: 'count' | undefined; name: 'name' | undefined } | undefined
>>;

// A case doesn't match the checked form of another case: any aliases match `{}`.
export type Test275 = ExpectTrue<Equals<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  IsValidProviders<CountName & { f: { factory: CountNameFormat; aliases: { count: 'name' } | {} } }>,
  false
>>;

export type Test276 = ExpectTrue<Equals<
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  Providers<CountName & { f: { factory: CountNameFormat; aliases: { count: 'name' } | {} } }>['f']['aliases'],
  { count: 'count' | undefined } | undefined
>>;

export type Test277 = ExpectTrue<Equals<
  IsValidProviders<CountName & { f: { factory: CountNameFormat; aliases: { count: 'count' } | { other: 'count' } } }>,
  false
>>;

type ThreeValues = { count: 1; otherCount: 2; name: 'text' };

export type Test278 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & {
    // eslint-disable-next-line @typescript-eslint/no-empty-object-type
    f: { factory: CountNameFormat; aliases: { count: 'otherCount' } | { name: 'name' } | {} };
  }>,
  true
>>;

export type Test279 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & { f: { factory: CountNameFormat; aliases?: { count: 'otherCount' } | { count: 'name' } } }>,
  false
>>;

// With a required alias, each case must have it.

type TotalFormat = (p: { total: number; name: string }) => string;

export type Test280 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & { f: { factory: TotalFormat; aliases: { total: 'count' } | { total: 'otherCount' } } }>,
  true
>>;

export type Test281 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & { f: { factory: TotalFormat; aliases: { total: 'count' } | { name: 'name' } } }>,
  false
>>;

export type Test282 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & { f: { factory: TotalFormat; aliases: { total: 'count' } | { total: 'name' } } }>,
  false
>>;

export type Test283 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & {
    m: { multiFactory: (p: { count: number }) => { y: number }; keys: readonly ['y']; aliases: { count: 'otherCount' } | { count: 'name' } };
  }>,
  false
>>;

export type Test284 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & {
    m: { multiFactory: (p: { count: number }) => { y: number }; keys: readonly ['y']; aliases: { count: 'otherCount' } | { count: 'count' } };
  }>,
  true
>>;

// An invalid case doesn't match the checked form of another invalid case: `{ count?: 'name' }` matches
// `{ name?: 'name' }`.

type SharedFormat = (p: { count: number; name: string; shared: boolean }) => string;

type CrossAliases = { count?: 'name'; shared: 'shared' } | { name?: 'count'; shared: 'shared' };

export type Test285 = ExpectTrue<Equals<
  IsValidProviders<CountName & { shared: true; f: { factory: SharedFormat; aliases: CrossAliases } }>,
  false
>>;

export type Test286 = ExpectTrue<Equals<
  Providers<CountName & { shared: true; f: { factory: SharedFormat; aliases: CrossAliases } }>['f']['aliases'],
  { count?: 'count' | undefined; name?: 'name' | undefined; shared: 'shared' | undefined } | undefined
>>;

export type Test287 = ExpectTrue<Equals<
  IsValidProviders<CountName & {
    shared: true;
    f: { factory: SharedFormat; aliases: { count?: 'count'; shared: 'shared' } | { name?: 'name'; shared: 'shared' } };
  }>,
  true
>>;

// The checked forms of invalid cases may conflict: the aliases are rejected anyway.
export type Test288 = ExpectTrue<Equals<
  IsValidProviders<ThreeValues & { f: { factory: CountNameFormat; aliases: { count: 'name' } | { count: 'text' } } }>,
  false
>>;

// An invalid case of a union provider doesn't match the checked form of another invalid case.

type CrossProviders = CountName & {
  shared: true;
  f:
    | { factory: SharedFormat; aliases: { count?: 'name'; shared: 'shared' } }
    | { factory: SharedFormat; aliases: { name?: 'count'; shared: 'shared' } };
};

export type Test289 = ExpectTrue<Equals<IsValidProviders<CrossProviders>, false>>;

// A union function type in `factory` is checked the same way.

type CountShared = (p: { count: number; shared: boolean }) => string;

type NameShared = (p: { name: string; shared: boolean }) => string;

export type Test290 = ExpectTrue<Equals<
  IsValidProviders<CountName & { shared: true; f: { factory: CountShared | NameShared; aliases: { shared: 'count' } } }>,
  false
>>;

export type Test291 = ExpectTrue<Equals<IsUnion<{ a?: 1 } | { b?: 2 }>, true>>;

export type Test292 = ExpectTrue<Equals<IsUnion<boolean>, true>>;

export type Test293 = ExpectTrue<Equals<IsUnion<never>, false>>;

// Duplicate keys are a type error: the runtime rejects them.
export type Test294 = ExpectTrue<Equals<KeysOf<{ a: 1 }, readonly ['a', 'a']>, DuplicateKeysError<'a'>>>;

export type Test295 = ExpectTrue<Equals<
  KeysOf<{ a: 1; b: 2 }, readonly ['a', 'b'] | readonly ['b', 'a', 'b']>,
  DuplicateKeysError<'b'>
>>;

// A union element is surely a duplicate when each of its keys is listed.
export type Test296 = ExpectTrue<Equals<
  KeysOf<{ a: 1; b: 2 }, readonly ['a' | 'b', 'a', 'b']>,
  DuplicateKeysError<'a' | 'b'>
>>;

// A union element may be another key.
export type Test301 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly ['a' | 'b', 'a']>, MissingKeysError<'b'>>>;

export type Test302 = ExpectTrue<Equals<KeysOf<{ a: 1; b: 2 }, readonly [string, 'a', 'b']>, readonly ('a' | 'b')[]>>;

// A long tuple doesn't exceed the instantiation depth.
type LongKeys = readonly [
  'k0', 'k1', 'k2', 'k3', 'k4', 'k5', 'k6', 'k7', 'k8', 'k9', 'k10', 'k11', 'k12', 'k13', 'k14', 'k15', 'k16', 'k17',
  'k18', 'k19', 'k20', 'k21', 'k22', 'k23', 'k24', 'k25', 'k26', 'k27', 'k28', 'k29', 'k30', 'k31', 'k32', 'k33',
  'k34', 'k35', 'k36', 'k37', 'k38', 'k39', 'k40', 'k41', 'k42', 'k43', 'k44', 'k45', 'k46', 'k47', 'k48', 'k49',
  'k50', 'k51', 'k52', 'k53', 'k54', 'k55', 'k56', 'k57', 'k58', 'k59', 'k60', 'k61', 'k62', 'k63', 'k64', 'k65',
  'k66', 'k67', 'k68', 'k69', 'k70', 'k71', 'k72', 'k73', 'k74', 'k75', 'k76', 'k77', 'k78', 'k79', 'k80', 'k81',
  'k82', 'k83', 'k84', 'k85', 'k86', 'k87', 'k88', 'k89', 'k90', 'k91', 'k92', 'k93', 'k94', 'k95', 'k96', 'k97',
  'k98', 'k99',
];

export type Test303 = ExpectTrue<Equals<
  KeysOf<Record<LongKeys[number], 1>, LongKeys>,
  readonly LongKeys[number][]
>>;

// Aliases must be a plain object: a function without properties would match `{}`.
export type Test297 = ExpectTrue<Equals<
  Providers<{ value: 1; f: { factory: (p: { value: number }) => 1; aliases: () => 1 } }>['f']['aliases'],
  AliasesObjectError | undefined
>>;

export type Test298 = ExpectTrue<Equals<
  IsValidProviders<{ value: 1; f: { factory: (p: { value: number }) => 1; aliases: readonly [] } }>,
  false
>>;

// An alias that is not required may be `undefined`: the parameter is injected by its own name.
export type Test299 = ExpectTrue<Equals<
  IsValidProviders<{ value: 1; f: { factory: (p: { value: number }) => 1; aliases: { value: undefined } } }>,
  true
>>;

export type Test300 = ExpectTrue<Equals<
  IsValidProviders<{ other: 1; f: { factory: (p: { value: number }) => 1; aliases: { value: undefined } } }>,
  false
>>;

// A resolver of a non-canonical key accepts both forms of the key.
export const numericKeyResolver = (resolve: Resolver<Record<'0', number> & { a: 1 }>) => {
  const byNumber: number = resolve(0);
  const byString: number = resolve('0');
  const both: { 0: number; a: 1 } = resolve(0, 'a');

  return [byNumber, byString, both];
};
