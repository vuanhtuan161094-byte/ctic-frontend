const START_DATE = "2016-10-24";
const END_DATE = "2026-10-24";
const YEARS = Array.from({ length: 11 }, (_, index) => 2016 + index);

const CUSTOMER_PROFILES = [
  { name: "Công ty Cổ phần Cơ khí An Phú", country: "VN", sector: "Gia công cơ khí", headcount: 86, sites: 1 },
  { name: "Công ty TNHH Thiết bị Y tế Minh Châu và Dịch vụ Kỹ thuật", country: "VN", sector: "Thiết bị y tế", headcount: 143, sites: 2 },
  { name: "Công ty Sản xuất Bao bì Xanh Phương Nam", country: "VN", sector: "Bao bì", headcount: 212, sites: 3 },
  { name: "Công ty TNHH Thực phẩm Hương Đồng", country: "VN", sector: "Chế biến thực phẩm", headcount: 74, sites: 2 },
  { name: "Công ty Điện tử Sao Bắc", country: "VN", sector: "Điện tử", headcount: 318, sites: 4 },
  { name: "Công ty Dệt may Sông Lam", country: "VN", sector: "Dệt may", headcount: 510, sites: 5 },
  { name: "Công ty TNHH Logistics Cánh Buồm", country: "VN", sector: "Logistics", headcount: 95, sites: 2 },
  { name: "Công ty Hóa chất Bờ Cát", country: "VN", sector: "Hóa chất", headcount: 128, sites: 1 },
  { name: "Công ty Cổ phần Nông sản Mùa Vàng", country: "VN", sector: "Nông sản", headcount: 168, sites: 3 },
  { name: "Công ty Công nghệ Mở Horizon Systems", country: "SG", sector: "Phần mềm", headcount: 61, sites: 2 },
  { name: "Công ty Xây dựng Bình Minh", country: "VN", sector: "Xây dựng", headcount: 236, sites: 2 },
  { name: "Công ty TNHH In ấn Đại Việt", country: "VN", sector: "In ấn", headcount: 44, sites: 1 },
  { name: "Công ty Nước sạch Thành Công", country: "VN", sector: "Dịch vụ môi trường", headcount: 183, sites: 3 },
  { name: "Công ty Linh kiện Kỹ thuật Đông Á", country: "VN", sector: "Linh kiện", headcount: 271, sites: 4 },
  { name: "Công ty TNHH Du lịch Bốn Mùa", country: "VN", sector: "Dịch vụ lưu trú", headcount: 57, sites: 2 },
  { name: "Công ty Dược phẩm Bình An", country: "VN", sector: "Dược phẩm", headcount: 304, sites: 3 },
  { name: "Công ty Cổ phần Vận tải Mekong Route", country: "VN", sector: "Vận tải", headcount: 116, sites: 5 },
  { name: "Công ty Nhựa kỹ thuật Tân Lực", country: "VN", sector: "Nhựa kỹ thuật", headcount: 397, sites: 2 },
  { name: "Công ty TNHH Dịch vụ Số Lantern Digital", country: "MY", sector: "Dịch vụ số", headcount: 82, sites: 1 },
  { name: "Công ty Thiết kế và Sản xuất Nội thất Hòa Phát", country: "VN", sector: "Nội thất", headcount: 152, sites: 3 },
];

const PERSONAS = [
  ["fixture-admin", "Quản trị viên kiểm thử", "ADMIN"],
  ["fixture-sales", "Chuyên viên kinh doanh kiểm thử", "SALES"],
  ["fixture-coordinator", "Điều phối viên kiểm thử", "COORDINATOR"],
  ["fixture-lead-auditor", "Trưởng đoàn đánh giá kiểm thử", "LEAD_AUDITOR"],
  ["fixture-auditor", "Đánh giá viên kiểm thử", "AUDITOR"],
  ["fixture-expert", "Chuyên gia kỹ thuật kiểm thử", "EXPERT"],
  ["fixture-reviewer", "Thẩm xét kỹ thuật kiểm thử", "TECHNICAL_REVIEWER"],
  ["fixture-decision-maker", "Người ra quyết định kiểm thử", "DECISION_MAKER"],
];

function dateAt(year, month, day) {
  return `${year}-${String(month).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

function isoStandard(customerIndex, cycleIndex, year) {
  const choices = ["ISO 9001:2015", "ISO 14001:2015"];
  if (year >= 2018) choices.push("ISO 45001:2018");
  if ((customerIndex + cycleIndex) % 5 === 0 && year >= 2018) return "ISO 9001:2015 + ISO 45001:2018";
  return choices[(customerIndex + cycleIndex) % choices.length];
}

function cycleCount(customerIndex) {
  return [2, 3, 4][customerIndex % 3];
}

function buildCustomers() {
  return CUSTOMER_PROFILES.map((profile, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    const createdYear = 2016 + (index % 4);
    return {
      id: `fixture-10y-customer-${sequence}`,
      customer_code: `F10Y-CMP-${sequence}`,
      company_name: profile.name,
      country_code: profile.country,
      country_name: profile.country === "VN" ? "Việt Nam" : profile.country === "SG" ? "Singapore" : "Malaysia",
      sector: profile.sector,
      effective_headcount: profile.headcount,
      shift_count: 1 + (index % 3),
      site_count: profile.sites,
      address: `Địa chỉ giả lập ${sequence}, Khu vực kiểm thử`,
      phone: null,
      email: `cmp-fixture-${sequence}@example.invalid`,
      tax_code: null,
      status: index === 19 ? "inactive" : "active",
      created_at: `${createdYear}-02-14T09:00:00Z`,
      updated_at: `${END_DATE}T09:00:00Z`,
      fixture_only: true,
    };
  });
}

function cycleScenario(customerIndex, indexInCustomer, count) {
  if (indexInCustomer !== count - 1) return "completed";
  if (customerIndex % 11 === 0) return "open-major-cap";
  if (customerIndex % 11 === 1) return "overdue-surveillance";
  if (customerIndex % 11 === 2) return "returned-review";
  if (customerIndex % 11 === 3) return "cancelled-intake";
  if (customerIndex % 11 === 4) return "scope-change";
  if (customerIndex % 11 === 5) return "suspended-simulation";
  if (customerIndex % 11 === 6) return "appeal-simulation";
  return "completed";
}

function buildLifecycle(customers, { scenario, maxCycles = Infinity, maxCustomers = Infinity }) {
  const selectedCustomers = customers.slice(0, maxCustomers);
  const applications = [];
  const cycles = [];
  const projects = [];
  const reviews = [];
  const contracts = [];
  const auditPlans = [];
  const findings = [];
  const correctiveActions = [];
  const technicalReviews = [];
  const decisions = [];
  const certificates = [];
  const workItems = [];
  const resourceBookings = [];
  let sequence = 1;

  for (const [customerIndex, customer] of selectedCustomers.entries()) {
    const count = Math.min(cycleCount(customerIndex), maxCycles);
    const firstYear = 2016 + (customerIndex % 3);
    for (let cycleIndex = 0; cycleIndex < count; cycleIndex += 1) {
      const cycleYear = firstYear + cycleIndex * 3;
      if (cycleYear > 2026) continue;
      const cycleId = `fixture-10y-cycle-${String(sequence).padStart(3, "0")}`;
      const applicationId = `fixture-10y-app-${String(sequence).padStart(3, "0")}`;
      const projectId = `fixture-10y-project-${String(sequence).padStart(3, "0")}`;
      const code = `F10Y-${cycleYear}-${String(sequence).padStart(3, "0")}`;
      const status = cycleScenario(customerIndex, cycleIndex, count);
      const registrationDate = cycleYear === 2016
        ? "2016-10-24"
        : dateAt(cycleYear, 1 + (customerIndex % 8), 5 + (customerIndex % 20));
      const standardName = isoStandard(customerIndex, cycleIndex, cycleYear);
      const application = {
        id: applicationId,
        application_code: `F10Y-DK-${code}`,
        customer_id: customer.id,
        customer,
        standard_name: standardName,
        certification_scope: `${customer.sector}; ${customer.site_count} địa điểm; dữ liệu giả lập`,
        application_date: registrationDate,
        status: status === "cancelled-intake" ? "cancelled" : status === "returned-review" ? "under_review" : "accepted",
        certification_type: cycleIndex === 0 ? "INITIAL" : "RECERTIFICATION",
        cycle_id: cycleId,
        fixture_only: true,
        scenario_tag: status,
      };
      applications.push(application);

      const reviewStatus = status === "cancelled-intake" ? "DRAFT" : status === "returned-review" ? "RETURNED" : "APPROVED";
      const review = {
        id: `fixture-10y-review-${String(sequence).padStart(3, "0")}`,
        application_id: applicationId,
        result: status === "returned-review" ? "NEED_MORE_INFO" : "ACCEPTED",
        workflow_status: reviewStatus,
        standard_name: standardName,
        iaf_code: String(1 + ((customerIndex + cycleIndex) % 39)).padStart(2, "0"),
        prepared_by_role: "COORDINATOR",
        reviewer_role: "TECHNICAL_REVIEWER",
        reviewer_is_independent: true,
        fixture_only: true,
      };
      reviews.push(review);

      const cycle = {
        id: cycleId,
        customer_id: customer.id,
        customer,
        application_id: applicationId,
        project_id: null,
        cycle_no: cycleIndex + 1,
        cycle_type: cycleIndex === 0 ? "INITIAL" : "RECERTIFICATION",
        standard_name: standardName,
        year: cycleYear,
        start_date: registrationDate,
        scenario_tag: status,
        fixture_only: true,
      };
      cycles.push(cycle);

      if (status === "cancelled-intake" || status === "returned-review") {
        workItems.push({
          id: `fixture-10y-work-${String(sequence).padStart(3, "0")}`,
          entity_id: applicationId,
          customer_id: customer.id,
          work_type: "CUSTOMER_APPLICATION_INTAKE",
          assigned_role: "COORDINATOR",
          status: "OPEN",
          due_date: addDays(registrationDate, 14),
          priority: "medium",
          scenario_tag: status,
          fixture_only: true,
        });
        sequence += 1;
        continue;
      }

      const contractDate = addDays(registrationDate, 28);
      const stage1Date = addDays(registrationDate, 75);
      const stage2Date = addDays(stage1Date, 45);
      const certificateDate = addDays(stage2Date, 60);
      const planIds = [];
      const addPlan = (kind, plannedDate, duration = 1, planStatus = "completed") => {
        const plan = {
          id: `fixture-10y-plan-${String(sequence).padStart(3, "0")}-${kind.toLowerCase().replaceAll("_", "-")}`,
          project_id: projectId,
          customer_id: customer.id,
          plan_code: `F10Y-PLAN-${code}-${kind}`,
          audit_type: kind,
          title: `${kind.replaceAll("_", " ")} · ${customer.company_name}`,
          planned_start_date: plannedDate,
          planned_end_date: addDays(plannedDate, duration - 1),
          status: planStatus,
          assigned_expert_id: `fixture-10y-person-${String((customerIndex + cycleIndex) % 5 + 1).padStart(2, "0")}`,
          fixture_only: true,
          scenario_tag: status,
        };
        planIds.push(plan.id);
        auditPlans.push(plan);
        resourceBookings.push({
          id: `fixture-10y-booking-${String(sequence).padStart(3, "0")}-${kind.toLowerCase()}`,
          plan_id: plan.id,
          expert_id: plan.assigned_expert_id,
          start_date: plannedDate,
          end_date: plan.planned_end_date,
          fixture_only: true,
        });
        return plan;
      };

      addPlan("STAGE_1", stage1Date, 1 + (customerIndex % 2));
      addPlan("STAGE_2", stage2Date, 2 + (customerIndex % 3));
      const surveillance1 = addDays(certificateDate, 365);
      const surveillance2 = addDays(certificateDate, 730);
      if (surveillance1 <= END_DATE) addPlan("SURVEILLANCE_1", surveillance1, 1);
      if (surveillance2 <= END_DATE) addPlan("SURVEILLANCE_2", surveillance2, 1, status === "overdue-surveillance" ? "overdue" : "completed");

      const projectStatus = status === "open-major-cap" || status === "overdue-surveillance" ? "in_progress" : "completed";
      const project = {
        id: projectId,
        project_code: `F10Y-HS-${code}`,
        customer_id: customer.id,
        customer,
        application_id: applicationId,
        certification_applications: application,
        standard_name: standardName,
        certification_type: cycle.cycle_type,
        status: projectStatus,
        updated_at: `${Math.min(cycleYear + 2, 2026)}-10-01T08:00:00Z`,
        created_at: `${registrationDate}T08:00:00Z`,
        plan_ids: planIds,
        fixture_only: true,
        scenario_tag: status,
      };
      projects.push(project);
      cycle.project_id = projectId;
      contracts.push({
        id: `fixture-10y-contract-${String(sequence).padStart(3, "0")}`,
        application_id: applicationId,
        project_id: projectId,
        customer_id: customer.id,
        contract_number: `F10Y-HD-${code}`,
        status: "ACCEPTED",
        signed_on: contractDate,
        fixture_only: true,
      });

      if (status === "open-major-cap") {
        const finding = {
          id: `fixture-10y-nc-${String(sequence).padStart(3, "0")}`,
          project_id: projectId,
          customer_id: customer.id,
          finding_code: `F10Y-NC-${String(sequence).padStart(3, "0")}`,
          finding_type: "MAJOR",
          workflow_state: "CUSTOMER_RESPONSE_PENDING",
          reported_at: stage2Date,
          fixture_only: true,
          scenario_tag: status,
        };
        findings.push(finding);
        correctiveActions.push({
          id: `fixture-10y-cap-${String(sequence).padStart(3, "0")}`,
          finding_id: finding.id,
          project_id: projectId,
          customer_id: customer.id,
          workflow_state: "OPEN",
          next_action: "Chờ khách hàng gửi phương án khắc phục",
          fixture_only: true,
        });
      } else if (cycleIndex === 0 || customerIndex % 4 === 0) {
        const finding = {
          id: `fixture-10y-nc-${String(sequence).padStart(3, "0")}`,
          project_id: projectId,
          customer_id: customer.id,
          finding_code: `F10Y-NC-${String(sequence).padStart(3, "0")}`,
          finding_type: cycleIndex % 2 ? "MINOR" : "OBSERVATION",
          workflow_state: "CLOSED",
          reported_at: stage2Date,
          closed_at: addDays(stage2Date, 35),
          fixture_only: true,
        };
        findings.push(finding);
        correctiveActions.push({
          id: `fixture-10y-cap-${String(sequence).padStart(3, "0")}`,
          finding_id: finding.id,
          project_id: projectId,
          customer_id: customer.id,
          workflow_state: "ACCEPTED",
          submitted_at: addDays(stage2Date, 14),
          closed_at: addDays(stage2Date, 35),
          fixture_only: true,
        });
      }

      const hasBlockingFinding = status === "open-major-cap";
      const isOverdue = status === "overdue-surveillance";
      if (!hasBlockingFinding) {
        technicalReviews.push({
          id: `fixture-10y-tech-review-${String(sequence).padStart(3, "0")}`,
          project_id: projectId,
          reviewer_role: "TECHNICAL_REVIEWER",
          reviewer_is_independent: true,
          reviewed_at: addDays(stage2Date, 42),
          result: "ACCEPTED",
          fixture_only: true,
        });
        decisions.push({
          id: `fixture-10y-decision-${String(sequence).padStart(3, "0")}`,
          project_id: projectId,
          decision_maker_role: "DECISION_MAKER",
          reviewer_is_independent: true,
          decided_at: addDays(stage2Date, 48),
          result: "CERTIFY",
          fixture_only: true,
        });
        const certificateStatus = status === "suspended-simulation" ? "SUSPENDED" : status === "withdrawn-simulation" ? "WITHDRAWN" : "VALID";
        const certificateEnd = addDays(certificateDate, 3 * 365);
        certificates.push({
          id: `fixture-10y-certificate-${String(sequence).padStart(3, "0")}`,
          project_id: projectId,
          customer_id: customer.id,
          certificate_number: `FIXTURE-${code}`,
          status: certificateStatus,
          issued_at: certificateDate,
          effective_from: certificateDate,
          effective_to: certificateEnd,
          public_verification_enabled: false,
          preview_watermark: "DEMO — KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN",
          legal_effect: false,
          fixture_only: true,
          scenario_tag: status,
        });
      }

      workItems.push({
        id: `fixture-10y-work-${String(sequence).padStart(3, "0")}`,
        entity_id: projectId,
        customer_id: customer.id,
        work_type: isOverdue ? "SURVEILLANCE_FOLLOW_UP" : "CERTIFICATION_CYCLE_REVIEW",
        assigned_role: isOverdue ? "COORDINATOR" : "TECHNICAL_REVIEWER",
        status: isOverdue ? "OVERDUE" : projectStatus === "completed" ? "DONE" : "OPEN",
        due_date: isOverdue ? "2026-06-30" : addDays(stage2Date, 24),
        priority: isOverdue ? "high" : "medium",
        fixture_only: true,
      });
      sequence += 1;
    }
  }

  if (scenario === "edge-cases" || scenario === "dense") {
    const day = "2026-10-22";
    for (let index = 0; index < 12; index += 1) {
      const customer = selectedCustomers[index % selectedCustomers.length];
      const customerProject = projects.find((project) => project.customer_id === customer.id);
      const plan = {
        id: `fixture-10y-plan-dense-${String(index + 1).padStart(2, "0")}`,
        project_id: customerProject?.id ?? null,
        customer_id: customer.id,
        plan_code: `F10Y-DENSE-${String(index + 1).padStart(2, "0")}`,
        audit_type: "SPECIAL_AUDIT",
        title: `Lịch dày kiểm thử ${String(index + 1).padStart(2, "0")} · ${customer.company_name}`,
        planned_start_date: day,
        planned_end_date: day,
        status: "planned",
        assigned_expert_id: `fixture-10y-person-${String(index + 1).padStart(2, "0")}`,
        fixture_only: true,
        scenario_tag: "DENSE_DAY_CONFLICT_CHECK",
      };
      auditPlans.push(plan);
      resourceBookings.push({
        id: `fixture-10y-booking-dense-${String(index + 1).padStart(2, "0")}`,
        plan_id: plan.id,
        expert_id: plan.assigned_expert_id,
        start_date: day,
        end_date: day,
        conflict_scenario: index < 2,
        fixture_only: true,
      });
    }
  }

  return { applications, cycles, projects, reviews, contracts, auditPlans, findings, correctiveActions, technicalReviews, decisions, certificates, workItems, resourceBookings };
}

export function generateCmpDemo10YearFixture(scenario = "full-10y") {
  if (!["empty", "sparse", "dense", "full-10y", "edge-cases"].includes(scenario)) {
    throw new Error(`Unknown CMP 10-year fixture scenario: ${scenario}`);
  }
  const allCustomers = buildCustomers();
  const customers = scenario === "empty" ? [] : scenario === "sparse" ? allCustomers.slice(0, 1) : allCustomers;
  const lifecycle = buildLifecycle(customers, {
    scenario,
    maxCustomers: scenario === "empty" ? 0 : scenario === "sparse" ? 1 : Infinity,
    maxCycles: scenario === "sparse" ? 1 : Infinity,
  });
  const customerAccess = customers.map((customer, index) => ({
    customer_id: customer.id,
    user_id: `fixture-10y-portal-${String(index + 1).padStart(3, "0")}`,
    role: "CUSTOMER",
    fixture_only: true,
  }));
  const personnel = Array.from({ length: scenario === "empty" ? 0 : 20 }, (_, index) => {
    const sequence = String(index + 1).padStart(2, "0");
    const role = ["AUDITOR", "LEAD_AUDITOR", "TECHNICAL_REVIEWER", "EXPERT"][index % 4];
    return {
      id: `fixture-10y-person-${sequence}`,
      employee_code: `F10Y-NV-${sequence}`,
      full_name: `Nhân sự giả lập ${sequence}`,
      email: `cmp-fixture-person-${sequence}@example.invalid`,
      role,
      status: index === 19 ? "inactive" : "active",
      fixture_only: true,
    };
  });
  const competencies = personnel.filter((person) => person.status === "active").flatMap((person, index) => [
    { id: `fixture-10y-competency-${String(index * 2 + 1).padStart(3, "0")}`, expert_id: person.id, standard_name: "ISO 9001:2015", status: "APPROVED", fixture_only: true, no_real_evidence: true },
    { id: `fixture-10y-competency-${String(index * 2 + 2).padStart(3, "0")}`, expert_id: person.id, standard_name: index % 2 ? "ISO 14001:2015" : "ISO 45001:2018", status: "APPROVED", fixture_only: true, no_real_evidence: true },
  ]);
  const countsByYear = Object.fromEntries(YEARS.map((year) => [year, {
    applications: lifecycle.applications.filter((item) => Number(item.application_date.slice(0, 4)) === year).length,
    audit_plans: lifecycle.auditPlans.filter((item) => Number(item.planned_start_date.slice(0, 4)) === year).length,
  }]));
  const data = {
    source_mode: "FIXTURE_10Y",
    fixture_only: true,
    seed: "cmp-v4-lifecycle-2026-10-24-v1",
    range: { start: START_DATE, end: END_DATE, timezone: "Asia/Ho_Chi_Minh" },
    scenario,
    customers,
    customerAccess,
    personnel,
    competencies,
    personas: PERSONAS.map(([id, full_name, role]) => ({ id, full_name, role, fixture_only: true })),
    ...lifecycle,
    countsByYear,
    public_verifier: { enabled: false, mode: "isolated-fixture-only" },
    certificate_preview: { watermark: "DEMO — KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN", legal_effect: false },
  };
  data.counts = Object.fromEntries([
    "customers", "applications", "cycles", "projects", "reviews", "contracts", "auditPlans", "findings", "correctiveActions", "technicalReviews", "decisions", "certificates", "workItems", "resourceBookings", "personnel", "competencies",
  ].map((key) => [key, data[key].length]));
  return data;
}

export function getFixturePortalView(data, portalUserId) {
  const access = data.customerAccess.find((item) => item.user_id === portalUserId);
  if (!access) return { customer: null, applications: [], projects: [], certificates: [] };
  const ownApplicationIds = new Set(data.applications.filter((item) => item.customer_id === access.customer_id).map((item) => item.id));
  const ownProjectIds = new Set(data.projects.filter((item) => item.customer_id === access.customer_id).map((item) => item.id));
  return {
    customer: data.customers.find((item) => item.id === access.customer_id) ?? null,
    applications: data.applications.filter((item) => ownApplicationIds.has(item.id)),
    projects: data.projects.filter((item) => ownProjectIds.has(item.id)),
    certificates: data.certificates.filter((item) => item.customer_id === access.customer_id),
  };
}

export function validateCmpDemo10YearFixture(data) {
  const errors = [];
  const customerIds = new Set(data.customers.map((item) => item.id));
  const cycleCounts = new Map();
  for (const cycle of data.cycles) cycleCounts.set(cycle.customer_id, (cycleCounts.get(cycle.customer_id) ?? 0) + 1);
  if (data.scenario === "full-10y" || data.scenario === "dense" || data.scenario === "edge-cases") {
    if (data.customers.length !== 20) errors.push("full scenario must contain 20 fictional customers");
    for (const customer of data.customers) {
      const count = cycleCounts.get(customer.id) ?? 0;
      if (count < 2 || count > 4) errors.push(`customer ${customer.id} has ${count} cycles (expected 2–4)`);
    }
  }
  for (const collection of [data.applications, data.cycles, data.projects, data.reviews, data.contracts, data.auditPlans, data.findings, data.correctiveActions, data.technicalReviews, data.decisions, data.certificates, data.workItems, data.resourceBookings, data.personnel, data.competencies]) {
    if (collection.some((item) => item.fixture_only !== true)) errors.push("every generated domain row must be marked fixture_only");
  }
  for (const application of data.applications) {
    if (!customerIds.has(application.customer_id)) errors.push(`application ${application.id} references an unknown customer`);
  }
  for (const project of data.projects) {
    if (!customerIds.has(project.customer_id) || project.certification_applications?.customer_id !== project.customer_id) errors.push(`project ${project.id} crosses customer boundaries`);
  }
  for (const plan of data.auditPlans) {
    if (!customerIds.has(plan.customer_id)) errors.push(`plan ${plan.id} references an unknown customer`);
    if (plan.project_id && !data.projects.some((project) => project.id === plan.project_id && project.customer_id === plan.customer_id)) errors.push(`plan ${plan.id} has a cross-customer project reference`);
    if (plan.planned_start_date < START_DATE || plan.planned_end_date > END_DATE || plan.planned_end_date < plan.planned_start_date) errors.push(`plan ${plan.id} has an invalid date range`);
  }
  for (const plan of data.auditPlans.filter((item) => item.audit_type === "STAGE_1")) {
    const stage2 = data.auditPlans.find((item) => item.project_id === plan.project_id && item.audit_type === "STAGE_2");
    if (stage2 && stage2.planned_start_date <= plan.planned_start_date) errors.push(`project ${plan.project_id} has Stage 2 before Stage 1`);
  }
  for (const certificate of data.certificates) {
    if (certificate.fixture_only !== true || certificate.legal_effect !== false || certificate.public_verification_enabled !== false) errors.push(`certificate ${certificate.id} is not isolated fixture-only data`);
    if (!certificate.preview_watermark?.includes("KHÔNG CÓ GIÁ TRỊ CHỨNG NHẬN")) errors.push(`certificate ${certificate.id} is missing its test watermark`);
    if ("signature" in certificate || "signed_by" in certificate || "audit_trail" in certificate) errors.push(`certificate ${certificate.id} includes simulated signature/audit data`);
  }
  for (const access of data.customerAccess) {
    if (!customerIds.has(access.customer_id)) errors.push(`Portal mapping ${access.user_id} references an unknown customer`);
  }
  if (data.public_verifier.enabled !== false) errors.push("fixture public verifier must remain disabled");
  return { valid: errors.length === 0, errors };
}

export const CMP_DEMO_10Y_FIXTURE = generateCmpDemo10YearFixture();
