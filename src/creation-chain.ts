export type CreationChain = ReturnType<typeof makeCreationChain>;

// Keys of the components being created, from the requested one to the innermost dependency.
export const makeCreationChain = () => {
  const keys: string[] = [];

  const isInProgress = (key: string): boolean => keys.includes(key);

  const isEmpty = (): boolean => keys.length === 0;

  const format = (...nextKeys: string[]): string => [...keys, ...nextKeys].join(' -> ');

  const track = <R>(key: string, create: () => R): R => {
    if (isInProgress(key)) {
      throw new Error(`Circular dependency: ${format(key)}`);
    }

    keys.push(key);

    try {
      return create();
    } finally {
      keys.pop();
    }
  };

  return { track, isEmpty, format };
};
