import { expect, test } from '@playwright/test';
import { captureVisualBaseline, expectNoHorizontalOverflow, runAxeBaseline, watchRuntimeIssues } from '../helpers/quality.mjs';

const session = { access_token: 'controlled-fix2-not-a-credential', user: {
  id: 'fix2-admin', username: 'fix2.admin', full_name: 'Fix 2 Browser QA', roles: ['ADMIN'],
} };
const schemes = [
  { id: 'ems', code: 'EMS', name: 'Hệ thống quản lý môi trường', status: 'ACTIVE' },
  { id: 'qms', code: 'QMS', name: 'Hệ thống quản lý chất lượng', status: 'ACTIVE' },
];
const standards = schemes.map((scheme, index) => ({ id: `edition-${scheme.id}`, scheme_id: scheme.id,
  standard_code: index ? 'ISO 9001' : 'ISO 14001:2015', standard_name: scheme.name,
  edition: '2015', status: 'ACTIVE', effective_from: '2015-09-15', scheme,
}));
const iafs = [
  ['12', 'Hóa chất, sản phẩm hóa chất và sợi'], ['14', 'Cao su và sản phẩm nhựa'],
  ['15', 'Sản phẩm khoáng phi kim loại'], ['16', 'Bê tông, xi măng, vôi, thạch cao'],
  ['19', 'Thiết bị điện và quang học'], ['28', 'Xây dựng'],
].map(([iaf_code, iaf_name]) => ({ id: `iaf-${iaf_code}`, iaf_code, iaf_name, is_active: true }));
const industryCode = (classification_type, code, title, level = 4) => ({
  id: `${classification_type}-${code}`, classification_type,
  revision: classification_type === 'ISIC' ? 'ISIC_REV_4' : 'NACE_REV_2',
  code, title_en: title, title_vi: title, level, is_active: true,
});
const isics = [industryCode('ISIC', '2220', 'Sản xuất sản phẩm nhựa'), industryCode('ISIC', '2651', 'Sản xuất thiết bị đo lường')];
const naces = [industryCode('NACE', '22.21', 'Sản xuất tấm, phiến, ống nhựa'), industryCode('NACE', '26.5', 'Sản xuất thiết bị đo lường', 3)];
const mapping = { id: 'mapping-plastic', mapping_type: 'ONE_TO_MANY', mapping_status: 'APPROVED', source_code: isics[0], target_code: naces[0] };
const candidate = (code) => ({ mapping_id: `mapping-${code}`, iaf_scope_id: `iaf-${code}`, iaf_code: code,
  iaf_name: iafs.find(item => item.iaf_code === code).iaf_name, source_document: 'IAF ID 1:2023', derived: false, derived_from_nace_codes: [],
});
function capability(id, standard, code, extra = {}) {
  return { id, program_code: standard?.scheme.code ?? 'OHSMS', program_name: standard?.scheme.name ?? 'An toàn và sức khỏe nghề nghiệp',
    standard_edition_id: standard?.id ?? null, standard_edition: standard ?? null,
    iaf_scope_id: `iaf-${code}`, iaf_scope: iafs.find(item => item.iaf_code === code),
    status: 'ACTIVE', effective_from: '2026-01-01', effective_to: null, notes: null, ...extra,
  };
}
async function installApi(page, options = {}) {
  const writes = [];
  const resolves = [];
  const rows = [capability('ems12', standards[0], '12'), capability('ems14', standards[0], '14', { effective_to: '2026-09-30' }),
    capability('ems15', standards[0], '15', { effective_to: '2026-09-19' }), capability('ems16', standards[0], '16', { status: 'INACTIVE' }),
    capability('qms19', standards[1], '19'), capability('qms28', standards[1], '28', { effective_from: '2026-10-01' }),
    capability('legacy28', null, '28')];
  await page.clock.setFixedTime(new Date('2026-09-20T05:00:00Z'));
  await page.addInitScript(value => sessionStorage.setItem('ctic_cmp_session', JSON.stringify(value)), session);
  await page.route(/http:\/\/(?:127\.0\.0\.1|localhost):3000\/.*/, async route => {
    const req = route.request(); const url = new URL(req.url()); const path = url.pathname;
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json; charset=utf-8', body: JSON.stringify(body) });
    if (req.method() === 'POST' && path === '/certification-body-capabilities/batch') {
      const body = req.postDataJSON(); writes.push({ method: 'POST', body });
      for (const id of body.iaf_scope_ids) rows.push(capability(`new-${id}`, standards.find(item => item.id === body.standard_edition_id), iafs.find(item => item.id === id).iaf_code, body));
      return json({ created_count: body.iaf_scope_ids.length, existing_count: 0 });
    }
    if (req.method() === 'PATCH' && path.startsWith('/certification-body-capabilities/')) {
      const body = req.postDataJSON(); writes.push({ method: 'PATCH', path, body });
      Object.assign(rows.find(item => item.id === path.split('/').pop()), body);
      return json({});
    }
    if (req.method() === 'POST' && path === '/industry-classifications/resolve-batch') {
      const { items } = req.postDataJSON();
      resolves.push(...items);
      return json({ items: items.map(query => {
        const source = isics.find(item => item.code === query.code);
        const plastic = source.code === '2220'; const iaf = candidate(plastic ? '14' : '19');
        return { source, management_system: query.management_system,
          nace_candidates: [{ mapping_type: 'ONE_TO_MANY', nace: naces[plastic ? 0 : 1], iaf_candidates: [iaf] }],
          iaf_summary: { status: 'UNIQUE', iaf_codes: [iaf.iaf_code], candidates: [iaf] } };
      }) });
    }
    if (req.method() !== 'GET') return json({ message: 'Unexpected mutation in controlled Fix 2 fixture' }, 405);
    if (path === '/auth/me') return json({ user: { ...session.user, permissions: ['classifications.manage', 'projects.read', 'users.read'] } });
    if (path === '/platform-branding') return json({});
    if (path === '/notifications/me') return json({ items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } });
    if (path === '/me/workspace') return json({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [], calendar_items: [] });
    if (path === '/master-data-configuration/standards') return json(standards);
    if (path === '/master-data-configuration/configuration-readiness') return json({ schemes: { ready: true, items: [] }, organization: { ready: true, reasons: [] }, taxonomy: { ready: !options.blocked, reasons: [] }, numbering: { ready: true, reasons: [] } });
    if (path === '/certification-body-capabilities') return json(rows);
    if (path === '/industry-classifications/iaf-scopes') return json(iafs);
    if (path === '/industry-classifications/readiness') return json({ ready: !options.blocked, operational_revisions: { ISIC: 'ISIC_REV_4', NACE: 'NACE_REV_2' }, reasons: options.blocked ? [{ code: 'UNRESOLVED', blocking: true, message: 'Thiếu ánh xạ NACE cho hoạt động cần chứng nhận' }] : [] });
    if (path === '/industry-classifications/summary') return json({ chain: ['ISIC', 'NACE', 'IAF'], counts: { isic_total: 2, isic_classes: 2, nace_total: 2, nace_classes: 1, iaf_total: 6, isic_nace_approved: 1 }, sources: [{ key: 'iaf', label: 'IAF ID 1:2023', owner: 'IAF', purpose: 'QMS / EMS', url: 'https://iaf.nu' }] });
    if (path === '/industry-classifications/mapping-coverage') return json({ management_system: url.searchParams.get('management_system'), total_isic_classes: 2, resolved: 2, unique_iaf: 2, multiple_iaf: 0, outside_iaf_table: 0, unresolved: options.blocked ? 1 : 0, complete_for_certifiable_isic: !options.blocked, unresolved_items: [], note: '' });
    if (path === '/industry-classifications/codes') return json(url.searchParams.get('classification_type') === 'ISIC' ? isics : naces);
    if (path === '/industry-classifications/mappings') return json([mapping]);
    if (path === '/industry-classifications/nace-iaf-projection') return json({ management_system: url.searchParams.get('management_system'), operational_revision: 'NACE_REV_2', items: naces.map((nace, index) => ({ nace, resolution_status: 'UNIQUE', outside_iaf_table: false, derived_from_nace_classes: [], iaf_candidates: [candidate(index ? '19' : '14')] })) });
    if (path === '/industry-classifications/resolve') {
      const query = Object.fromEntries(url.searchParams); resolves.push(query);
      const source = [...isics, ...naces].find(item => item.code === query.code && item.classification_type === query.classification_type);
      const plastic = source.code === '2220' || source.code === '22.21'; const iaf = candidate(plastic ? '14' : '19');
      return json({ source, management_system: query.management_system, nace_candidates: [{ mapping_type: plastic ? 'ONE_TO_MANY' : 'DERIVED_FROM_CHILDREN', nace: naces[plastic ? 0 : 1], iaf_candidates: [iaf] }], iaf_summary: { status: 'UNIQUE', iaf_codes: [iaf.iaf_code], candidates: [iaf] } });
    }
    return json([]);
  });
  return { writes, resolves };
}
async function selectOption(page, label, option) {
  await page.getByRole('combobox', { name: label, exact: true }).click();
  await page.locator('.ant-select-dropdown:visible').getByText(option, { exact: true }).click();
}
async function quality(page, testInfo, name) {
  await expectNoHorizontalOverflow(page);
  await page.screenshot({ path: testInfo.outputPath(`${name}-viewport.png`), animations: "disabled" });
  await captureVisualBaseline(page, testInfo, name);
  await runAxeBaseline(page, testInfo);
}

test('taxonomy unified workspace keeps lookup, catalog, mapping and sources usable', async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const fixture = await installApi(page);
  await page.goto('/admin/configuration/classifications');

  await expect(page.getByRole('heading', { name: 'Phân loại ngành', exact: true })).toBeVisible();
  for (const tab of ['Tra cứu', 'Danh mục', 'Ánh xạ & kiểm soát', 'Nguồn tham chiếu']) {
    await expect(page.getByRole('tab', { name: tab, exact: true })).toBeVisible();
  }
  await expect(page.getByText('Chuỗi phân loại dùng trong CMP', { exact: true })).toBeVisible();
  await expect(page.getByText('Dữ liệu sẵn sàng', { exact: true })).toBeVisible();
  await quality(page, testInfo, 'taxonomy-unified-default');

  await page.getByRole('textbox', { name: 'Mã cần tra', exact: true }).fill('2220');
  await page.getByRole('button', { name: /Tra IAF$/ }).click();
  await expect(page.getByText('Kết quả:')).toBeVisible();
  await expect(page.getByText(/IAF 14/).filter({ visible: true }).first()).toBeVisible();
  expect(fixture.resolves.at(-1)).toEqual({
    classification_type: 'ISIC',
    revision: 'ISIC_REV_4',
    code: '2220',
    management_system: 'QMS',
  });

  await page.getByRole('tab', { name: 'Nhiều hoạt động', exact: true }).click();
  await page.getByRole('combobox', { name: 'Hoạt động ISIC', exact: true }).click();
  await page.locator('.ant-select-dropdown:visible').getByText('2220 · Sản xuất sản phẩm nhựa', { exact: true }).click();
  await page.locator('.ant-select-dropdown:visible').getByText('2651 · Sản xuất thiết bị đo lường', { exact: true }).click();
  await page.keyboard.press('Escape');
  await page.getByRole('button', { name: /Tra NACE & IAF$/ }).click();
  await expect(page.getByText(/IAF 14/).filter({ visible: true })).toBeVisible();
  await expect(page.getByText(/IAF 19/).filter({ visible: true }).first()).toBeVisible();
  expect(fixture.resolves.slice(-2).map(item => item.code)).toEqual(['2220', '2651']);

  await page.getByRole('tab', { name: 'Ánh xạ & kiểm soát', exact: true }).click();
  await expect(page.locator('.taxonomy-control-strip').getByText('Đã xác định IAF', { exact: true })).toBeVisible();
  await expect(page.getByText('Lỗi ánh xạ', { exact: true })).toBeVisible();
  await expect(page.getByRole('cell', { name: /2220/ })).toBeVisible();
  await expect(page.getByRole('cell', { name: /22\.21/ })).toBeVisible();

  await expect(page.getByRole('tab', { name: 'NACE → IAF', exact: true })).toHaveCount(0);
  await page.getByRole('textbox', { name: 'Tìm chuỗi ISIC NACE IAF', exact: true }).fill('14');
  await expect(page.getByText('IAF 14', { exact: true }).filter({ visible: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Danh mục', exact: true }).click();
  await expect(page.locator('.taxonomy-data-strip > div').first().locator('strong')).toHaveText(String(isics.length));
  await expect(page.getByRole('cell', { name: '2220' })).toBeVisible();
  await page.getByRole('tab', { name: 'IAF', exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm IAF', exact: true }).fill('Cao su');
  await expect(page.getByRole('cell', { name: 'Cao su và sản phẩm nhựa', exact: true })).toBeVisible();

  await page.getByRole('tab', { name: 'Nguồn tham chiếu', exact: true }).click();
  await expect(page.getByRole('link', { name: 'Mở nguồn' }).first()).toBeVisible();

  await expectNoHorizontalOverflow(page);
  expect(fixture.writes).toEqual([]);
  runtime.assertClean();
});

test('legacy taxonomy mapping route resolves into the unified workspace', async ({ page }) => {
  await installApi(page);
  await page.goto('/admin/configuration/mappings');
  await expect(page.getByRole('heading', { name: 'Phân loại ngành', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Tra cứu', exact: true })).toBeVisible();
  await expect(page.getByRole('tab', { name: 'Ánh xạ & kiểm soát', exact: true })).toBeVisible();
});

test('taxonomy blocking issue remains prominent without duplicate readiness chrome', async ({ page }, testInfo) => {
  await installApi(page, { blocked: true });
  await page.goto('/admin/configuration/classifications');
  await expect(page.getByText('Dữ liệu phân loại chưa sẵn sàng', { exact: true })).toBeInViewport();
  await expect(page.getByText('Thiếu ánh xạ NACE cho hoạt động cần chứng nhận', { exact: true })).toBeVisible();
  await expect(page.getByText('Không có mục cấu hình bắt buộc nào còn thiếu.')).toHaveCount(0);
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page, testInfo, 'taxonomy-blocked');
});

test('competence matrix, summary and filters use the existing records', async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  await installApi(page);
  await page.goto('/admin/configuration/capabilities');

  const overview = page.getByLabel('Tổng quan năng lực');
  await expect(overview.getByText('Năng lực hiệu lực', { exact: true })).toBeVisible();
  await expect(overview.getByText('4', { exact: true }).first()).toBeVisible();
  await expect(overview.getByText('Phiên bản tiêu chuẩn', { exact: true })).toBeVisible();
  await expect(overview.getByText('3', { exact: true }).first()).toBeVisible();
  await expect(overview.getByText('IAF đang bao phủ', { exact: true })).toBeVisible();
  await expect(overview.getByText('4 / 6', { exact: true })).toBeVisible();
  await expect(overview.getByText('Cần rà soát', { exact: true })).toBeVisible();
  await expect(overview.getByText('2', { exact: true }).first()).toBeVisible();
  await expect(overview.getByText('1 sắp hết · 1 hết hạn · 1 ngừng', { exact: true })).toBeVisible();

  const matrix = page.getByRole('region', { name: 'Ma trận năng lực theo IAF và tiêu chuẩn' });
  await expect(matrix).toBeVisible();
  await expect(matrix.getByText('ISO 14001:2015', { exact: true })).toBeVisible();
  await expect(matrix.getByText('ISO 9001:2015', { exact: true })).toBeVisible();
  await expect(matrix.locator('button[title="Sắp hết · ISO 14001:2015 · IAF 14"]')).toBeVisible();
  await expect(matrix.locator('button[title="Hết hạn · ISO 14001:2015 · IAF 15"]')).toBeVisible();
  await expect(matrix.locator('button[title="Ngừng · ISO 14001:2015 · IAF 16"]')).toBeVisible();
  await quality(page, testInfo, 'capabilities-matrix');

  await selectOption(page, 'Lọc theo tiêu chuẩn', 'ISO 14001:2015');
  await expect(page.getByText('4 cấu hình · 4 lĩnh vực IAF', { exact: true })).toBeVisible();
  await page.getByRole('textbox', { name: 'Tìm năng lực', exact: true }).fill('Cao su');
  await expect(page.getByText('1 cấu hình · 1 lĩnh vực IAF', { exact: true })).toBeVisible();

  await page.getByText('Bộ lọc nâng cao', { exact: true }).click();
  await page.getByRole('textbox', { name: 'Tìm năng lực', exact: true }).fill('');
  await selectOption(page, 'Lọc theo hiệu lực', 'Hết hạn trong 30 ngày');
  await expect(page.getByText('1 cấu hình · 1 lĩnh vực IAF', { exact: true })).toBeVisible();
  await selectOption(page, 'Lọc theo hiệu lực', 'Đã hết hạn');
  await expect(page.getByText('1 cấu hình · 1 lĩnh vực IAF', { exact: true })).toBeVisible();

  await expectNoHorizontalOverflow(page);
  runtime.assertClean();
});

test('competence add and matrix edit keep exact edition, IAF and validity payloads', async ({ page }, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const fixture = await installApi(page);
  await page.goto('/admin/configuration/capabilities');

  await page.getByRole('button', { name: /Thêm năng lực$/ }).click();
  const create = page.getByRole('dialog', { name: 'Thêm năng lực tổ chức' });
  await expect(create.locator('#effective_from')).toHaveValue('20/09/2026');

  const standardInput = create.getByRole('combobox', { name: 'Chương trình / tiêu chuẩn / phiên bản' });
  await standardInput.fill('ISO 9001');
  await expect(page.locator('.ant-select-dropdown:visible').getByText('QMS · ISO 9001:2015 — Hệ thống quản lý chất lượng', { exact: true })).toBeVisible();
  await standardInput.press('Enter');

  const iafInput = create.getByRole('combobox', { name: 'Lĩnh vực IAF được cấp năng lực' });
  await iafInput.fill('Hóa chất');
  await expect(page.locator('.ant-select-dropdown:visible').getByText('IAF 12 · Hóa chất, sản phẩm hóa chất và sợi', { exact: true })).toBeVisible();
  await iafInput.press('Enter');
  await expect(create.getByRole('button', { name: 'Lưu 1 lĩnh vực IAF', exact: true })).toBeVisible();
  await iafInput.press('Escape');
  await quality(page, testInfo, 'capability-add');
  await create.getByRole('button', { name: 'Lưu 1 lĩnh vực IAF', exact: true }).click();
  await expect(create).not.toBeVisible();

  expect(fixture.writes[0]).toEqual({
    method: 'POST',
    body: {
      standard_edition_id: 'edition-qms',
      iaf_scope_ids: ['iaf-12'],
      status: 'ACTIVE',
      effective_from: '2026-09-20',
    },
  });

  await selectOption(page, 'Lọc theo tiêu chuẩn', 'ISO 9001:2015');
  await page.getByRole('textbox', { name: 'Tìm năng lực', exact: true }).fill('Hóa chất');
  await page.locator('button[title="Có · ISO 9001:2015 · IAF 12"]').click();

  const edit = page.getByRole('dialog', { name: 'Cập nhật năng lực', exact: true });
  await expect(edit.getByRole('textbox', { name: /Có hiệu lực từ$/ })).toHaveValue('20/09/2026');
  await edit.getByRole('textbox', { name: 'Tham chiếu / ghi chú' }).fill('Kiểm tra giao diện có kiểm soát');
  await quality(page, testInfo, 'capability-edit');
  await edit.getByRole('button', { name: 'Lưu thay đổi', exact: true }).click();
  await expect(edit).not.toBeVisible();

  expect(fixture.writes[1]).toEqual({
    method: 'PATCH',
    path: '/certification-body-capabilities/new-iaf-12',
    body: {
      status: 'ACTIVE',
      effective_from: '2026-09-20',
      notes: 'Kiểm tra giao diện có kiểm soát',
    },
  });
  runtime.assertClean();
});
