import { Alert, Card, Space, Typography } from "antd";
import type { ReactNode } from "react";

export interface FormSectionProps {
  title: ReactNode;
  description?: ReactNode;
  children: ReactNode;
  extra?: ReactNode;
  errors?: string[];
}

export function FormSection({ title, description, children, extra, errors = [] }: FormSectionProps) {
  return (
    <Card className="cmp-form-section" title={title} extra={extra}>
      <Space orientation="vertical" size={16} style={{ width: "100%" }}>
        {description ? <Typography.Text type="secondary">{description}</Typography.Text> : null}
        {errors.length ? (
          <Alert
            type="error"
            showIcon
            title="Vui lòng kiểm tra thông tin"
            description={<ul className="cmp-blocker-list">{errors.map((error, index) => <li key={`${index}-${error}`}>{error}</li>)}</ul>}
          />
        ) : null}
        <div>{children}</div>
      </Space>
    </Card>
  );
}
