"use client";

import {
  CheckOutlined,
  EyeOutlined,
  PaperClipOutlined,
  ReloadOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType } from "antd";
import {
  Alert,
  App,
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  Grid,
  Input,
  Modal,
  Pagination,
  Select,
  Space,
  Table,
  Tag,
  Typography,
} from "antd";
import { useMemo, useState } from "react";

import { api, getErrorMessage } from "../lib/api";
import { openDocumentFile } from "../lib/document-file-client";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface OrganizationSnapshot {
  organization: {
    id: string;
    customer_code: string;
    company_name: string;
    country_code: string;
    country_name: string | null;
    tax_code: string | null;
    address: string | null;
    phone: string | null;
    email: string | null;
  };
  contact: {
    id: string | null;
    full_name: string;
    email: string | null;
    phone: string | null;
    position: string | null;
  } | null;
}

interface ChangeRequestAttachment {
  id: string;
  original_name: string;
  mime_type: string;
  file_size: number;
  version_no: number;
  note: string | null;
  download_url: string;
}

interface CustomerChangeRequest {
  id: string;
  request_code: string;
  status: "SUBMITTED" | "UNDER_REVIEW" | "APPROVED" | "REJECTED" | "CANCELLED";
  reason: string;
  before_snapshot: OrganizationSnapshot;
  after_snapshot: OrganizationSnapshot;
  review_comment: string | null;
  submitted_at: string;
  reviewed_at: string | null;
  applied_at: string | null;
  customer: {
    id: string;
    customer_code: string;
    company_name: string;
  };
  requester: {
    id: string;
    full_name: string | null;
    email: string;
  };
  reviewer: {
    id: string;
    full_name: string | null;
  } | null;
  attachments: ChangeRequestAttachment[];
}

const statusMeta: Record<CustomerChangeRequest["status"], { label: string; color: string }> = {
  SUBMITTED: { label: "Chờ xem xét", color: "blue" },
  UNDER_REVIEW: { label: "Đang xem xét", color: "processing" },
  APPROVED: { label: "Đã chấp thuận", color: "green" },
  REJECTED: { label: "Không chấp thuận", color: "red" },
  CANCELLED: { label: "Đã hủy", color: "default" },
};

function formatDateTime(value?: string | null) {
  if (!value) return "—";
  return new Intl.DateTimeFormat("vi-VN", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

function display(value?: string | null) {
  return value?.trim() || "—";
}

export function CustomerChangeRequestsScreen() {
  const breakpoints = Grid.useBreakpoint();
  const useCompactList = !breakpoints.lg;
  const { message } = App.useApp();
  const queryClient = useQueryClient();
  const [status, setStatus] = useState<string>("SUBMITTED");
  const [selected, setSelected] = useState<CustomerChangeRequest | null>(null);
  const [reviewDecision, setReviewDecision] = useState<"APPROVE" | "REJECT" | null>(null);
  const [reviewComment, setReviewComment] = useState("");
  const [openingAttachmentId, setOpeningAttachmentId] = useState<string | null>(null);
  const [mobilePage, setMobilePage] = useState(1);

  const query = useQuery({
    queryKey: ["customer-change-requests", status],
    queryFn: async () => (
      await api.get<CustomerChangeRequest[]>(`/customer-change-requests?status=${encodeURIComponent(status)}`)
    ).data,
  });

  const items = useMemo(() => query.data ?? [], [query.data]);
  const mobilePageCount = Math.max(1, Math.ceil(items.length / 10));
  const visibleMobilePage = Math.min(mobilePage, mobilePageCount);
  const visibleItems = items.slice((visibleMobilePage - 1) * 10, visibleMobilePage * 10);

  const reviewMutation = useMutation({
    mutationFn: async () => {
      if (!selected || !reviewDecision) throw new Error("Chưa chọn quyết định.");
      return (
        await api.post(`/customer-change-requests/${selected.id}/review`, {
          decision: reviewDecision,
          comment: reviewComment || undefined,
        })
      ).data;
    },
    onSuccess: async () => {
      message.success(reviewDecision === "APPROVE" ? "Đã chấp thuận và cập nhật hồ sơ khách hàng." : "Đã từ chối yêu cầu thay đổi.");
      setReviewDecision(null);
      setReviewComment("");
      setSelected(null);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["customer-change-requests"] }),
        queryClient.invalidateQueries({ queryKey: ["customers"] }),
        queryClient.invalidateQueries({ queryKey: ["personal-workspace"] }),
      ]);
    },
    onError: (error) => message.error(getErrorMessage(error)),
  });

  const openAttachment = async (attachment: ChangeRequestAttachment) => {
    setOpeningAttachmentId(attachment.id);
    try {
      await openDocumentFile({
        url: attachment.download_url,
        filename: attachment.original_name,
        mimeType: attachment.mime_type,
        title: attachment.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setOpeningAttachmentId(null);
    }
  };

  const columns: TableColumnsType<CustomerChangeRequest> = [
    {
      title: "Mã yêu cầu",
      dataIndex: "request_code",
      key: "request_code",
      width: 190,
      render: (value: string) => <Text strong>{value}</Text>,
    },
    {
      title: "Khách hàng",
      key: "customer",
      render: (_, record) => (
        <Space direction="vertical" size={0}>
          <Text strong>{record.customer.company_name}</Text>
          <Text type="secondary">{record.customer.customer_code}</Text>
        </Space>
      ),
    },
    {
      title: "Người gửi",
      key: "requester",
      width: 220,
      render: (_, record) => record.requester.full_name || record.requester.email,
    },
    {
      title: "Ngày gửi",
      dataIndex: "submitted_at",
      key: "submitted_at",
      width: 160,
      render: (value: string) => formatDateTime(value),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: CustomerChangeRequest["status"]) => {
        const meta = statusMeta[value];
        return <Tag color={meta.color}>{meta.label}</Tag>;
      },
    },
    {
      title: "",
      key: "action",
      width: 100,
      render: (_, record) => <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem</Button>,
    },
  ];

  const before = selected?.before_snapshot;
  const after = selected?.after_snapshot;
  const canReview = selected ? ["SUBMITTED", "UNDER_REVIEW"].includes(selected.status) : false;

  return (
    <div className="projects-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ KHÁCH HÀNG</span>
          <Title level={2}>Yêu cầu thay đổi hồ sơ</Title>
          <Text type="secondary">Xem xét snapshot trước/sau do khách hàng gửi. Chỉ khi chấp thuận hệ thống mới cập nhật hồ sơ master.</Text>
        </div>
        <Space className="customer-change-requests__toolbar">
          <Select
            onChange={setStatus}
            options={Object.entries(statusMeta).map(([value, meta]) => ({ value, label: meta.label }))}
            value={status}
            style={{ width: 180 }}
          />
          <Button icon={<ReloadOutlined />} loading={query.isFetching} onClick={() => void query.refetch()}>Làm mới</Button>
        </Space>
      </div>

      {query.isError ? (
        <Alert description={getErrorMessage(query.error)} message="Không tải được yêu cầu thay đổi" showIcon type="error" />
      ) : (
        <Card loading={useCompactList && query.isLoading}>
          {useCompactList ? (
            items.length ? (
              <>
                <div aria-label="Yêu cầu thay đổi hồ sơ" className="portal-mobile-list">
                  {visibleItems.map((record) => (
                    <article className="portal-mobile-card" key={record.id}>
                      <div className="portal-mobile-card__heading">
                        <div className="portal-mobile-card__identity">
                          <strong>{record.request_code}</strong>
                          <small>{record.customer.company_name}</small>
                        </div>
                        <Tag color={statusMeta[record.status].color}>{statusMeta[record.status].label}</Tag>
                      </div>
                      <div className="portal-mobile-card__meta">
                        <span><strong>Mã khách hàng:</strong> {record.customer.customer_code}</span>
                        <span><strong>Người gửi:</strong> {record.requester.full_name || record.requester.email}</span>
                        <span><strong>Ngày gửi:</strong> {formatDateTime(record.submitted_at)}</span>
                        <span><strong>Lý do:</strong> {record.reason}</span>
                      </div>
                      <Space className="portal-mobile-card__actions portal-mobile-card__actions--single" wrap>
                        <Button icon={<EyeOutlined />} onClick={() => setSelected(record)} size="small">Xem thay đổi</Button>
                      </Space>
                    </article>
                  ))}
                </div>
                {items.length > 10 ? (
                  <Pagination
                    className="compact-mobile-pagination"
                    current={visibleMobilePage}
                    onChange={setMobilePage}
                    pageSize={10}
                    responsive
                    showSizeChanger={false}
                    showTotal={(total) => `${total} yêu cầu`}
                    total={items.length}
                  />
                ) : null}
              </>
            ) : <Empty description="Không có yêu cầu trong trạng thái này" />
          ) : (
            <Table<CustomerChangeRequest>
              columns={columns}
              dataSource={items}
              loading={query.isLoading}
              locale={{ emptyText: <Empty description="Không có yêu cầu trong trạng thái này" /> }}
              pagination={{ pageSize: 20 }}
              rowKey="id"
            />
          )}
        </Card>
      )}

      <Drawer
        onClose={() => setSelected(null)}
        open={Boolean(selected)}
        title={selected ? `${selected.request_code} · ${selected.customer.customer_code}` : "Yêu cầu thay đổi"}
        width={breakpoints.md ? 720 : "100%"}
      >
        {selected && before && after ? (
          <Space direction="vertical" size={16} style={{ width: "100%" }}>
            <Alert description={selected.reason} message="Lý do thay đổi" showIcon type="info" />
            <Descriptions bordered column={1} size="small" title="So sánh thông tin tổ chức">
              <Descriptions.Item label="Tên tổ chức">{display(before.organization.company_name)} → {display(after.organization.company_name)}</Descriptions.Item>
              <Descriptions.Item label="Địa chỉ">{display(before.organization.address)} → {display(after.organization.address)}</Descriptions.Item>
              <Descriptions.Item label="MST / Business ID">{display(before.organization.tax_code)} → {display(after.organization.tax_code)}</Descriptions.Item>
              <Descriptions.Item label="Điện thoại">{display(before.organization.phone)} → {display(after.organization.phone)}</Descriptions.Item>
              <Descriptions.Item label="Email">{display(before.organization.email)} → {display(after.organization.email)}</Descriptions.Item>
            </Descriptions>

            <Descriptions bordered column={1} size="small" title="Người liên hệ">
              <Descriptions.Item label="Trước thay đổi">
                {before.contact ? `${before.contact.full_name} · ${display(before.contact.position)} · ${display(before.contact.phone)} · ${display(before.contact.email)}` : "—"}
              </Descriptions.Item>
              <Descriptions.Item label="Sau thay đổi">
                {after.contact ? `${after.contact.full_name} · ${display(after.contact.position)} · ${display(after.contact.phone)} · ${display(after.contact.email)}` : "—"}
              </Descriptions.Item>
            </Descriptions>

            <Card size="small" title="Tệp đính kèm">
              {selected.attachments.length ? (
                <Space wrap>
                  {selected.attachments.map((attachment) => (
                    <Button
                      icon={<PaperClipOutlined />}
                      key={attachment.id}
                      loading={openingAttachmentId === attachment.id}
                      onClick={() => void openAttachment(attachment)}
                    >
                      {attachment.original_name}
                    </Button>
                  ))}
                </Space>
              ) : <Text type="secondary">Không có tệp đính kèm.</Text>}
            </Card>

            {selected.review_comment ? <Alert description={selected.review_comment} message="Ý kiến xem xét" type={selected.status === "REJECTED" ? "warning" : "success"} showIcon /> : null}

            {canReview ? (
              <Space>
                <Button
                  icon={<CheckOutlined />}
                  onClick={() => {
                    setReviewComment("");
                    setReviewDecision("APPROVE");
                  }}
                  type="primary"
                >
                  Chấp thuận
                </Button>
                <Button
                  danger
                  icon={<StopOutlined />}
                  onClick={() => {
                    setReviewComment("");
                    setReviewDecision("REJECT");
                  }}
                >
                  Từ chối
                </Button>
              </Space>
            ) : null}
          </Space>
        ) : null}
      </Drawer>

      <Modal
        okButtonProps={{ danger: reviewDecision === "REJECT", loading: reviewMutation.isPending }}
        okText={reviewDecision === "APPROVE" ? "Xác nhận chấp thuận" : "Xác nhận từ chối"}
        onCancel={() => setReviewDecision(null)}
        onOk={() => reviewMutation.mutate()}
        open={Boolean(reviewDecision)}
        title={reviewDecision === "APPROVE" ? "Chấp thuận yêu cầu thay đổi" : "Từ chối yêu cầu thay đổi"}
      >
        <Alert
          description={reviewDecision === "APPROVE"
            ? "Khi xác nhận, hồ sơ master của khách hàng sẽ được cập nhật theo snapshot sau thay đổi."
            : "Yêu cầu sẽ được đóng và khách hàng nhận thông báo phản hồi."}
          message="Quyết định có kiểm soát"
          showIcon
          style={{ marginBottom: 16 }}
          type={reviewDecision === "APPROVE" ? "warning" : "info"}
        />
        <TextArea
          onChange={(event) => setReviewComment(event.target.value)}
          placeholder={reviewDecision === "REJECT" ? "Nhập lý do từ chối (bắt buộc)" : "Ý kiến xem xét (không bắt buộc)"}
          rows={4}
          value={reviewComment}
        />
      </Modal>
    </div>
  );
}
