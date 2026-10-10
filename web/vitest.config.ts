import { defineConfig } from 'vitest/config';
import { resolve } from 'node:path';

export default defineConfig({
  resolve: { alias: { 'qsg.circuit': resolve(__dirname, 'src/test/fake-qsg-circuit.ts') } },
  test: { environment: 'node', include: ['src/**/*.test.ts'] },
});
