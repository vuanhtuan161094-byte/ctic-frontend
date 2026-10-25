export function mapTenYearApplications(fixture) {
  return fixture.applications.map((application) => ({
    ...application,
    customers: application.customer,
    employee_count: application.customer?.effective_headcount ?? null,
    site_count: application.customer?.site_count ?? null,
    sites: [],
    fixture_only: true,
    application_reviews: [],
  }));
}

export function mapTenYearProjects(fixture) {
  return fixture.projects.map((project) => {
    const { customer, ...caseRecord } = project;
    return {
      ...caseRecord,
      fixture_only: true,
      certification_applications: {
        ...project.certification_applications,
        customers: customer,
      },
      audit_plans: fixture.auditPlans.filter((plan) => plan.project_id === project.id),
    };
  });
}

export function mapTenYearAuditPlans(fixture, projects = mapTenYearProjects(fixture)) {
  const projectsById = new Map(projects.map((project) => [project.id, project]));
  return fixture.auditPlans.map((plan) => ({
    ...plan,
    audit_event_id: null,
    created_at: `${plan.planned_start_date}T00:00:00.000Z`,
    certification_projects: projectsById.get(plan.project_id) ?? null,
  }));
}

export function mapTenYearWorkTasks(fixture, statusFilter = "ACTIVE") {
  const customersById = new Map(fixture.customers.map((customer) => [customer.id, customer]));
  const applicationsById = new Map(fixture.applications.map((application) => [application.id, application]));
  const projectsById = new Map(fixture.projects.map((project) => [project.id, project]));
  const items = fixture.workItems.map((item) => {
    const project = projectsById.get(item.entity_id);
    const application = applicationsById.get(item.entity_id);
    const customer = customersById.get(item.customer_id);
    const dueAt = `${item.due_date}T23:59:00.000Z`;
    const overdue = item.status === "OVERDUE";
    return {
      id: item.id,
      work_type: item.work_type,
      action_code: item.work_type,
      title: item.work_type === "CUSTOMER_APPLICATION_INTAKE" ? "Tiếp nhận đơn đăng ký" : "Rà soát chu kỳ chứng nhận",
      description: `${item.scenario_tag ?? "Vòng đời chứng nhận giả lập"} · FIXTURE_10Y`,
      priority: overdue ? "HIGH" : item.priority === "high" ? "HIGH" : "NORMAL",
      status: item.status === "OVERDUE" ? "OPEN" : item.status,
      entity_type: application ? "certification_application" : "certification_project",
      entity_id: item.entity_id,
      project_id: project?.id ?? null,
      project_code: project?.project_code ?? application?.application_code ?? null,
      organization_name: customer?.company_name ?? null,
      assignee: item.assigned_role,
      due_at: dueAt,
      is_overdue: overdue,
      sla_state: overdue ? "OVERDUE" : "ON_TRACK",
      sla_label: overdue ? "Quá hạn" : "Theo kế hoạch",
      days_until_due: null,
      days_overdue: overdue ? 1 : 0,
      escalation_level: overdue ? 1 : null,
      destination_path: null,
      context: { source_mode: "FIXTURE_10Y", scenario_tag: item.scenario_tag ?? null },
      can_execute: false,
      can_view: true,
      is_delegated: false,
      created_at: dueAt,
      updated_at: dueAt,
      fixture_only: true,
    };
  });
  const status = String(statusFilter).toUpperCase();
  const filteredItems = status === "DONE"
    ? items.filter((item) => item.status === "DONE")
    : status === "OPEN"
      ? items.filter((item) => item.status === "OPEN")
      : status === "IN_PROGRESS"
        ? items.filter((item) => item.status === "IN_PROGRESS")
        : status === "CANCELLED"
          ? items.filter((item) => item.status === "CANCELLED")
          : items.filter((item) => ["OPEN", "IN_PROGRESS"].includes(item.status));
  return {
    generated_at: "2026-10-24T00:00:00.000Z",
    summary: {
      total: filteredItems.length,
      overdue: filteredItems.filter((item) => item.is_overdue).length,
      due_soon: 0,
      high_priority: filteredItems.filter((item) => ["URGENT", "HIGH"].includes(item.priority)).length,
    },
    filter: { limit: 200, status },
    items: filteredItems,
  };
}

export function mapTenYearExperts(fixture) {
  return fixture.personnel.map((person) => {
    const competencies = fixture.competencies.filter((item) => item.expert_id === person.id);
    const plans = fixture.auditPlans.filter((plan) => plan.assigned_expert_id === person.id);
    return {
      id: person.id,
      employee_code: person.employee_code,
      full_name: person.full_name,
      email: person.email,
      organization: "Tổ chức chứng nhận giả lập",
      job_title: person.role,
      profile_status: person.status === "active" ? "APPROVED" : "DRAFT",
      status: person.status,
      fixture_only: true,
      user_account: null,
      competency_summary: {
        total: competencies.length,
        approved: competencies.filter((item) => item.status === "APPROVED").length,
        draft: 0,
        suspended: 0,
        expiring: 0,
        programs: new Set(competencies.map((item) => item.standard_name)).size,
        industry_codes: [],
      },
      audit_summary: { total: plans.length, last_audit_date: plans.at(-1)?.planned_start_date ?? null },
      certificate_summary: { total: 0 },
    };
  });
}

export function mapTenYearCertificatePreviews(fixture) {
  return fixture.certificates.map((certificate) => {
    const customer = fixture.customers.find((item) => item.id === certificate.customer_id);
    const active = certificate.status === "VALID";
    return {
      id: certificate.id,
      certificate_series: { project_id: certificate.project_id },
      certificate_series_id: null,
      technical_review_id: certificate.id,
      cert_number: certificate.certificate_number,
      verification_code: null,
      version_no: 1,
      organization_name: customer?.company_name ?? "Tổ chức giả lập",
      organization_address: customer?.address ?? null,
      management_system: "QMS",
      standard_name: fixture.projects.find((project) => project.id === certificate.project_id)?.standard_name ?? "ISO 9001:2015",
      certification_scope: "Phạm vi kiểm thử giả lập",
      issue_date: certificate.issued_at,
      expire_date: certificate.effective_to,
      status: active ? "active" : "suspended",
      created_at: `${certificate.issued_at}T00:00:00.000Z`,
      updated_at: `${certificate.issued_at}T00:00:00.000Z`,
      fixture_only: true,
      legal_effect: false,
      public_verification_enabled: false,
      preview_watermark: certificate.preview_watermark,
      technical_reviews: null,
    };
  });
}

export async function installTenYearReadOnlyApi(page, fixture, session) {
  const served = new Map();
  const writes = [];
  const applications = mapTenYearApplications(fixture);
  const projects = mapTenYearProjects(fixture);
  const auditPlans = mapTenYearAuditPlans(fixture, projects);
  const experts = mapTenYearExperts(fixture);
  const certificates = mapTenYearCertificatePreviews(fixture);

  await page.addInitScript((value) => {
    window.sessionStorage.setItem("ctic_cmp_session", JSON.stringify(value));
  }, session);

  await page.route("http://127.0.0.1:3000/**", async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    const path = url.pathname;
    if (request.method() !== "GET") {
      writes.push(`${request.method()} ${path}`);
      await route.fulfill({ status: 405, contentType: "application/json", body: JSON.stringify({ message: "FIXTURE_10Y is read-only" }) });
      return;
    }

    let body = [];
    if (path === "/auth/me") {
      body = { user: { ...session.user, permissions: ["applications.read", "projects.read", "customers.read", "experts.read", "competencies.read", "certificates.read", "reports.read"] } };
    } else if (path === "/platform-branding") {
      body = {};
    } else if (path === "/me/workspace") {
      body = {
        user_context: { personas: ["ADMIN"] },
        work_summary: { open: 0, in_progress: 0, overdue: 0, due_soon: 0, high_priority: 0 },
        priority_work_items: [], calendar_items: [], exceptions: [], recent_records: [], role_kpis: [],
        meta: { due_soon_days: 7, sales_assignment_limitation: null },
      };
    } else if (path.startsWith("/notifications")) {
      body = { items: [], summary: { total: 0, unread: 0, critical: 0, warning: 0 } };
    } else if (path === "/certification-applications") {
      body = applications;
    } else if (path === "/certification-projects") {
      body = projects;
    } else if (path === "/audit-plans") {
      body = auditPlans;
    } else if (path === "/audit-team-appointments") {
      body = [];
    } else if (path === "/my-work") {
      body = mapTenYearWorkTasks(fixture, url.searchParams.get("status") ?? "ACTIVE");
    } else if (path === "/customers") {
      body = fixture.customers;
    } else if (path === "/contracts" || path === "/certification-agreements" || path.startsWith("/master-data-configuration/") || path.startsWith("/industry-classifications/") || path.startsWith("/manday-calculations/") || path === "/application-reviews/assignees") {
      body = [];
    } else if (path === "/experts/overview") {
      body = {
        generated_at: "2026-10-24T00:00:00.000Z",
        experts: {
          total: experts.length,
          active: experts.filter((expert) => expert.status === "active").length,
          inactive: experts.filter((expert) => expert.status !== "active").length,
          linked_accounts: 0,
          approved_profiles: experts.filter((expert) => expert.profile_status === "APPROVED").length,
          pending_profiles: experts.filter((expert) => expert.profile_status !== "APPROVED").length,
        },
        competencies: {
          total: fixture.competencies.length,
          approved: fixture.competencies.filter((item) => item.status === "APPROVED").length,
          draft: 0, suspended: 0, expiring_90_days: 0, expired: 0, evidence_gaps: 0,
          review_overdue: 0, review_due_90_days: 0, management_action_required: 0,
        },
        certificates: { expiring_90_days: 0 },
      };
    } else if (path === "/experts" || path === "/experts/") {
      body = experts;
    } else if (path === "/certificates") {
      body = certificates;
    } else if (/^\/certificates\/[^/]+\/status-history$/.test(path)) {
      body = { certificate: { id: path.split("/")[2], cert_number: certificates.find((item) => item.id === path.split("/")[2])?.cert_number ?? "", status: "active" }, history: [] };
    } else if (/^\/certificates\/[^/]+$/.test(path)) {
      body = certificates.find((item) => item.id === path.split("/")[2]) ?? {};
    } else if (/^\/document-files\/entity\/certificate\/[^/]+\/current$/.test(path)) {
      body = [];
    }

    served.set(path, (served.get(path) ?? 0) + 1);
    await route.fulfill({ status: 200, contentType: "application/json; charset=utf-8", headers: { "x-cmp-data-source": "FIXTURE_10Y" }, body: JSON.stringify(body) });
  });

  return { served, writes, counts: fixture.counts };
}
