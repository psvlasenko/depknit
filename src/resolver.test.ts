import { describe, it } from 'node:test';
import { inspect } from 'node:util';
import type { Resolver } from './resolver.js';
import { makeDependencyResolver } from './resolver.js';
import assert from 'node:assert';

describe('dependency resolver', () => {
  const userServiceSymbol = Symbol('user service');
  const customerServiceSymbol = Symbol('customer service');
  const idServiceSymbol = Symbol('id service');

  it('repeated calls cause an error', () => {
    type A = { kind: typeof userServiceSymbol };
    type B = { kind: typeof idServiceSymbol };

    const createUserService = (): A => ({ kind: userServiceSymbol });
    const createIdService = (): B => ({ kind: idServiceSymbol });

    const resolve = makeDependencyResolver({
      idService: createIdService,
      userService: createUserService,
    });

    const fail = () => {
      resolve('userService');
      resolve('idService');
    }; // act

    assert.throws(fail);
  });

  it('circular dependencies cause an error', () => {
    type UserService = {
      kind: typeof userServiceSymbol;
      getIdService: () => IdService;
    };

    type IdService = {
      kind: typeof idServiceSymbol;
      getUserService: () => UserService;
    };

    const createUserService = ({ idService }: { idService: IdService }): UserService => ({
      kind: userServiceSymbol,
      getIdService: () => idService,
    });

    const createIdService = ({ userService }: { userService: UserService }): IdService => ({
      kind: idServiceSymbol,
      getUserService: () => userService,
    });

    const resolve = makeDependencyResolver({
      idService: createIdService,
      userService: createUserService,
    });

    const fail = () => {
      resolve('userService');
    };

    assert.throws(
      fail,
      err => err instanceof Error && err.message.includes('userService -> idService -> userService'),
    );
  });

  describe('returns requested single instance with resolved dependencies', () => {
    it('when resolver parameters contains only factories without aliases', () => {
      type UserService = {
        kind: typeof userServiceSymbol;
        getIdService: () => IdService;
      };

      type IdService = {
        kind: typeof idServiceSymbol;
      };

      const createUserService = ({ idService }: { idService: IdService }): UserService => ({
        kind: userServiceSymbol,
        getIdService: () => idService,
      });

      const createIdService = (): IdService => ({ kind: idServiceSymbol });

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userService: createUserService,
      });

      const userService = resolve('userService'); // act

      assert.equal(userService.kind, userServiceSymbol);
      assert.equal(userService.getIdService().kind, idServiceSymbol);
    });

    it('when resolver params contains component instance', () => {
      type UserService = {
        kind: typeof userServiceSymbol;
        getIdService: () => IdService;
      };

      type IdService = {
        kind: typeof idServiceSymbol;
      };

      const createUserService = ({ idService }: { idService: IdService }): UserService => {
        return ({
          kind: userServiceSymbol,
          getIdService: () => idService,
        });
      };

      const idService: IdService = { kind: idServiceSymbol };

      const resolve = makeDependencyResolver({
        idService,
        userService: createUserService,
      });

      const userService = resolve('userService'); // act

      assert.equal(userService.kind, userServiceSymbol);
      assert.equal(userService.getIdService().kind, idServiceSymbol);
    });

    it('when resolver parameters contains factories with aliases', () => {
      type UserService = {
        kind: typeof userServiceSymbol;
        getIdService: () => IdService;
      };

      type IdService = { kind: typeof idServiceSymbol };

      type UserServiceDeps = { paramIdService: IdService };

      const createUserService = ({ paramIdService }: UserServiceDeps): UserService => ({
        kind: userServiceSymbol,
        getIdService: () => paramIdService,
      });

      const createIdService = (): IdService => ({ kind: idServiceSymbol });

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userService: {
          factory: createUserService,
          aliases: {
            paramIdService: 'idService',
          },
        },
      });

      const userService = resolve('userService'); // act

      assert.equal(userService.kind, userServiceSymbol);
      assert.equal(userService.getIdService().kind, idServiceSymbol);
    });

    it('when resolver parameters contains multiFactories with aliases', () => {
      type IdService = { kind: typeof idServiceSymbol };

      const createIdService = (): IdService => ({ kind: idServiceSymbol });

      const makeUserModule = ({ paramIdService }: { paramIdService: IdService }) => ({
        userService: {
          kind: userServiceSymbol,
          getIdService: () => paramIdService,
        },
        customerService: {
          kind: customerServiceSymbol,
          getIdService: () => paramIdService,
        },
      });

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userModule: {
          multiFactory: makeUserModule,
          keys: ['userService', 'customerService'],
          aliases: {
            paramIdService: 'idService',
          },
        },
      });

      const { userService, customerService } = resolve('userService', 'customerService'); // act

      assert.equal(userService.kind, userServiceSymbol);
      assert.equal(userService.getIdService().kind, idServiceSymbol);
      assert.equal(customerService.kind, customerServiceSymbol);
      assert.equal(customerService.getIdService().kind, idServiceSymbol);
    });
  });

  it('returns dictionary of requested instances, when more than one instance requested to resolve', () => {
    type UserService = {
      kind: typeof userServiceSymbol;
      getIdService: () => IdService;
    };

    type IdService = {
      kind: typeof idServiceSymbol;
    };

    const createUserService = ({ idService }: { idService: IdService }): UserService => ({
      kind: userServiceSymbol,
      getIdService: () => idService,
    });

    const createIdService = (): IdService => ({ kind: idServiceSymbol });

    const resolve = makeDependencyResolver({
      idService: createIdService,
      userService: createUserService,
    });

    const { userService, idService } = resolve('userService', 'idService'); // act

    assert.equal(userService.kind, userServiceSymbol);
    assert.equal(idService.kind, idServiceSymbol);
  });

  it('all components have got the same instance of injected service', () => {
    type UserService = {
      kind: typeof userServiceSymbol;
      getIdService: () => IdService;
    };

    type CustomerService = {
      kind: typeof customerServiceSymbol;
      getIdService: () => IdService;
    };

    type IdService = {
      kind: typeof idServiceSymbol;
    };

    const createUserService = ({ idService }: { idService: IdService }): UserService => ({
      kind: userServiceSymbol,
      getIdService: () => idService,
    });

    const createCustomerService = ({ idService }: { idService: IdService }): CustomerService => ({
      kind: customerServiceSymbol,
      getIdService: () => idService,
    });

    const createIdService = (): IdService => ({ kind: idServiceSymbol });

    const resolve = makeDependencyResolver({
      idService: createIdService,
      userService: createUserService,
      customerService: createCustomerService,
    });

    const { userService, customerService } = resolve('userService', 'customerService'); // act

    assert.equal(userService.getIdService(), customerService.getIdService());
  });

  describe('multiFactory', () => {
    type IdService = { kind: typeof idServiceSymbol };

    type UserService = {
      kind: typeof userServiceSymbol;
      getIdService: () => IdService;
    };

    type CustomerService = {
      kind: typeof customerServiceSymbol;
      getIdService: () => IdService;
    };

    type UserModule = {
      userService: UserService;
      customerService: CustomerService;
    };

    const createIdService = (): IdService => ({ kind: idServiceSymbol });

    const makeUserModule = ({ idService }: { idService: IdService }): UserModule => ({
      userService: {
        kind: userServiceSymbol,
        getIdService: () => idService,
      },
      customerService: {
        kind: customerServiceSymbol,
        getIdService: () => idService,
      },
    });

    it('is called once, when several of its components requested', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userModule: {
          multiFactory: (deps: { idService: IdService }) => {
            calls++;

            return makeUserModule(deps);
          },
          keys: ['userService', 'customerService'],
        },
      });

      const { userService, customerService } = resolve('userService', 'customerService'); // act

      assert.equal(calls, 1);
      assert.equal(userService.getIdService(), customerService.getIdService());
    });

    it('is not called, when none of its components requested', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userModule: {
          multiFactory: (deps: { idService: IdService }) => {
            calls++;

            return makeUserModule(deps);
          },
          keys: ['userService', 'customerService'],
        },
      });

      resolve('idService'); // act

      assert.equal(calls, 0);
    });

    it('its components are injected into regular factories', () => {
      const orderServiceSymbol = Symbol('order service');

      const resolve = makeDependencyResolver({
        idService: createIdService,
        userModule: {
          multiFactory: makeUserModule,
          keys: ['userService', 'customerService'],
        },
        orderService: ({ userService }: { userService: UserService }) => ({
          kind: orderServiceSymbol,
          getUserService: () => userService,
        }),
      });

      const { orderService, userService } = resolve('orderService', 'userService'); // act

      assert.equal(orderService.kind, orderServiceSymbol);
      assert.equal(orderService.getUserService(), userService);
    });

    it('may depend on components of another multiFactory declared later', () => {
      const resolve = makeDependencyResolver({
        userModule: {
          multiFactory: makeUserModule,
          keys: ['userService', 'customerService'],
        },
        idModule: {
          multiFactory: () => ({ idService: createIdService() }),
          keys: ['idService'],
        },
      });

      const userService = resolve('userService'); // act

      assert.equal(userService.getIdService().kind, idServiceSymbol);
    });

    it('components of several multiFactories are resolved together', () => {
      const resolve = makeDependencyResolver({
        idModule: {
          multiFactory: () => ({ idService: createIdService() }),
          keys: ['idService'],
        },
        userModule: {
          multiFactory: makeUserModule,
          keys: ['userService', 'customerService'],
        },
      });

      const { idService, userService } = resolve('idService', 'userService'); // act

      assert.equal(userService.getIdService(), idService);
    });

    it('circular dependency with a regular factory causes an error', () => {
      const resolve = makeDependencyResolver({
        idService: ({ userService }: { userService: UserService }): IdService => {
          void userService;

          return { kind: idServiceSymbol };
        },
        userModule: {
          multiFactory: makeUserModule,
          keys: ['userService', 'customerService'],
        },
      });

      const fail = () => {
        resolve('userService');
      };

      assert.throws(
        fail,
        err => err instanceof Error && err.message.includes('userModule -> idService -> userModule'),
      );
    });

    it('component provided by a multiFactory and a regular provider causes an error', () => {
      const fail = () => makeDependencyResolver({
        idService: createIdService,
        userModule: {
          // @ts-expect-error userService is provided twice
          multiFactory: (): UserModule => makeUserModule({ idService: createIdService() }),
          keys: ['userService', 'customerService'],
        },
        userService: (): UserService => ({ kind: userServiceSymbol, getIdService: createIdService }),
      });

      assert.throws(
        fail,
        err => err instanceof Error
          && err.message === 'Component "userService" is provided by both "userModule" and "userService"',
      );
    });

    it('component provided by two multiFactories causes an error', () => {
      const fail = () => makeDependencyResolver({
        // @ts-expect-error idService is provided twice
        firstModule: { multiFactory: () => ({ idService: createIdService() }), keys: ['idService'] },
        // @ts-expect-error idService is provided twice
        secondModule: { multiFactory: () => ({ idService: createIdService(), other: 1 }), keys: ['idService', 'other'] },
      });

      assert.throws(
        fail,
        err => err instanceof Error
          && err.message === 'Component "idService" is provided by both "firstModule" and "secondModule"',
      );
    });

    it('dependency on its own component causes an error', () => {
      const resolve = makeDependencyResolver({
        userModule: {
          multiFactory: ({ userService }: { userService: UserService }): UserModule => ({
            userService: { kind: userServiceSymbol, getIdService: () => createIdService() },
            customerService: { kind: customerServiceSymbol, getIdService: () => userService.getIdService() },
          }),
          keys: ['userService', 'customerService'],
          // @ts-expect-error multiFactory can't depend on its own components
          aliases: {},
        },
      });

      const fail = () => {
        resolve('customerService');
      };

      assert.throws(
        fail,
        err => err instanceof Error && err.message === 'Circular dependency: userModule -> userModule',
      );
    });

    it('its component is injected into a regular factory that another multiFactory depends on', () => {
      const providers = {
        service: ({ x }: { x: number }) => x + 1,
        first: { multiFactory: ({ service }: { service: number }) => ({ y: service }), keys: ['y'] },
        second: { multiFactory: () => ({ x: 1 }), keys: ['x'] },
      } as const;

      const { first, second, service } = providers;

      assert.equal(makeDependencyResolver(providers)('service'), 2); // act
      assert.equal(makeDependencyResolver({ second, first, service })('service'), 2);
    });

    it('is not called, when a component of another multiFactory is requested', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        userModule: {
          multiFactory: (deps: { idService: IdService }) => {
            calls++;

            return makeUserModule(deps);
          },
          keys: ['userService', 'customerService'],
        },
        idModule: { multiFactory: () => ({ idService: createIdService() }), keys: ['idService'] },
      });

      resolve('idService'); // act

      assert.equal(calls, 0);
    });

    it('getter of its result is called once', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        valueModule: {
          multiFactory: () => ({
            get value() {
              calls++;

              return {};
            },
          }),
          keys: ['value'],
        },
        consumer: ({ value }: { value: object }) => value,
      });

      const { value, consumer } = resolve('value', 'consumer'); // act

      assert.equal(value, consumer);
      assert.equal(calls, 1);
    });

    it('components are cached only when all of them are read', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        module: {
          multiFactory: () => {
            const call = ++calls;

            return {
              first: { call },
              get second() {
                if (call === 1) {
                  throw new Error('getter error');
                }

                return call;
              },
            };
          },
          keys: ['first', 'second'],
        },
        service: (deps: { first: { call: number }; second: number }) => {
          assert.throws(() => deps.first, err => err instanceof Error && err.message === 'getter error');

          return { first: deps.first, second: deps.second };
        },
      });

      const { service, first } = resolve('service', 'first'); // act

      assert.equal(service.first, first);
      assert.deepEqual(service, { first: { call: 2 }, second: 2 });
      assert.equal(calls, 2);
    });

    it('component named like an Object.prototype member is resolved', () => {
      const resolve = makeDependencyResolver({
        module: { multiFactory: () => ({ toString: 42 }), keys: ['toString'] },
      });

      assert.equal(resolve('toString'), 42);
    });

    it('inherited property listed in keys causes an error', () => {
      const resolve = makeDependencyResolver({
        // `__proto__` with a primitive value doesn't define a property, while the type has it.
        module: { multiFactory: () => ({ __proto__: 42 }), keys: ['__proto__'] },
      });

      assert.throws(
        () => resolve('__proto__'),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" didn\'t return the component "__proto__" listed in "keys"',
      );
    });

    it('null result causes an error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error null is not an object
        module: { multiFactory: () => null, keys: ['x'] },
      });

      assert.throws(
        () => resolve('x' as never),
        err => err instanceof Error && err.message === 'Multi-factory "module" must return an object, got null',
      );
    });

    it('array result causes an error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error an array is not allowed
        module: { multiFactory: () => [1], keys: ['0'] },
      });

      assert.throws(
        () => resolve('0' as never),
        err => err instanceof Error && err.message === 'Multi-factory "module" must return an object, got an array',
      );
    });

    it('promise result causes an error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error a promise is not allowed
        module: { multiFactory: async () => ({ x: 1 }), keys: ['x'] },
      });

      assert.throws(
        () => resolve('x' as never),
        err => err instanceof Error && err.message === 'Multi-factory "module" must return an object, got a promise',
      );
    });

    it('component named then is resolved, and its getter is called once', () => {
      let calls = 0;

      const resolve = makeDependencyResolver({
        thenModule: {
          multiFactory: () => ({
            get then() {
              calls++;

              return () => 42;
            },
          }),
          keys: ['then'],
        },
      });

      const then = resolve('then'); // act

      assert.equal(then(), 42);
      assert.equal(calls, 1);
    });

    it('result with keys that may be missing is a type error', () => {
      const createUnion = (): { a: number } | { b: number } => ({ a: 1 });
      const createOptional = (): { a: number; b?: number } => ({ a: 1 });

      const resolve = makeDependencyResolver({
        // @ts-expect-error a and b are present only in some cases
        unionModule: { multiFactory: createUnion, keys: [] },
        // @ts-expect-error b is optional
        optionalModule: { multiFactory: createOptional, keys: ['a', 'b'] },
      });

      assert.throws(
        () => resolve('a'),
        err => err instanceof Error
          && err.message === 'Multi-factory "optionalModule" didn\'t return the component "b" listed in "keys"',
      );
    });

    it('cases of a union result are merged into a union of component types', () => {
      const createModule = (): { value: number } | { value: string } => ({ value: 'text' });

      const resolve = makeDependencyResolver({
        module: { multiFactory: createModule, keys: ['value'] },
      });

      const value: number | string = resolve('value'); // act

      assert.equal(value, 'text');
    });

    it('dependency on a merged component must accept every case', () => {
      const createModule = (): { value: number } | { value: string } => ({ value: 'text' });

      const resolve = makeDependencyResolver({
        module: { multiFactory: createModule, keys: ['value'] },
        // @ts-expect-error value may be a string
        formatted: ({ value }: { value: number }) => value.toFixed(2),
      });

      assert.throws(() => resolve('formatted'), TypeError);
    });

    it('cases of a union result that are subtypes of each other are merged too', () => {
      const createModule = (): { value: string } | { value: string | number } => ({ value: 42 });

      const resolve = makeDependencyResolver({
        module: { multiFactory: createModule, keys: ['value'] },
        // @ts-expect-error value may be a number
        upper: ({ value }: { value: string }) => value.toUpperCase(),
      });

      assert.throws(() => resolve('upper'), TypeError);
    });

    it('union with a provider of another kind is a type error', () => {
      const flag = Math.random() < 2;

      const resolve = makeDependencyResolver({
        // @ts-expect-error it is unknown which components the provider provides
        module: flag ? { multiFactory: () => ({ value: 1 }), keys: ['value'] } : 1,
      });

      assert.equal(resolve('value' as never), 1);
    });

    it('symbol key in its result causes an error', () => {
      const key = Symbol('component');

      const resolve = makeDependencyResolver({
        // @ts-expect-error component keys must be strings
        module: { multiFactory: () => ({ x: 1, [key]: 42 }), keys: ['x'] },
      });

      assert.throws(
        () => resolve('x' as never),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" returned the symbol key Symbol(component). Component keys must be strings',
      );
    });

    it('key listed in keys but missing in its result causes an error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error y is not returned
        module: { multiFactory: () => ({ x: 1 }), keys: ['x', 'y'] },
      });

      assert.throws(
        () => resolve('x' as never),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" didn\'t return the component "y" listed in "keys"',
      );
    });

    it('key of its result not listed in keys causes an error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error y is not listed
        module: { multiFactory: () => ({ x: 1, y: 2 }), keys: ['x'] },
      });

      assert.throws(
        () => resolve('x' as never),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" returned the component "y" that is not listed in "keys"',
      );
    });

    it('non-enumerable key of its result not listed in keys causes an error', () => {
      const resolve = makeDependencyResolver({
        module: {
          multiFactory: () => Object.defineProperty({ x: 1 }, 'hidden', { value: 2 }),
          keys: ['x'],
        },
      });

      assert.throws(
        () => resolve('x'),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" returned the component "hidden" that is not listed in "keys"',
      );
    });

    it('keys of an array type are a type error', () => {
      const keys: ('x' | 'y')[] = ['x'];

      const resolve = makeDependencyResolver({
        // @ts-expect-error keys must be a tuple
        module: { multiFactory: () => ({ x: 1, y: 2 }), keys },
      });

      assert.throws(() => resolve('y'), err => err instanceof Error && err.message === 'Component "y" is not provided');
    });

    it('keys of a string array type with a record result are a type error', () => {
      const keys: string[] = ['x'];
      const createRecord = (): Record<string, number> => ({ x: 1 });

      const resolve = makeDependencyResolver({
        // @ts-expect-error keys must be a tuple
        module: { multiFactory: createRecord, keys },
      });

      assert.throws(() => resolve('anything'), err => err instanceof Error && err.message === 'Component "anything" is not provided');
    });

    it('keys with a union element are a type error', () => {
      const key: 'x' | 'y' = Math.random() < 2 ? 'x' : 'y';

      const resolve = makeDependencyResolver({
        // @ts-expect-error y may be not listed
        module: { multiFactory: () => ({ x: 1, y: 2 }), keys: [key] },
      });

      assert.throws(() => resolve('y'), err => err instanceof Error && err.message === 'Component "y" is not provided');
    });

    it('keys with a string element are a type error', () => {
      const key: string = 'x';

      const resolve = makeDependencyResolver({
        // @ts-expect-error y may be not listed
        module: { multiFactory: () => ({ x: 1, y: 2 }), keys: [key] },
      });

      assert.throws(() => resolve('y'), err => err instanceof Error && err.message === 'Component "y" is not provided');
    });

    it('union of functions is checked like a union of providers', () => {
      const flag = Math.random() < 2;

      const resolve = makeDependencyResolver({
        count: 2,
        module: {
          multiFactory: flag ? ({ count }: { count: number }) => ({ value: count }) : () => ({ value: 'none' }),
          keys: ['value'],
        },
      });

      const value: number | string = resolve('value'); // act

      assert.equal(value, 2);
    });

    it('missing or duplicate keys cause an error', () => {
      assert.throws(
        // @ts-expect-error keys are required
        () => makeDependencyResolver({ module: { multiFactory: () => ({ x: 1 }) } }),
        err => err instanceof Error
          && err.message === 'Multi-factory "module" must list the keys of its components in "keys"',
      );

      assert.throws(
        // @ts-expect-error x is listed twice
        () => makeDependencyResolver({ module: { multiFactory: () => ({ x: 1 }), keys: ['x', 'x'] } }),
        err => err instanceof Error && err.message === 'Multi-factory "module" lists the key "x" more than once',
      );
    });

    it('dependency on a not provided component causes an error', () => {
      const resolve = makeDependencyResolver({
        userModule: {
          multiFactory: ({ idService }: { idService: IdService }): UserModule => makeUserModule({ idService }),
          keys: ['userService', 'customerService'],
          // @ts-expect-error idService is not provided
          aliases: {},
        },
      });

      const fail = () => {
        resolve('userService');
      };

      assert.throws(
        fail,
        err => err instanceof Error && err.message === 'Component "idService" is not provided, required by userModule',
      );
    });
  });

  it('factories of not requested components are not called', () => {
    let calls = 0;

    const resolve = makeDependencyResolver({
      idService: () => ({ kind: idServiceSymbol }),
      userService: () => {
        calls++;

        return { kind: userServiceSymbol };
      },
    });

    resolve('idService'); // act

    assert.equal(calls, 0);
  });

  it('factory of a shared dependency is called once', () => {
    let calls = 0;

    type IdService = { kind: typeof idServiceSymbol };

    const resolve = makeDependencyResolver({
      idService: (): IdService => {
        calls++;

        return { kind: idServiceSymbol };
      },
      userService: ({ idService }: { idService: IdService }) => ({ kind: userServiceSymbol, idService }),
      customerService: ({ idService }: { idService: IdService }) => ({ kind: customerServiceSymbol, idService }),
    });

    resolve('userService', 'customerService'); // act

    assert.equal(calls, 1);
  });

  it('returns falsy component instances as is', () => {
    const resolve = makeDependencyResolver({
      zero: 0,
      emptyString: '',
      no: false,
      nothing: null,
    });

    const result = resolve('zero', 'emptyString', 'no', 'nothing'); // act

    assert.deepStrictEqual(result, { zero: 0, emptyString: '', no: false, nothing: null });
  });

  it('factory with aliases receives not aliased dependencies too', () => {
    type IdService = { kind: typeof idServiceSymbol };
    type Config = { prefix: string };

    const resolve = makeDependencyResolver({
      idService: (): IdService => ({ kind: idServiceSymbol }),
      config: { prefix: 'user' } as Config,
      userService: {
        factory: ({ paramIdService, config }: { paramIdService: IdService; config: Config }) => ({
          kind: userServiceSymbol,
          idService: paramIdService,
          prefix: config.prefix,
        }),
        aliases: {
          paramIdService: 'idService',
        },
      },
    });

    const userService = resolve('userService'); // act

    assert.equal(userService.idService.kind, idServiceSymbol);
    assert.equal(userService.prefix, 'user');
  });

  it('factory with aliases receives a component of the same type by an optional alias', () => {
    type IdService = { kind: symbol };

    const otherIdServiceSymbol = Symbol('other id service');

    const resolve = makeDependencyResolver({
      idService: (): IdService => ({ kind: idServiceSymbol }),
      otherIdService: (): IdService => ({ kind: otherIdServiceSymbol }),
      userService: {
        factory: ({ idService }: { idService: IdService }) => ({ kind: userServiceSymbol, idService }),
        aliases: {
          idService: 'otherIdService',
        },
      },
    });

    const userService = resolve('userService'); // act

    assert.equal(userService.idService.kind, otherIdServiceSymbol);
  });

  it('optional aliases are type checked', () => {
    const create = () => makeDependencyResolver({
      idService: () => 1,
      name: () => 'name',
      userService: {
        factory: ({ ids, idService }: { ids: number; idService: number }) => ids + idService,
        aliases: {
          ids: 'idService',
          // @ts-expect-error the component has a wrong type
          idService: 'name',
          // @ts-expect-error not a parameter of the factory
          other: 'idService',
        },
      },
    });

    assert.doesNotThrow(create);
  });

  it('provider with both factory and multiFactory causes an error', () => {
    const fail = () => makeDependencyResolver({
      // @ts-expect-error a provider can't have both factory and multiFactory
      module: { factory: () => 0, multiFactory: () => ({ x: 1 }), keys: ['x'] },
    });

    assert.throws(
      fail,
      err => err instanceof Error && err.message === 'Provider "module" has both "factory" and "multiFactory"',
    );
  });

  describe('optional parameter', () => {
    type Deps = { port: number; host?: string };

    const createUrl = ({ port, host = 'localhost' }: Deps) => `${host}:${port}`;

    it('receives the component', () => {
      const resolve = makeDependencyResolver({ port: 80, host: 'example.com', url: createUrl });

      assert.equal(resolve('url'), 'example.com:80');
    });

    it('without a component is a type error', () => {
      const resolve = makeDependencyResolver({
        port: 80,
        // @ts-expect-error host has no component
        url: createUrl,
      });

      assert.throws(
        () => resolve('url'),
        err => err instanceof Error && err.message === 'Component "host" is not provided, required by url',
      );
    });

    it('without a component requires an alias in a factory with aliases', () => {
      const resolve = makeDependencyResolver({
        port: 80,
        defaultHost: 'localhost',
        url: { factory: createUrl, aliases: { host: 'defaultHost' } },
      });

      assert.equal(resolve('url'), 'localhost:80');

      makeDependencyResolver({
        port: 80,
        defaultHost: 'localhost',
        // @ts-expect-error host requires an alias
        url: { factory: createUrl, aliases: {} },
      });
    });

    it('without a component is a type error, when the dependencies parameter has a default value', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error port has no component
        service: ({ port = 8080 }: { port?: number } = {}) => port,
      });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "port" is not provided, required by service',
      );
    });

    it('without a component is a type error, when it is declared next to an index signature', () => {
      type IndexedDeps = { [key: string]: number | undefined; port?: number };

      const resolve = makeDependencyResolver({
        // @ts-expect-error port has no component
        service: ({ port = 8080 }: IndexedDeps) => port,
      });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "port" is not provided, required by service',
      );
    });

    it('without a component is a type error, when it is optional only in some cases of a union', () => {
      type UnionDeps = { port?: number } | { port: number };

      const resolve = makeDependencyResolver({
        // @ts-expect-error port has no component
        service: ({ port = 8080 }: UnionDeps) => port,
      });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "port" is not provided, required by service',
      );
    });

    it('receives undefined from an explicit value', () => {
      const resolve = makeDependencyResolver({ port: 80, host: undefined as string | undefined, url: createUrl });

      assert.equal(resolve('url'), 'localhost:80');
    });
  });

  describe('union provider', () => {
    const flag = Math.random() < 2;

    it('gives a union of the component types of its cases', () => {
      const resolve = makeDependencyResolver({ value: flag ? () => 42 : 'text' });

      const value: number | 'text' = resolve('value'); // act

      assert.equal(value, 42);
    });

    it('checks the dependencies of each case', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error missing is not provided
        value: flag ? ({ missing }: { missing: number }) => missing : 'text',
      });

      assert.throws(
        () => resolve('value'),
        err => err instanceof Error && err.message === 'Component "missing" is not provided, required by value',
      );
    });
  });

  it('aliases of each case of a union provider are checked', () => {
    const flag = Math.random() < 2;
    const format = ({ count }: { count: number }) => count.toFixed(2);

    const resolve = makeDependencyResolver({
      count: 42,
      text: 'text',
      // @ts-expect-error text is not a number
      formatted: flag ? { factory: format, aliases: { count: 'text' } } : { factory: format },
    });

    assert.throws(() => resolve('formatted'), TypeError);

    const valid = makeDependencyResolver({
      count: 42,
      otherCount: 7,
      formatted: flag ? { factory: format, aliases: { count: 'otherCount' } } : { factory: format },
    });

    assert.equal(valid('formatted'), '7.00');
  });

  it('providers that are not an object cause an error', () => {
    // @ts-expect-error providers must be an object
    const fail = () => makeDependencyResolver(null);

    assert.throws(fail, err => err instanceof Error && err.message === 'Providers must be an object, got null');
  });

  it('symbol provider key causes an error', () => {
    const idServiceKey = Symbol('id service');

    const fail = () => makeDependencyResolver({
      // @ts-expect-error provider keys must be strings
      [idServiceKey]: 1,
    });

    assert.throws(
      fail,
      err => err instanceof Error && err.message === 'Provider key Symbol(id service) is a symbol. Provider keys must be strings',
    );
  });

  it('circular dependency error through aliases contains provider keys', () => {
    type UserService = { kind: typeof userServiceSymbol };
    type IdService = { kind: typeof idServiceSymbol };

    const resolve = makeDependencyResolver({
      idService: ({ userService }: { userService: UserService }): IdService => {
        void userService;

        return { kind: idServiceSymbol };
      },
      userService: {
        factory: ({ paramIdService }: { paramIdService: IdService }): UserService => {
          void paramIdService;

          return { kind: userServiceSymbol };
        },
        aliases: {
          paramIdService: 'idService',
        },
      },
    });

    const fail = () => {
      resolve('userService');
    };

    assert.throws(
      fail,
      err => err instanceof Error && err.message.includes('userService -> idService -> userService'),
    );
  });

  it('error thrown by a factory is propagated', () => {
    const factoryError = new Error('factory error');

    const resolve = makeDependencyResolver({
      userService: (): { kind: typeof userServiceSymbol } => {
        throw factoryError;
      },
    });

    const fail = () => {
      resolve('userService');
    };

    assert.throws(fail, err => err === factoryError);
  });

  it('not provided component causes an error with the dependency chain', () => {
    const resolve = makeDependencyResolver({
      userService: {
        factory: ({ paramIdService }: { paramIdService: { kind: typeof idServiceSymbol } }) => ({
          kind: userServiceSymbol,
          idService: paramIdService,
        }),
        // @ts-expect-error alias to a not provided component
        aliases: { paramIdService: 'idService' },
      },
    });

    const fail = () => {
      resolve('userService');
    };

    assert.throws(
      fail,
      err => err instanceof Error && err.message === 'Component "idService" is not provided, required by userService',
    );
  });

  it('requested not provided component causes an error', () => {
    const resolve = makeDependencyResolver({ idService: () => ({ kind: idServiceSymbol }) });

    const fail = () => {
      // @ts-expect-error not provided component
      resolve('userService');
    };

    assert.throws(fail, err => err instanceof Error && err.message === 'Component "userService" is not provided');
  });

  it('dependencies object can be inspected', () => {
    const resolve = makeDependencyResolver({
      idService: () => ({ kind: idServiceSymbol }),
      userService: (deps: object) => inspect(deps),
    });

    const userService = resolve('userService'); // act

    assert.equal(typeof userService, 'string');
  });

  describe('Object.prototype members', () => {
    it('are not provided as dependencies', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error constructor has no component
        service: ({ constructor }: { constructor: unknown }) => constructor,
      });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "constructor" is not provided, required by service',
      );
    });

    it('are not resolved', () => {
      const resolve = makeDependencyResolver({ port: 80 });

      for (const key of ['toString', 'constructor', '__proto__']) {
        assert.throws(
          // @ts-expect-error not provided component
          () => makeDependencyResolver({ port: 80 })(key),
          err => err instanceof Error && err.message === `Component "${key}" is not provided`,
        );
      }

      assert.equal(resolve('port'), 80);
    });

    it('as a function parameter without a component is a type error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error toString has no component
        text: ({ toString }: { toString: () => string }) => toString(),
      });

      assert.throws(
        () => resolve('text'),
        err => err instanceof Error && err.message === 'Component "toString" is not provided, required by text',
      );
    });

    it('in a case of a union parameter without a component is a type error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error neither case is provided
        service: (deps: { count: number } | { toString: () => string }) =>
          'count' in deps ? deps.count.toFixed() : deps.toString(),
      });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "toString" is not provided, required by service',
      );
    });

    it('in a case of a union parameter is not required, when another case is provided', () => {
      const resolve = makeDependencyResolver({
        count: 42,
        service: (deps: { count: number } | { toString: () => string }) =>
          'count' in deps ? deps.count.toFixed() : deps.toString(),
      });

      assert.equal(resolve('service'), '42');
    });

    it('in a case of a union parameter can be provided', () => {
      const resolve = makeDependencyResolver({
        toString: () => () => 'custom',
        service: (deps: { count: number } | { toString: () => string }) =>
          'count' in deps ? deps.count.toFixed() : deps.toString(),
      });

      assert.equal(resolve('service'), 'custom');
    });

    it('can be injected into a function parameter', () => {
      const resolve = makeDependencyResolver({
        toString: () => () => 'custom',
        text: ({ toString }: { toString: () => string }) => toString(),
      });

      assert.equal(resolve('text'), 'custom');
    });

    it('can be aliased', () => {
      const resolve = makeDependencyResolver({
        toString: () => () => 'custom',
        service: { factory: ({ format }: { format: () => string }) => format(), aliases: { format: 'toString' } },
      });

      assert.equal(resolve('service'), 'custom');
    });

    it('can be provided by a multi-factory', () => {
      const resolve = makeDependencyResolver({
        module: { multiFactory: () => ({ toString: () => 'custom' }), keys: ['toString'] },
      });

      assert.equal(resolve('toString')(), 'custom');
    });

    it('can be provided', () => {
      const resolve = makeDependencyResolver({
        constructor: 1,
        toString: () => 'text',
        service: ({ constructor, toString }: { constructor: number; toString: string }) => `${toString}${constructor}`,
      });

      assert.equal(resolve('service'), 'text1');
    });
  });

  describe('providers object', () => {
    it('with inherited providers causes an error', () => {
      class Providers {
        port = 80;

        url({ port }: { port: number }) {
          return `localhost:${port}`;
        }
      }

      assert.throws(
        () => makeDependencyResolver(new Providers()),
        err => err instanceof Error
          && err.message === 'Providers must be a plain object, inherited providers are not supported',
      );
    });

    it('with a prototype that has no prototype causes an error', () => {
      const prototype = Object.create(null, { port: { value: 80, enumerable: true } });
      const providers: { port: number } = Object.create(prototype);

      assert.throws(
        () => makeDependencyResolver(providers),
        err => err instanceof Error
          && err.message === 'Providers must be a plain object, inherited providers are not supported',
      );
    });

    it('that is a module namespace object is accepted', async () => {
      const url = 'data:text/javascript,export const port = 80;';
      const providers: { port: number } = await import(url);

      assert.equal(makeDependencyResolver(providers)('port'), 80);
    });

    it('that is an array causes an error', () => {
      assert.throws(
        // @ts-expect-error providers must be a plain object
        () => makeDependencyResolver([42]),
        err => err instanceof Error && err.message === 'Providers must be an object, got an array',
      );
    });

    it('that is a function causes an error', () => {
      assert.throws(
        // @ts-expect-error providers must be a plain object
        () => makeDependencyResolver(() => 42),
        err => err instanceof Error && err.message === 'Providers must be an object, got function',
      );
    });

    it('that is a class causes an error', () => {
      class Providers {
        static port = 80;
      }

      assert.throws(
        // @ts-expect-error providers must be a plain object
        () => makeDependencyResolver(Providers),
        err => err instanceof Error && err.message === 'Providers must be an object, got function',
      );
    });

    it('that may be a class causes an error', () => {
      class Providers {
        static port = 80;
      }

      const providers = [Providers, { port: 80 }][0];

      assert.throws(
        // @ts-expect-error providers must be a plain object
        () => makeDependencyResolver(providers),
        err => err instanceof Error && err.message === 'Providers must be an object, got function',
      );
    });

    it('that may be an array causes an error', () => {
      const providers = [[80], { port: 80 }][0];

      assert.throws(
        // @ts-expect-error providers must be a plain object
        () => makeDependencyResolver(providers),
        err => err instanceof Error && err.message === 'Providers must be an object, got an array',
      );
    });

    it('that is a union of plain objects is accepted', () => {
      const providers = [{ port: 80 }, { port: 'auto' }][0];

      assert.equal(makeDependencyResolver(providers)('port'), 80);
    });

    it('without a prototype is accepted', () => {
      const providers: { port: number } = Object.create(null, { port: { value: 80, enumerable: true } });

      assert.equal(makeDependencyResolver(providers)('port'), 80);
    });

    it('with non-enumerable providers registers them', () => {
      const providers = { port: 80 } as { port: number; url: (deps: { port: number }) => string };
      Object.defineProperty(providers, 'url', { value: ({ port }: { port: number }) => `localhost:${port}` });

      assert.equal(makeDependencyResolver(providers)('url'), 'localhost:80');
    });

    it('with an optional provider is a type error', () => {
      const providers: { port?: number; url: (deps: { port?: number }) => string } = {
        url: ({ port }) => `localhost:${port}`,
      };

      // @ts-expect-error port may be missing
      const resolve = makeDependencyResolver(providers);

      assert.throws(
        () => resolve('url'),
        err => err instanceof Error && err.message === 'Component "port" is not provided, required by url',
      );
    });
  });

  describe('function provider with a factory property', () => {
    it('is checked as a function', () => {
      const service = Object.assign(({ port }: { port: number }) => port, { factory: () => 'nested' });

      // @ts-expect-error port has no component
      const resolve = makeDependencyResolver({ service });

      assert.throws(
        () => resolve('service'),
        err => err instanceof Error && err.message === 'Component "port" is not provided, required by service',
      );
    });

    it('provides the result of the function', () => {
      const service = Object.assign(({ port }: { port: number }) => port, { multiFactory: () => ({ nested: 1 }) });
      const resolve = makeDependencyResolver({ port: 80, service });

      const port: number = resolve('service'); // act

      assert.equal(port, 80);
    });
  });

  describe('optional factory field', () => {
    it('is a type error', () => {
      const provider: { factory?: () => number } = { factory: () => 42 };

      // @ts-expect-error it is unknown whether the provider is a factory
      const resolve = makeDependencyResolver({ answer: provider });

      assert.equal(resolve('answer'), 42);
    });

    it('in a multi-factory is a type error', () => {
      const provider: { multiFactory?: () => { answer: number }; keys: readonly ['answer'] } = {
        multiFactory: () => ({ answer: 42 }),
        keys: ['answer'],
      };

      // @ts-expect-error it is unknown whether the provider is a multi-factory
      const resolve = makeDependencyResolver({ module: provider });

      // @ts-expect-error the types treat the provider as a value
      assert.equal(resolve('answer'), 42);
    });

    it('with a function that has own properties is a type error', () => {
      const factory = Object.assign(() => 42, { tag: 'factory' });
      const provider: { factory?: typeof factory } = { factory };

      // @ts-expect-error it is unknown whether the provider is a factory
      const resolve = makeDependencyResolver({ answer: provider });

      assert.equal(resolve('answer'), 42); // the factory is called
    });

    it('with a class is a type error', () => {
      class Answer {}
      const provider: { factory?: typeof Answer } = { factory: Answer };

      assert.throws(
        // @ts-expect-error it is unknown whether the provider is a factory
        () => makeDependencyResolver({ answer: provider }),
        err => err instanceof Error && err.message.includes('Provider "answer" is a class'),
      );
    });

    it('in a multi-factory with a class is a type error', () => {
      class Module {}
      const provider: { multiFactory: typeof Module | undefined; keys: readonly [] } = {
        multiFactory: Module,
        keys: [],
      };

      assert.throws(
        // @ts-expect-error it is unknown whether the provider is a multi-factory
        () => makeDependencyResolver({ module: provider }),
        err => err instanceof Error && err.message.includes('Provider "module" is a class'),
      );
    });

    it('that is never a function is a value', () => {
      const resolve = makeDependencyResolver({ settings: { factory: 'none' } });

      assert.deepEqual(resolve('settings'), { factory: 'none' });
    });
  });

  describe('overloaded factory', () => {
    function describeCount(deps: { count: number }): number;
    function describeCount(deps: { name: string }): string;
    function describeCount(deps: { count?: number; name?: string }): number | string {
      return deps.count ?? deps.name ?? '';
    }

    it('is a type error', () => {
      const resolve = makeDependencyResolver({
        count: 42,
        name: 'text',
        // @ts-expect-error the result type would be taken from the last signature
        description: describeCount,
      });

      assert.equal(resolve('description'), 42);
    });

    it('is a type error, when its last signatures have the same parameter and result', () => {
      function describe3(deps: { count: number }): number;
      function describe3(deps: { name: string }): string;
      function describe3(deps: { name: string }, option?: boolean): string;
      function describe3(deps: { count?: number; name?: string }): number | string {
        return deps.count ?? deps.name ?? '';
      }

      const resolve = makeDependencyResolver({
        count: 42,
        name: 'text',
        // @ts-expect-error the result type would be taken from the last signature
        description: describe3,
      });

      assert.equal(resolve('description'), 42);
    });

    it('is a type error, when its parameters differ only in an optional field', () => {
      function createUrl(deps: { port: number; host?: string }): string;
      function createUrl(deps: { port: number }): string;
      function createUrl({ port, host }: { port: number; host?: string }): string {
        return `${host}:${port}`;
      }

      const resolve = makeDependencyResolver({
        port: 8080,
        // @ts-expect-error the optional host would be missed
        url: createUrl,
      });

      assert.throws(
        () => resolve('url'),
        err => err instanceof Error && err.message === 'Component "host" is not provided, required by url',
      );
    });

    it('wrapped in a factory with a single signature is accepted', () => {
      const resolve = makeDependencyResolver({
        count: 42,
        name: 'text',
        description: ({ name }: { name: string }) => describeCount({ name }),
      });

      const description: string = resolve('description'); // act

      assert.equal(description, 'text');
    });
  });

  it('class provider causes an error', () => {
    class UserService {
      kind = userServiceSymbol;
    }

    const fail = () => makeDependencyResolver({
      // @ts-expect-error class can't be a provider
      userService: UserService,
    });

    assert.throws(fail, err => err instanceof Error && err.message.includes('Provider "userService" is a class'));
  });

  it('class in factory field causes an error', () => {
    class UserService {
      kind = userServiceSymbol;
    }

    const fail = () => makeDependencyResolver({
      // @ts-expect-error class can't be a factory
      userService: { factory: UserService },
    });

    assert.throws(fail, err => err instanceof Error && err.message.includes('Provider "userService" is a class'));
  });

  it('factory with aliases can\'t depend on itself', () => {
    const resolve = makeDependencyResolver({
      idService: () => 1,
      userService: {
        factory: ({ id }: { id: number }) => id,
        // @ts-expect-error alias to the component itself
        aliases: { id: 'userService' },
      },
    });

    const fail = () => {
      resolve('userService');
    };

    assert.throws(
      fail,
      err => err instanceof Error && err.message.includes('userService -> userService'),
    );
  });

  it('repeated call after failed resolve causes an error', () => {
    const resolve = makeDependencyResolver({
      userService: (): { kind: typeof userServiceSymbol } => {
        throw new Error('factory error');
      },
    });

    assert.throws(() => resolve('userService'));

    const fail = () => {
      resolve('userService');
    };

    assert.throws(
      fail,
      err => err instanceof Error && err.message.includes('Repeated resolve calls'),
    );
  });

  it('key requested next to a key of a string type is not optional', () => {
    const providers: Record<string, number> = { a: 1, b: 2 };
    const resolve = makeDependencyResolver(providers);
    const key: string = 'b';

    const result = resolve('a', key); // act

    const a: number = result.a;
    // @ts-expect-error a key of a string type may be not requested
    const other: number = result[key];
    assert.deepEqual([a, other], [1, 2]);
  });

  it('optional aliases field is type checked', () => {
    const format = ({ count }: { count: number }) => count.toFixed(2);
    const provider: { factory: typeof format; aliases?: { count: 'text' } } = { factory: format, aliases: { count: 'text' } };

    // @ts-expect-error text is not a number
    const resolve = makeDependencyResolver({ text: 'abc', count: 1, formatted: provider });

    assert.throws(() => resolve('formatted'), TypeError);
  });

  it('union of key tuples gives optional fields for keys missing in some case', () => {
    const keys = (Math.random() < 2 ? ['a', 'b'] : ['a', 'c']) as ['a', 'b'] | ['a', 'c'];

    const resolved = makeDependencyResolver({ a: 1, b: 2, c: 3 })(...keys); // act

    const a: number = resolved.a;
    // @ts-expect-error c may be missing
    const c: number = resolved.c;

    assert.deepEqual({ a, b: resolved.b, c }, { a: 1, b: 2, c: undefined });
  });

  describe('factory requiring this', () => {
    function createUrl(this: { port: number }, { host }: { host: string }) {
      return `${host}:${this.port}`;
    }

    it('is a type error', () => {
      const resolve = makeDependencyResolver({
        host: 'localhost',
        // @ts-expect-error the runtime doesn't pass this
        url: createUrl,
      });

      assert.throws(() => resolve('url'), TypeError);
    });

    it('that accepts undefined is accepted', () => {
      const resolve = makeDependencyResolver({
        host: 'localhost',
        url: function (this: void, { host }: { host: string }) {
          return host;
        },
      });

      assert.equal(resolve('url'), 'localhost');
    });

    it('that accepts undefined is accepted in a factory with aliases', () => {
      function createUrl(this: void, { host }: { host: string }) {
        return host;
      }

      const resolve = makeDependencyResolver({
        localHost: 'localhost',
        url: { factory: createUrl, aliases: { host: 'localHost' } },
      });

      assert.equal(resolve('url'), 'localhost');
    });

    it('that accepts undefined is accepted in a multi-factory', () => {
      function createUrls(this: void, { host }: { host: string }) {
        return { url: `http://${host}` };
      }

      const resolve = makeDependencyResolver({ host: 'localhost', urls: { multiFactory: createUrls, keys: ['url'] } });

      assert.equal(resolve('url'), 'http://localhost');
    });

    it('that only includes undefined is a type error in a factory with aliases', () => {
      function createPort(this: { port: number } | undefined) {
        return this?.port.toFixed() ?? 'default';
      }

      const resolve = makeDependencyResolver({
        // @ts-expect-error this is the provider object without port
        port: { factory: createPort },
      });

      assert.throws(() => resolve('port'), TypeError);
    });

    it('that is undefined is a type error in a factory with aliases', () => {
      function isWithoutThis(this: undefined) {
        return this === undefined;
      }

      const resolve = makeDependencyResolver({
        // @ts-expect-error this is the provider object
        withoutThis: { factory: isWithoutThis },
      });

      assert.equal(resolve('withoutThis'), false);
    });

    it('that only includes undefined is accepted in a factory function', () => {
      const resolve = makeDependencyResolver({
        port: function (this: { port: number } | undefined) {
          return this?.port ?? 80;
        },
      });

      assert.equal(resolve('port'), 80);
    });
  });

  describe('optional alias', () => {
    const format = ({ count }: { count: number }) => count.toFixed(2);

    type Provider = { factory: typeof format; aliases?: { count?: 'otherCount' } };

    it('can be omitted when the parameter has a component', () => {
      const provider: Provider = { factory: format, aliases: {} };

      const resolve = makeDependencyResolver({ count: 1, otherCount: 2, formatted: provider });

      assert.equal(resolve('formatted'), '1.00');
    });

    it('is used when it is given', () => {
      const provider: Provider = { factory: format, aliases: { count: 'otherCount' } };

      const resolve = makeDependencyResolver({ count: 1, otherCount: 2, formatted: provider });

      assert.equal(resolve('formatted'), '2.00');
    });

    it('that is undefined injects the parameter by its own name', () => {
      const provider: Provider = { factory: format, aliases: { count: undefined } };

      const resolve = makeDependencyResolver({ count: 1, otherCount: 2, formatted: provider });

      assert.equal(resolve('formatted'), '1.00');
    });

    it('that is undefined in an inline provider injects the parameter by its own name', () => {
      const resolve = makeDependencyResolver({
        count: 1,
        otherCount: 2,
        formatted: { factory: format, aliases: { count: undefined } },
      });

      assert.equal(resolve('formatted'), '1.00');
    });
  });

  describe('in operator', () => {
    it('tells whether a component is provided through an alias', () => {
      const resolve = makeDependencyResolver({
        value: 1,
        service: {
          factory: (deps: { alias: number; missing?: number }) => ['alias' in deps, 'missing' in deps],
          aliases: { alias: 'value', missing: 'other' as never },
        },
      });

      assert.deepEqual(resolve('service'), [true, false]);
    });

    it('tells whether a component is provided in a factory function', () => {
      const resolve = makeDependencyResolver({
        value: 1,
        service: (deps: object) => ['value' in deps, 'other' in deps],
      });

      assert.deepEqual(resolve('service'), [true, false]);
    });
  });

  describe('union of functions in a factory with aliases', () => {
    const flag = Math.random() < 2;
    const countValue = ({ a }: { a: number }) => a;
    const nameValue = ({ b }: { b: string }) => b;

    it('is accepted when each function is valid', () => {
      const resolve = makeDependencyResolver({ a: 1, b: 'text', service: { factory: flag ? countValue : nameValue } });

      const service: number | string = resolve('service'); // act

      assert.equal(service, 1);
    });

    it('uses the aliases with each function', () => {
      const formatValue = ({ a }: { a: number }) => a.toFixed(1);

      const resolve = makeDependencyResolver({
        other: 1,
        service: { factory: flag ? countValue : formatValue, aliases: { a: 'other' } },
      });

      assert.equal(resolve('service'), 1);
    });

    it('is accepted in a multi-factory with a factory property that is not a function', () => {
      const resolve = makeDependencyResolver({
        a: 1,
        b: 'text',
        module: {
          factory: 'metadata',
          multiFactory: flag
            ? (deps: { a: number }) => ({ value: countValue(deps) })
            : (deps: { b: string }) => ({ value: nameValue(deps) }),
          keys: ['value'],
        },
      });

      const value: number | string = resolve('value'); // act

      assert.equal(value, 1);
    });

    it('is accepted in a factory with a multiFactory property that is not a function', () => {
      const resolve = makeDependencyResolver({
        a: 1,
        b: 'text',
        service: { factory: flag ? countValue : nameValue, multiFactory: 'metadata' },
      });

      const service: number | string = resolve('service'); // act

      assert.equal(service, 1);
    });

    it('with an invalid function is a type error', () => {
      const resolve = makeDependencyResolver({
        a: 1,
        // @ts-expect-error b is not provided
        service: { factory: flag ? countValue : nameValue },
      });

      assert.equal(resolve('service'), 1);
    });
  });

  it('resolve without keys causes an error and doesn\'t use up the call', () => {
    const resolve = makeDependencyResolver({ value: 1 });

    assert.throws(
      // @ts-expect-error at least one key is required
      () => resolve(),
      err => err instanceof Error && err.message === 'At least one key must be passed to resolve.',
    );

    assert.equal(resolve('value'), 1);
  });

  describe('falsy alias', () => {
    it('to an empty component key is used', () => {
      const resolve = makeDependencyResolver({
        'count': 1,
        '': 2,
        'result': { factory: ({ count }: { count: number }) => count, aliases: { count: '' } },
      });

      assert.equal(resolve('result'), 2);
    });

    it('to an empty component key is used when the parameter has no component', () => {
      const resolve = makeDependencyResolver({
        '': 2,
        'result': { factory: ({ count }: { count: number }) => count, aliases: { count: '' } },
      });

      assert.equal(resolve('result'), 2);
    });

    it('to a numeric component key is used', () => {
      const resolve = makeDependencyResolver({
        count: 1,
        0: 2,
        result: { factory: ({ count }: { count: number }) => count, aliases: { count: 0 } },
      });

      assert.equal(resolve('result'), 2);
    });
  });

  describe('union parameter of a factory', () => {
    const describeDeps = (deps: { count: number } | { name: string }) => 'name' in deps ? deps.name : deps.count;

    it('receives the components of all cases', () => {
      const resolve = makeDependencyResolver({ count: 42, name: 'text', description: describeDeps });

      const description: number | string = resolve('description'); // act

      assert.equal(description, 'text');
    });

    it('is accepted when one case is provided', () => {
      const resolve = makeDependencyResolver({ count: 42, description: describeDeps });

      assert.equal(resolve('description'), 42);
    });

    it('with a component that doesn\'t match its case is a type error', () => {
      const resolve = makeDependencyResolver({
        count: 42,
        name: 7,
        // @ts-expect-error name is not a string
        description: (deps: { count: number } | { name: string }) => 'name' in deps ? deps.name.toUpperCase() : deps.count,
      });

      assert.throws(() => resolve('description'), TypeError);
    });
  });

  describe('numeric key', () => {
    it('of a multi-factory result is listed in keys as a string', () => {
      const resolve = makeDependencyResolver({ module: { multiFactory: () => ({ 0: 42 }), keys: ['0'] } });

      const value: number = resolve(0); // act

      assert.equal(value, 42);
    });

    it('of a multi-factory result not listed in keys is a type error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error 0 is not listed
        module: { multiFactory: () => ({ 0: 42 }), keys: [] },
      });

      assert.throws(() => resolve(0), err => err instanceof Error && err.message === 'Component "0" is not provided');
    });

    it('of an optional parameter without a component is a type error', () => {
      const resolve = makeDependencyResolver({
        // @ts-expect-error 0 has no component
        service: ({ 0: value = 42 }: { 0?: number }) => value,
      });

      assert.throws(() => resolve('service'), err => err instanceof Error && err.message.includes('"0" is not provided'));
    });

    it('of a provider colliding with a string key of a multi-factory result is a type error', () => {
      const createText = (): Record<'0', string> => ({ 0: 'text' });

      assert.throws(
        () => makeDependencyResolver({
          0: 1,
          // @ts-expect-error 0 is provided more than once
          module: { multiFactory: createText, keys: ['0'] },
        }),
        err => err instanceof Error && err.message.includes('"0"'),
      );
    });

    it('of a multi-factory result colliding with a string provider key is a type error', () => {
      const values: Record<'0', number> = { 0: 1 };

      assert.throws(
        () => makeDependencyResolver({
          ...values,
          // @ts-expect-error 0 is provided more than once
          module: { multiFactory: () => ({ 0: 'text' }), keys: ['0'] },
        }),
        err => err instanceof Error && err.message.includes('"0"'),
      );
    });

    it('of a string provider is injected into a numeric parameter', () => {
      const values: Record<'0', number> = { 0: 42 };

      const resolve = makeDependencyResolver({ ...values, service: ({ 0: value = 0 }: { 0?: number }) => value });

      const service: number = resolve('service'); // act

      assert.equal(service, 42);
    });

    it('of a provider is injected into a string parameter', () => {
      const resolve = makeDependencyResolver({ 0: 42, service: (deps: Record<'0', number>) => deps[0] });

      assert.equal(resolve('service'), 42);
    });

    it('of a multi-factory result is resolved in both forms', () => {
      const resolve = makeDependencyResolver({ module: { multiFactory: () => ({ 0: 42, a: 1 }), keys: ['0', 'a'] } });

      const result = resolve('0', 0, 'a'); // act

      const values: [number, number, number] = [result[0], result['0'], result.a];
      assert.deepEqual(values, [42, 42, 1]);
    });

    it('of a multi-factory result is resolved by a string key', () => {
      const resolve = makeDependencyResolver({ module: { multiFactory: () => ({ 0: 42 }), keys: ['0'] } });

      const value: number = resolve('0'); // act

      assert.equal(value, 42);
    });

    it('of a component can be aliased in both forms', () => {
      const resolve = makeDependencyResolver({
        module: { multiFactory: () => ({ 0: 42 }), keys: ['0'] },
        byString: { factory: ({ value }: { value: number }) => value, aliases: { value: '0' } },
        byNumber: { factory: ({ value }: { value: number }) => value, aliases: { value: 0 } },
      });

      assert.deepEqual(resolve('byString', 'byNumber'), { byString: 42, byNumber: 42 });
    });

    it('that is not canonical is not the numeric key', () => {
      const resolve = makeDependencyResolver({ 1000: 1 });

      // @ts-expect-error 1e3 is not 1000
      assert.throws(() => resolve('1e3'), err => err instanceof Error && err.message === 'Component "1e3" is not provided');
    });
  });

  describe('index signature', () => {
    it('of the components keeps a numeric key resolved with another key', () => {
      const values: Record<string, number> = { 0: 42, a: 1 };
      const resolve = makeDependencyResolver(values);

      const result = resolve('0', 'a'); // act

      const pair: [number | undefined, number | undefined] = [result[0], result.a];
      assert.deepEqual(pair, [42, 1]);
    });

    it('of a parameter can be aliased', () => {
      const resolve = makeDependencyResolver({
        count: 42,
        service: { factory: (deps: Record<string, number>) => deps.value, aliases: { value: 'count' } },
      });

      assert.equal(resolve('service'), 42);
    });

    it('in a case of a union parameter must match the components', () => {
      const resolve = makeDependencyResolver({
        name: 'text',
        marker: true,
        count: 42,
        // @ts-expect-error count is not a string
        service: (deps: Record<string, string> | { name: string; marker: true }) =>
          'count' in deps ? String(deps.count).toUpperCase() : deps.name,
      });

      assert.equal(resolve('service'), '42');
    });
  });

  describe('Resolver type', () => {
    it('with a numeric string key returns the component type', () => {
      const resolve: Resolver<Record<'0', number>> = makeDependencyResolver({ 0: 42 });

      // @ts-expect-error the component is a number
      const text: string = resolve('0'); // act

      assert.equal(text, 42);
    });

    it('accepts a resolver of narrower components', () => {
      const resolve: Resolver<{ count: number; 0: number }> = makeDependencyResolver({ count: 42, 0: 1 });

      assert.deepEqual(resolve('count', 0), { count: 42, 0: 1 });
    });

    it('doesn\'t accept a resolver of components of other types', () => {
      // @ts-expect-error a is not a string
      const resolve: Resolver<{ a: string }> = makeDependencyResolver({ a: 42 });

      assert.throws(() => resolve('a').toUpperCase(), TypeError);
    });

    it('doesn\'t accept a resolver without a component', () => {
      // @ts-expect-error b is not provided
      const resolve: Resolver<{ a: number; b: number }> = makeDependencyResolver({ a: 42 });

      assert.throws(() => resolve('b'), err => err instanceof Error && err.message === 'Component "b" is not provided');
    });
  });

  describe('symbol alias', () => {
    const token = Symbol('token');

    it('injects the component into a symbol parameter', () => {
      const resolve = makeDependencyResolver({
        value: 42,
        service: { factory: ({ [token]: value }: { [token]: number }) => value.toFixed(), aliases: { [token]: 'value' } },
      });

      assert.equal(resolve('service'), '42');
    });

    it('is seen by the in operator', () => {
      const resolve = makeDependencyResolver({
        value: 42,
        service: { factory: (deps: { [token]: number }) => token in deps, aliases: { [token]: 'value' } },
      });

      assert.equal(resolve('service'), true);
    });
  });

  describe('multi-factory returning a class', () => {
    it('is a type error', () => {
      class Result {
        static value = 42;
      }

      const resolve = makeDependencyResolver({
        // @ts-expect-error a multi-factory must return an object
        module: { multiFactory: () => Result, keys: ['prototype', 'value'] },
      });

      assert.throws(
        // @ts-expect-error the result is not an object, so the types don't know its components
        () => resolve('value'),
        err => err instanceof Error && err.message === 'Multi-factory "module" must return an object, got function',
      );
    });
  });

  describe('aliases object', () => {
    const notPlainError = (key: string) => (err: unknown) => err instanceof Error
      && err.message === `Aliases of provider "${key}" must be a plain object, inherited aliases are not supported`;

    it('with an inherited alias causes an error', () => {
      class AliasMap {
        get source(): 'value' {
          return 'value';
        }
      }

      assert.throws(
        () => makeDependencyResolver({
          value: 42,
          service: { factory: ({ source }: { source: number }) => source.toFixed(), aliases: new AliasMap() },
        }),
        notPlainError('service'),
      );
    });

    it('of a multi-factory with an inherited alias causes an error', () => {
      class AliasMap {
        get source(): 'value' {
          return 'value';
        }
      }

      assert.throws(
        () => makeDependencyResolver({
          value: 42,
          module: {
            multiFactory: ({ source }: { source: number }) => ({ text: source.toFixed() }),
            keys: ['text'],
            aliases: new AliasMap(),
          },
        }),
        notPlainError('module'),
      );
    });

    it('that is an instance of a class with own aliases causes an error', () => {
      class AliasMap {
        source = 'value' as const;
      }

      assert.throws(
        () => makeDependencyResolver({
          value: 42,
          service: { factory: ({ source }: { source: number }) => source, aliases: new AliasMap() },
        }),
        notPlainError('service'),
      );
    });

    it('that is a function causes an error', () => {
      assert.throws(
        () => makeDependencyResolver({
          value: 42,
          // @ts-expect-error aliases must be a plain object
          service: { factory: ({ value }: { value: number }) => value, aliases: () => 1 },
        }),
        notPlainError('service'),
      );
    });

    it('that is null causes an error', () => {
      const aliases = null as unknown as { source: 'value' };

      assert.throws(
        () => makeDependencyResolver({
          value: 42,
          service: { factory: ({ source }: { source: number }) => source, aliases },
        }),
        notPlainError('service'),
      );
    });

    it('without a prototype is accepted', () => {
      const aliases: { source: 'value' } = Object.create(null, { source: { value: 'value', enumerable: true } });
      const resolve = makeDependencyResolver({
        value: 42,
        service: { factory: ({ source }: { source: number }) => source.toFixed(), aliases },
      });

      assert.equal(resolve('service'), '42');
    });

    it('that is a union is used in each case', () => {
      const format = ({ count, name }: { count: number; name: string }) => `${count.toFixed()} ${name}`;
      const makeResolve = (aliases: { count: 'otherCount' } | { name: 'otherName' }) => makeDependencyResolver({
        count: 1,
        otherCount: 2,
        name: 'a',
        otherName: 'b',
        service: { factory: format, aliases },
      });

      assert.equal(makeResolve({ count: 'otherCount' })('service'), '2 a');
      assert.equal(makeResolve({ name: 'otherName' })('service'), '1 b');
    });

    it('of a value provider is not checked', () => {
      const settings = { aliases: new Map([['a', 'b']]) };

      assert.equal(makeDependencyResolver({ settings })('settings'), settings);
    });
  });

  describe('union of providers objects', () => {
    const pick = <T>(cases: T[], index: number): T => cases[index]!;

    it('provides a component of a union type, when its type differs in the cases', () => {
      for (const [index, expected] of [[0, 42], [1, 'text']] as const) {
        const providers = pick([
          { module: { multiFactory: () => ({ value: 42 }), keys: ['value'] as const } },
          { module: { multiFactory: () => ({ value: 'text' }), keys: ['value'] as const } },
        ], index);

        const value: number | string = makeDependencyResolver(providers)('value');

        assert.equal(value, expected);
      }
    });

    it('provides a component of a union type that is not assignable to another type', () => {
      const providers = pick([
        { module: { multiFactory: () => ({ value: 42 }), keys: ['value'] as const } },
        { module: { multiFactory: () => ({ value: 'text' }), keys: ['value'] as const } },
      ], 0);

      // @ts-expect-error the component is a number or a string
      const date: Date = makeDependencyResolver(providers)('value');

      assert.equal(date, 42);
    });

    it('doesn\'t provide a component missing in some case', () => {
      const providers = pick([
        { module: { multiFactory: () => ({ a: 1 }), keys: ['a'] as const } },
        { module: { multiFactory: () => ({ b: 2 }), keys: ['b'] as const } },
      ], 0);

      assert.throws(
        // @ts-expect-error b is missing in the first case
        () => makeDependencyResolver(providers)('a', 'b'),
        err => err instanceof Error && err.message === 'Component "b" is not provided',
      );
    });

    it('checks each case', () => {
      const providers = pick([
        { value: 42, service: ({ value }: { value: number }) => value.toFixed() },
        { value: 'text', service: ({ value }: { value: number }) => value.toFixed() },
      ], 1);

      // @ts-expect-error value is a string in the second case
      const resolve = makeDependencyResolver(providers);

      assert.throws(() => resolve('service'), TypeError);
    });
  });
});
