/** Latest request wins. Termination cancels CPU work, versioning rejects races. */
export function createSimulationRunner(createWorker) {
  let worker = null,
    version = 0,
    pending = null;
  function cancel() {
    version++;
    worker?.terminate();
    worker = null;
    pending?.resolve(null);
    pending = null;
  }
  function run(state, kind = 'trace', scan = null) {
    cancel();
    const id = version;
    return new Promise((resolve, reject) => {
      pending = { resolve, reject };
      try {
        worker = createWorker();
      } catch (error) {
        pending = null;
        reject(error);
        return;
      }
      worker.onmessage = ({ data }) => {
        if (data.id !== id || version !== id) return;
        pending = null;
        worker?.terminate();
        worker = null;
        if (data.error) reject(new Error(data.error));
        else resolve(data.result);
      };
      worker.onerror = (event) => {
        if (version !== id) return;
        pending = null;
        worker?.terminate();
        worker = null;
        reject(new Error(event.message || 'Simulation worker failed.'));
      };
      try {
        worker.postMessage({ id, state, kind, scan });
      } catch (error) {
        pending = null;
        worker?.terminate();
        worker = null;
        reject(error);
      }
    });
  }
  return { run, cancel };
}
