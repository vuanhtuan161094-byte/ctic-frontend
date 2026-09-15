import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import vm from 'node:vm';
import ts from 'typescript';

const source = await readFile(new URL('../app/components/ImportJobDetails.tsx', import.meta.url), 'utf8');
const panel = await readFile(new URL('../app/components/MasterDataConfigurationPanel.tsx', import.meta.url), 'utf8');
const output = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.React } }).outputText;
const rows = [
  { row_number: 2, validation_status: 'INVALID', raw_data: '{"code":"bad"}', normalized_data: '{}', errors: '["Missing reference"]', warnings: null },
  { row_number: 3, validation_status: 'DUPLICATE', raw_data: '{}', normalized_data: '{}', errors: '["Duplicate key"]', warnings: null },
  { row_number: 4, validation_status: 'VALID', raw_data: '{}', normalized_data: '{}', errors: null, warnings: '["Draft awaiting publication"]' },
];
function render(state = 'READY_FOR_PUBLICATION', allowed = true, error = false) {
  const calls = [];
  const ui = Object.fromEntries(['Alert', 'Button', 'Descriptions', 'Select', 'Space', 'Table'].map(x => [x, x]));
  ui.Modal = Object.assign(() => {}, { confirm: options => options.onOk() }); ui.Typography = { Text: 'Text' };
  const job = { id: 'old-job', entity_type: 'ISIC_NACE_MAPPING', source_file_name: 'mapping.csv', source_sha256: 'abc123', publication_state: state, can_publish: allowed, can_commit: state === 'VALIDATED', total_rows: 3, valid_rows: 1, invalid_rows: 1, duplicate_rows: 1, warning_rows: 1, rows };
  const context = { exports: {}, React: { createElement: (type, props, ...children) => ({ type, props: props ?? {}, children }), Fragment: 'fragment' }, require: name => {
    if (name === 'react') return { useState: () => ['ALL', () => {}] };
    if (name === 'antd') return ui;
    if (name.includes('react-query')) return { useQuery: options => { calls.push(options.queryKey); return { data: job }; }, useQueryClient: () => ({ invalidateQueries() {} }), useMutation: () => ({ isError: error, error: new Error('Server rejected publication'), mutate: action => calls.push(action), mutateAsync: action => calls.push(action) }) };
    return { api: {}, getErrorMessage: error => error.message };
  } };
  vm.runInNewContext(output, context);
  const tree = context.exports.ImportJobDetails({ id: 'old-job', onClose() {} });
  const nodes = [];
  const walk = value => { if (Array.isArray(value)) value.forEach(walk); else if (value && typeof value === 'object') { nodes.push(value); walk(value.children); } }; walk(tree);
  return { helpers: context.exports, nodes, calls, job };
}
test('validation selection is retained and existing import details reopen by id', () => {
  assert.match(panel, /setSelectedImportJob\(result\.data\.id\)/);
  assert.match(panel, /setSelectedImportJob\(row\.id\)/);
  assert.deepEqual(Array.from(render().calls[0]), ['import-job-detail', 'old-job']);
});
test('row evidence includes exact errors warnings and original normalized values', () => {
  const table = render().nodes.find(x => x.type === 'Table');
  assert.equal(table.props.dataSource.length, 3);
  assert.equal(table.props.columns.find(x => x.title === 'Lỗi').render(null, rows[0]), 'Missing reference');
  assert.equal(table.props.columns.find(x => x.title === 'Cảnh báo').render(null, rows[2]), 'Draft awaiting publication');
  assert.ok(table.props.columns.find(x => x.title.includes('chuẩn hóa')).render(null, rows[0]));
});
test('all error duplicate warning valid filters execute', () => {
  const { helpers } = render();
  for (const [filter, expected] of [['ALL', 3], ['INVALID', 1], ['DUPLICATE', 1], ['WARNINGS', 1], ['VALID', 1]]) assert.equal(helpers.filterImportRows(rows, filter).length, expected);
});
test('error report CSV contains row messages and escaped source values', () => {
  const csv = render().helpers.importErrorCsv(rows);
  assert.ok(csv.startsWith('\uFEFF')); assert.match(csv, /Missing reference/); assert.match(csv, /Duplicate key/); assert.match(csv, /Draft awaiting publication/); assert.match(csv, /""code""/);
});
test('draft and operational states are distinct and publish requires backend permission', () => {
  const draft = render(); const operational = render('OPERATIONAL', false);
  const label = result => result.nodes.find(x => x.type === 'Descriptions').props.items.find(x => x.key === 'status').children;
  assert.match(label(draft), /mapping nháp/); assert.match(label(operational), /Đang vận hành/);
  const publish = result => result.nodes.find(x => x.type === 'Button' && x.children.includes('Công bố lô mapping'));
  assert.ok(publish(draft)); assert.equal(publish(operational), undefined);
  publish(draft).props.onClick(); assert.ok(draft.calls.includes('publish'));
});
test('failed publish shows the server error without synthesizing operational state', () => {
  const result = render('DRAFTS_NEED_REVIEW', false, true);
  assert.ok(result.nodes.some(x => x.type === 'Alert' && x.props.message === 'Server rejected publication'));
  assert.equal(result.job.publication_state, 'DRAFTS_NEED_REVIEW');
  assert.equal(result.nodes.some(x => x.type === 'Button' && x.children.includes('Công bố lô mapping')), false);
});
