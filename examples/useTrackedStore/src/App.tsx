import { useMemo } from 'react';
import { createStore } from 'zustand';
import { useTrackedStore } from 'zustand-tracked';

type State = {
  count: number;
  increment: () => void;
};

function App() {
  const api = useMemo(
    () =>
      createStore<State>((set) => ({
        count: 0,
        increment: () => set((state) => ({ count: state.count + 1 })),
      })),
    []
  );

  const count = useTrackedStore(api, (state) => state.count);
  const increment = useTrackedStore(api, (state) => state.increment);

  return (
    <div>
      <h1>Tracked Computer Example</h1>
      <p>Count: {count}</p>
      <button onClick={increment}>Increment</button>
    </div>
  );
}

export default App;
