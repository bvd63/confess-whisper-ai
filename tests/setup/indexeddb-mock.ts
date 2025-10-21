import { vi } from 'vitest';

const mock = {
  open: vi.fn(() => ({
    onerror: vi.fn(),
    onsuccess: vi.fn(),
    result: {
      createObjectStore: vi.fn(() => ({
        createIndex: vi.fn(),
      })),
      transaction: vi.fn(() => ({
        objectStore: vi.fn(() => ({
          get: vi.fn(),
          put: vi.fn(),
          delete: vi.fn(),
        })),
      })),
    },
  })),
  deleteDatabase: vi.fn(),
};

Object.defineProperty(window, 'indexedDB', {
  value: mock,
  writable: true,
});
