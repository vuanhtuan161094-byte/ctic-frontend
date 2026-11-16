import { expect, test } from "@playwright/test";
import { captureVisualBaseline, expectNoHorizontalOverflow, watchRuntimeIssues } from "../helpers/quality.mjs";

// Isolated browser fixture: no production network, no database writes.
const actor = {
  id: "11111111-1111-4111-8111-111111111111",
  roles: ["ADMIN"],
  username: "f16.qa",
  full_name: "F16 QA",
  permissions: ["documents.read", "documents.manage"],
};
const revision = {
  id: "22222222-2222-4222-8222-222222222222", revision_no: 1,
  status: "approved", prepared_by: "33333333-3333-4333-8333-333333333333",
  approved_by: actor.id, approved_at: "2026-11-16T08:00:00Z",
  organizations: [{ name: "Tổ chức được thừa nhận A", recognition_scope: "ISO 9001:2015" }],
  manday_reduction_authorized: false, signed_original_attested: false,
};
test("F.16 approved register and unsigned/signed release gates remain visible across viewports", async ({page}, testInfo) => {
  const runtime = watchRuntimeIssues(page);
  const writes = [];
  await page.addInitScript((v) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify({
      access_token: "browser-fixture-not-a-credential",
      user: v,
    }));
  }, actor);
  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const pathname = new URL(route.request().url()).pathname;
    if (route.request().method() !== "GET") {
      writes.push(route.request().method() + " " + pathname);
      await route.fulfill({status:405, contentType:"application/json",
        body:JSON.stringify({message:"Browser fixture is read-only"})});
      return;
    }
    let result = [];
    if (pathname === "/auth/me") result = {user:actor};
    else if (pathname.startsWith("/notifications")) {
      result = { items: [], summary: {total:0,unread:0,critical:0,warning:0} };
    } else if (pathname === "/me/workspace") {
      result = {
        user_context: {personas:["ADMIN"], current_user: actor},
        work_summary: {open:0,in_progress:0,overdue:0,due_soon:0,high_priority:0},
        priority_work_items:[],calendar_items:[],exceptions:[],recent_records:[],role_kpis:[],
        meta: {due_soon_days:7,sales_assignment_limitation:null},
      };
    } else if (pathname === "/my-work") {
      result = { generated_at:"2026-11-16T07:00:00Z", summary:{
        total:0,overdue:0,due_soon:0,high_priority:0 },
        filter:{limit:200}, items:[] };
    } else if (pathname === "/document-files") {
      result = {items:[],summary:{current:0,archived:0,total:0}};
    } else if (pathname === "/document-control/v2/template-fields") {
      result = { total: 0, syntax: {scalar:"{{field}}",repeat:"{{#rows}}"},
        groups: [] };
    } else if (pathname === "/p09/recognized-certification-bodies") {
      result = [revision];
    } else if (pathname.endsWith("/issue-status")) {
      result = {official_issued:false,signed_file_id:null,signed_file_sha256:null};
    } else if (pathname === "/platform-branding") {
      result = {};
    }
    await route.fulfill({status:200,contentType:"application/json; charset=utf-8",body:JSON.stringify(result)});
  });
  await page.goto("/documents");
  const card = page.getByText("F.16 — Danh sách tổ chức được thừa nhận");
  await expect(card).toBeVisible();
  await expect(page.getByText("Tổ chức được thừa nhận A")).toBeVisible();
  await expect(page.getByText("Chưa phát hành chính thức theo bản ký")).toBeVisible();
  await expect(page.getByRole("button", {name:"Xuất Word chưa ký"})).toBeVisible();
  await expect(page.getByRole("button", {name:"Xuất PDF chưa ký"})).toBeVisible();
  await expect(page.getByLabel("Bản ký F.16")).toBeVisible();
  await expectNoHorizontalOverflow(page);
  await captureVisualBaseline(page,testInfo,"p09-f16-controlled-unsigned", {fullPage:false});
  expect(writes).toEqual([]);
  runtime.assertClean();
});
