import test from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';

const vite = fs.readFileSync(new URL('../vite.ctic.config.ts', import.meta.url), 'utf8');
const env = fs.readFileSync(new URL('../.env.production.example', import.meta.url), 'utf8');
const deployment = fs.readFileSync(new URL('../app/lib/deployment-config.ts', import.meta.url), 'utf8');

test('production build has an explicit deployment target guard', () => {
  assert.match(vite, /VITE_DEPLOYMENT_TARGET/);
  assert.match(vite, /localhost/);
});

test('production source maps are disabled', () => {
  assert.match(vite, /sourcemap:\s*false/);
});

test('production example prefers same-origin without localhost values', () => {
  assert.match(env, /VITE_DEPLOYMENT_TARGET=production/);
  assert.match(env, /VITE_API_BASE_URL=\s*$/m);
  assert.match(env, /VITE_PUBLIC_API_BASE_URL=\s*$/m);
});

test('runtime browser helper still supports same-origin reverse-proxy deployment', () => {
  assert.match(deployment, /same-origin/);
  assert.match(deployment, /window\.location/);
});
