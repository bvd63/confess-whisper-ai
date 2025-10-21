import { defineConfig, configDefaults } from 'vitest/config';
import react from '@vitejs/plugin-react-swc';
import path from 'path';

export default defineConfig({
  plugins: [react()],
  resolve: { alias: { '@': path.resolve(__dirname, 'src') } },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: [
      'tests/setup/indexeddb-mock.ts',
      'tests/setup/supabase-mock.ts',
      'tests/setup/test-setup.ts'
    ],
    exclude: [...configDefaults.exclude, 'tests/e2e/**'],
    css: true,
    restoreMocks: true,
    clearMocks: true,
    mockReset: true,
  },
});
