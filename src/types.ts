import type { DeepSimplify, IsIdenticalType, IsUnion, PickByValue, Simplify, UnionToIntersection } from './type-utils.js';

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Factory<P = any, R = any> = (p: P) => R;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type AnyFunction = (...args: any) => any;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export type Constructor = abstract new (...args: any) => any;

export type MultiFactory<F extends Factory = Factory> = { multiFactory: F };

// `undefined` is dropped: a default value of the parameter, `(deps = {}) => ...`, doesn't make its fields optional.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type FactoryParams<F extends Factory> = Parameters<F> extends [] ? {} : NonNullable<Parameters<F>[0]>;

// Component types

// A function is a regular factory even when it has a `multiFactory` property: the runtime calls the function itself.
export type MultiFactoryCase<P> = P extends AnyFunction ? never : P extends MultiFactory ? P : never;

export type MultiFactoryProviders<T> = {
  [K in keyof T as [MultiFactoryCase<T[K]>] extends [never] ? never : K]: MultiFactoryCase<T[K]>
};

export type MultiFactoryKeysFrom<T> = keyof MultiFactoryProviders<T>;

// Distributes over a union provider, e.g. `condition ? () => 42 : 'text'` gives `number | 'text'`.
export type RegularComponentType<P> =
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  P extends (p: any) => infer V ? V
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  : P extends { factory: (p: any) => infer V } ? V
  : P;

export type RegularComponentTypes<T> = { [K in keyof T]: RegularComponentType<T[K]> };

// The components of one multi-factory. The cases of a union result are merged: `{ a: 1 } | { a: 2 }` gives
// `{ a: 1 | 2 }`. Other results are used as is: merging every result would slow down the type checking.
export type MultiFactoryResultComponents<R> = IsUnion<R> extends true ? MergeCases<[R]> : R;

// The result is boxed in a tuple, so that the mapped type doesn't distribute over the union.
export type MergeCases<Box extends [unknown]> = { [C in keyof Box[0]]: Box[0][C] };

// The components of different multi-factories are combined by intersection.
export type MultiFactoryComponentTypes<T extends { [k: PropertyKey]: MultiFactory }> = Simplify<UnionToIntersection<{
  [K in keyof T]: MultiFactoryResultComponents<ReturnType<T[K]['multiFactory']>>
}[keyof T]>>;

// A union of providers objects, e.g. `condition ? providers1 : providers2`, provides the components of one case:
// the components of each case are computed separately and merged, so that only common keys are left, with unions of
// their types. Combining the multi-factories of different cases by intersection would give keys of one case only
// and `never` for a key with different types.
export type ComponentTypes<T> = IsUnion<T> extends true ? MergeCases<[CaseComponentTypes<T>]> : CaseComponentTypes<T>;

export type CaseComponentTypes<T> = T extends unknown
  ? CanonicalKeys<
    RegularComponentTypes<Omit<T, MultiFactoryKeysFrom<T>>>
    & MultiFactoryComponentTypes<MultiFactoryProviders<T>>
  >
  : never;

// `0` and `'0'` are the same property, while TypeScript keeps them as different keys: a provider `0` and a result
// `Record<'0', V>` would give different components. Component keys are made canonical: a numeric string is
// a number. Keys of parameters and aliases are compared by their canonical form, and a component can be resolved
// or aliased by both forms. An object type with both forms is not used: mapped types over it lose the property.
// Remapping is slower than `Simplify`, so it is used only when there is a numeric string key.
export type CanonicalKeys<C> = [Extract<keyof C, `${number}`>] extends [never]
  ? Simplify<C>
  : { [K in keyof C as CanonicalKey<K>]: C[K] };

// `'1e3'` and `'01'` are not numeric: `obj[1e3]` and `obj[1]` read `'1000'` and `'1'`.
export type CanonicalKey<K> = K extends `${infer N extends number}` ? `${N}` extends K ? N : K : K;

// The canonical key and its string form: `0 | '0'`.
export type KeyForms<K> = K | (K extends number ? `${K}` : never);

// Components available to the provider K. For a regular provider, the components of all providers are computed once
// and K is omitted. A multi-factory can't depend on its own components, so its provider is omitted instead.
export type OtherComponents<T, K extends keyof T> = [MultiFactoryCase<T[K]>] extends [never]
  ? Omit<ComponentTypes<T>, CanonicalKey<K>>
  : ComponentTypes<Omit<T, K>>;

export type PickCommonKeys<T, U, Keys = CanonicalKey<keyof U>> = {
  [K in keyof T as K extends Keys ? K : never]: T[K]
};

// Keys whose canonical form is among the canonical keys, e.g. `'0'` in `0 | 'a'`.
export type KeysIn<K, Canonical> = K extends unknown ? CanonicalKey<K> extends Canonical ? K : never : never;

// The keys of `T` that hold the property of a canonical key: `'0'` for `0` in `Record<'0', V>`. An index signature
// holds its keys too: `keyof Record<string, V>` is `string | number`.
export type KeyOf<T, K> = KeyForms<K> & keyof T;

// The type of the property of a canonical key.
export type ValueOf<T, K> = T[KeyOf<T, K>];

// Both forms of the component keys: `0 | '0'` also for `Record<'0', V>`.
export type ResolverKey<C> = KeyForms<CanonicalKey<keyof C>>;

// Aliases

export type ImpossibleAliases<T extends string> = Record<T, never>;

// Keys of the components that can be injected into a parameter of the given type.
export type Alias<Components, ParamType> = KeyForms<keyof PickByValue<Components, ParamType>>;

// Parameters that can't be injected by their own names. Optional parameters are treated as required.
export type RequiredAliases<Components, Params> = {
  [K in keyof Params as CanonicalKey<K> extends keyof Components
    ? Components[CanonicalKey<K> & keyof Components] extends Params[K] ? never : K
    : K
  ]-?: Alias<Components, Params[K]>
};

// Index signatures, e.g. `Record<string, X>`, are not optional keys. Keys like `toString` are optional only with `?`:
// `{} extends Pick<T, K>` would be true for them, see `IsOptionalKey`. The keys are filtered by remapping: indexing
// the mapped type by `keyof T` would return only the index signature and lose the properties declared next to it.
// A union is processed case by case: `keyof` of a union would return only the keys common to all cases.
export type OptionalKeys<T> = T extends unknown
  ? keyof {
    [K in keyof T as string extends K ? never
    : number extends K ? never
    : Pick<T, K> extends Required<Pick<T, K>> ? never
    : K]: never;
  }
  : never;

// Optional parameters of a regular factory that have no component to inject.
export type MissingOptionalKeys<Params, Components> = Exclude<
  OptionalKeys<Params>, KeysIn<OptionalKeys<Params>, keyof Components>
>;

// Parameters of a regular factory named like members of `Object`, e.g. `toString`, that have no component. Any object
// has such members, so a missing component would not be reported: `{}` is assignable to `{ toString: () => string }`.
// The keys are filtered by remapping, so that an index signature, e.g. `Record<string, X>`, gives none. A union is
// processed case by case: `keyof` of a union would return only the keys common to all cases.
export type MissingObjectMemberKeys<Params, Components> = Params extends unknown
  ? Exclude<ObjectMemberKeys<Params>, KeysIn<ObjectMemberKeys<Params>, keyof Components>>
  : never;

// Cases of a union parameter whose members of `Object` have components: only they can be provided.
export type ObjectMemberCases<Params, Components> = Params extends unknown
  ? [MissingObjectMemberKeys<Params, Components>] extends [never] ? Params : never
  : never;

// eslint-disable-next-line @typescript-eslint/no-wrapper-object-types
export type ObjectMemberKeys<T> = keyof { [K in keyof T as K extends keyof Object ? K : never]: never };

// The key in an error message. A numeric key, e.g. `0`, would be dropped by `K & string` and give no error.
export type KeyName<K> = K extends string | number ? `${K}` : K extends symbol ? '[symbol]' : never;

export type NotParameterAliasError<K extends PropertyKey> = {
  [P in `Error: "${KeyName<K>}" is not a parameter of the factory`]: never;
};

// An optional `aliases` field is checked too: the runtime uses it when it is present.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type GivenAliases<P> = 'aliases' extends keyof P ? NonNullable<P['aliases' & keyof P]> : {};

// Aliases given for the parameters that could be injected by their own names.
// Mapped over the keys of the given aliases, so that optional aliases stay optional. `Pick` turns `object` into `{}`:
// a mapped type over `object` itself would return `object`. Such an alias may be `undefined`, also without `?`:
// the parameter is injected by its own name then.
export type OptionalAliases<Components, Params, Given, Required, G = Pick<Given, keyof Given>> = {
  [K in keyof G as [KeysIn<K, CanonicalKey<keyof Required>>] extends [never] ? K : never]:
  [ParamKey<Params, K>] extends [never]
    ? NotParameterAliasError<K>
    : Alias<Components, Params[ParamKey<Params, K>]> | undefined;
};

// The parameter of the alias key: `0` for the alias `'0'`.
export type ParamKey<Params, K> = KeysIn<keyof Params, CanonicalKey<K>>;

export type AliasesField<Components, Params, Given, Required = RequiredAliases<Components, Params>> =
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  {} extends Required
    ? { aliases?: CheckedAliases<Components, Params, Given, Required> }
    : { aliases: CheckedAliases<Components, Params, Given, Required> };

// The checked form of each case of the given aliases. `keyof` of a union would return only the keys common to all
// cases, e.g. none for `{ a: 'x' } | { b: 'y' }`, and leave the aliases unchecked.
// A function or an array is rejected: the runtime requires a plain object, while the checked form of a function
// without properties would be `{}`.
export type CaseAliases<Components, Params, Given, Required> = Given extends unknown
  ? Given extends AnyFunction | Constructor | readonly unknown[] ? AliasesObjectError
  : DeepSimplify<Required & OptionalAliases<Components, Params, Given, Required>>
  : never;

// Cases of the given aliases that don't match their own checked form.
export type InvalidAliasCases<Components, Params, Given, Required> = Given extends unknown
  ? Given extends CaseAliases<Components, Params, Given, Required> ? never : Given
  : never;

// Union aliases are accepted only when each case matches its own checked form: checking the union as a whole would
// let a case match the checked form of another case, e.g. any aliases match `{}`.
export type CheckedAliases<
  Components, Params, Given, Required, Invalid = InvalidAliasCases<Components, Params, Given, Required>,
> = [Invalid] extends [never]
  ? CaseAliases<Components, Params, Given, Required>
  : Simplify<RejectingForm<CaseAliases<Components, Params, Invalid, Required>>>;

export type ResolveAliases<Aliases, Components> = {
  [K in keyof Aliases]: Components[Aliases[K] & keyof Components]
};

export type AliasedFactoryParams<Components, Params, Required = RequiredAliases<Components, Params>> =
  Simplify<ResolveAliases<Required, Components> & Omit<Params, keyof Required>>;

// Errors

export type OptionalParameterError<K extends PropertyKey> = {
  [P in `Error: optional parameter "${KeyName<K>}" has no component, provide it or wrap the factory`]: never;
};

export type ObjectMemberParameterError<K extends PropertyKey> = {
  [P in `Error: parameter "${KeyName<K>}" has no component, members of Object are not provided`]: never;
};

export type AmbiguousProviderError = {
  'Error: a provider can\'t have both "factory" and "multiFactory"': never;
};

export type MultiFactoryResultError = {
  'Error: a multi-factory must return an object, not a promise, an array, a function or null': never;
};

export type SymbolComponentKeyError = {
  'Error: a multi-factory must return an object with string keys': never;
};

export type VaryingKeysError = {
  'Error: a multi-factory result must have the same keys in every case, without optional ones': never;
};

export type MissingKeysError<K extends PropertyKey> = {
  [P in `Error: "keys" must list the component "${KeyName<K>}"`]: never;
};

export type DuplicateKeysError<K extends PropertyKey> = {
  [P in `Error: "keys" lists the component "${KeyName<K>}" more than once`]: never;
};

export type AliasesObjectError = {
  'Error: aliases must be a plain object': never;
};

export type KeysTupleError = {
  'Error: "keys" must be a tuple of the component keys, declare it "as const"': never;
};

export type MixedMultiFactoryError = {
  'Error: a multi-factory can\'t be combined in a union with a provider of another kind': never;
};

export type OptionalProviderError = {
  'Error: a provider can\'t be optional, it may be missing at runtime': never;
};

export type UncertainMakerError<F extends PropertyKey> = {
  [P in `Error: "${KeyName<F>}" must be a function, not optional or possibly another value`]: never;
};

export type SymbolKeyError = {
  'Error: a provider key must be a string': never;
};

export type ClassProvider = Constructor | { factory: Constructor } | { multiFactory: Constructor };

export type ClassProviderError = {
  'Error: a class can\'t be a provider, wrap it in a factory: deps => new Class(deps)': never;
};

// Functions that are left after the factory checks: they have more than one required parameter.
export type MultiParameterFunction = AnyFunction | { factory: AnyFunction } | { multiFactory: AnyFunction };

export type OverloadedFactoryError = {
  'Error: a factory can\'t be overloaded, wrap it in a factory with a single signature': never;
};

export type UnionParameterError<K extends PropertyKey> = {
  [P in `Error: component "${KeyName<K>}" doesn't match every case of the union parameter`]: never;
};

export type UnionParameterAliasesError = {
  'Error: a union parameter is supported only by a factory function, not by a factory with aliases or a multi-factory': never;
};

export type ThisParameterError = {
  'Error: a factory can\'t require "this", wrap it in an arrow function': never;
};

export type FactoryParametersError = {
  'Error: a factory takes a single dependencies parameter, wrap a function value in a factory: () => fn': never;
};

export type KeyCollisionError<K extends PropertyKey> = {
  [P in `Error: component "${KeyName<K>}" is provided more than once`]: never;
};

// Compared by the canonical form: a provider `0` collides with a result key `'0'`.
export type CollidingKeys<T, K extends keyof T, R> = KeysIn<keyof R, keyof ComponentTypes<Omit<T, K>>>;

export type WithoutCollisions<R, C extends PropertyKey> = [C] extends [never]
  ? R
  : Omit<R, C> & { [P in C]: KeyCollisionError<P> };

// Multi-factory results

// A class is a function at runtime. `Extract` checks each case of a union: a conditional type over `R` doesn't
// distribute inside the branch of `[R] extends [object]`.
export type IsValidMultiFactoryResult<R> = [R] extends [object]
  ? [Extract<R, PromiseLike<unknown> | readonly unknown[] | AnyFunction | Constructor>] extends [never] ? true : false
  : false;

export type GivenKeys<P> = P extends { keys: infer G extends readonly unknown[] } ? G : readonly [];

// Only a tuple without optional and rest elements tells which keys are listed: `('a' | 'b')[]` may be `['a']`.
export type IsFixedTuple<G extends readonly unknown[]> = number extends G['length'] ? false
  : G['length'] extends Required<G>['length'] ? true
  : false;

// Keys of the result missing in some case of the listed keys, e.g. `['a'] | ['b']`. Only a single key at a position
// is surely listed: `[key]` with `key: 'a' | 'b'` lists one of them.
// The listed keys are strings, while a result key may be a number, e.g. `{ 0: value }`.
export type MissingKeys<R, Given extends readonly unknown[]> = Given extends unknown
  ? KeysNotNamed<keyof R, DefiniteKeys<Given>>
  : never;

// Keys listed more than once in some case of the listed keys: the runtime rejects them.
export type DuplicateKeys<Given extends readonly unknown[]> = Given extends unknown
  ? CaseDuplicateKeys<Given, DefiniteKeys<Given>>
  : never;

// Tail-recursive, so that a long tuple doesn't exceed the instantiation depth: the duplicates are accumulated.
export type CaseDuplicateKeys<Keys extends readonly unknown[], All, Found = never, Duplicates = never> =
  Keys extends readonly [infer First, ...infer Rest]
    ? CaseDuplicateKeys<Rest, All, Found | DefiniteKey<First>, Duplicates | SureDuplicate<First, All, Found>>
    : Duplicates;

// A single key is a duplicate when it is listed before. A union element, e.g. `key: 'a' | 'b'` in `[key, 'a', 'b']`,
// is surely a duplicate when each of its keys is listed as a single key: in `[key, 'a']` it may be `'b'`.
// A wide key, e.g. `string`, may be any other key.
export type SureDuplicate<K, All, Found> = IsWideKey<K> extends true ? never
  : IsUnion<K> extends true ? [K] extends [All] ? K : never
  : K & Found;

// Keys without a name among the given ones: `0` and `'0'` are the same property.
export type KeysNotNamed<K, Names> = K extends unknown ? KeyName<K> extends Names ? never : K : never;

// Keys of every case of a union result.
export type AllKeys<R> = R extends unknown ? keyof R : never;

// Keys that may be missing in the result: present only in some cases of a union, or optional.
export type VaryingKeys<R> = Exclude<AllKeys<R>, keyof R> | (R extends unknown ? OptionalKeys<R> : never);

// The listed keys must be exactly the keys of the result, and the result must always have all of them.
export type MultiFactoryKeys<R, Given extends readonly unknown[]> = [Extract<AllKeys<R>, symbol>] extends [never]
  ? [VaryingKeys<R>] extends [never]
    ? false extends IsFixedTuple<Given> ? KeysTupleError
    : [DuplicateKeys<Given>] extends [never]
      ? [MissingKeys<R, Given>] extends [never] ? readonly KeyName<keyof R>[]
      : MissingKeysError<MissingKeys<R, Given>>
      : DuplicateKeysError<DuplicateKeys<Given>>
    : VaryingKeysError
  : SymbolComponentKeyError;

// Providers

export type FactoryProvider<T, K extends keyof T, F extends Factory, P> = {
  factory: (params: AliasedFactoryParams<OtherComponents<T, K>, FactoryParams<F>>) => ReturnType<F>;
} & AliasesField<OtherComponents<T, K>, FactoryParams<F>, GivenAliases<P>>;

export type MultiFactoryProvider<T, K extends keyof T, F extends Factory, P, R = ReturnType<F>> = (
  IsValidMultiFactoryResult<R> extends true
    ? {
      multiFactory: (
        params: AliasedFactoryParams<OtherComponents<T, K>, FactoryParams<F>>,
      ) => WithoutCollisions<R, CollidingKeys<T, K, R>>;
      keys: MultiFactoryKeys<R, GivenKeys<P>>;
    }
    : {
      multiFactory: (params: AliasedFactoryParams<OtherComponents<T, K>, FactoryParams<F>>) => MultiFactoryResultError;
      keys: readonly string[];
    }
) & AliasesField<OtherComponents<T, K>, FactoryParams<F>, GivenAliases<P>>;

export type RegularFactoryProvider<
  T, K extends keyof T, P, R,
  M = MissingOptionalKeys<NonNullable<P>, OtherComponents<T, K>>,
  O = MissingObjectMemberKeys<NonNullable<P>, OtherComponents<T, K>>,
> = [M] extends [never]
  ? [O] extends [never]
    ? IsUnion<NonNullable<P>> extends true
      ? UnionParameterFactory<PickKeys<OtherComponents<T, K>, AllKeys<NonNullable<P>>>, NonNullable<P>, R>
      : (providers: Simplify<PickCommonKeys<OtherComponents<T, K>, NonNullable<P>>>) => R
    : ObjectMemberUnionFactory<OtherComponents<T, K>, NonNullable<P>, R, O>
  : OptionalParameterError<M & PropertyKey>;

// A parameter whose member of `Object` has no component. In a union, e.g. `{ a: number } | { toString: F }`,
// the components must match another case: the factory type doesn't check it, because `{}` is assignable to the case
// with `toString`.
export type ObjectMemberUnionFactory<
  Components, P, R, Missing, Provided = PickKeys<Components, AllKeys<P>>, Cases = ObjectMemberCases<P, Components>,
> = [Cases] extends [never]
  ? ObjectMemberParameterError<Missing & PropertyKey>
  : Provided extends Cases ? UnionParameterFactory<Provided, P, R>
  : [MismatchedKeys<Provided, P>] extends [never] ? ObjectMemberParameterError<Missing & PropertyKey>
  : UnionParameterFactory<Provided, P, R>;

// A union parameter, e.g. `{ a: number } | { b: string }`, receives the components of the keys of all cases.
// The factory may choose a case by a key, `'b' in deps`, so a component must match every case that declares its key.
export type UnionParameterFactory<
  Provided, P, R, Mismatched = MismatchedKeys<Provided, P>,
> = [Mismatched] extends [never]
  ? (providers: Simplify<Provided>) => R
  : UnionParameterError<Mismatched & PropertyKey>;

export type MismatchedKeys<Provided, P> = {
  [Key in keyof Provided]: Provided[Key] extends CasesType<P, Key> ? never : Key
}[keyof Provided];

// The intersection of the types of the key in the cases that declare it. The types are boxed in function
// parameters, so that a union type of the key in one case is kept.
export type CasesType<P, Key> = CaseTypeBoxes<P, Key> extends (value: infer V) => void ? V : never;

export type CaseTypeBoxes<P, Key> = P extends unknown
  ? [KeyOf<P, Key>] extends [never] ? never : (value: ValueOf<P, Key>) => void
  : never;

export type PickKeys<T, Keys> = { [K in keyof T as K extends CanonicalKey<Keys> ? K : never]: T[K] };

// A `factory` or `multiFactory` property that may be a function or another value, e.g. an optional one: the runtime
// decides by the value whether the provider is a factory, so its kind is unknown.
export type UncertainMakerKey<P, F = keyof P & ('factory' | 'multiFactory')> = F extends keyof P
  ? P[F] extends AnyFunction ? never : MayBeFunction<P[F]> extends true ? F : never
  : never;

// A union with a function or a class case, also a function with own properties, or a type that includes functions:
// `unknown`, `{}` or `object`.
export type MayBeFunction<V> = [Extract<V, AnyFunction | Constructor>] extends [never]
  ? AnyFunction extends V ? true : false
  : true;

export type HasUncertainMaker<P> = [UncertainMakerKey<P>] extends [never] ? false : true;

// The property with the function, like the runtime chooses it: `{ factory: 'metadata', multiFactory: f }` is
// a multi-factory.
export type MakerKey<P> = P extends { factory: AnyFunction } ? 'factory'
  : P extends { multiFactory: AnyFunction } ? 'multiFactory'
  : never;

export type MakerOf<P> = P[MakerKey<P> & keyof P];

// A union function type in `factory` or `multiFactory`, e.g. `condition ? f1 : f2`, is split into a union of
// providers: the aliases and the keys of the provider are used with each function.
export type SplitMaker<P, Key extends keyof P = MakerKey<P> & keyof P> = P[Key] extends infer F
  ? F extends unknown ? Omit<P, Key> & { [M in Key]: F } : never
  : never;

// The provider is accepted as is when each of its split cases is valid.
export type CheckedSplitProvider<T, K extends keyof T, P, Invalid = InvalidCases<T, K, SplitMaker<P>>> =
  [Invalid] extends [never] ? P : RejectingForm<CheckedProvider<T, K, Invalid>>;

// Checks the provider P of the key K. It distributes over a union provider, e.g. `condition ? factory : value`,
// so that each case is checked. A function is checked first: the runtime calls it even when it has a `factory`
// or `multiFactory` property.
export type CheckedProvider<T, K extends keyof T, P> =
  P extends AnyFunction ? CheckedFunctionProvider<T, K, P>
  : P extends ClassProvider ? ClassProviderError
  : P extends { factory: AnyFunction; multiFactory: AnyFunction } ? AmbiguousProviderError
  : HasUncertainMaker<P> extends true ? UncertainMakerError<UncertainMakerKey<P>>
  : IsUnion<MakerOf<P>> extends true ? CheckedSplitProvider<T, K, P>
  : P extends { factory: infer F extends Factory } ? CheckedMaker<F, P, FactoryProvider<T, K, F, P>>
  : P extends { multiFactory: infer F extends Factory } ? CheckedMaker<F, P, MultiFactoryProvider<T, K, F, P>>
  : P extends MultiParameterFunction ? FactoryParametersError
  : P;

export type CheckedFunctionProvider<T, K extends keyof T, P> =
  P extends Constructor ? ClassProviderError
  : true extends IsOverloaded<P> ? OverloadedFactoryError
  : true extends HasWrongThis<P, undefined> ? ThisParameterError
  : P extends Factory<infer Params, infer R> ? RegularFactoryProvider<T, K, Params, R>
  : FactoryParametersError;

// The types of an overloaded factory are taken from its last signature, while the runtime may match another one.
// Inference from several signatures to several ones is pairwise from the last ones: the last four signatures are
// compared, and a function with fewer signatures fills the first slots with its first one. A function with a single
// signature, also a generic one, gives the same signature in all slots. Overloads are missed only behind four
// identical last signatures: checking that the last signature is assignable to the function would find them, but
// would reject every generic factory.
export type IsOverloaded<F> = F extends {
  (...args: infer A1): infer R1;
  (...args: infer A2): infer R2;
  (...args: infer A3): infer R3;
  (...args: infer A4): infer R4;
} ? AreIdentical<[A1, R1], [[A2, R2], [A3, R3], [A4, R4]]> extends true ? false : true
  : false;

// Compared one by one: comparing the tuples of the slots as a whole is false for identical signatures declared
// separately.
export type AreIdentical<S, Others extends unknown[]> = Others extends [infer First, ...infer Rest]
  ? IsIdentical<S, First> extends true ? AreIdentical<S, Rest> : false
  : true;

// Identity, not mutual assignability: `{ port: number; host?: string }` and `{ port: number }` are assignable to each
// other, but an implementation may read `host` that has no component.
export type IsIdentical<A, B> = IsIdenticalType<A, B>;

// The runtime calls a function provider without `this`, and a `factory` or `multiFactory` as a method of its provider.
// Exactly `this: void` doesn't use the context, so it is accepted in both cases; a type that only includes
// `undefined`, e.g. `{ port: number } | undefined`, must accept the provider object.
export type HasWrongThis<F, This> = F extends unknown
  ? This extends ThisParameterType<F> ? false : IsIdentical<ThisParameterType<F>, void> extends true ? false : true
  : never;

// Checks the `factory` or `multiFactory` function F of the provider P. `true extends` checks each case of a union
// function type: the result of a union may be `boolean`.
export type CheckedMaker<F, P, Checked> =
  true extends IsOverloaded<F> ? OverloadedFactoryError
  : true extends HasWrongThis<F, P> ? ThisParameterError
  : true extends HasUnionParameter<F> ? UnionParameterAliasesError
  : Checked;

export type HasUnionParameter<F> = F extends Factory ? IsUnion<FactoryParams<F>> : never;

// A union of a multi-factory with a provider of another kind: it is unknown which components it provides.
export type IsMixedMultiFactory<P> = [MultiFactoryCase<P>] extends [never] ? false
  : [P] extends [MultiFactoryCase<P>] ? false
  : true;

// The provider of an optional key may be missing at runtime. Keys like `toString` are not optional: `Pick` keeps
// their own type, while `{} extends Pick<T, K>` would be true for them.
export type IsOptionalKey<T, K extends keyof T> = Pick<T, K> extends Required<Pick<T, K>> ? false : true;

// Cases of a union provider that don't match their own checked form.
export type InvalidCases<T, K extends keyof T, P> = P extends unknown
  ? P extends CheckedProvider<T, K, P> ? never : P
  : never;

// A union provider is accepted only when each case matches its own checked form: checking the union as a whole
// would let a case match the checked form of another case, e.g. any aliases match `aliases?: {}`.
export type CheckedUnionProvider<T, K extends keyof T, P> = [InvalidCases<T, K, P>] extends [never]
  ? P
  : RejectingForm<CheckedProvider<T, K, InvalidCases<T, K, P>>>;

// The checked forms of invalid cases are intersected, not united: an invalid case could match the form of another
// one, e.g. `{ a?: 'x' }` matches `{ b?: 'y' }`, while it never matches the intersection that includes its own form.
export type RejectingForm<Forms> = UnionToIntersection<Forms>;

export type ProvidersObjectError = {
  'Error: providers must be a plain object, not an array, a function or a class': never;
};

// Arrays, functions and classes are objects, but their members are inherited or not enumerable. `Extract` finds them
// also in a case of a union, e.g. `condition ? Class : { value: 42 }`: a distributive check would give
// `ProvidersObjectError | object`, which accepts any case.
export type ProvidersObject<T> = [Extract<T, readonly unknown[] | AnyFunction | Constructor>] extends [never]
  ? object
  : ProvidersObjectError;

export type Providers<T> = {
  [K in keyof T]: K extends symbol ? SymbolKeyError
  : IsOptionalKey<T, K> extends true ? OptionalProviderError
  : IsMixedMultiFactory<T[K]> extends true ? MixedMultiFactoryError
  : IsUnion<T[K]> extends true ? CheckedUnionProvider<T, K, T[K]>
  : CheckedProvider<T, K, T[K]>;
};

// Resolver

// Keys that are surely resolved: a single key at a fixed position of the tuple. A key passed as a union,
// e.g. `key: 'a' | 'b'`, as a wide type, e.g. `string`, or in the rest part of a tuple, e.g. `...'c'[]`,
// gives an optional field.
// The recursion is in the tail position with an accumulator, so that TypeScript allows long tuples.
export type DefiniteKeys<Keys extends readonly unknown[], Found = never> =
  Keys extends readonly [infer First, ...infer Rest] ? DefiniteKeys<Rest, Found | DefiniteKey<First>>
  : Keys extends readonly [...infer Rest, infer Last] ? DefiniteKeys<Rest, Found | DefiniteKey<Last>>
  : Found;

export type DefiniteKey<K> = IsUnion<K> extends true ? never : IsWideKey<K> extends true ? never : K;

// A type of many keys, e.g. `string` or `` `id${string}` ``: an object without properties matches its record.
// eslint-disable-next-line @typescript-eslint/no-empty-object-type
export type IsWideKey<K> = {} extends Record<K & PropertyKey, 1> ? true : false;

// Keys that are surely resolved in every case of a union of tuples, e.g. `['a', 'b'] | ['a', 'c']` gives `'a'`.
// The definite keys are collected per case rather than taken from `Keys[number]`, where a wide key absorbs
// the literal ones: `'a' | string` is `string`.
export type CommonDefiniteKeys<
  Keys extends readonly unknown[], All = AllDefiniteKeys<Keys>,
> = Exclude<All, MaybeMissingKeys<Keys, All>>;

export type AllDefiniteKeys<Keys extends readonly unknown[]> = Keys extends unknown ? DefiniteKeys<Keys> : never;

// Definite keys of some case that may be missing in another case.
export type MaybeMissingKeys<Case extends readonly unknown[], All> = Case extends unknown
  ? Exclude<All, DefiniteKeys<Case>>
  : never;

// A key may be given in both forms, `0` or `'0'`: the fields have canonical keys.
export type ResolvedComponents<
  C, Keys extends readonly ResolverKey<C>[],
  Canonical extends readonly unknown[] = CanonicalTuple<Keys>, Definite = CommonDefiniteKeys<Canonical>,
> = Simplify<
  { [K in Definite & PropertyKey]: ValueOf<C, K> }
  & { [K in Exclude<Canonical[number], Definite> & PropertyKey]?: ValueOf<C, K> }
>;

export type CanonicalTuple<Keys extends readonly unknown[]> = { [I in keyof Keys]: CanonicalKey<Keys[I]> };
