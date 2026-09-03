import { Button, Card, List, Space, Timeline, Typography } from "antd";
import type { ReactNode } from "react";

import type { SemanticTone } from "./types";
import { DomainStatusBadge } from "./status";
import type { StatusDomain } from "./types";

export interface ChangeDiffItem { key: string; label: ReactNode; before: ReactNode; after: ReactNode; changed?: boolean; }
export function ChangeDiff({ items }: { items: ChangeDiffItem[] }) {
  return (
    <div className="cmp-change-diff" role="table" aria-label="So sánh thay đổi">
      {items.map((item) => (
        <div className="cmp-change-diff__row" role="row" key={item.key} data-changed={item.changed ?? true}>
          <div className="cmp-change-diff__cell cmp-change-diff__label" role="rowheader">{item.label}</div>
          <div className="cmp-change-diff__cell cmp-change-diff__before" role="cell">{item.before}</div>
          <div className="cmp-change-diff__cell cmp-change-diff__after" role="cell">{item.after}</div>
        </div>
      ))}
    </div>
  );
}

export interface ActivityEvent { key: string; title: ReactNode; actor?: ReactNode; time: ReactNode; description?: ReactNode; onNavigate?: () => void; }
export function ActivityTimeline({ events, onLoadMore }: { events: ActivityEvent[]; onLoadMore?: () => void }) {
  return (
    <div>
      <Timeline items={events.map((event) => ({ content: <div><Typography.Text strong>{event.title}</Typography.Text><div><Typography.Text type="secondary">{event.actor ? <>{event.actor} · </> : null}{event.time}</Typography.Text></div>{event.description ? <div>{event.description}</div> : null}{event.onNavigate ? <Button type="link" onClick={event.onNavigate}>Mở chi tiết</Button> : null}</div> }))} />
      {onLoadMore ? <Button onClick={onLoadMore}>Tải thêm hoạt động</Button> : null}
    </div>
  );
}

export interface GovernedDocumentCardProps {
  title: ReactNode;
  documentClass: ReactNode;
  version: ReactNode;
  visibility: ReactNode;
  statusDomain: Extract<StatusDomain, "controlledTemplate" | "generatedDocument">;
  statusCode: string;
  actions?: ReactNode;
}
export function GovernedDocumentCard({ title, documentClass, version, visibility, statusDomain, statusCode, actions }: GovernedDocumentCardProps) {
  return (
    <Card className="cmp-document-card" title={title} extra={<DomainStatusBadge domain={statusDomain} code={statusCode} />}>
      <Space orientation="vertical" size={8}>
        <div className="cmp-document-card__meta">{documentClass} · {version} · {visibility}</div>
        {actions ? <div className="cmp-inline-stack">{actions}</div> : null}
      </Space>
    </Card>
  );
}

export interface EvidenceItem { key: string; name: ReactNode; owner?: ReactNode; metadata?: ReactNode; preview?: () => void; download?: () => void; }
export function EvidenceList({ items }: { items: EvidenceItem[] }) {
  return (
    <List
      dataSource={items}
      locale={{ emptyText: "Chưa có bằng chứng" }}
      renderItem={(item) => (
        <List.Item actions={[
          item.preview ? <Button key="preview" type="link" onClick={item.preview}>Xem</Button> : null,
          item.download ? <Button key="download" type="link" onClick={item.download}>Tải xuống</Button> : null,
        ].filter(Boolean) as ReactNode[]}>
          <List.Item.Meta title={item.name} description={<>{item.owner}{item.owner && item.metadata ? " · " : null}{item.metadata}</>} />
        </List.Item>
      )}
    />
  );
}

export function ToneSwatch({ tone, label }: { tone: SemanticTone; label: string }) {
  return <span className={`cmp-status-badge cmp-tone-${tone}`}>{label}</span>;
}
