import { CloseOutlined, MenuOutlined } from "@ant-design/icons";
import { App, Button, Select, Tag } from "antd";
import { useMemo, useState } from "react";

import "./certification-case-visual-showcase.css";
import { CertificationCaseRegistryView } from "./CertificationCaseRegistryPage";
import { CertificationCaseWorkspaceView } from "./CertificationCaseWorkspace";
import { DEV_CERTIFICATION_CASE_RECORDS, DEV_CERTIFICATION_CASE_WORKSPACE } from "./dev-certification-case-fixture";
import type { CertificationCaseArea } from "./types";

type ShowcaseView = "registry" | "empty" | CertificationCaseArea;

const viewLabels: Array<{ key: ShowcaseView; label: string }> = [
  { key: "registry", label: "Registry" },
  { key: "empty", label: "Registry rỗng" },
  { key: "overview", label: "Overview" },
  { key: "progress", label: "Progress" },
  { key: "team", label: "Team" },
  { key: "documents", label: "Documents" },
  { key: "activity", label: "Activity" },
];

function initialView(): ShowcaseView {
  const value = new URLSearchParams(window.location.search).get("view");
  return viewLabels.some((item) => item.key === value) ? value as ShowcaseView : "registry";
}

export function CertificationCaseVisualShowcase() {
  const { message } = App.useApp();
  const [view, setView] = useState<ShowcaseView>(() => initialView());
  const [menuOpen, setMenuOpen] = useState(false);
  const area = useMemo<CertificationCaseArea>(() => view === "registry" || view === "empty" ? "overview" : view, [view]);

  const navigate = (next: ShowcaseView) => {
    const params = new URLSearchParams();
    params.set("view", next);
    window.history.replaceState(window.history.state, "", `${window.location.pathname}?${params.toString()}`);
    setView(next);
    setMenuOpen(false);
    window.scrollTo({ top: 0, behavior: "instant" });
  };

  return (
    <div className="cmp-case-dev-showcase" data-menu-open={menuOpen}>
      <aside className="cmp-case-dev-sidebar" aria-label="Điều hướng bản trình diễn">
        <div className="cmp-case-dev-brand"><strong>Certification Platform</strong><small>Dữ liệu minh họa DEV</small></div>
        <nav aria-label="Nghiệp vụ chứng nhận minh họa">
          <button type="button">Đơn đăng ký</button>
          <button type="button" aria-current="page" onClick={() => navigate("registry")}>Hồ sơ chứng nhận</button>
          <button type="button">Sổ đăng ký chứng chỉ</button>
        </nav>
      </aside>

      <div className="cmp-case-dev-main">
        <div className="cmp-case-dev-toolbar">
          <Button
            className="cmp-case-dev-menu-button"
            aria-label={menuOpen ? "Đóng điều hướng" : "Mở điều hướng"}
            icon={menuOpen ? <CloseOutlined /> : <MenuOutlined />}
            onClick={() => setMenuOpen((open) => !open)}
          />
          <Tag color="blue">DEV · MOCK DATA</Tag>
          <Select
            className="cmp-case-dev-view-select"
            aria-label="Chọn màn hình trình diễn"
            value={view}
            options={viewLabels.map((item) => ({ value: item.key, label: item.label }))}
            onChange={navigate}
          />
          <div className="cmp-case-dev-view-buttons">
            {viewLabels.map((item) => (
              <Button key={item.key} size="small" type={view === item.key ? "primary" : "default"} onClick={() => navigate(item.key)}>{item.label}</Button>
            ))}
          </div>
        </div>

        <div className="cmp-case-dev-content">
          {view === "registry" || view === "empty" ? (
            <CertificationCaseRegistryView
              records={view === "empty" ? [] : DEV_CERTIFICATION_CASE_RECORDS}
              onRefresh={() => undefined}
              onOpenCase={() => navigate("overview")}
            />
          ) : (
            <CertificationCaseWorkspaceView
              data={DEV_CERTIFICATION_CASE_WORKSPACE}
              area={area}
              selectedCycleKey="initial-certification"
              onBack={() => navigate("registry")}
              onRefresh={() => undefined}
              onNavigateArea={navigate}
              onCycleChange={() => undefined}
              onOpenCompatibility={() => message.info("Bản trình diễn DEV chỉ mô phỏng điều hướng; không gọi thao tác nghiệp vụ.")}
              onOpenFile={(file) => message.info(`Bản trình diễn không tải tệp: ${file.original_name}`)}
            />
          )}
        </div>
      </div>
    </div>
  );
}
