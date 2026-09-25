import { test, expect } from '@playwright/test';

// Controlled API fixture: verifies browser ownership routing/UI, not live DB UAT.
test('account self-service edits returned evidence and submits without admin actions', async ({ page }) => {
  const session = { access_token: 'controlled-competency-fixture', user: { id: 'owner', username: 'expert.fixture', full_name: 'Expert Fixture', roles: ['AUDITOR'] } };
  const rows = ['RETURNED', 'PENDING_APPROVAL', 'APPROVED', 'SUSPENDED', 'DRAFT'].map((approval_status, i) => ({
    id: 'c' + i, expert_id: 'e1', standard_code: 'ISO 9001:2015', management_system: 'QMS',
    competency_role: 'AUDITOR', scope_level: 'IAF', iaf_code: String(14 + i),
    effective_date: '2026-01-01', approval_status, evidence_summary: 'Original evidence',
    evidence_records: [], action_records: approval_status === 'RETURNED' ? [{ reason: 'Bổ sung số chứng chỉ' }] : [],
  }));
  const writes = []; const globalReads = [];
  await page.addInitScript((value) => sessionStorage.setItem('ctic_cmp_session', JSON.stringify(value)), session);
  await page.route(/http:\/\/(?:127\.0\.0\.1|localhost):3000\/.*/, async route => {
    const req = route.request(); const path = new URL(req.url()).pathname;
    const json = body => route.fulfill({ contentType: 'application/json', body: JSON.stringify(body) });
    if (path === '/auth/me') return json({ user: { ...session.user, permissions: [] } });
    if (path === '/notifications/me') return json({ items: [], summary: { total: 0, unread: 0 } });
    if (path === '/platform-branding') return json({});
    if (path === '/me/workspace') return json({
      work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 },
      priority_work_items: [], recent_records: [], role_kpis: [],
    });
    if (path === '/expert-competencies/me' && req.method() === 'GET') return json(rows);
    if (path.startsWith('/expert-competencies/me/') && req.method() !== 'GET') {
      const row = rows.find(r => r.id === path.split('/')[3]);
      const body = req.postData() ? req.postDataJSON() : {};
      writes.push({ path, method: req.method(), body });
      if (path.endsWith('/submit')) row.approval_status = 'PENDING_APPROVAL';
      else if (req.method() === 'PATCH') Object.assign(row, body);
      return json(row);
    }
    if (path === '/experts' || path === '/experts/overview' || path === '/expert-competencies') globalReads.push(path);
    return json([]);
  });
  await page.goto('/resources/experts?view=me');
  await expect(page.getByRole('heading', { name: 'Năng lực của tôi', exact: true })).toBeVisible();
  await expect(page.getByText('Bổ sung số chứng chỉ', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: 'Phê duyệt', exact: true })).toHaveCount(0);
  const returned = page.locator('tr[data-row-key="c0"]');
  await returned.getByRole('button', { name: 'Sửa', exact: true }).click();
  const dialog = page.getByRole('dialog');
  await dialog.getByLabel('Tóm tắt bằng chứng').fill('Chứng chỉ bổ sung số 123');
  await dialog.getByRole('button', { name: 'Lưu dự thảo' }).click();
  await expect(dialog).toBeHidden();
  await returned.getByRole('button', { name: 'Gửi phê duyệt', exact: true }).click();
  await page.locator('.ant-popconfirm').getByRole('button').last().click();
  await expect(returned.getByText('Chờ phê duyệt', { exact: true })).toBeVisible();
  await expect(returned.getByRole('button', { name: 'Sửa', exact: true })).toHaveCount(0);
  expect(writes.map(w => w.path)).toEqual(['/expert-competencies/me/c0', '/expert-competencies/me/c0/submit']);
  expect(writes[0].body).not.toHaveProperty('expert_id');
  expect(globalReads).toEqual([]);
  await page.reload();
  await expect(page.getByRole('heading', { name: 'Năng lực của tôi', exact: true })).toBeVisible();
  await expect(page).toHaveURL(/resources\/experts\?view=me/);
  await page.locator('.account-button').click();
  await expect(page.getByRole('menuitem', { name: 'Năng lực của tôi' })).toBeVisible();
});
