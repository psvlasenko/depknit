// Compile-time errors of the public API that have no runtime behavior to assert. The file is only type-checked:
// `sut` is declared, so a call would throw. Each block matches a `describe` block of `resolver.test.ts`.
import type { makeDependencyResolver } from '../resolver.js';

declare const sut: typeof makeDependencyResolver;

// optional factory field
{
  // that may be not a function is a type error
  const provider: { factory: (() => number) | undefined } = { factory: () => 42 };

  // @ts-expect-error it is unknown whether the provider is a factory
  sut({ answer: provider });
}

// overloaded factory
{
  function describeCount(deps: { count: number }): number;
  function describeCount(deps: { name: string }): string;
  function describeCount(deps: { count?: number; name?: string }): number | string {
    return deps.count ?? deps.name ?? '';
  }

  // in a factory with aliases is a type error
  sut({
    count: 42,
    name: 'text',
    // @ts-expect-error the result type would be taken from the last signature
    description: { factory: describeCount },
  });

  // in a union factory type is a type error
  const factory: typeof describeCount | ((deps: { name: string }) => string) = describeCount;

  sut({
    count: 42,
    name: 'text',
    // @ts-expect-error the result type would be taken from the last signature
    description: { factory },
  });
}

// factory requiring this
{
  function createUrl(this: { port: number }, { host }: { host: string }) {
    return `${host}:${this.port}`;
  }

  // in a factory with aliases is a type error
  sut({
    localHost: 'localhost',
    // @ts-expect-error this is the provider object
    url: { factory: createUrl, aliases: { host: 'localHost' } },
  });

  // that requires its provider is a type error in a multi-factory
  sut({
    host: 'localhost',
    // @ts-expect-error this is the provider object
    urls: { multiFactory: function (this: { port: number }) { return { url: `:${this.port}` }; }, keys: ['url'] },
  });
}

// optional alias
{
  const format = ({ count }: { count: number }) => count.toFixed(2);

  // is required when the parameter has no component
  const provider: { factory: typeof format; aliases?: { count?: 'otherCount' } } = { factory: format, aliases: {} };

  // @ts-expect-error count has no component, so its alias is required
  sut({ otherCount: 2, formatted: provider });

  // to a component of a wrong type is a type error
  const wrongProvider: { factory: typeof format; aliases: { count?: 'text' } } = { factory: format, aliases: {} };

  // @ts-expect-error text is not a number
  sut({ count: 1, text: 'abc', formatted: wrongProvider });
}

// union of functions in a factory with aliases
{
  const flag = Math.random() < 2;
  const countValue = ({ a }: { a: number }) => a;
  const nameValue = ({ b }: { b: string }) => b;

  // with an alias that is not a parameter of every function is a type error
  sut({
    other: 1,
    b: 'text',
    // @ts-expect-error a is not a parameter of nameValue
    service: { factory: flag ? countValue : nameValue, aliases: { a: 'other' } },
  });
}

// union parameter of a factory
{
  const describeDeps = (deps: { count: number } | { name: string }) => 'name' in deps ? deps.name : deps.count;

  // without components of any case is a type error
  sut({
    other: 1,
    // @ts-expect-error neither count nor name is provided
    description: describeDeps,
  });

  // in a factory with aliases is a type error
  sut({
    count: 42,
    name: 'text',
    // @ts-expect-error a union parameter is supported only by a factory function
    description: { factory: describeDeps },
  });
}

// numeric key
{
  // of a component of a wrong type is a type error in a parameter and an alias
  const values: Record<'0', string> = { 0: 'text' };

  sut({
    ...values,
    // @ts-expect-error 0 is not a number
    service: ({ 0: value = 0 }: { 0?: number }) => value,
    // @ts-expect-error 0 is not a number
    aliased: { factory: ({ value }: { value: number }) => value, aliases: { value: '0' } },
  });

  // of a provider is not available to the provider itself in the other form
  sut({
    // @ts-expect-error 0 can't depend on itself
    0: (deps: Record<'0', number>) => deps[0],
  });
}

// symbol alias
{
  const token = Symbol('token');

  // that is not a parameter is a type error
  sut({
    value: 42,
    // @ts-expect-error token is not a parameter
    service: { factory: ({ value }: { value: number }) => value, aliases: { [token]: 'value' } },
  });
}

// union of aliases
{
  const flag = Math.random() < 2;
  const format = ({ count, name }: { count: number; name: string }) => count.toFixed() + name;

  // with a case aliasing a component of a wrong type is a type error
  const swapped: { count: 'name' } | { name: 'count' } = flag ? { count: 'name' } : { name: 'count' };

  // @ts-expect-error name is not a number, count is not a string
  sut({ count: 42, name: 'text', service: { factory: format, aliases: swapped } });

  // with an invalid case next to an empty one is a type error
  // eslint-disable-next-line @typescript-eslint/no-empty-object-type
  const partlyEmpty: { count: 'name' } | {} = flag ? { count: 'name' } : {};

  // @ts-expect-error name is not a number
  sut({ count: 42, name: 'text', service: { factory: format, aliases: partlyEmpty } });

  // with a case aliasing an unknown parameter is a type error
  const unknownKey: { count: 'count' } | { other: 'count' } = flag ? { count: 'count' } : { other: 'count' };

  // @ts-expect-error other is not a parameter of the factory
  sut({ count: 42, name: 'text', service: { factory: format, aliases: unknownKey } });
}

// union of aliases with optional keys
{
  const flag = Math.random() < 2;
  const format = ({ count, name, shared }: { count: number; name: string; shared: boolean }) =>
    count.toFixed() + name + String(shared);

  // with an invalid case matching the checked form of another case is a type error
  const crossed: { count?: 'name'; shared: 'shared' } | { name?: 'count'; shared: 'shared' } = flag
    ? { count: 'name', shared: 'shared' }
    : { name: 'count', shared: 'shared' };

  // @ts-expect-error name is not a number, count is not a string
  sut({ count: 42, name: 'text', shared: true, service: { factory: format, aliases: crossed } });
}

// union provider with aliases with optional keys
{
  const flag = Math.random() < 2;
  const format = ({ count, name, shared }: { count: number; name: string; shared: boolean }) =>
    count.toFixed() + name + String(shared);
  const countAliases: { count?: 'name'; shared: 'shared' } = { count: 'name', shared: 'shared' };
  const nameAliases: { name?: 'count'; shared: 'shared' } = { name: 'count', shared: 'shared' };

  sut({
    count: 42,
    name: 'text',
    shared: true,
    // @ts-expect-error an invalid case matches the checked form of another case
    service: flag ? { factory: format, aliases: countAliases } : { factory: format, aliases: nameAliases },
  });
}
