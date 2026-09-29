import { test, expect } from '@playwright/test';

// Controlled API fixtures, never live SQL UAT or backend authorization proof.
test.use({ viewport: { width: 1784, height: 864 } });
const catalog = [{ iaf_code: '14', iaf_name: 'Cao su và sản phẩm nhựa' }, { iaf_code: '17', iaf_name: 'Kim loại cơ bản và sản phẩm kim loại' }];
const competency = (id, status = 'DRAFT') => ({ id, expert_id: 'e1', standard_code: 'ISO 9001:2015', management_system: 'QMS',
  competency_role: 'AUDITOR', competency_level: 'QUALIFIED', scope_level: 'IAF', iaf_code: '14',
  effective_date: '2026-01-01', approval_status: status, evidence_summary: 'Chứng chỉ và kinh nghiệm', evidence_records: [], action_records: [] });

async function fixture(page, { self = false, subject = 'other', duplicate = false } = {}) {
  const session = { access_token: 'controlled-compact-fixture', user: { id: 'actor', username: 'fixture', full_name: 'Tài khoản kiểm thử', roles: [self ? 'AUDITOR' : 'ADMIN'] } };
  const rows = self ? ['DRAFT', 'RETURNED', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED'].map((status, i) => ({ ...competency('c' + i, status), evidence_records: [{ id: 'ev' + i, title: 'Chứng chỉ ' + i, status: 'ACTIVE' }] }))
    : [{ ...competency('pending', 'PENDING_APPROVAL'), action_records: [{ action_type: 'SUBMIT', actor_id: 'actor' }] },
      { ...competency('legacy', 'RETURNED'), scope_level: 'NACE', nace_code: '22.19', nace_revision: 'NACE_REV_2', competency_role: 'TECHNICAL_REVIEWER', competency_level: 'SENIOR' }];
  const expert = { id: 'e1', full_name: 'Nguyễn Minh An', employee_code: 'CG-001', status: 'active', profile_status: 'APPROVED',
    account: { id: subject, username: 'expert', roles: ['AUDITOR'] }, programs: [], industry_codes: [], competencies: rows,
    summary: { approved_competencies: 1, pending_competencies: 1, audit_count: 2, certificate_count: 1 },
    work_experiences: [], certificates: [], audit_team_members: [] };
  const requests = [];
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.addInitScript(value => sessionStorage.setItem('ctic_cmp_session', JSON.stringify(value)), session);
  await page.route(/http:\/\/(?:127\.0\.0\.1|localhost):3000\/.*/, async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    requests.push({ path, method: req.method(), body: req.headers()['content-type']?.includes('application/json') ? req.postDataJSON() : null });
    const json = (body, status = 200) => route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me') return json({ user: { ...session.user, permissions: self ? [] : ['experts.read', 'competencies.read', 'competencies.manage'] } });
    if (path === '/notifications/me') return json({ items: [], summary: { total: 0, unread: 0 } });
    if (path === '/platform-branding') return json({});
    if (path === '/me/workspace') return json({ work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 }, priority_work_items: [], recent_records: [], role_kpis: [] });
    if (path === '/experts/overview') return json({ experts: { total: 2 }, competencies: { approved: 3, expiring_90_days: 1, review_overdue: 1 }, certificates: {} });
    if (path === '/experts') return json([expert]);
    if (path === '/experts/e1') return json(expert);
    if (path.endsWith('/iaf-scopes')) return json(catalog);
    if (path === '/expert-competencies/me') return json(rows);
    if (path.endsWith('/batch')) return duplicate ? json({ message: 'Phạm vi đã tồn tại: IAF 14' }, 409) : json(catalog.map((c, i) => ({ ...competency('new' + i), iaf_code: c.iaf_code })));
    if (path.startsWith('/document-files/self/competency-evidence/')) return json([{ id: 'f1', original_name: 'chung-chi.txt' }]);
    if (path === '/document-files/self/competency-files/f1/download') return route.fulfill({ contentType: 'text/plain', body: 'Controlled attachment' });
    if (req.method() === 'PATCH') return json(req.postDataJSON());
    return json([]);
  });
  return { requests, errors };
}

async function openAdmin(page) {
  await page.goto('/resources/experts');
  await expect(page.getByRole('heading', { name: 'Chuyên gia & năng lực', exact: true })).toBeVisible();
  await page.locator('.expert-list-card').getByRole('button', { name: 'Mở', exact: true }).click();
  await page.getByRole('tab', { name: /Chương trình & lĩnh vực/ }).click();
}

async function selectIaf(page, code) {
  const field = page.getByRole('dialog', { name: /^(Thêm|Sửa) năng lực/ }).getByLabel('Phạm vi IAF');
  await field.fill(code);
  await page.locator('.ant-select-item-option').filter({ hasText: `IAF ${code} —` }).click();
}

test('compact desktop, canonical multi-IAF and two primary roles', async ({ page }, info) => {
  const h = await fixture(page);
  await page.goto('/resources/experts');
  await expect(page.locator('.expert-kpi-grid .ant-statistic')).toHaveCount(4);
  await expect(page.locator('.expert-list-card tr[data-row-key="e1"]')).toBeVisible();
  expect((await page.locator('.expert-list-card').boundingBox()).y).toBeLessThan(430);
  await page.screenshot({ path: info.outputPath('experts-1784x864.png') });
  await page.locator('.expert-list-card').getByRole('button', { name: 'Mở', exact: true }).click();
  await page.getByRole('tab', { name: /Chương trình & lĩnh vực/ }).click();
  await expect(page.locator('tr[data-row-key="pending"]').getByRole('button', { name: 'Phê duyệt', exact: true })).toBeEnabled();
  await page.getByRole('button', { name: 'Thêm chương trình/phạm vi' }).click();
  const dialog = page.getByRole('dialog', { name: /^(Thêm|Sửa) năng lực/ });
  await dialog.getByLabel('Vai trò', { exact: true }).click();
  await expect(page.locator('.ant-select-dropdown:visible .ant-select-item-option')).toHaveCount(2);
  await page.keyboard.press('Escape');
  await selectIaf(page, '14'); await selectIaf(page, '17'); await page.keyboard.press('Escape');
  await dialog.getByLabel('Cơ sở phê duyệt / ghi chú').click();
  await expect(dialog.getByLabel('Mức năng lực')).toHaveCount(0);
  await expect(dialog.getByLabel('Mã NACE')).toHaveCount(0);
  const box = await dialog.boundingBox(); expect(box.height).toBeLessThan(750);
  await page.screenshot({ path: info.outputPath('competency-form-1784x864.png') });
  await dialog.getByRole('button', { name: 'Lưu dự thảo' }).click();
  await expect(dialog).toBeHidden();
  const batch = h.requests.find(r => r.path === '/expert-competencies/batch');
  expect(batch.body.iaf_codes).toEqual(['14', '17']);
  expect(batch.body).not.toHaveProperty('nace_code');
  expect(batch.body).not.toHaveProperty('competency_level');
  expect(h.errors).toEqual([]);
});

test('self expert admin cannot approve; legacy NACE and role stay unchanged on edit', async ({ page }) => {
  const h = await fixture(page, { subject: 'actor' }); await openAdmin(page);
  await expect(page.locator('tr[data-row-key="pending"]').getByRole('button', { name: 'Phê duyệt', exact: true })).toBeDisabled();
  await page.locator('tr[data-row-key="legacy"]').getByRole('button', { name: 'Sửa', exact: true }).click();
  const dialog = page.getByRole('dialog', { name: /^(Thêm|Sửa) năng lực/ });
  await expect(dialog.getByLabel('Phạm vi IAF')).toBeDisabled();
  await dialog.getByLabel('Cơ sở phê duyệt / ghi chú').fill('Bổ sung hồ sơ');
  await dialog.getByRole('button', { name: 'Lưu dự thảo' }).click();
  await expect(dialog).toBeHidden();
  const patch = h.requests.find(r => r.method === 'PATCH').body;
  expect(patch.competency_role).toBe('TECHNICAL_REVIEWER');
  for (const key of ['scope_level', 'nace_code', 'nace_revision', 'competency_level']) expect(patch[key] === undefined || patch[key] === { scope_level: 'NACE', nace_code: '22.19', nace_revision: 'NACE_REV_2', competency_level: 'SENIOR' }[key]).toBe(true);
  expect(h.errors).toEqual([]);
});

test('duplicate response keeps selected IAF and entered notes', async ({ page }) => {
  await fixture(page, { duplicate: true }); await openAdmin(page);
  await page.getByRole('button', { name: 'Thêm chương trình/phạm vi' }).click();
  const dialog = page.getByRole('dialog', { name: /^(Thêm|Sửa) năng lực/ });
  await selectIaf(page, '14'); await page.keyboard.press('Escape');
  await dialog.getByLabel('Cơ sở phê duyệt / ghi chú').fill('Giữ nội dung');
  await dialog.getByRole('button', { name: 'Lưu dự thảo' }).click();
  await expect(page.getByText('Phạm vi đã tồn tại: IAF 14', { exact: true })).toBeVisible();
  await expect(dialog.getByLabel('Cơ sở phê duyệt / ghi chú')).toHaveValue('Giữ nội dung');
  await expect(dialog.getByText('IAF 14 — Cao su và sản phẩm nhựa')).toBeVisible();
});

test('self evidence uses narrow upload/download routes and locks submitted states', async ({ page }, info) => {
  const h = await fixture(page, { self: true });
  await page.goto('/resources/experts?view=me');
  await expect(page.getByRole('heading', { name: 'Năng lực của tôi' })).toBeVisible();
  for (let i = 0; i < 5; i++) await page.locator(`tr[data-row-key="c${i}"] .ant-table-row-expand-icon`).click();
  await expect(page.locator('input[type="file"]')).toHaveCount(2);
  await page.getByLabel('Tệp đính kèm Chứng chỉ 0').setInputFiles({ name: 'evidence.txt', mimeType: 'text/plain', buffer: Buffer.from('Controlled upload') });
  await expect.poll(() => h.requests.some(r => r.method === 'POST' && r.path === '/document-files/self/competency-evidence/ev0/files')).toBe(true);
  await page.getByRole('button', { name: 'chung-chi.txt', exact: true }).first().click();
  await expect.poll(() => h.requests.some(r => r.path === '/document-files/self/competency-files/f1/download')).toBe(true);
  await expect(page.getByRole('button', { name: 'Phê duyệt', exact: true })).toHaveCount(0);
  expect(h.requests.some(r => ['/document-files', '/document-files/upload'].includes(r.path))).toBe(false);
  await page.screenshot({ path: info.outputPath('self-evidence-1784x864.png'), fullPage: true });
  expect(h.errors).toEqual([]);
});
