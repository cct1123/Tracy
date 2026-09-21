import { migrateProjectJSON } from './project-schema.js';

/** Device-local storage only. Success means the transaction committed, not just
 * that a put request was queued. Projects and crash recovery are separate. */
export async function openLocalProjects(indexedDB = globalThis.indexedDB) {
  if (!indexedDB) throw new Error('IndexedDB is unavailable in this browser.');
  const database = await new Promise((resolve, reject) => {
    const request = indexedDB.open('tracy-workbench', 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains('projects'))
        db.createObjectStore('projects', { keyPath: 'id' });
      if (!db.objectStoreNames.contains('recovery'))
        db.createObjectStore('recovery');
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
    request.onblocked = () =>
      reject(new Error('Close other Tracy tabs to upgrade local storage.'));
  });
  database.onversionchange = () => database.close();
  function transact(storeName, mode, run) {
    return new Promise((resolve, reject) => {
      const transaction = database.transaction(storeName, mode);
      let result;
      const request = run(transaction.objectStore(storeName));
      request.onsuccess = () => {
        result = request.result;
      };
      transaction.oncomplete = () => resolve(result);
      transaction.onabort = transaction.onerror = () =>
        reject(
          transaction.error ||
            request.error ||
            new Error('Local save was aborted.'),
        );
    });
  }
  return {
    async recovery() {
      const record = await transact('recovery', 'readonly', (store) =>
        store.get('current'),
      );
      return record ? migrateProjectJSON(record) : null;
    },
    saveRecovery(project) {
      return transact('recovery', 'readwrite', (store) =>
        store.put(migrateProjectJSON(project), 'current'),
      );
    },
    async list() {
      const records = await transact('projects', 'readonly', (store) =>
        store.getAll(),
      );
      return records
        .map(({ id, name, savedAt }) => ({ id, name, savedAt }))
        .sort((a, b) => b.savedAt.localeCompare(a.savedAt));
    },
    async load(id) {
      const record = await transact('projects', 'readonly', (store) =>
        store.get(id),
      );
      if (!record)
        throw new Error('The selected local project no longer exists.');
      return migrateProjectJSON(record.project);
    },
    save(project) {
      const data = migrateProjectJSON(project);
      return transact('projects', 'readwrite', (store) =>
        store.put({
          id: data.project.id,
          name: data.project.name,
          savedAt: new Date().toISOString(),
          project: data,
        }),
      );
    },
    close() {
      database.close();
    },
  };
}

/** Serialize writes; an old completion must never mark newer edits as saved.
 * Failed writes retain dirty state and can be retried with flush(). */
export function createAutosave({
  capture,
  write,
  status = () => {},
  delay = 450,
}) {
  let revision = 0;
  let savedRevision = 0;
  let timer;
  let pending = null;
  let disposed = false;
  async function flush() {
    clearTimeout(timer);
    if (disposed || revision === savedRevision) return;
    if (pending) {
      await pending;
      return flush();
    }
    const savingRevision = revision;
    const snapshot = capture();
    status('saving');
    pending = Promise.resolve().then(() => write(snapshot));
    try {
      await pending;
      savedRevision = savingRevision;
      status(revision === savedRevision ? 'saved' : 'dirty');
    } catch (error) {
      status('error', error);
      throw error;
    } finally {
      pending = null;
    }
    if (revision !== savedRevision) return flush();
  }
  return {
    changed() {
      if (disposed) return;
      revision++;
      status('dirty');
      clearTimeout(timer);
      timer = setTimeout(() => {
        flush().catch(() => {});
      }, delay);
    },
    get dirty() {
      return revision !== savedRevision;
    },
    flush,
    dispose() {
      disposed = true;
      clearTimeout(timer);
    },
  };
}
