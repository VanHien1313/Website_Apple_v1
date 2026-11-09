import assert from 'node:assert/strict';
import { build } from 'vite';

// Exercise the build guard with a real forbidden dependency, without editing source.
await assert.rejects(build({
  mode: 'api', logLevel: 'silent', build: { write: false },
  plugins: [{
    name: 'test-forbidden-demo-import',
    transform(code, id) {
      if (id.replaceAll('\\', '/').endsWith('/src/routes/ApiRoutes.tsx')) {
        return `${code}\nimport '../data/mockProducts';`;
      }
    },
  }],
}), /API build must not include demo module/);
console.log('PASS: API build rejects an injected demo dependency.');
