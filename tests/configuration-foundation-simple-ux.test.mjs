import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const source = fs.readFileSync(new URL('../app/components/MasterDataConfigurationPanel.tsx', import.meta.url), 'utf8');

test('program and standard setup is merged into one business flow', () => {
  assert.match(source, /key: "programs"/);
  assert.match(source, /label: "Chương trình & tiêu chuẩn"/);
  assert.doesNotMatch(source, /key: "schemes"/);
  assert.doesNotMatch(source, /key: "standards"/);
});

test('the UI explains QMS versus ISO edition and prevents duplicate confusion', () => {
  assert.match(source, /QMS là chương trình; ISO 9001:2015 là tiêu chuẩn nằm bên trong QMS/);
  assert.match(source, /Chương trình .* đã tồn tại\. Không cần tạo lại/);
  assert.match(source, /Thêm tiêu chuẩn \/ phiên bản/);
});

test('standards are displayed nested under their scheme', () => {
  assert.match(source, /standardsByScheme/);
  assert.match(source, /standardEditionLabel\(standard\)/);
  assert.match(source, /Thêm phiên bản tiêu chuẩn/);
});

test('backend loading errors are explicit and never masquerade as an empty list', () => {
  assert.match(source, /foundationLoadError/);
  assert.match(source, /Không tải được danh sách chương trình \/ tiêu chuẩn/);
  assert.match(source, /không hiển thị “Trống”/);
});

test('long explanations are collapsed by default', () => {
  assert.match(source, /Xem giải thích ·/);
  assert.match(source, /Xem giải thích từng mục cấu hình/);
});

test('standard code normalizer removes an edition suffix to avoid ISO 9001:2015:2015', () => {
  assert.match(source, /normalizeStandardCode/);
  assert.match(source, /Nếu lỡ nhập ISO 9001:2015, hệ thống sẽ tự tách năm khỏi mã/);
});
