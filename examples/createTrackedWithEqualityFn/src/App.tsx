import { createTrackedWithEqualityFn } from 'zustand-tracked';

type State = {
  count: number;
  increment: () => void;
};

const useStore = createTrackedWithEqualityFn<State>(
  (set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
  }),
  Object.is
);

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

export default App;
