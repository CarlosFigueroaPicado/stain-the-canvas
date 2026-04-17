const listeners = new Set();

let state = {
  user: null,
  products: [],
  productsLoaded: false,
  productsRequest: null
};

export function getState() {
  return state;
}

export function setState(patch) {
  state = {
    ...state,
    ...(patch || {})
  };

  listeners.forEach((listener) => {
    listener(state);
  });

  return state;
}

export function updateState(updater) {
  const nextPatch = typeof updater === "function" ? updater(state) : updater;
  return setState(nextPatch);
}

export function subscribe(listener) {
  if (typeof listener !== "function") {
    return function noop() {};
  }

  listeners.add(listener);
  return function unsubscribe() {
    listeners.delete(listener);
  };
}

export function resetProductsState() {
  return setState({
    products: [],
    productsLoaded: false,
    productsRequest: null
  });
}
