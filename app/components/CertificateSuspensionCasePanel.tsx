"use client";

import { useQuery } from "@tanstack/react-query";
import { Alert, Button, Card, Descriptions, Empty, Input, Select, Space, Tag, Typography } from "antd";
import dayjs from "dayjs";
import { useState } from "react";
import { api, getErrorMessage } from "../lib/api";

const { Text } = Typography;
type Action = "EXTEND_3_MONTHS" | "RECOMMEND_RESTORE" | "RECOMMEND_WITHDRAW" | "RECOMMEND_REDUCE_SCOPE";
const choices: Array<{ value: Action; label: string }> = [
  { value: "EXTEND_3_MONTHS", label: "Đề nghị gia hạn đình chỉ thêm 3 tháng" },
  { value: "RECOMMEND_RESTORE", label: "Kiến nghị khôi phục khi đã khắc phục phù hợp" },
  { value: "RECOMMEND_WITHDRAW", label: "Kiến nghị thu hồi chứng nhận" },
  { value: "RECOMMEND_REDUCE_SCOPE", label: "Kiến nghị thu hẹp phạm vi chứng nhận" },
];
type CaseRecord = {
  id: string;
  status: string | null;
  reviewer_id: string;
  evidence: {
    action: Action;
    technical_review_id: string;
    reason: string;
    corrective_evidence: string;
    requested_by: string;
    reviewer_comment?: string;
    reviewed_at?: string;
  } | null;
};
type CaseResponse = {
  certificate: { id: string; cert_number: string; status: string };
  suspension: { id: string; effective_date: string; decision_id: string | null };
  deadline: {
    initial_review_due_at: string;
    maximum_due_at: string;
    after_initial: boolean;
    after_maximum: boolean;
  };
  extension: CaseRecord | null;
  recommendation: CaseRecord | null;
  approved_extension: boolean;
  requires_f13: boolean;
  legal_status_unchanged: true;
};
type Reviewer = { id: string; username: string; full_name: string | null };
type Props = {
  certificateId: string;
  projectId?: string;
  roles: string[];
  onOpenPath?: (path: string) => void;
};
function date(value?: string | null) {
  if (!value) return "—";
  const parsed = dayjs(value);
  return parsed.isValid() ? parsed.format("DD/MM/YYYY") : "—";
}
function statusText(value?: string | null) {
  if (value === "approved") return <Tag color="green">Đã được duyệt nội bộ</Tag>;
  if (value === "pending") return <Tag color="gold">Chờ quyết định</Tag>;
  if (value === "rejected") return <Tag color="red">Không được chấp thuận</Tag>;
  return <Tag>Chưa có hồ sơ</Tag>;
}
export function CertificateSuspensionCasePanel({ certificateId, projectId, roles, onOpenPath }: Props) {
  const canRequest = roles.some((r) => ["ADMIN", "COORDINATOR"].includes(r.toUpperCase()));
  const canDecide = roles.some((r) => r.toUpperCase() === "DECISION_MAKER");
  const [action, setAction] = useState<Action>("EXTEND_3_MONTHS");
  const [reviewerId, setReviewerId] = useState<string>();
  const [f11Id, setF11Id] = useState("");
  const [reason, setReason] = useState("");
  const [correctiveEvidence, setCorrectiveEvidence] = useState("");
  const [decisionNote, setDecisionNote] = useState<Record<string, string>>({});
  const [saving, setSaving] = useState(false);
  const [operationError, setOperationError] = useState<string | null>(null);
  const recordQuery = useQuery({
    queryKey: ["certificate", certificateId, "suspension-case"],
    queryFn: async () => (await api.get<CaseResponse>(`/certificates/${certificateId}/suspension-case`)).data,
    retry: 1,
  });
  const reviewers = useQuery({
    queryKey: ["certificates", "suspension-reviewers"],
    enabled: canRequest,
    queryFn: async () => (await api.get<Reviewer[]>("/certificates/suspension-review/reviewers")).data,
    staleTime: 60_000,
    retry: 1,
  });
  const data = recordQuery.data;
  const isLate = data?.deadline.after_maximum ?? false;
  const pending = [data?.extension, data?.recommendation].filter(
    (item): item is CaseRecord => Boolean(item?.status === "pending" && item.evidence),
  );
  const sendRequest = async () => {
    if (!reviewerId || !/^[0-9a-f-]{36}$/i.test(f11Id.trim()) ||
        reason.trim().length < 20 || correctiveEvidence.trim().length < 8) return;
    setSaving(true);
    setOperationError(null);
    try {
      await api.post(`/certificates/${certificateId}/suspension-case/request`, {
        action, technical_review_id: f11Id.trim(), decision_maker_id: reviewerId,
        reason: reason.trim(), corrective_evidence: correctiveEvidence.trim(),
      });
      await recordQuery.refetch();
      setReason("");
      setCorrectiveEvidence("");
    } catch (error) { setOperationError(getErrorMessage(error)); }
    finally { setSaving(false); }
  };
  const sendDecision = async (item: CaseRecord, decision: "approved" | "rejected") => {
    if (!item.evidence?.action || (decisionNote[item.id] ?? "").trim().length < 20) return;
    setSaving(true);
    setOperationError(null);
    try {
      await api.post(
        `/certificates/${certificateId}/suspension-case/${item.evidence.action}/decide`,
        { decision, comment: decisionNote[item.id].trim() },
      );
      await recordQuery.refetch();
      setDecisionNote((current) => ({ ...current, [item.id]: "" }));
    } catch (error) { setOperationError(getErrorMessage(error)); }
    finally { setSaving(false); }
  };

  return (
    <section className="certificate-detail-section" aria-label="Xem xét đình chỉ 3 cộng 3 tháng">
      <div className="certificate-section-heading">
        <div>
          <strong>Xem xét đình chỉ 3 + 3 tháng</strong>
          <span>Phê duyệt gia hạn có kiểm soát · Thẩm xét F.11 · Quyết định F.13</span>
        </div>
        <Button size="small" loading={recordQuery.isFetching} onClick={() => void recordQuery.refetch()}>Tải lại</Button>
      </div>
      {recordQuery.isError ? (
        <Alert showIcon type="error" title="Không đọc được hồ sơ xem xét đình chỉ"
          description={getErrorMessage(recordQuery.error)}
          action={<Button size="small" onClick={() => void recordQuery.refetch()}>Thử lại</Button>} />
      ) : null}
      {recordQuery.isLoading ? <Card loading /> : null}
      {data ? (
        <Space orientation="vertical" style={{ width: "100%" }} size="middle">
          <Descriptions bordered column={{ xs: 1, sm: 2 }} size="small">
            <Descriptions.Item label="Bắt đầu đình chỉ">{date(data.suspension.effective_date)}</Descriptions.Item>
            <Descriptions.Item label="Xem xét sau 3 tháng">{date(data.deadline.initial_review_due_at)}</Descriptions.Item>
            <Descriptions.Item label="Giới hạn 6 tháng">{date(data.deadline.maximum_due_at)}</Descriptions.Item>
            <Descriptions.Item label="Gia hạn thêm 3 tháng">{data.approved_extension ? <Tag color="green">Đã duyệt</Tag> : <Tag>Chưa duyệt</Tag>}</Descriptions.Item>
          </Descriptions>
          {isLate ? (
            <Alert type="error" showIcon title="Đã vượt quá 6 tháng đình chỉ"
              description="Bắt buộc xử lý thu hồi hoặc thu hẹp phạm vi theo quy trình thẩm xét và quyết định chứng nhận. Không thể gia hạn lần hai; hệ thống không tự thay đổi hiệu lực chứng chỉ." />
          ) : data.deadline.after_initial && !data.approved_extension ? (
            <Alert type="warning" showIcon title="Đã đến hạn xem xét sau 3 tháng"
              description="Nếu hành động khắc phục chưa đạt, điều phối viên phải trình bằng chứng F.11 để người ra quyết định độc lập xem xét gia hạn một lần tối đa 3 tháng." />
          ) : null}

          <Descriptions bordered size="small" column={1}>
            <Descriptions.Item label="Xem xét gia hạn">{statusText(data.extension?.status)}</Descriptions.Item>
            <Descriptions.Item label="Kiến nghị xử lý">{statusText(data.recommendation?.status)}
              {data.recommendation?.evidence?.action
                ? ` · ${choices.find((item) => item.value === data.recommendation?.evidence?.action)?.label ?? ""}` : ""}
            </Descriptions.Item>
          </Descriptions>
          {operationError ? <Alert type="error" showIcon title="Không thực hiện được thao tác" description={operationError} /> : null}

          {canRequest ? (
            <Card size="small" title="Lập đề nghị xem xét đình chỉ">
              <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                <Text>Loại đề nghị</Text>
                <Select aria-label="Loại đề nghị đình chỉ" value={action} onChange={setAction}
                  options={choices.filter((choice) => !isLate ||
                    !["EXTEND_3_MONTHS", "RECOMMEND_RESTORE"].includes(choice.value))}
                  style={{ width: "100%" }} />
                <Text>Mã hồ sơ thẩm xét F.11 đã hoàn thành (UUID)</Text>
                <Input aria-label="Mã thẩm xét F11" value={f11Id} onChange={(event) => setF11Id(event.target.value)}
                  placeholder="Nhập UUID bản F.11 thuộc hồ sơ chứng nhận này" />
                <Text>Người ra quyết định độc lập</Text>
                <Select aria-label="Người quyết định đình chỉ" value={reviewerId} onChange={setReviewerId}
                  loading={reviewers.isFetching} style={{ width: "100%" }}
                  placeholder="Chọn người có vai trò DECISION_MAKER đang hoạt động"
                  options={(reviewers.data ?? []).map((person) => ({
                    value: person.id, label: person.full_name ? `${person.full_name} · ${person.username}` : person.username,
                  }))} />
                {reviewers.isError ? <Alert showIcon type="error" title="Không đọc được danh sách người quyết định"
                  description={getErrorMessage(reviewers.error)} /> : null}
                <Text>Lý do và biện pháp kiểm soát</Text>
                <Input.TextArea aria-label="Lý do xem xét đình chỉ" maxLength={2000} rows={3}
                  value={reason} onChange={(event) => setReason(event.target.value)} />
                <Text>Tham chiếu bằng chứng hành động khắc phục</Text>
                <Input aria-label="Tham chiếu bằng chứng khắc phục" maxLength={1000}
                  value={correctiveEvidence} onChange={(event) => setCorrectiveEvidence(event.target.value)}
                  placeholder="Ví dụ: mã hồ sơ CAP / tài liệu đã kiểm soát" />
                <Button type="primary" loading={saving}
                  disabled={!reviewerId || !/^[0-9a-f-]{36}$/i.test(f11Id.trim()) ||
                    reason.trim().length < 20 || correctiveEvidence.trim().length < 8}
                  onClick={() => void sendRequest()}>
                  Gửi đề nghị thẩm xét độc lập
                </Button>
              </Space>
            </Card>
          ) : null}

          {canDecide && pending.length ? pending.map((item) => (
            <Card size="small" key={item.id} title="Quyết định xem xét đình chỉ độc lập">
              <Space orientation="vertical" size="small" style={{ width: "100%" }}>
                <Text>{choices.find((choice) => choice.value === item.evidence?.action)?.label}</Text>
                <Text>F.11: {item.evidence?.technical_review_id}</Text>
                <Text>Lý do: {item.evidence?.reason}</Text>
                <Text>Bằng chứng: {item.evidence?.corrective_evidence}</Text>
                <Input.TextArea aria-label="Căn cứ quyết định đình chỉ độc lập" rows={3} maxLength={2000}
                  value={decisionNote[item.id] ?? ""}
                  onChange={(event) => setDecisionNote((prev) => ({ ...prev, [item.id]: event.target.value }))} />
                <Space wrap>
                  <Button type="primary" loading={saving}
                    disabled={(decisionNote[item.id] ?? "").trim().length < 20}
                    onClick={() => void sendDecision(item, "approved")}>Chấp thuận đề nghị</Button>
                  <Button danger loading={saving}
                    disabled={(decisionNote[item.id] ?? "").trim().length < 20}
                    onClick={() => void sendDecision(item, "rejected")}>Từ chối</Button>
                </Space>
              </Space>
            </Card>
          )) : null}
          <Alert showIcon type="info" title="Thẩm xét hồ sơ không tự làm thay đổi chứng chỉ"
            description="Phê duyệt gia hạn hoặc kiến nghị khôi phục/thu hồi/thu hẹp chỉ là một cổng nghiệp vụ. Quyết định F.13 đã được ban hành và kiểm soát độc lập mới được thay đổi trạng thái hoặc phạm vi chứng nhận."
            action={projectId && onOpenPath ? (
              <Button size="small" onClick={() => onOpenPath(`/certifications/${projectId}`)}>Mở hồ sơ F.11/F.13</Button>
            ) : undefined} />
        </Space>
      ) : !recordQuery.isLoading && !recordQuery.isError ? <Empty description="Không có hồ sơ đình chỉ" /> : null}
    </section>
  );
}
