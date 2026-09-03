import { Button, Card, Space, Typography } from "antd";
import type { ReactNode } from "react";

import type { DestinationRef } from "./types";

export interface PageHeaderProps {
  title: ReactNode;
  identity?: ReactNode;
  description?: ReactNode;
  metadata?: ReactNode;
  primaryAction?: ReactNode;
  secondaryActions?: ReactNode;
}

export function PageHeader({ title, identity, description, metadata, primaryAction, secondaryActions }: PageHeaderProps) {
  return (
    <header className="cmp-page-header">
      <div className="cmp-page-header__body">
        {identity ? <div className="cmp-page-header__identity">{identity}</div> : null}
        <h1>{title}</h1>
        {description ? <div className="cmp-page-header__description">{description}</div> : null}
        {metadata ? <div className="cmp-page-header__metadata cmp-inline-stack">{metadata}</div> : null}
      </div>
      {primaryAction || secondaryActions ? (
        <div className="cmp-page-header__actions">
          {secondaryActions}
          {primaryAction}
        </div>
      ) : null}
    </header>
  );
}

export interface SectionHeaderProps {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

export function SectionHeader({ title, description, actions }: SectionHeaderProps) {
  return (
    <div className="cmp-section-header">
      <div><h2>{title}</h2>{description ? <p>{description}</p> : null}</div>
      {actions ? <div>{actions}</div> : null}
    </div>
  );
}

export type ResponsibilityState = "OWN" | "WAITING" | "DELEGATED_TO_ME" | "HANDED_OFF";

const RESPONSIBILITY_LABELS: Record<ResponsibilityState, string> = {
  OWN: "Việc của tôi",
  WAITING: "Đang chờ người khác xử lý",
  DELEGATED_TO_ME: "Được ủy quyền cho tôi",
  HANDED_OFF: "Tôi đã bàn giao",
};

export interface ResponsibilityCardProps {
  state: ResponsibilityState;
  actor?: ReactNode;
  role?: ReactNode;
  destination?: DestinationRef;
  details?: ReactNode;
}

export function ResponsibilityCard({ state, actor, role, destination, details }: ResponsibilityCardProps) {
  return (
    <Card className="cmp-responsibility-card" size="small" title={RESPONSIBILITY_LABELS[state]}>
      {actor || role ? <div className="cmp-responsibility-card__actor">{actor ?? role}</div> : null}
      {actor && role ? <Typography.Text type="secondary">{role}</Typography.Text> : null}
      {details ? <div>{details}</div> : null}
      {destination ? (
        <div className="cmp-responsibility-card__destination">
          <Button type="link" onClick={destination.onNavigate} disabled={!destination.onNavigate}>
            {destination.label ?? "Mở công việc"}
          </Button>
        </div>
      ) : null}
    </Card>
  );
}

export interface EntitySummaryItem { label: ReactNode; value: ReactNode; }
export interface EntitySummaryProps { title?: ReactNode; items: EntitySummaryItem[]; compact?: boolean; }

export function EntitySummary({ title, items, compact = false }: EntitySummaryProps) {
  return (
    <Card className="cmp-entity-summary" size={compact ? "small" : "default"} title={title}>
      <Space orientation="vertical" size={compact ? 4 : 8}>
        {items.map((item, index) => <div key={index}><Typography.Text type="secondary">{item.label}: </Typography.Text>{item.value}</div>)}
      </Space>
    </Card>
  );
}

export interface BreadcrumbItem { key: string; label: ReactNode; available?: boolean; onNavigate?: () => void; }
export function Breadcrumb({ items }: { items: BreadcrumbItem[] }) {
  const visibleItems = items.filter((item) => item.available !== false);
  return (
    <nav aria-label="Breadcrumb">
      <ol className="cmp-inline-stack" style={{ listStyle: "none", margin: 0, padding: 0 }}>
        {visibleItems.map((item, index) => (
          <li key={item.key}>
            {index > 0 ? <span aria-hidden="true">/ </span> : null}
            {item.onNavigate ? <Button type="link" size="small" onClick={item.onNavigate}>{item.label}</Button> : <span aria-current={index === visibleItems.length - 1 ? "page" : undefined}>{item.label}</span>}
          </li>
        ))}
      </ol>
    </nav>
  );
}
