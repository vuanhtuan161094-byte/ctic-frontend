from pathlib import Path


def replace_once(path: str, old: str, new: str, label: str) -> None:
    target = Path(path)
    text = target.read_text(encoding="utf-8")
    if old not in text:
        raise SystemExit(f"anchor missing: {label} in {path}")
    if text.count(old) != 1:
        raise SystemExit(f"anchor not unique: {label} in {path}")
    target.write_text(text.replace(old, new, 1), encoding="utf-8")


# -----------------------------------------------------------------------------
# Internal application intake: source standards from backend operational authority.
# -----------------------------------------------------------------------------
internal = Path("app/components/CertificationProjectsScreen.tsx")
text = internal.read_text(encoding="utf-8")

interface_anchor = '''interface IndustryCodeOption {
  id: string;
  classification_type: string;
  revision: string;
  code: string;
  title_en: string;
  title_vi?: string | null;
  is_active?: boolean;
}
'''
interface_new = interface_anchor + '''
interface OperationalStandardEdition {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: string;
  scheme: {
    id: string;
    code: string;
    name: string;
  };
}
'''
if "interface OperationalStandardEdition" not in text:
    if interface_anchor not in text:
        raise SystemExit("internal operational standard interface anchor missing")
    text = text.replace(interface_anchor, interface_new, 1)

constant = '''const standardOptions = [
  "ISO 9001:2015",
  "ISO 14001:2015",
  "ISO 45001:2018",
  "ISO 22000:2018",
  "ISO/IEC 27001:2022",
];

'''
text = text.replace(constant, "")

status_anchor = '''function normalizeStatus(value?: string | null) {
  return (value ?? "unknown").trim().toLowerCase();
}
'''
status_new = status_anchor + '''
function operationalStandardLabel(row: Pick<OperationalStandardEdition, "standard_code" | "edition">) {
  const code = row.standard_code.trim();
  const edition = row.edition.trim();
  return edition && !code.toUpperCase().includes(edition.toUpperCase())
    ? `${code}:${edition}`
    : code;
}
'''
if "function operationalStandardLabel" not in text:
    if status_anchor not in text:
        raise SystemExit("internal label helper anchor missing")
    text = text.replace(status_anchor, status_new, 1)

customers_query_anchor = '''  const applicationsQuery = useQuery({
    queryKey: ["certification-applications", "project-creation"],
'''
operational_query = '''  const operationalStandardsQuery = useQuery({
    queryKey: ["master-data-configuration", "operational-standards"],
    queryFn: async () => {
      const response = await api.get<OperationalStandardEdition[]>("/master-data-configuration/operational-standards");
      return response.data;
    },
    enabled: creationOpen,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const applicationsQuery = useQuery({
    queryKey: ["certification-applications", "project-creation"],
'''
if 'queryKey: ["master-data-configuration", "operational-standards"]' not in text:
    if customers_query_anchor not in text:
        raise SystemExit("internal operational query anchor missing")
    text = text.replace(customers_query_anchor, operational_query, 1)

data_anchor = '''  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const customers = customersQuery.data ?? [];
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
'''
data_new = '''  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const customers = customersQuery.data ?? [];
  const operationalStandards = useMemo(() => operationalStandardsQuery.data ?? [], [operationalStandardsQuery.data]);
  const operationalStandardOptions = useMemo(() => {
    const groups = new Map<string, { label: string; options: Array<{ value: string; label: string }> }>();
    for (const row of operationalStandards) {
      const key = row.scheme.id;
      const group = groups.get(key) ?? {
        label: `${row.scheme.code} · ${row.scheme.name}`,
        options: [],
      };
      const label = operationalStandardLabel(row);
      if (!group.options.some((item) => item.value === label)) {
        group.options.push({ value: label, label });
      }
      groups.set(key, group);
    }
    return Array.from(groups.values());
  }, [operationalStandards]);
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
'''
if "const operationalStandardOptions = useMemo" not in text:
    if data_anchor not in text:
        raise SystemExit("internal operational options anchor missing")
    text = text.replace(data_anchor, data_new, 1)

select_old = '''                        <Form.Item className="span-2" label="Chuẩn mực chứng nhận" name="standard_names" rules={[{ required: true, message: "Chọn ít nhất một tiêu chuẩn" }]}>
                          <Select
                            mode="tags"
                            options={standardOptions.map((value) => ({ value, label: value }))}
                            placeholder="Chọn hoặc nhập tiêu chuẩn"
                          />
                        </Form.Item>
'''
select_new = '''                        <Form.Item
                          className="span-2"
                          extra="Danh sách được lấy từ cấu hình Chương trình & tiêu chuẩn đang sẵn sàng cho hồ sơ mới."
                          label="Chuẩn mực chứng nhận"
                          name="standard_names"
                          rules={[{ required: true, message: "Chọn ít nhất một tiêu chuẩn" }]}
                        >
                          <Select
                            disabled={operationalStandardsQuery.isError || (!operationalStandardsQuery.isLoading && operationalStandards.length === 0)}
                            loading={operationalStandardsQuery.isLoading}
                            mode="multiple"
                            optionFilterProp="label"
                            options={operationalStandardOptions}
                            placeholder={operationalStandardsQuery.isLoading ? "Đang tải tiêu chuẩn..." : "Chọn tiêu chuẩn đang áp dụng"}
                            showSearch
                          />
                        </Form.Item>
                        {operationalStandardsQuery.isError ? (
                          <Alert
                            className="span-2"
                            description="Không thể tải danh sách tiêu chuẩn đang áp dụng. Thử lại trước khi lưu đơn đăng ký mới."
                            message="Chưa tải được Chương trình & tiêu chuẩn"
                            showIcon
                            type="error"
                          />
                        ) : !operationalStandardsQuery.isLoading && operationalStandards.length === 0 ? (
                          <Alert
                            className="span-2"
                            description="Quản trị viên cần hoàn tất chương trình, phiên bản tiêu chuẩn và bộ quy tắc chứng nhận trước khi tiếp nhận đơn mới."
                            message="Chưa có tiêu chuẩn sẵn sàng cho hồ sơ mới"
                            showIcon
                            type="warning"
                          />
                        ) : null}
'''
if 'options={standardOptions.map' in text:
    if select_old not in text:
        raise SystemExit("internal standard select anchor mismatch")
    text = text.replace(select_old, select_new, 1)

internal.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# Customer portal application intake: customer-safe operational source, multi-standard.
# -----------------------------------------------------------------------------
portal = Path("app/components/CustomerApplicationsScreen.tsx")
text = portal.read_text(encoding="utf-8")

org_anchor = '''interface CustomerPortalOrganization {
  id: string;
  customer_code: string;
  company_name: string;
}
'''
org_new = org_anchor + '''
interface OperationalStandardEdition {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: string;
  label?: string;
  scheme: {
    id: string;
    code: string;
    name: string;
  };
}
'''
if "interface OperationalStandardEdition" not in text:
    if org_anchor not in text:
        raise SystemExit("portal operational standard interface anchor missing")
    text = text.replace(org_anchor, org_new, 1)

text = text.replace("  standard_name: string;\n  certification_scope: string;\n", "  standard_names: string[];\n  certification_scope: string;\n", 1)

payload_old = '''function toPayload(values: ApplicationFormValues) {
  return {
    ...values,
    application_date: values.application_date.format("YYYY-MM-DD"),
'''
payload_new = '''function toPayload(values: ApplicationFormValues) {
  const { standard_names, ...rest } = values;
  return {
    ...rest,
    standard_name: (standard_names ?? []).join(" + "),
    application_date: values.application_date.format("YYYY-MM-DD"),
'''
if "const { standard_names, ...rest } = values;" not in text:
    if payload_old not in text:
        raise SystemExit("portal payload anchor missing")
    text = text.replace(payload_old, payload_new, 1)

function_anchor = '''function toDate(value?: string | null) {
  return value ? dayjs(value) : undefined;
}
'''
function_new = function_anchor + '''
function operationalStandardLabel(row: Pick<OperationalStandardEdition, "standard_code" | "edition" | "label">) {
  if (row.label?.trim()) return row.label.trim();
  const code = row.standard_code.trim();
  const edition = row.edition.trim();
  return edition && !code.toUpperCase().includes(edition.toUpperCase())
    ? `${code}:${edition}`
    : code;
}
'''
if "function operationalStandardLabel" not in text:
    if function_anchor not in text:
        raise SystemExit("portal label helper anchor missing")
    text = text.replace(function_anchor, function_new, 1)

profile_query_anchor = '''  const organizationsQuery = useQuery({
    queryKey: ["customer-portal", "profile"],
'''
query_prefix = '''  const operationalStandardsQuery = useQuery({
    queryKey: ["customer-portal", "operational-standards"],
    queryFn: async () => (
      await api.get<OperationalStandardEdition[]>("/customer-portal/me/operational-standards")
    ).data,
    enabled: modalOpen,
    staleTime: 60_000,
    retry: false,
  });
  const organizationsQuery = useQuery({
    queryKey: ["customer-portal", "profile"],
'''
if 'queryKey: ["customer-portal", "operational-standards"]' not in text:
    if profile_query_anchor not in text:
        raise SystemExit("portal operational query anchor missing")
    text = text.replace(profile_query_anchor, query_prefix, 1)

organizations_anchor = '''  const organizations = useMemo(() => organizationsQuery.data ?? [], [organizationsQuery.data]);
  const organizationOptions = useMemo(
'''
organizations_new = '''  const organizations = useMemo(() => organizationsQuery.data ?? [], [organizationsQuery.data]);
  const operationalStandards = useMemo(() => operationalStandardsQuery.data ?? [], [operationalStandardsQuery.data]);
  const operationalStandardOptions = useMemo(() => {
    const groups = new Map<string, { label: string; options: Array<{ value: string; label: string }> }>();
    for (const row of operationalStandards) {
      const group = groups.get(row.scheme.id) ?? {
        label: `${row.scheme.code} · ${row.scheme.name}`,
        options: [],
      };
      const label = operationalStandardLabel(row);
      if (!group.options.some((item) => item.value === label)) {
        group.options.push({ value: label, label });
      }
      groups.set(row.scheme.id, group);
    }
    return Array.from(groups.values());
  }, [operationalStandards]);
  const organizationOptions = useMemo(
'''
if "const operationalStandardOptions = useMemo" not in text:
    if organizations_anchor not in text:
        raise SystemExit("portal options anchor missing")
    text = text.replace(organizations_anchor, organizations_new, 1)

edit_old = '''      certification_type: item.certification_type ?? undefined,
      standard_name: item.standard_name,
      certification_scope: item.certification_scope,
'''
edit_new = '''      certification_type: item.certification_type ?? undefined,
      standard_names: item.standard_name.split(" + ").map((value) => value.trim()).filter(Boolean),
      certification_scope: item.certification_scope,
'''
if "standard_names: item.standard_name.split" not in text:
    if edit_old not in text:
        raise SystemExit("portal edit standard anchor missing")
    text = text.replace(edit_old, edit_new, 1)

portal_select_old = '''            <Col xs={24} md={8}>
              <Form.Item label="Tiêu chuẩn" name="standard_name" rules={[{ required: true, message: "Nhập tiêu chuẩn" }]}>
                <Input placeholder="Ví dụ: ISO 9001:2015" />
              </Form.Item>
            </Col>
'''
portal_select_new = '''            <Col xs={24} md={8}>
              <Form.Item
                extra="Chỉ hiển thị tiêu chuẩn mà tổ chức chứng nhận đang tiếp nhận."
                label="Tiêu chuẩn"
                name="standard_names"
                rules={[{ required: true, message: "Chọn ít nhất một tiêu chuẩn" }]}
              >
                <Select
                  disabled={operationalStandardsQuery.isError || (!operationalStandardsQuery.isLoading && operationalStandards.length === 0)}
                  loading={operationalStandardsQuery.isLoading}
                  mode="multiple"
                  optionFilterProp="label"
                  options={operationalStandardOptions}
                  placeholder={operationalStandardsQuery.isLoading ? "Đang tải tiêu chuẩn..." : "Chọn tiêu chuẩn"}
                  showSearch
                />
              </Form.Item>
            </Col>
'''
if 'name="standard_name"' in text:
    if portal_select_old not in text:
        raise SystemExit("portal standard input anchor mismatch")
    text = text.replace(portal_select_old, portal_select_new, 1)

form_anchor = '''          <Form.Item label="Phạm vi đề nghị chứng nhận" name="certification_scope" rules={[{ required: true, message: "Nhập phạm vi chứng nhận" }]}>
'''
alerts = '''          {operationalStandardsQuery.isError ? (
            <Alert
              description="Không thể tải danh sách tiêu chuẩn đang tiếp nhận. Vui lòng thử lại trước khi lưu đơn."
              message="Chưa tải được danh sách tiêu chuẩn"
              showIcon
              style={{ marginBottom: 16 }}
              type="error"
            />
          ) : !operationalStandardsQuery.isLoading && operationalStandards.length === 0 ? (
            <Alert
              description="Hiện chưa có chương trình và phiên bản tiêu chuẩn sẵn sàng tiếp nhận đơn mới."
              message="Chưa có tiêu chuẩn đang tiếp nhận"
              showIcon
              style={{ marginBottom: 16 }}
              type="warning"
            />
          ) : null}

          <Form.Item label="Phạm vi đề nghị chứng nhận" name="certification_scope" rules={[{ required: true, message: "Nhập phạm vi chứng nhận" }]}>
'''
if "Chưa có tiêu chuẩn đang tiếp nhận" not in text:
    if form_anchor not in text:
        raise SystemExit("portal alert anchor missing")
    text = text.replace(form_anchor, alerts, 1)

portal.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# Shell: one visible configuration destination, preserve hidden compatibility route.
# -----------------------------------------------------------------------------
shell = Path("app/components/DashboardShell.tsx")
text = shell.read_text(encoding="utf-8")
text = text.replace('{ key: "configuration-schemes", label: "Chương trình chứng nhận" },\n              { key: "configuration-standards", label: "Tiêu chuẩn & phiên bản" },', '{ key: "configuration-schemes", label: "Chương trình & tiêu chuẩn" },', 1)
text = text.replace('<MenuLabel label="Công việc của tôi" count={taskCount} />', '<MenuLabel label="Công việc" count={taskCount} />', 1)
text = text.replace('"my-tasks": "Công việc của tôi",', '"my-tasks": "Công việc",', 1)
text = text.replace('"configuration-schemes": "Chương trình chứng nhận",', '"configuration-schemes": "Chương trình & tiêu chuẩn",', 1)
text = text.replace('"configuration-standards": "Tiêu chuẩn & phiên bản",', '"configuration-standards": "Chương trình & tiêu chuẩn",', 1)
if '"configuration-schemes": "schemes"' not in text or '"configuration-standards": "standards"' not in text:
    raise SystemExit("typed compatibility routing was altered")
if '{ key: "configuration-standards", label: "Tiêu chuẩn & phiên bản" }' in text:
    raise SystemExit("duplicate visible standard navigation remains")
shell.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# Program surface wording: catalogues, not claims of full workflow enforcement.
# -----------------------------------------------------------------------------
programs = Path("app/components/CertificationProgramsPanel.tsx")
text = programs.read_text(encoding="utf-8")
text = text.replace('label="Loại đánh giá bắt buộc"', 'label="Danh mục loại đánh giá"')
text = text.replace('label="Loại quyết định bắt buộc"', 'label="Danh mục loại quyết định"')
programs.write_text(text, encoding="utf-8")

# -----------------------------------------------------------------------------
# Source-contract regression locks.
# -----------------------------------------------------------------------------
test_source = r'''import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const source = (path) => readFileSync(new URL(path, import.meta.url), "utf8");
const internal = source("../app/components/CertificationProjectsScreen.tsx");
const portal = source("../app/components/CustomerApplicationsScreen.tsx");
const shell = source("../app/components/DashboardShell.tsx");
const programs = source("../app/components/CertificationProgramsPanel.tsx");

test("internal application intake consumes operational standards and has no free-text standard authority", () => {
  assert.match(internal, /\/master-data-configuration\/operational-standards/);
  assert.match(internal, /mode="multiple"/);
  assert.doesNotMatch(internal, /const standardOptions = \[/);
  assert.doesNotMatch(internal, /options=\{standardOptions\.map/);
  assert.doesNotMatch(internal, /placeholder="Chọn hoặc nhập tiêu chuẩn"/);
});

test("customer application intake uses the customer-safe operational catalogue and supports integrated selection", () => {
  assert.match(portal, /\/customer-portal\/me\/operational-standards/);
  assert.match(portal, /standard_names: item\.standard_name\.split\(" \+ "\)/);
  assert.match(portal, /standard_name: \(standard_names \?\? \[\]\)\.join\(" \+ "\)/);
  assert.match(portal, /mode="multiple"/);
  assert.doesNotMatch(portal, /name="standard_name"/);
});

test("configuration shell shows one combined program destination while retaining compatibility routing", () => {
  assert.match(shell, /"configuration-schemes": "schemes"/);
  assert.match(shell, /"configuration-standards": "standards"/);
  assert.match(shell, /\{ key: "configuration-schemes", label: "Chương trình & tiêu chuẩn" \}/);
  assert.doesNotMatch(shell, /\{ key: "configuration-standards", label: "Tiêu chuẩn & phiên bản" \}/);
  assert.match(shell, /"configuration-schemes": "Chương trình & tiêu chuẩn"/);
  assert.match(shell, /"configuration-standards": "Chương trình & tiêu chuẩn"/);
});

test("program configuration uses governance catalogue wording", () => {
  assert.match(programs, /label="Danh mục loại đánh giá"/);
  assert.match(programs, /label="Danh mục loại quyết định"/);
  assert.doesNotMatch(programs, /label="Loại đánh giá bắt buộc"/);
  assert.doesNotMatch(programs, /label="Loại quyết định bắt buộc"/);
});
'''
Path("tests/program-structure-authority.test.mjs").write_text(test_source, encoding="utf-8")
