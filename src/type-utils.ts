export type PickByValue<O, T> = {
  // The value is narrowed again: without it, TypeScript can't prove that the picked values extend T.
  [K in keyof O as O[K] extends T ? K : never]: O[K] extends T ? O[K] : never;
};

export type UnionToIntersection<U> =
  (U extends unknown ? (arg: U) => void : never) extends
  (arg: infer I) => void
    ? I
    : never;

// True for any union, also when its cases are subtypes of each other: `{ a: string } | { a: string | number }`, or
// assignable to each other: `{ a?: 1 } | { b?: 2 }`. Each case is compared with the whole type by identity:
// assignability can't tell such cases apart.
export type IsUnion<T, All = T> = [T] extends [never] ? false
  : T extends unknown ? IsIdenticalType<T, All> extends true ? false : true
  : never;

export type IsIdenticalType<A, B> = (<T>() => T extends A ? 1 : 2) extends (<T>() => T extends B ? 1 : 2)
  ? true
  : false;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type Simplify<T> = T extends Function ? T : T extends object ? { [K in keyof T]: T[K] } : T;

// eslint-disable-next-line @typescript-eslint/no-unsafe-function-type
export type DeepSimplify<T> = T extends Function
  ? T
  : T extends object ? { [K in keyof T]: DeepSimplify<T[K]> } : T;
