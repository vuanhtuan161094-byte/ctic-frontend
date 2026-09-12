import fs from 'node:fs';
import test from 'node:test';
import assert from 'node:assert/strict';

const programs = fs.readFileSync(new URL('../app/components/CertificationProgramsPanel.tsx', import.meta.url), 'utf8');
const routes = fs.readFileSync(new URL('../app/components/ConfigurationRouteScreen.tsx', import.meta.url), 'utf8');

test('program and standard setup is one focused business surface', () => {
  assert.match(routes, /CertificationProgramsPanel/);
  assert.match(routes, /label: "Chương trình & tiêu chuẩn"/);
  assert.match(routes, /section === "standards" \? "schemes" : section/);
});

test('the working surface avoids tutorial and implementation copy', () => {
  assert.doesNotMatch(programs, /Chỉ cần nhớ/);
  assert.doesNotMatch(programs, /Hiểu đơn giản/);
  assert.doesNotMatch(programs, /Ảnh hưởng:/);
  assert.doesNotMatch(routes, /backend kiểm soát/);
  assert.doesNotMatch(routes, /chiếu trực tiếp từ dữ liệu/);
});

test('standards are displayed nested under their program with direct actions', () => {
  assert.match(programs, /standardsByScheme/);
  assert.match(programs, /standardEditionLabel\(standard\)/);
  assert.match(programs, /Thêm phiên bản/);
  assert.match(programs, /MoreOutlined/);
});

test('readiness is compact and separate from program operational status', () => {
  assert.match(programs, /chương trình/);
  assert.match(programs, /sẵn sàng/);
  assert.match(programs, /cần thiết lập/);
  assert.match(programs, /function ProgramStatus/);
});

test('the new surface does not duplicate the program data in a second full table', () => {
  assert.doesNotMatch(programs, /Xem bảng tất cả tiêu chuẩn/);
  assert.doesNotMatch(programs, /<Table/);
});

test('standard code normalizer prevents ISO 9001:2015:2015 labels', () => {
  assert.match(programs, /function normalizeStandardCode/);
  assert.match(programs, /normalizeStandardCode\(values\.standard_code, edition\)/);
});
