import { Alert, Button, Card, Empty, Space, Typography } from "antd";
import type { ReactNode } from "react";

import type { ProjectedAction, StructuredBlocker } from "./types";

const blockerAlertType = (severity: StructuredBlocker["severity"]) =>
  severity === "BLOCKING" ? "error" : severity === "WARNING" ? "warning" : "info";

export interface ReadinessBlockerPanelProps {
  title?: ReactNode;
  blockers: StructuredBlocker[];
  readyMessage?: ReactNode;
}

export function ReadinessBlockerPanel({ title = "Điều kiện sẵn sàng", blockers, readyMessage = "Đã đáp ứng các điều kiện được cung cấp." }: ReadinessBlockerPanelProps) {
  if (blockers.length === 0) return <Alert showIcon type="success" title={readyMessage} />;
  return (
    <Card size="small" title={title}>
      <Space orientation="vertical" size={8} style={{ width: "100%" }}>
        {blockers.map((blocker) => (
          <Alert
            key={blocker.code}
            showIcon
            type={blockerAlertType(blocker.severity)}
            title={blocker.label}
            description={blocker.explanation}
            action={blocker.resolution ? (
              <Button size="small" onClick={blocker.resolution.onNavigate} disabled={!blocker.resolution.onNavigate}>
                {blocker.resolution.label ?? "Xem cách xử lý"}
              </Button>
            ) : undefined}
          />
        ))}
      </Space>
    </Card>
  );
}

export interface NextActionBarProps {
  primaryAction?: ProjectedAction | null;
  secondaryActions?: ProjectedAction[];
  emptyLabel?: ReactNode;
}

function ActionButton({ action, primary = false }: { action: ProjectedAction; primary?: boolean }) {
  return (
    <Button
      danger={action.severity === "DESTRUCTIVE"}
      disabled={!action.enabled}
      onClick={action.onAction}
      title={!action.enabled ? action.disabledReason : action.businessMeaning}
      type={primary ? "primary" : "default"}
    >
      {action.label}
    </Button>
  );
}

export function NextActionBar({ primaryAction, secondaryActions = [], emptyLabel = "Không có hành động tiếp theo được cung cấp." }: NextActionBarProps) {
  if (!primaryAction && secondaryActions.length === 0) return <Empty image={Empty.PRESENTED_IMAGE_SIMPLE} description={emptyLabel} />;
  return (
    <div className="cmp-next-action-bar" aria-label="Hành động tiếp theo">
      <div className="cmp-next-action-bar__meaning">
        <Typography.Text strong>{primaryAction?.label ?? "Hành động có thể thực hiện"}</Typography.Text>
        {primaryAction?.businessMeaning ? <div>{primaryAction.businessMeaning}</div> : null}
      </div>
      <div className="cmp-next-action-bar__actions">
        {secondaryActions.map((action) => <ActionButton key={action.code} action={action} />)}
        {primaryAction ? <ActionButton action={primaryAction} primary /> : null}
      </div>
    </div>
  );
}

export interface ActionGuardProps {
  allowed: boolean;
  reason?: ReactNode;
  children: ReactNode;
  fallback?: ReactNode;
}

export function ActionGuard({ allowed, reason, children, fallback }: ActionGuardProps) {
  if (allowed) return <>{children}</>;
  return <>{fallback ?? <Alert type="info" showIcon title="Chỉ đọc" description={reason ?? "Hành động này hiện không khả dụng."} />}</>;
}

export interface LifecycleStep {
  key: string;
  title: ReactNode;
  description?: ReactNode;
  state: "complete" | "current" | "blocked" | "upcoming" | "notApplicable";
}

export function LifecycleStepper({ steps }: { steps: LifecycleStep[] }) {
  return (
    <ol aria-label="Tiến trình vòng đời" className="cmp-section-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
      {steps.map((step, index) => (
        <li key={step.key} aria-current={["current", "blocked"].includes(step.state) ? "step" : undefined} data-lifecycle-state={step.state}>
          <Typography.Text type={step.state === "notApplicable" ? "secondary" : undefined} strong={["current", "blocked"].includes(step.state)}>
            {index + 1}. {step.title}{step.state === "notApplicable" ? " — Không áp dụng" : step.state === "blocked" ? " — Đang bị chặn" : ""}
          </Typography.Text>
          {step.description ? <div><Typography.Text type="secondary">{step.description}</Typography.Text></div> : null}
        </li>
      ))}
    </ol>
  );
}

export interface CycleOption { key: string; label: ReactNode; sourceIds?: string[]; }
export function CycleSelector({ cycles, value, onChange }: { cycles: CycleOption[]; value?: string; onChange?: (cycleKey: string) => void }) {
  return (
    <div role="group" aria-label="Chu kỳ chứng nhận" className="cmp-inline-stack">
      {cycles.map((cycle) => <Button key={cycle.key} type={cycle.key === value ? "primary" : "default"} onClick={() => onChange?.(cycle.key)}>{cycle.label}</Button>)}
    </div>
  );
}
