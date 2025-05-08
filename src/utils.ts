import { createProxy, isChanged } from 'proxy-compare';
import { useMemo, useRef } from 'react';
import {
  create,
  createStore,
  StateCreator,
  StoreApi,
  StoreMutatorIdentifier,
  useStore,
} from 'zustand';
import {
  createWithEqualityFn,
  useStoreWithEqualityFn,
} from 'zustand/traditional';

function identity<T>(x: T): T {
  return x;
}

type Computed = <T extends object>(
  /**
   * The function that computes the derived state.
   */
  compute: Compute<T>
) => <
  Mps extends [StoreMutatorIdentifier, unknown][] = [],
  Mcs extends [StoreMutatorIdentifier, unknown][] = []
>(
  creator: StateCreator<T, [...Mps], Mcs>
) => StateCreator<T, Mps, [...Mcs]>;

type Compute<T> = (state: T) => Partial<T>;

export const createTrackedComputer =
  createComputerImplementation as unknown as Computed;

function createComputerImplementation<T extends object>(
  compute: (state: T) => Partial<T>
): (creator: StateCreator<T>) => StateCreator<T> {
  return (creator) => {
    return (set, get, api) => {
      let affected = new WeakMap();

      let proxyState: T;

      function runCompute(state: Partial<T>): Partial<T> {
        proxyState = { ...get(), ...state };
        const nextAffected = new WeakMap();
        const proxy = createProxy(proxyState, nextAffected);
        const computed = compute(proxy);
        affected = nextAffected;
        return computed;
      }

      const setWithComputed: typeof set = (partial, replace) => {
        const nextPartial =
          typeof partial === 'function' ? partial(get()) : partial;

        const merged = { ...get(), ...nextPartial };

        const touched = isChanged(
          proxyState,
          merged,
          affected,
          new WeakMap(),
          Object.is
        );
        if (touched) {
          const computed = runCompute(merged);
          const withComputed = { ...nextPartial, ...computed };
          set(withComputed, replace as false);
        } else {
          set(nextPartial, replace as false);
        }
      };

      Object.assign(api, {
        setState: setWithComputed,
      });

      const initialState = creator(setWithComputed, get, api);
      const initialComputed = runCompute(initialState);
      return { ...initialState, ...initialComputed };
    };
  };
}

function useTrackedSelector<T>(selector: (state: T) => unknown) {
  const affected = useRef(new WeakMap());
  const prevState = useRef<T>();
  const trackedValue = useRef<any>(undefined);

  return useMemo(() => {
    let firstRun = true;
    return (state: T) => {
      const touched = isChanged(
        prevState.current,
        state,
        affected.current,
        new WeakMap(),
        Object.is
      );
      if (touched || firstRun) {
        firstRun = false;
        prevState.current = state;
        affected.current = new WeakMap();
        const proxy = createProxy(state, affected.current);
        trackedValue.current = selector(proxy);
      }

      return trackedValue.current;
    };
  }, [selector]);
}

type UseStoreWithTracked = typeof useStore;
export const useTrackedStore: UseStoreWithTracked = <T extends object>(
  store: StoreApi<T>,
  selector = identity
) => {
  return useStore(store, useTrackedSelector(selector));
};

type UseBoundStoreWithTracked = typeof create;
export const createTracked = (<T extends object>(fn?: StateCreator<T>) => {
  if (!fn) {
    return (fn: StateCreator<T>) => {
      return createTracked(fn);
    };
  } else {
    const store = createStore(fn);
    const useStore = (selector = identity) => {
      return useTrackedStore(store, selector);
    };

    return Object.assign(useStore, store);
  }
}) as UseBoundStoreWithTracked;

type UseStoreWithTrackedEqualityFn = typeof useStoreWithEqualityFn;

export const useTrackedStoreWithEqualityFn: UseStoreWithTrackedEqualityFn = <
  T extends object
>(
  store: StoreApi<T>,
  selector = identity,
  isEqual = Object.is
) => {
  return useStoreWithEqualityFn(store, useTrackedSelector(selector), isEqual);
};

type UseBoundStoreWithTrackedEqualityFn = typeof createWithEqualityFn;

export const createTrackedWithEqualityFn = (<T extends object>(
  fn?: StateCreator<T>,
  isEqual = Object.is
) => {
  if (!fn) {
    return (fn: StateCreator<T>, isEqual = Object.is) => {
      return createTrackedWithEqualityFn(fn, isEqual);
    };
  } else {
    const store = createStore(fn);
    const parentIsEqual = isEqual;

    const useStore = (selector = identity, isEqual = parentIsEqual) => {
      return useTrackedStoreWithEqualityFn(store, selector, isEqual);
    };

    return Object.assign(useStore, store);
  }
}) as UseBoundStoreWithTrackedEqualityFn;
