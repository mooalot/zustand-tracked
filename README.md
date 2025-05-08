# zustand-tracked

A small library that allows all your selectors to be tracked, optimizing computations and rerenders.

## Why?

Updating data in your store triggers all selectors to recompute, which can be costly with many or complex selectors. This library optimizes performance by tracking dependencies and only recomputing affected selectors, making it ideal for large applications.

## Installation

```bash
npm install zustand-tracked
```

## Usage Example

```typescript
import { createTracked } from 'zustand-tracked';

type State = {
  count: number;
  increment: () => void;
};

const useStore = createTracked<State>((set) => ({
  count: 0,
  increment: () => set((state) => ({ count: state.count + 1 })),
}));

function App() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  return (
    <div>
      <h1>Tracked Computer Example</h1>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}
```

## API

| Method                          | Description                                                                                     |
| ------------------------------- | ----------------------------------------------------------------------------------------------- |
| `createTracked`                 | Create a store with tracked selectors.                                                          |
| `useTrackedStore`               | A hook to access the store with tracked selectors.                                              |
| `createTrackedWithEqualityFn`   | Create a store with tracked selectors and a custom equality function.                           |
| `useTrackedStoreWithEqualityFn` | A hook to access the store with tracked selectors and a custom equality function.               |
| `createTrackedComputer`         | Create a tracked computer that can be used to compute derived state based on the store's state. |

## Optimal Performance

For optimal performance, it is best to use `createTrackedWithEqualityFn` or `useTrackedStoreWithEqualityFn` with `useCallback` for the selector. This ensures that the selector is only recomputed when its dependencies change.

```typescript
const value = useStore(
  useCallback((state) => {
    //...some expensive computation
  }, []),
  (a, b) => a === b
);
```

Keep in mind that using `useCallback` is not always necessary, but it can help with performance in some cases. If you find that your selectors are being recomputed too often or are very complex, consider using `useCallback` to memoize them.

## More Examples

See more examples on [Github](https://github.com/mooalot/zustand-tracked/tree/main/examples/global)

## License

This project is licensed under the MIT License. See the [LICENSE](LICENSE) file for details.

## Contributing

Contributions are welcome! Please open an issue or submit a pull request if you have suggestions or improvements.
