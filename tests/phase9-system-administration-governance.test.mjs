import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import test from "node:test";

const panel = readFileSync(
  new URL("../app/components/SystemGovernancePanel.tsx", import.meta.url),
  "utf8",
);
const admin = readFileSync(
  new URL("../app/components/SystemAdminScreen.tsx", import.meta.url),
  "utf8",
);
const shell = readFileSync(
  new URL("../app/components/DashboardShell.tsx", import.meta.url),
  "utf8",
);
const masterData = readFileSync(
  new URL("../app/components/MasterDataConfigurationPanel.tsx", import.meta.url),
  "utf8",
);
const capability = readFileSync(
  new URL("../app/components/CertificationBodyCapabilitiesPanel.tsx", import.meta.url),
  "utf8",
);

test("System Administration uses a coherent tabbed governance shell", () => {
  for (const label of [
    "Tổng quan",
    "Quyền truy cập khách hàng",
    "Nhật ký hệ thống",
    "Cấu hình",
    "Thông báo / thời hạn xử lý",
    "Trung tâm nhập dữ liệu",
    "Tình trạng hệ thống",
  ]) {
    assert.match(panel, new RegExp(label.replace("/", "\\/")));
  }
});

test("customer access supports controlled direct provisioning and request workflow", () => {
  assert.match(panel, /Có thể tạo trực tiếp tài khoản mới tại đây/);
  assert.match(panel, /Yêu cầu do khách hàng gửi vẫn được xử lý/);
});

test("audit log explorer uses server pagination and filters", () => {
  assert.match(panel, /\/audit-logs\?\$\{auditQuery\}/);
  assert.match(panel, /page: String\(auditPage\)/);
  assert.match(panel, /entity_type/);
});

test("audit log screen has no delete or edit action", () => {
  assert.match(panel, /Nhật ký hệ thống chỉ đọc/);
  assert.doesNotMatch(panel, /api\.(delete|patch)\([^)]*audit-logs/);
});

test("audit log explorer exposes existing details as a read-only before-after drawer", () => {
  assert.match(panel, /Chi tiết nhật ký hệ thống/);
  assert.match(panel, /Trước thay đổi/);
  assert.match(panel, /Sau thay đổi/);
  assert.match(panel, /selectedAuditDetails\?\.before/);
  assert.match(panel, /selectedAuditDetails\?\.after/);
});

test("configuration reuses Phase 7 components", () => {
  assert.match(panel, /MasterDataConfigurationPanel/);
  assert.match(panel, /CertificationBodyCapabilitiesPanel/);
});

test("scheduler UI is visibility-only without run-now API", () => {
  assert.match(panel, /không cho phép chạy tức thời tùy ý/);
  assert.doesNotMatch(panel, /api\.(post|patch)\([^)]*(run-now|execute-job)/);
});

test("health view states that secrets and raw paths are not exposed", () => {
  assert.match(panel, /Lộ thông tin bí mật/);
  assert.match(panel, /Không hiển thị đường dẫn vật lý/);
});

test("SystemAdminScreen integrates governance without duplicating Phase 7 directly", () => {
  assert.match(admin, /SystemGovernancePanel/);
  assert.doesNotMatch(admin, /import \{ MasterDataConfigurationPanel/);
});

test("System Administration routes retain the ADMIN controller boundary and effective permission shaping", () => {
  assert.match(shell, /canManageAccounts = hasRole\("ADMIN"\) && hasPermission\("users\.read"\)/);
  assert.match(shell, /if \(canManageAccounts\)[\s\S]*key: "account-access-group"/);
  assert.match(shell, /ForbiddenState/);
});

test("runtime role designer mutation is not added to Phase 9 UI", () => {
  assert.doesNotMatch(panel, /api\.(post|patch)\([^)]*users\/(roles|permissions)/i);
});

test("internal assignment controls use backend authority while account review keeps the full role catalog", () => {
  assert.match(admin, /assignable: boolean/);
  assert.match(admin, /assignable: role\.assignable === true/);
  assert.match(admin, /roleOptions = availableRoles/);
  assert.match(admin, /role\.permissions\.length\} quyền/);
  assert.match(admin, /Tất cả vai trò[^\n]*roleFilterOptions/);
  assert.match(
    admin,
    /const roleOptions = availableRoles\s*\.filter\(\(role\) => role\.assignable === true\)/,
  );
  assert.match(admin, /const internalRoleOptions = roleOptions\.filter\(\(option\) => normalizeRole\(option\.value\) !== "customer"\)/);
});

test("technical expert is presented as a Vietnamese internal role", () => {
  assert.match(admin, /technical_expert: "Chuyên gia kỹ thuật"/);
});

test("effective permissions are grouped and displayed only with Vietnamese business labels", () => {
  assert.match(admin, /permissionGroupDefinitions/);
  assert.match(admin, /Quyền truy cập hiệu lực/);
  assert.match(admin, /getPermissionLabel\(permission\)/);
  assert.doesNotMatch(admin, /<small>\{permission\}<\/small>/);
  assert.doesNotMatch(admin, /<Tag key=\{permission\}>\{permission\}<\/Tag>/);
});

test("System Administration static navigation and governance labels are Vietnamese", () => {
  for (const pattern of [
    /System governance/,
    /label: "Customer Access"/,
    /label: "Audit Logs"/,
    /label: "Configuration"/,
    /label: "Notifications \/ SLA"/,
    /label: "Import Center"/,
    /label: "System Health"/,
    /title="Account\/access review"/,
    /title="Security events"/,
  ]) {
    assert.doesNotMatch(panel, pattern);
  }
  assert.doesNotMatch(admin, /label="Username"/);
  assert.doesNotMatch(admin, /Legacy \(chỉ đọc\)/);
});


test("configuration and capability panels use Vietnamese user-facing labels", () => {
  for (const pattern of [
    /MASTER DATA & CONFIGURATION/,
    /label: "Schemes"/,
    /label: "Standards \/ editions"/,
    /label: "Scheme rules"/,
    /label: "Numbering"/,
    /label: "Organization \/ branding"/,
    /label: "Import Center"/,
    /label="Username"/,
  ]) {
    assert.doesNotMatch(masterData, pattern);
  }
  assert.match(masterData, /THIẾT LẬP NGHIỆP VỤ & DỮ LIỆU NỀN/);
  assert.match(masterData, /Chương trình chứng nhận/);
  assert.match(masterData, /Trung tâm nhập dữ liệu/);
  assert.match(capability, /Tiêu chuẩn × lĩnh vực IAF/);
  assert.match(capability, /Mỗi ô là trạng thái năng lực của một lĩnh vực IAF trên đúng phiên bản tiêu chuẩn/);
});


test("role editor previews permissions before save and avoids a misleading self-role edit", () => {
  assert.match(admin, /Form\.useWatch\("role_names", rolesForm\)/);
  assert.match(admin, /roleSelectionChanged/);
  assert.match(admin, /Quyền sau khi lưu/);
  assert.match(admin, /Xem trước/);
  assert.match(admin, /disabled=\{selectedUser\.id === currentUserId\}/);
  assert.match(admin, /Không thể thay đổi vai trò của tài khoản đang đăng nhập/);
});

test("permission groups are compact and expandable instead of forcing a 45-row scroll", () => {
  assert.match(admin, /<details className="system-permission-group"/);
  assert.match(admin, /<summary className="system-permission-group-heading">/);
  assert.match(admin, /system-permission-group-chevron/);
  assert.match(admin, /nhóm nghiệp vụ/);
});

test("per-user permission overrides are available without changing role templates", () => {
  assert.match(admin, /\/users\/\$\{selectedUserId\}\/permission-profile/);
  assert.match(admin, /\/users\/\$\{selectedUserId\}\/permission-overrides/);
  assert.match(admin, /Quyền riêng theo tài khoản/);
  assert.match(admin, /Điều chỉnh quyền riêng/);
  assert.match(admin, /Cấp thêm quyền/);
  assert.match(admin, /Thu hồi quyền từ vai trò/);
  assert.match(admin, /Lý do điều chỉnh quyền/);
});

test("permission override UX keeps role scope visible and prevents ambiguous edits", () => {
  assert.match(admin, /Vai trò xác định phạm vi công việc; quyền riêng chỉ tinh chỉnh trong phạm vi đó/);
  assert.match(admin, /Quyền riêng không vượt qua các ràng buộc vai trò hoặc phân tách nhiệm vụ/);
  assert.match(admin, /disabled=\{roleSelectionChanged\}/);
  assert.match(admin, /Lưu thay đổi vai trò trước khi chỉnh quyền riêng/);
});

test("effective permission view includes saved account-level exceptions", () => {
  assert.match(admin, /applyPermissionOverrides\(basePermissions, allowOverrideNames, denyOverrideNames\)/);
  assert.match(admin, /Cấp riêng cho tài khoản/);
  assert.match(admin, /Cấp thêm \{allowOverrideNames\.length\}/);
  assert.match(admin, /Thu hồi \{denyOverrideNames\.length\}/);
});


test("role selection exposes permission counts and permission contents before save", () => {
  assert.match(admin, /quyền trong hệ thống/);
  assert.match(admin, /quyền từ lựa chọn hiện tại/);
  assert.match(admin, /RolePermissionPreview/);
  assert.match(admin, /Quyền của các vai trò đang chọn/);
  assert.match(admin, /Tổng \{totalPermissions\.length\} quyền/);
  assert.match(admin, /role\.permissions\.length\} quyền/);
  assert.match(admin, /Chọn vai trò để xem trước tổng quyền và quyền cụ thể trước khi tạo tài khoản/);
});

test("account permission override editor shows catalog and selection counts", () => {
  assert.match(admin, /quyền toàn hệ thống/);
  assert.match(admin, /quyền có thể cấp thêm/);
  assert.match(admin, /quyền có thể thu hồi/);
  assert.match(admin, /watchedAllowPermissionNames/);
  assert.match(admin, /watchedDenyPermissionNames/);
  assert.match(admin, /Đã chọn \$\{\(watchedAllowPermissionNames/);
  assert.match(admin, /Đã chọn \$\{\(watchedDenyPermissionNames/);
});
