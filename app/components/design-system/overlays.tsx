import { Drawer, Form, Input, Modal, Typography } from "antd";
import type { ReactNode } from "react";

export type DetailDrawerSize = "sm" | "md" | "lg" | "xl";
const DRAWER_WIDTHS: Record<DetailDrawerSize, number> = { sm: 420, md: 560, lg: 760, xl: 960 };

export interface DetailDrawerProps {
  open: boolean;
  title: ReactNode;
  children: ReactNode;
  size?: DetailDrawerSize;
  extra?: ReactNode;
  footer?: ReactNode;
  onClose: () => void;
}

export function DetailDrawer({ open, title, children, size = "md", extra, footer, onClose }: DetailDrawerProps) {
  return (
    <Drawer
      className="cmp-detail-drawer"
      open={open}
      title={title}
      extra={extra}
      footer={footer}
      onClose={onClose}
      size={DRAWER_WIDTHS[size]}
      styles={{ wrapper: { maxWidth: "100vw" } }}
      data-size-tier={size}
    >
      {children}
    </Drawer>
  );
}

export type ConfirmDialogVariant = "confirm" | "reason" | "comment" | "destructive";

export interface ConfirmDialogProps {
  open: boolean;
  title: ReactNode;
  consequence: ReactNode;
  variant?: ConfirmDialogVariant;
  confirmLabel?: string;
  cancelLabel?: string;
  noteLabel?: string;
  onCancel: () => void;
  onConfirm: (note?: string) => void | Promise<void>;
  loading?: boolean;
}

export function ConfirmDialog({ open, title, consequence, variant = "confirm", confirmLabel = "Xác nhận", cancelLabel = "Hủy", noteLabel, onCancel, onConfirm, loading }: ConfirmDialogProps) {
  const [form] = Form.useForm<{ note?: string }>();
  const noteRequired = variant === "reason" || variant === "destructive";
  const hasNote = variant !== "confirm";

  const submit = async () => {
    const enteredNote = form.getFieldValue("note") as string | undefined;
    if (noteRequired && !enteredNote?.trim()) {
      form.setFields([{ name: "note", errors: ["Vui lòng nhập lý do."] }]);
      return;
    }
    const values = await form.validateFields();
    await onConfirm(values.note?.trim() || undefined);
  };

  return (
    <Modal
      open={open}
      title={title}
      okText={confirmLabel}
      cancelText={cancelLabel}
      okButtonProps={{ danger: variant === "destructive" }}
      confirmLoading={loading}
      onCancel={onCancel}
      onOk={submit}
      destroyOnHidden
      afterOpenChange={(isOpen) => { if (!isOpen) form.resetFields(); }}
    >
      <Typography.Paragraph>{consequence}</Typography.Paragraph>
      {hasNote ? (
        <Form form={form} layout="vertical" requiredMark="optional">
          <Form.Item
            name="note"
            label={noteLabel ?? (variant === "comment" ? "Nhận xét" : "Lý do")}
            rules={noteRequired ? [{ required: true, whitespace: true, message: "Vui lòng nhập lý do." }] : undefined}
          >
            <Input.TextArea autoFocus rows={4} maxLength={2000} showCount />
          </Form.Item>
        </Form>
      ) : null}
    </Modal>
  );
}
