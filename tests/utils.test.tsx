import { act, render, screen } from '@testing-library/react';
import React from 'react';
import { describe, expect, it } from 'vitest';
import { create, createStore } from 'zustand';
import {
  createTrackedComputer,
  createTracked,
  useTrackedStore,
  createTrackedWithEqualityFn,
  useTrackedStoreWithEqualityFn,
} from '../src/utils';

describe('createTracked', () => {
  type State = {
    count: number;
    text: string;
    increment: () => void;
    setText: (t: string) => void;
  };

  function setupStore() {
    return createTracked<State>((set) => ({
      count: 0,
      text: 'a',
      increment: () => set((s) => ({ count: s.count + 1 })),
      setText: (t) => set({ text: t }),
    }));
  }

  it('only re-renders when tracked variable changes', () => {
    const useStore = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useStore((s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    function Text() {
      const text = useStore((s) => s.text);
      return <div data-testid="text">{text}</div>;
    }
    render(
      <>
        <Counter />
        <Text />
      </>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(renderCount).toBe(2); // initial + after increment
    act(() => useStore.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(renderCount).toBe(2); // Counter did not re-render
  });

  it('does not re-render when unrelated state changes', () => {
    const useStore = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useStore((s) => s.count);
      return <div>{count}</div>;
    }
    render(<Counter />);
    act(() => useStore.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });

  it('selector only runs when accessed value changes', () => {
    const useStore = setupStore();
    let selectorRuns = 0;
    function Comp() {
      const val = useStore((s) => {
        selectorRuns++;
        return s.count;
      });
      return <div>{val}</div>;
    }
    render(<Comp />);
    expect(selectorRuns).toBe(1);
    act(() => useStore.getState().setText('e'));
    expect(selectorRuns).toBe(1);
    act(() => useStore.getState().increment());
    expect(selectorRuns).toBe(3); // 1 for initial, 1 for the subscription, 1 for the rerender
  });

  it('should still get the correct value if an external state change happens', () => {
    const useStore = setupStore();
    function Counter({ text }: { text: string }) {
      const count = useStore((s) => (text === 'a' ? s.count : s.count + 1));
      return <div data-testid="count">{count}</div>;
    }

    function CounterParent() {
      const text = useStore((s) => s.text);
      return (
        <div>
          <div data-testid="text">{text}</div>
          <Counter text={text} />
        </div>
      );
    }
    render(<CounterParent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
});

describe('createTrackedComputer', () => {
  type State = {
    count: number;
    text: string;
    increment: () => void;
    setText: (t: string) => void;
  };

  it('computed value only updates when tracked variable changes', () => {
    type StateWithDouble = State & { double: number };
    let computeCount = 0;
    const computer = createTrackedComputer<StateWithDouble>((s) => {
      computeCount++;
      return {
        double: s.count * 2,
      };
    });
    const useStore = create<StateWithDouble>()(
      computer((set) => ({
        count: 0,
        text: 'a',
        increment: () => set((s) => ({ count: s.count + 1 })),
        setText: (t) => set({ text: t }),
        double: 0,
      }))
    );
    let doubleRender = 0;
    function Double() {
      doubleRender++;
      const double = useStore((s) => s.double);
      return <div data-testid="double">{double}</div>;
    }
    render(<Double />);
    expect(screen.getByTestId('double').textContent).toBe('0');
    expect(computeCount).toBe(1);
    act(() => useStore.getState().increment());
    expect(screen.getByTestId('double').textContent).toBe('2');
    expect(doubleRender).toBe(2); // initial + after increment
    expect(computeCount).toBe(2);
    act(() => useStore.getState().setText('d'));
    expect(doubleRender).toBe(2); // did not re-render
    expect(computeCount).toBe(2); // did not re-compute
  });
});

describe('useTrackedStore', () => {
  type State = {
    count: number;
    text: string;
    increment: () => void;
    setText: (t: string) => void;
  };

  function setupStore() {
    return createStore<State>((set) => ({
      count: 0,
      text: 'a',
      increment: () => set((s) => ({ count: s.count + 1 })),
      setText: (t) => set({ text: t }),
    }));
  }
  it('only re-renders when tracked variable changes', () => {
    const store = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useTrackedStore(store, (s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    function Text() {
      const text = useTrackedStore(store, (s) => s.text);
      return <div data-testid="text">{text}</div>;
    }
    render(
      <>
        <Counter />
        <Text />
      </>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(renderCount).toBe(2); // initial + after increment
    act(() => store.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(renderCount).toBe(2); // Counter did not re-render
  });
  it('does not re-render when unrelated state changes', () => {
    const store = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useTrackedStore(store, (s) => s.count);
      return <div>{count}</div>;
    }
    render(<Counter />);
    act(() => store.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });
  it('selector only runs when accessed value changes', () => {
    const store = setupStore();
    let selectorRuns = 0;
    function Comp() {
      const val = useTrackedStore(store, (s) => {
        selectorRuns++;
        return s.count;
      });
      return <div>{val}</div>;
    }
    render(<Comp />);
    expect(selectorRuns).toBe(1);
    act(() => store.getState().setText('e'));
    expect(selectorRuns).toBe(1);
    act(() => store.getState().increment());
    expect(selectorRuns).toBe(3); // 1 for initial, 1 for the subscription, 1 for the rerender
  });

  it('should still get the correct value if an external state change happens', () => {
    const store = setupStore();
    function Counter({ text }: { text: string }) {
      const count = useTrackedStore(store, (s) =>
        text === 'a' ? s.count : s.count + 1
      );
      return <div data-testid="count">{count}</div>;
    }

    function CounterParent() {
      const text = useTrackedStore(store, (s) => s.text);
      return (
        <div>
          <div data-testid="text">{text}</div>
          <Counter text={text} />
        </div>
      );
    }
    render(<CounterParent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
});

describe('createTrackedWithEqualityFn', () => {
  type State = {
    count: number;
    text: string;
    increment: () => void;
    setText: (t: string) => void;
  };

  function setupStore() {
    return createTrackedWithEqualityFn<State>((set) => ({
      count: 0,
      text: 'a',
      increment: () => set((s) => ({ count: s.count + 1 })),
      setText: (t) => set({ text: t }),
    }));
  }

  it('only re-renders when tracked variable changes', () => {
    const useStore = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useStore((s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    function Text() {
      const text = useStore((s) => s.text);
      return <div data-testid="text">{text}</div>;
    }
    render(
      <>
        <Counter />
        <Text />
      </>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(renderCount).toBe(2); // initial + after increment
    act(() => useStore.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(renderCount).toBe(2); // Counter did not re-render
  });
  it('does not re-render when unrelated state changes', () => {
    const useStore = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useStore((s) => s.count);
      return <div>{count}</div>;
    }
    render(<Counter />);
    act(() => useStore.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });
  it('selector only runs when accessed value changes', () => {
    const useStore = setupStore();
    let selectorRuns = 0;
    function Comp() {
      const val = useStore((s) => {
        selectorRuns++;
        return s.count;
      });
      return <div>{val}</div>;
    }
    render(<Comp />);
    expect(selectorRuns).toBe(1);
    act(() => useStore.getState().setText('e'));
    expect(selectorRuns).toBe(1);
    act(() => useStore.getState().increment());
    expect(selectorRuns).toBe(3); // 1 for initial, 1 for the subscription, 1 for the rerender
  });
  it('should still get the correct value if an external state change happens', () => {
    const useStore = setupStore();
    function Counter({ text }: { text: string }) {
      const count = useStore((s) => (text === 'a' ? s.count : s.count + 1));
      return <div data-testid="count">{count}</div>;
    }

    function CounterParent() {
      const text = useStore((s) => s.text);
      return (
        <div>
          <div data-testid="text">{text}</div>
          <Counter text={text} />
        </div>
      );
    }
    render(<CounterParent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => useStore.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
  it('should not re-render when the equality function returns true', () => {
    const useStore = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useStore((s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    render(<Counter />);
    act(() => useStore.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });
});

describe('useTrackedStoreWithEqualityFn', () => {
  type State = {
    count: number;
    text: string;
    increment: () => void;
    setText: (t: string) => void;
  };

  function setupStore() {
    return createStore<State>((set) => ({
      count: 0,
      text: 'a',
      increment: () => set((s) => ({ count: s.count + 1 })),
      setText: (t) => set({ text: t }),
    }));
  }

  it('only re-renders when tracked variable changes', () => {
    const store = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useTrackedStoreWithEqualityFn(store, (s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    function Text() {
      const text = useTrackedStoreWithEqualityFn(store, (s) => s.text);
      return <div data-testid="text">{text}</div>;
    }
    render(
      <>
        <Counter />
        <Text />
      </>
    );
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(renderCount).toBe(2); // initial + after increment
    act(() => store.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(renderCount).toBe(2); // Counter did not re-render
  });
  it('does not re-render when unrelated state changes', () => {
    const store = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useTrackedStoreWithEqualityFn(store, (s) => s.count);
      return <div>{count}</div>;
    }
    render(<Counter />);
    act(() => store.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });
  it('selector only runs when accessed value changes', () => {
    const store = setupStore();
    let selectorRuns = 0;
    function Comp() {
      const val = useTrackedStoreWithEqualityFn(store, (s) => {
        selectorRuns++;
        return s.count;
      });
      return <div>{val}</div>;
    }
    render(<Comp />);
    expect(selectorRuns).toBe(1);
    act(() => store.getState().setText('e'));
    expect(selectorRuns).toBe(1);
    act(() => store.getState().increment());
    expect(selectorRuns).toBe(3); // 1 for initial, 1 for the subscription, 1 for the rerender
  });
  it('should still get the correct value if an external state change happens', () => {
    const store = setupStore();
    function Counter({ text }: { text: string }) {
      const count = useTrackedStoreWithEqualityFn(store, (s) =>
        text === 'a' ? s.count : s.count + 1
      );
      return <div data-testid="count">{count}</div>;
    }

    function CounterParent() {
      const text = useTrackedStoreWithEqualityFn(store, (s) => s.text);
      return (
        <div>
          <div data-testid="text">{text}</div>
          <Counter text={text} />
        </div>
      );
    }
    render(<CounterParent />);
    expect(screen.getByTestId('count').textContent).toBe('0');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().increment());
    expect(screen.getByTestId('count').textContent).toBe('1');
    expect(screen.getByTestId('text').textContent).toBe('a');
    act(() => store.getState().setText('b'));
    expect(screen.getByTestId('text').textContent).toBe('b');
    expect(screen.getByTestId('count').textContent).toBe('2');
  });
  it('should not re-render when the equality function returns true', () => {
    const store = setupStore();
    let renderCount = 0;
    function Counter() {
      renderCount++;
      const count = useTrackedStoreWithEqualityFn(store, (s) => s.count);
      return <div data-testid="count">{count}</div>;
    }
    render(<Counter />);
    act(() => store.getState().setText('c'));
    expect(renderCount).toBe(1); // did not re-render
  });
});
