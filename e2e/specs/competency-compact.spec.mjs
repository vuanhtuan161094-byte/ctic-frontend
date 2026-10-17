import { test, expect } from '@playwright/test';

// Controlled API fixtures, never live SQL UAT or backend authorization proof.
test.use({ viewport: { width: 1784, height: 864 } });
const catalog = [{ iaf_code: '14', iaf_name: 'Cao su và sản phẩm nhựa' }, { iaf_code: '17', iaf_name: 'Kim loại cơ bản và sản phẩm kim loại' }];
const competency = (id, status = 'DRAFT') => ({ id, expert_id: 'e1', standard_code: 'ISO 9001:2015', management_system: 'QMS',
  competency_role: 'AUDITOR', competency_level: 'QUALIFIED', scope_level: 'IAF', iaf_code: '14',
  effective_date: '2026-01-01', approval_status: status, evidence_summary: 'Chứng chỉ và kinh nghiệm', evidence_records: [], action_records: [] });

async function fixture(page, { self = false, subject = 'other', duplicate = false, withDetails = false, withRecommendations = false, withDevelopment = false } = {}) {
  const session = { access_token: 'controlled-compact-fixture', user: { id: 'actor', username: 'fixture', full_name: 'Tài khoản kiểm thử', roles: [self ? 'AUDITOR' : 'ADMIN'] } };
  const rows = self ? ['DRAFT', 'RETURNED', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED'].map((status, i) => ({ ...competency('c' + i, status), evidence_records: [{ id: 'ev' + i, title: 'Chứng chỉ ' + i, status: 'ACTIVE' }] }))
    : [{ ...competency('pending', 'PENDING_APPROVAL'), action_records: [{ action_type: 'SUBMIT', actor_id: 'actor' }] },
      { ...competency('legacy', 'RETURNED'), scope_level: 'NACE', nace_code: '22.19', nace_revision: 'NACE_REV_2', competency_role: 'TECHNICAL_REVIEWER', competency_level: 'SENIOR' }];
  const expert = { id: 'e1', full_name: 'Nguyễn Minh An', employee_code: 'CG-001', status: 'active', profile_status: 'APPROVED',
    account: { id: subject, username: 'expert', roles: ['AUDITOR'] }, programs: [], industry_codes: [], competencies: rows,
    summary: { approved_competencies: 1, pending_competencies: 1, audit_count: 2, certificate_count: 1 },
    work_experiences: withDetails ? [{ id: 'work-1', organization: 'Công ty Kiểm định An Bình', position: 'Chuyên gia đánh giá', start_date: '2020-01-01', industry_codes: 'IAF 14', responsibility: 'Đánh giá hệ thống chất lượng' }] : [],
    certificates: withDetails ? [{ id: 'cert-1', certificate_name: 'Chứng chỉ trưởng đoàn', certificate_number: 'LA-001', issuing_organization: 'Tổ chức đào tạo', standard_code: 'ISO 9001:2015', issue_date: '2024-01-01', expiry_date: '2028-01-01', credential_url: 'https://example.test/certificate' }] : [],
    audit_team_members: withDetails ? [{ id: 'audit-1', team_role: 'TEAM_LEADER', planned_start_date: '2026-02-01', planned_end_date: '2026-02-03', planned_mandays: 3, scopes: [{ iaf_code: '14', nace_code: '22.19' }], audit_team_appointments: { audit_plans: { id: 'plan-1', plan_code: 'PLAN-001', certification_projects: { project_code: 'PRJ-001', standard_name: 'ISO 9001:2015', certification_applications: { customers: { company_name: 'Khách hàng An Bình' } } } } } }] : [] };
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
    if (path === '/audit-plans') return json(withRecommendations ? [{ id: 'plan-1', plan_code: 'PLAN-001', certification_projects: { project_code: 'PRJ-001', standard_name: 'ISO 9001:2015' } }] : []);
    if (path === '/experts/recommendations') return json({
      plan: { id: 'plan-1', plan_code: 'PLAN-001', project_code: 'PRJ-001', customer_name: 'Khách hàng An Bình', standard_code: 'ISO 9001:2015' },
      required_scopes: [{ iaf_code: '14', nace_code: '22.19' }],
      recommendations: withRecommendations ? [
        { expert: { id: 'candidate-1', full_name: 'Nguyễn Minh An', employee_code: 'CG-001', email: 'an@example.test', account: { username: 'expert-an' } }, eligible: true, match_status: 'ELIGIBLE', reasons: [], eligibility_reasons: [], competencies: [competency('match-1')], coverage: { covered: 1, total: 1, scopes: [{ iaf_code: '14', nace_code: '22.19', qualified: true }] }, workload: { assigned_mandays: 2, engagement_count: 1, other_commitments: 0 } },
        { expert: { id: 'candidate-2', full_name: 'Trần Thanh Bình', employee_code: 'CG-002' }, eligible: false, match_status: 'INSUFFICIENT_SCOPE', reasons: [], eligibility_reasons: [{ code: 'SCOPE_GAP', message: 'Thiếu phạm vi IAF 14', severity: 'BLOCK' }], competencies: [], coverage: { covered: 0, total: 1, scopes: [{ iaf_code: '14', nace_code: '22.19', qualified: false }] }, workload: { assigned_mandays: 8, engagement_count: 3, other_commitments: 1 } },
      ] : [],
    });
    if (path === '/experts/e1/development') return json({
      expert: { id: 'e1', full_name: 'Nguyễn Minh An', profile_status: 'APPROVED' },
      competencies: [], audit_plan_options: [], governance: null,
      trainings: withDevelopment ? [{ id: 'training-1', training_type: 'INTERNAL', title: 'Đào tạo ISO 9001', provider: 'CTIC', standard_code: 'ISO 9001:2015', start_date: '2026-01-10', status: 'PLANNED', attachments: [] }] : [],
      monitoring: withDevelopment ? [{ id: 'monitoring-1', monitoring_method: 'WITNESS', monitoring_content: 'Chứng kiến đánh giá tại nhà máy', plan_type: 'SCHEDULED', planned_date: '2026-03-10', status: 'PLANNED', witness_items: [{ criterion_code: 'F09-1', criterion_label: 'Chuẩn bị đánh giá', rating: '4' }], attachments: [] }] : [],
    });
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

test('mobile competency cards preserve scope, owner approval guard and review actions', async ({ page }, info) => {
  const h = await fixture(page, { subject: 'actor' });
  await openAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const competencyView = page.locator('.expert-competency-responsive');
  await expect(competencyView.locator('.cmp-data-table--responsive')).toBeHidden();
  const cards = competencyView.locator('.cmp-responsive-card');
  await expect(cards).toHaveCount(2);

  const pending = cards.nth(0);
  await expect(pending.getByText('IAF 14', { exact: true })).toBeVisible();
  await expect(pending.getByRole('button', { name: 'Phê duyệt', exact: true })).toBeDisabled();
  await expect(pending.getByRole('button', { name: 'Yêu cầu bổ sung', exact: true })).toBeVisible();

  const returned = cards.nth(1);
  await expect(returned.getByText('NACE 22.19', { exact: true })).toBeVisible();
  await expect(returned.getByRole('button', { name: 'Sửa', exact: true })).toBeVisible();
  await expect(returned.getByRole('button', { name: 'Gửi phê duyệt', exact: true })).toBeVisible();
  const cardTitleBox = await page.locator('.expert-competency-tab-card > .ant-card-head .ant-card-head-title').boundingBox();
  const cardActionBox = await page.locator('.expert-competency-tab-card > .ant-card-head .ant-card-extra').boundingBox();
  expect(cardTitleBox).not.toBeNull();
  expect(cardActionBox).not.toBeNull();
  expect(cardActionBox.y).toBeGreaterThan(cardTitleBox.y + cardTitleBox.height - 1);
  await page.screenshot({ path: info.outputPath('expert-competencies-mobile.png') });
  expect(h.errors).toEqual([]);
});

test('mobile expert profile shows work, certificate and audit details without wide tables', async ({ page }, info) => {
  const h = await fixture(page, { withDetails: true });
  await openAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });

  const mobileSections = page.getByRole('combobox', { name: 'Mục hồ sơ chuyên gia' });
  await expect(page.locator('.expert-detail-tabs > .ant-tabs-nav')).toBeHidden();
  await mobileSections.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Kinh nghiệm công việc' }).click();
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();
  let detail = page.getByRole('tabpanel', { name: /Kinh nghiệm công việc/ }).locator('.expert-detail-responsive');
  await expect(detail.locator('.cmp-data-table--responsive')).toBeHidden();
  await expect(detail.locator('.cmp-responsive-card')).toHaveCount(1);
  await expect(detail.locator('.cmp-responsive-card').getByText('Đánh giá hệ thống chất lượng')).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByRole('button', { name: 'Sửa kinh nghiệm' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('expert-work-mobile.png') });

  await mobileSections.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Chứng chỉ (1)' }).click();
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();
  detail = page.getByRole('tabpanel', { name: /Chứng chỉ \(/ }).locator('.expert-detail-responsive');
  await expect(detail.locator('.cmp-data-table--responsive')).toBeHidden();
  await expect(detail.locator('.cmp-responsive-card').getByText('LA-001')).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByRole('button', { name: 'Sửa chứng chỉ' })).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByRole('link', { name: 'Mở' })).toHaveAttribute('href', 'https://example.test/certificate');
  await page.screenshot({ path: info.outputPath('expert-certificate-mobile.png') });

  await mobileSections.click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Nhật ký đánh giá' }).click();
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();
  detail = page.getByRole('tabpanel', { name: /Nhật ký đánh giá/ }).locator('.expert-detail-responsive');
  await expect(detail.locator('.cmp-data-table--responsive')).toBeHidden();
  await expect(detail.locator('.cmp-responsive-card').getByText('PLAN-001 · PRJ-001')).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByText('Khách hàng An Bình')).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByText('Trưởng đoàn đánh giá')).toBeVisible();
  await expect(detail.locator('.cmp-responsive-card').getByText('IAF 14 · NACE 22.19')).toBeVisible();
  await page.screenshot({ path: info.outputPath('expert-history-mobile.png') });
  expect(h.errors).toEqual([]);
});

test('mobile expert recommendation shows eligibility and scope in cards', async ({ page }, info) => {
  const h = await fixture(page, { withRecommendations: true });
  await page.goto('/resources/experts');
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('button', { name: /Đối chiếu chuyên gia/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Đối chiếu chuyên gia theo kế hoạch' });
  await dialog.locator('.recommendation-filter-grid .ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'PLAN-001' }).click();
  await expect(page.locator('.ant-select-dropdown')).toBeHidden();

  const results = dialog.locator('.expert-recommendation-responsive');
  await expect(results.locator('.cmp-data-table--responsive')).toBeHidden();
  const cards = results.locator('.cmp-responsive-card');
  await expect(cards).toHaveCount(2);
  await expect(cards.nth(0).getByText('Nguyễn Minh An')).toBeVisible();
  await expect(cards.nth(0).getByText('Có thể phân công')).toBeVisible();
  await expect(cards.nth(0).getByText('IAF 14 · NACE 22.19')).toBeVisible();
  await expect(cards.nth(1).getByText('Thiếu phạm vi IAF 14')).toBeVisible();
  await expect(cards.nth(1).getByText('Không thể phân công')).toBeVisible();
  await page.screenshot({ path: info.outputPath('expert-recommendations-mobile.png') });
  expect(h.errors).toEqual([]);
});

test('desktop expert recommendation keeps the comparison table', async ({ page }, info) => {
  const h = await fixture(page, { withRecommendations: true });
  await page.goto('/resources/experts');
  await page.getByRole('button', { name: /Đối chiếu chuyên gia/ }).click();
  const dialog = page.getByRole('dialog', { name: 'Đối chiếu chuyên gia theo kế hoạch' });
  await dialog.locator('.recommendation-filter-grid .ant-select').first().click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'PLAN-001' }).click();
  const results = dialog.locator('.expert-recommendation-responsive');

  for (const width of [1440, 1366]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
    await expect(results.locator('.cmp-data-table--responsive')).toBeVisible();
    await expect(results.locator('.cmp-responsive-card-list')).toBeHidden();
    await expect(results.locator('tr[data-row-key="candidate-1"]')).toBeVisible();
    await page.screenshot({ path: info.outputPath(`expert-recommendations-${width}.png`) });
  }
  expect(h.errors).toEqual([]);
});

test('mobile expert development cards keep training and monitoring actions', async ({ page }, info) => {
  const h = await fixture(page, { withDevelopment: true });
  await openAdmin(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.getByRole('combobox', { name: 'Mục hồ sơ chuyên gia' }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Đào tạo & giám sát' }).click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);

  const development = page.locator('.expert-development-stack');
  await expect(development.locator('.expert-development-tabs > .ant-tabs-nav')).toBeHidden();
  const training = development.getByRole('tabpanel', { name: /Đào tạo \(/ }).locator('.expert-development-responsive');
  await expect(training.locator('.cmp-data-table--responsive')).toBeHidden();
  await expect(training.locator('.cmp-responsive-card').getByText('Đào tạo ISO 9001')).toBeVisible();
  await expect(training.locator('.cmp-responsive-card').getByRole('button', { name: 'Đánh giá hiệu quả' })).toBeVisible();
  await expect(training.locator('.cmp-responsive-card').getByRole('button', { name: 'Hủy' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('expert-training-mobile.png') });

  await page.getByRole('combobox', { name: 'Mục đào tạo và giám sát' }).click();
  await page.locator('.ant-select-dropdown:visible .ant-select-item-option').filter({ hasText: 'Giám sát F.12' }).click();
  await expect(page.locator('.ant-select-dropdown:visible')).toHaveCount(0);
  const monitoring = development.getByRole('tabpanel', { name: /Giám sát F.12/ }).locator('.expert-development-responsive');
  await expect(monitoring.locator('.cmp-data-table--responsive')).toBeHidden();
  await expect(monitoring.locator('.cmp-responsive-card').getByText('Chứng kiến đánh giá tại nhà máy')).toBeVisible();
  await expect(monitoring.locator('.cmp-responsive-card').getByRole('button', { name: 'Hoàn tất' })).toBeVisible();
  await expect(monitoring.locator('.cmp-responsive-card').getByRole('button', { name: 'Hủy' })).toBeVisible();
  await page.screenshot({ path: info.outputPath('expert-monitoring-mobile.png') });
  expect(h.errors).toEqual([]);
});

test('desktop expert development keeps training and monitoring tables', async ({ page }) => {
  const h = await fixture(page, { withDevelopment: true });
  await openAdmin(page);
  await page.getByRole('tab', { name: /Đào tạo & giám sát/ }).click();
  const development = page.locator('.expert-development-stack');
  for (const width of [1440, 1366]) {
    await page.setViewportSize({ width, height: width === 1440 ? 900 : 768 });
    await expect(development.locator('.expert-development-tabs > .ant-tabs-nav')).toBeVisible();
    await expect(development.locator('.cmp-data-table--responsive').first()).toBeVisible();
    await expect(development.locator('.cmp-responsive-card-list').first()).toBeHidden();
  }
  await development.getByRole('tab', { name: /Giám sát F.12/ }).click();
  await expect(development.getByRole('tabpanel', { name: /Giám sát F.12/ }).locator('tr[data-row-key="monitoring-1"]')).toBeVisible();
  expect(h.errors).toEqual([]);
});
