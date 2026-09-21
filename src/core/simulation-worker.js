import { simulate, focusScan } from './simulate.js';

// Each request contains its complete state; no DOM or shared UI state exists here.
globalThis.onmessage = ({ data }) => {
  try {
    const result =
      data.kind === 'focus'
        ? focusScan(data.state, data.scan)
        : simulate(data.state);
    globalThis.postMessage({ id: data.id, result });
  } catch (error) {
    globalThis.postMessage({ id: data.id, error: error.message });
  }
};
