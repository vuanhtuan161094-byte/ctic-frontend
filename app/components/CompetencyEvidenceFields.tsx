"use client";

import { DatePicker, Form, Input, InputNumber, Select, Typography } from "antd";
import type { FormInstance } from "antd";

const { Text } = Typography;

export const competencyEvidenceTypeOptions = [
  { value: "TRAINING_CERTIFICATE", label: "Đào tạo / chứng chỉ" },
  { value: "AUDIT_LOG", label: "Nhật ký / kinh nghiệm đánh giá" },
  { value: "WORK_EXPERIENCE", label: "Kinh nghiệm công việc" },
  { value: "WITNESS_ASSESSMENT", label: "Đánh giá chứng kiến" },
  { value: "INTERVIEW_TEST", label: "Phỏng vấn / kiểm tra" },
  { value: "CUSTOMER_FEEDBACK", label: "Phản hồi khách hàng" },
  { value: "AUDIT_REPORT_REVIEW", label: "Xem xét báo cáo đánh giá" },
  { value: "OTHER", label: "Bằng chứng khác" },
];

type EvidenceConfig = {
  referenceLabel?: string;
  dateLabel?: string;
  validUntilLabel?: string;
  resultLabel?: string;
  showScore?: boolean;
  showMandays?: boolean;
  descriptionLabel?: string;
  descriptionPlaceholder?: string;
};

const evidenceConfig: Record<string, EvidenceConfig> = {
  TRAINING_CERTIFICATE: {
    referenceLabel: "Số chứng chỉ / số hồ sơ",
    dateLabel: "Ngày cấp",
    validUntilLabel: "Có giá trị đến",
    descriptionLabel: "Ghi chú",
  },
  AUDIT_LOG: {
    dateLabel: "Ngày / kỳ đánh giá",
    showMandays: true,
    descriptionLabel: "Cuộc đánh giá liên quan",
    descriptionPlaceholder: "Khách hàng, loại đánh giá hoặc nội dung liên quan (nếu cần)",
  },
  WORK_EXPERIENCE: {
    dateLabel: "Ngày xác nhận",
    descriptionLabel: "Kinh nghiệm liên quan",
    descriptionPlaceholder: "Đơn vị, vị trí hoặc nội dung kinh nghiệm cần làm rõ (nếu cần)",
  },
  WITNESS_ASSESSMENT: {
    dateLabel: "Ngày đánh giá",
    resultLabel: "Kết quả",
    showScore: true,
    descriptionLabel: "Nhận xét",
  },
  INTERVIEW_TEST: {
    dateLabel: "Ngày thực hiện",
    resultLabel: "Kết quả",
    showScore: true,
    descriptionLabel: "Ghi chú",
  },
  CUSTOMER_FEEDBACK: {
    dateLabel: "Ngày phản hồi",
    resultLabel: "Kết quả / mức đánh giá",
    descriptionLabel: "Nội dung ngắn",
  },
  AUDIT_REPORT_REVIEW: {
    dateLabel: "Ngày xem xét",
    resultLabel: "Kết quả",
    descriptionLabel: "Ghi chú",
  },
  OTHER: {
    dateLabel: "Ngày bằng chứng",
    descriptionLabel: "Mô tả ngắn",
  },
};

const fieldsClearedOnTypeChange = {
  reference_no: undefined,
  valid_until: undefined,
  result: undefined,
  score: undefined,
  mandays: undefined,
};

interface CompetencyEvidenceFieldsProps {
  form: FormInstance;
  file?: File | null;
  onFileChange?: (file: File | null) => void;
}

export function CompetencyEvidenceFields({
  form,
  file,
  onFileChange,
}: CompetencyEvidenceFieldsProps) {
  const evidenceType = Form.useWatch("evidence_type", form) || "OTHER";
  const config = evidenceConfig[evidenceType] ?? evidenceConfig.OTHER;

  return (
    <>
      <div className="competency-form-grid">
        <Form.Item label="Loại bằng chứng" name="evidence_type" rules={[{ required: true }]}>
          <Select
            options={competencyEvidenceTypeOptions}
            onChange={(value) => {
              form.setFieldsValue({ ...fieldsClearedOnTypeChange, evidence_type: value });
            }}
          />
        </Form.Item>
        <Form.Item label="Tên bằng chứng" name="title" rules={[{ required: true, message: "Nhập tên bằng chứng" }]}>
          <Input placeholder="Tên tài liệu hoặc nội dung nhận biết ngắn gọn" />
        </Form.Item>
        {config.referenceLabel ? (
          <Form.Item label={config.referenceLabel} name="reference_no">
            <Input />
          </Form.Item>
        ) : null}
        {config.dateLabel ? (
          <Form.Item label={config.dateLabel} name="evidence_date">
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        ) : null}
        {config.validUntilLabel ? (
          <Form.Item label={config.validUntilLabel} name="valid_until">
            <DatePicker format="DD/MM/YYYY" style={{ width: "100%" }} />
          </Form.Item>
        ) : null}
        {config.resultLabel ? (
          <Form.Item label={config.resultLabel} name="result">
            <Input placeholder="Ví dụ: Đạt, Hoàn thành, Tốt..." />
          </Form.Item>
        ) : null}
        {config.showScore ? (
          <Form.Item label="Điểm (nếu có)" name="score">
            <InputNumber min={0} max={100} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        ) : null}
        {config.showMandays ? (
          <Form.Item label="Ngày công đánh giá" name="mandays">
            <InputNumber min={0} precision={2} style={{ width: "100%" }} />
          </Form.Item>
        ) : null}
      </div>

      {config.descriptionLabel ? (
        <Form.Item label={`${config.descriptionLabel} (không bắt buộc)`} name="description">
          <Input.TextArea rows={2} placeholder={config.descriptionPlaceholder} />
        </Form.Item>
      ) : null}

      {onFileChange ? (
        <Form.Item label="Tệp minh chứng">
          <input
            accept=".pdf,.doc,.docx,.png,.jpg,.jpeg"
            onChange={(event) => onFileChange(event.target.files?.[0] ?? null)}
            type="file"
          />
          <div className="competency-upload-note">
            {file ? file.name : "Có thể mở trực tiếp tệp này khi xem hồ sơ. Không cần nhập lại nội dung đã có trong tài liệu."}
          </div>
        </Form.Item>
      ) : null}
      <Text type="secondary">
        Chỉ nhập thông tin cần để nhận biết và tra cứu; nội dung chi tiết xem trực tiếp trong tệp minh chứng.
      </Text>
    </>
  );
}
