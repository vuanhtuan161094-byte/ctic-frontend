import { Alert, Button, Empty, Result, Typography } from "antd";
import type { ReactNode } from "react";

export interface StateAction { label: string; onAction: () => void; }

export function EmptyState({ title = "Chưa có dữ liệu", description, action }: { title?: ReactNode; description?: ReactNode; action?: StateAction }) {
  return <Empty className="cmp-state" description={<><Typography.Text strong>{title}</Typography.Text>{description ? <div>{description}</div> : null}</>}><>{action ? <Button type="primary" onClick={action.onAction}>{action.label}</Button> : null}</></Empty>;
}

export function ErrorState({ title = "Không thể tải dữ liệu", description, correlationId, retry }: { title?: ReactNode; description?: ReactNode; correlationId?: string; retry?: StateAction }) {
  return <Result className="cmp-state" status="error" title={title} subTitle={<>{description}{correlationId ? <div className="cmp-state__correlation">Mã tham chiếu: {correlationId}</div> : null}</>} extra={retry ? <Button type="primary" onClick={retry.onAction}>{retry.label}</Button> : undefined} />;
}

export function ForbiddenState({ exit }: { exit?: StateAction }) {
  return (
    <Result
      className="cmp-state"
      status="403"
      title="Không thể truy cập"
      subTitle="Bạn không có quyền xem nội dung này."
      extra={exit ? <Button onClick={exit.onAction}>{exit.label}</Button> : undefined}
    />
  );
}

export function ReadOnlyState({ reason, children }: { reason: ReactNode; children?: ReactNode }) {
  return <div className="cmp-read-only-state"><Alert type="info" showIcon title="Chế độ chỉ đọc" description={reason} />{children}</div>;
}
