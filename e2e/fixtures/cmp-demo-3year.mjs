const YEARS = [2024, 2025, 2026];

function dateFor(year, index) {
  const monthCount = year === 2026 ? 10 : 12;
  const latestDay = year === 2026 ? 17 : 27;
  const month = String(1 + (index % monthCount)).padStart(2, "0");
  const day = String(3 + (index % (latestDay - 2))).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function addDays(date, days) {
  const value = new Date(`${date}T00:00:00.000Z`);
  value.setUTCDate(value.getUTCDate() + days);
  return value.toISOString().slice(0, 10);
}

export const CMP_DEMO_DATA = (() => {
  const customers = Array.from({ length: 20 }, (_, index) => {
    const sequence = String(index + 1).padStart(3, "0");
    return {
      id: `demo-customer-${sequence}`,
      customer_code: `DEMO-CMP-${sequence}`,
      company_name: `Công ty Mẫu CMP ${sequence} · Thiết bị công nghiệp`,
      country_code: "VN",
      country_name: "Việt Nam",
      tax_code: null,
      address: "Địa chỉ mẫu phục vụ kiểm thử giao diện",
      phone: null,
      email: `demo-cmp-${sequence}@example.invalid`,
      status: index < 18 ? "active" : "inactive",
      created_at: `${YEARS[index % YEARS.length]}-01-15T09:00:00Z`,
      updated_at: "2026-10-18T01:00:00Z",
    };
  });

  const cases = Array.from({ length: 40 }, (_, index) => {
    const customer = customers[Math.floor(index / 2)];
    const year = YEARS[(Math.floor(index / 2) + (index % 2)) % YEARS.length];
    const sequence = String(index + 1).padStart(3, "0");
    const applicationDate = dateFor(year, index);
    const standard = index % 3 === 0 ? "ISO 9001:2015" : index % 3 === 1 ? "ISO 14001:2015" : "ISO 45001:2018";
    return {
      id: `demo-case-${sequence}`,
      project_code: `DEMO-HS-${year}-${sequence}`,
      status: "in_progress",
      standard_name: standard,
      updated_at: `${applicationDate}T09:00:00Z`,
      created_at: `${applicationDate}T09:00:00Z`,
      application: {
        id: `demo-application-${sequence}`,
        application_code: `DEMO-DK-${year}-${sequence}`,
        customer_id: customer.id,
      },
      customer,
      year,
      plan: {
        id: `demo-plan-${sequence}`,
        plan_code: `DEMO-PLAN-${year}-${sequence}`,
        planned_start_date: applicationDate,
        planned_end_date: addDays(applicationDate, 1),
        status: year < 2026 ? "completed" : ["draft", "planned", "in_progress"][index % 3],
      },
    };
  });

  const customerAccess = customers.map((customer, index) => ({
    customer_id: customer.id,
    user_id: `demo-portal-user-${String(index + 1).padStart(3, "0")}`,
    role: "CUSTOMER",
  }));

  const findings = cases.slice(0, 12).map((record, index) => ({
    id: `demo-finding-${String(index + 1).padStart(3, "0")}`,
    project_id: record.id,
    finding_type: index % 3 === 0 ? "major_nc" : "minor_nc",
    workflow_state: index % 3 === 0 ? "customer_response_pending" : "open",
    fixture_only: true,
  }));

  const countsByYear = Object.fromEntries(YEARS.map((year) => [
    year,
    cases.filter((record) => record.year === year).length,
  ]));

  return {
    source: "controlled-fixture-only",
    range: { start: "2024-01-01", end: "2026-10-18", timezone: "Asia/Ho_Chi_Minh" },
    customers,
    cases,
    customerAccess,
    findings,
    certificates: [],
    countsByYear,
  };
})();
