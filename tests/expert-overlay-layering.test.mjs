import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import test from 'node:test';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const read = (file) => fs.readFileSync(path.join(root, file), 'utf8');

test('expert child modals render above the competency governance drawer', () => {
  const main = read('src/main.tsx');
  const css = read('src/expert-overlay-layering.css');

  assert.match(main, /import "\.\/expert-overlay-layering\.css"/);
  assert.match(css, /body:has\(\.experts-screen\) \.ant-modal-root \.ant-modal-mask/);
  assert.match(css, /body:has\(\.experts-screen\) \.ant-modal-root \.ant-modal-wrap/);
  assert.match(css, /z-index:\s*1040\s*!important/);
});
