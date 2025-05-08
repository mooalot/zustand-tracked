import { create } from 'zustand';
import { createTrackedComputer } from 'zustand-tracked';

type State = {
  count: number;
  increment: () => void;
  squared: number;
};

const computer = createTrackedComputer<State>((state) => ({
  squared: state.count * state.count,
}));

const useStore = create<State>()(
  computer((set) => ({
    count: 0,
    increment: () => set((state) => ({ count: state.count + 1 })),
    squared: 0,
  }))
);

function App() {
  const count = useStore((state) => state.count);
  const increment = useStore((state) => state.increment);
  const squared = useStore((state) => state.squared);

  return (
    <div>
      <h1>Tracked Computer Example</h1>
      <p>Count: {count}</p>
      <p>Squared: {squared}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

export default App;
