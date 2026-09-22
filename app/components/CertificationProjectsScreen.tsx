"use client";

import {
  CheckCircleOutlined,
  DeleteOutlined,
  EditOutlined,
  EyeOutlined,
  ClockCircleOutlined,
  FileSearchOutlined,
  FolderOpenOutlined,
  PaperClipOutlined,
  PlusOutlined,
  UploadOutlined,
  SearchOutlined,
  WarningOutlined,
} from "@ant-design/icons";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { TableColumnsType, UploadFile } from "antd";
import {
  Alert,
  Button,
  Card,
  Checkbox,
  Collapse,
  ConfigProvider,
  DatePicker,
  Descriptions,
  Divider,
  Empty,
  Form,
  Input,
  InputNumber,
  Modal,
  Radio,
  Result,
  Select,
  Skeleton,
  Space,
  Steps,
  Table,
  Tag,
  Typography,
  Upload,
  message,
} from "antd";
import dayjs, { type Dayjs } from "dayjs";
import { useCallback, useDeferredValue, useEffect, useMemo, useRef, useState, type ReactNode } from "react";

import { api, getErrorMessage, SESSION_STORAGE_KEY, type AuthSession } from "../lib/api";
import { downloadDocumentFile, isBrowserPreviewableDocument, openDocumentFile } from "../lib/document-file-client";
import { PLATFORM_BRANDING } from "../lib/platform-branding";
import { invalidatePersonalWorkflowQueries } from "../lib/workspace-query-cache";

const { Text, Title } = Typography;
const { TextArea } = Input;

interface ProjectCustomer {
  id: string;
  customer_code: string;
  company_name: string;
  country_code?: string | null;
  tax_code?: string | null;
  address?: string | null;
  phone?: string | null;
  email?: string | null;
  status?: string | null;
}

interface ApplicationDocumentFile {
  id: string;
  document_type: string;
  original_name: string;
  mime_type?: string | null;
  download_url: string;
  note?: string | null;
  version_no?: number | null;
}

interface ApplicationSite {
  id?: string;
  site_no: number;
  site_name?: string | null;
  address: string;
  activities?: string | null;
  employee_count?: number | null;
  is_headquarters?: boolean;
}

interface ProjectApplication {
  id: string;
  customer_id: string;
  application_code: string;
  application_date?: string | null;
  certification_type?: string | null;
  other_certification_type?: string | null;
  standard_name: string;
  certification_scope?: string | null;
  excluded_clauses?: string | null;
  company_name_en?: string | null;
  headquarters_address?: string | null;
  representative_name?: string | null;
  representative_position?: string | null;
  representative_phone?: string | null;
  representative_fax?: string | null;
  representative_email?: string | null;
  contact_name?: string | null;
  contact_position?: string | null;
  contact_phone?: string | null;
  contact_fax?: string | null;
  contact_email?: string | null;
  site_count?: number | null;
  total_employee_count?: number | null;
  employee_count?: number | null;
  shift_count?: number | null;
  shift1_count?: number | null;
  shift2_count?: number | null;
  shift3_count?: number | null;
  external_provider_used?: boolean | null;
  outsourced_processes?: string | null;
  stage1_requested_date?: string | null;
  stage2_requested_date?: string | null;
  other_management_systems?: boolean | null;
  management_system_details?: string | null;
  associated_documents?: string | null;
  consultant_organization?: string | null;
  consultant_name?: string | null;
  certificate_languages?: string | null;
  other_requests?: string | null;
  declaration_accepted?: boolean;
  status: string;
  created_at?: string;
  updated_at?: string;
  customers?: ProjectCustomer | null;
  sites?: ApplicationSite[];
  certification_projects?: Array<{ id: string; project_code: string; status?: string | null }>;
  application_reviews?: Array<{
    id: string;
    result: string;
    review_date?: string | null;
    review_items_json?: string | null;
    comment?: string | null;
    conclusion?: string | null;
    client_code?: string | null;
    manday_method?: string | null;
    risk_level?: string | null;
    ems_complexity?: string | null;
    ohsms_complexity?: string | null;
    base_mandays?: number | string | null;
    increase_factors?: string | null;
    increase_percent?: number | string | null;
    reduction_factors?: string | null;
    reduction_percent?: number | string | null;
    final_mandays?: number | string | null;
    stage1_mandays?: number | string | null;
    stage2_mandays?: number | string | null;
    surveillance_mandays?: number | string | null;
    recertification_mandays?: number | string | null;
    stage1_proposed_date?: string | null;
    stage2_proposed_date?: string | null;
    surveillance1_date?: string | null;
    surveillance2_date?: string | null;
    recertification_date?: string | null;
    proposed_auditor_id?: string | null;
    proposed_auditors_json?: string | null;
    industry_scopes_json?: string | null;
    iaf_code?: string | null;
    isic_code?: string | null;
    audit_field?: string | null;
    ims_integration_criteria_json?: string | null;
    effective_personnel?: number | null;
    ims_integration_percent?: number | string | null;
    combined_audit_capability_percent?: number | string | null;
    integration_reduction_percent?: number | string | null;
    approved_by_name?: string | null;
    workflow_status?: string | null;
    prepared_by_id?: string | null;
    reviewer_id?: string | null;
    submitted_at?: string | null;
    approved_at?: string | null;
    returned_at?: string | null;
    approver_comment?: string | null;
    prepared_by?: ReviewAssignee | null;
    users?: ReviewAssignee | null;
    workflow_actions?: Array<{
      id: string;
      action: string;
      from_status?: string | null;
      to_status: string;
      comment?: string | null;
      created_at: string;
      actor?: ReviewAssignee | null;
    }>;
    created_at?: string;
  }>;
}

interface ReviewAssignee {
  id: string;
  username: string;
  full_name?: string | null;
  email?: string | null;
  roles?: string[];
}

interface ReviewAssigneeResponse {
  reviewers: ReviewAssignee[];
}

interface CertificationBodyCapabilityEvaluation {
  review_id: string;
  evaluated_at: string;
  overall_result: "CAPABLE" | "REVIEW_REQUIRED" | "NOT_CAPABLE";
  items: Array<{
    program_code: string;
    program_name: string;
    iaf_code: string | null;
    result: "CAPABLE" | "REVIEW_REQUIRED" | "NOT_CAPABLE";
    reason: string;
  }>;
}

interface ProjectContract {
  id: string;
  customer_id: string;
  contract_number: string;
  sign_date: string | null;
  start_date?: string | null;
  end_date?: string | null;
  total_value?: number | string | null;
  currency?: string | null;
}

interface ProjectAgreement {
  id: string;
  customer_id: string;
  contract_id?: string | null;
  agreement_number: string;
  sign_date: string | null;
}

interface CertificationProject {
  id: string;
  application_id: string;
  contract_id: string | null;
  agreement_id: string | null;
  project_code: string;
  standard_name: string;
  status: string;
  created_at: string;
  updated_at: string;
  certification_applications?: ProjectApplication | null;
  contracts?: ProjectContract | null;
  certification_agreements?: ProjectAgreement | null;
}

type CertificationWorkspaceRow = CertificationProject | ProjectApplication;

interface ExpertCompetencyOption {
  approval_status: string;
  expiry_date?: string | null;
  management_system?: string | null;
  standard_code?: string | null;
  iaf_code?: string | null;
  nace_code?: string | null;
}

interface ExpertOption {
  id: string;
  employee_code?: string | null;
  full_name: string;
  email?: string | null;
  status?: string | null;
  profile_status?: string | null;
  competencies?: ExpertCompetencyOption[];
}

interface IndustryCodeOption {
  id: string;
  classification_type: string;
  revision: string;
  code: string;
  title_en: string;
  title_vi?: string | null;
  is_active?: boolean;
}

interface OperationalStandardEdition {
  id: string;
  scheme_id: string;
  standard_code: string;
  standard_name: string;
  edition: string;
  effective_from: string;
  scheme: {
    id: string;
    code: string;
    name: string;
  };
}

interface IndustryScopeSelection {
  isic_code_id: string;
  isic_code: string;
  isic_revision: string;
  isic_title: string;
  isic_nace_mapping_id: string;
  nace_code_id: string;
  nace_code: string;
  nace_title: string;
  nace_iaf_mapping_id: string;
  iaf_code: string;
  iaf_name: string;
  management_system: "QMS" | "EMS" | "OHSMS";
  scope_description: string;
  is_primary?: boolean;
}

interface IndustryResolveResponse {
  source: IndustryCodeOption;
  management_system: "QMS" | "EMS" | "OHSMS";
  nace_candidates: Array<{
    mapping_id: string;
    mapping_type: string;
    nace: IndustryCodeOption;
    iaf_candidates: Array<{
      mapping_id: string;
      iaf_code: string;
      iaf_name: string;
      source_document?: string | null;
    }>;
  }>;
  requires_selection?: boolean;
}

interface IndustryResolutionRow {
  key: string;
  response: IndustryResolveResponse;
  selected_nace_mapping_id?: string;
  selected_iaf_mapping_id?: string;
  scope_description: string;
}

interface MandayReferenceRow {
  minimum: number;
  maximum: number;
  personnel_label: string;
  mandays?: number;
  high?: number;
  medium?: number;
  low?: number;
  limited?: number;
}

interface MandayReferenceTables {
  qms: MandayReferenceRow[];
  ems: MandayReferenceRow[];
  ohsms: MandayReferenceRow[];
  ims: {
    integration_levels: number[];
    capability_levels: number[];
    matrix: Record<string, number[]>;
  };
  multi_site: {
    initial: string;
    surveillance: string;
    recertification: string;
    non_sampling_surveillance: string;
  };
  rules: {
    base_rounding: string;
    stage_split: string;
    reduction_limit_percent: number;
    increase_recommended_limit_percent: number;
    increase_hard_limit_percent: number | null;
    ims_reduction_limit_percent: number;
  };
  sources: string[];
}

interface MandayStandardResult {
  standard: string;
  family: "QMS" | "EMS" | "OHSMS";
  complexity?: string;
  mandays: number;
}

interface MandaySiteResult {
  site_name: string;
  is_central: boolean;
  effective_personnel: number;
  standards: MandayStandardResult[];
  raw_mandays: number;
  sampled_site_reduction_percent: number;
  mandays_after_site_reduction: number;
}

interface MandayEngineSuggestion {
  method?: "IAF_MD5" | "IAF_MD11";
  base_mandays: number;
  starting_point_raw?: number;
  rounding_rule?: string;
  final_initial_mandays: number;
  stage1_mandays: number;
  stage2_mandays: number;
  surveillance_mandays: number;
  recertification_mandays: number;
  warnings?: string[];
  calculated_ims_reduction_percent?: number;
  ims_reduction_percent?: number;
  ims_integration_percent?: number;
  combined_audit_capability_percent?: number;
  site_calculation?: {
    total_sites: number;
    total_audited_sites: number;
    per_site?: MandaySiteResult[];
  };
}

interface ApplicationSiteForm {
  site_no?: number;
  site_name?: string;
  address?: string;
  activities?: string;
  employee_count?: number;
  is_headquarters?: boolean;
}

interface ReviewItemForm {
  item_code: string;
  content_vi: string;
  content_en?: string;
  result: "YES" | "NO" | "NA";
  comment?: string;
}

interface MandayAdjustmentForm {
  adjustment_type: "increase" | "reduction" | "ims_reduction";
  factor_code?: string;
  percentage?: number;
  reason?: string;
}

interface CreationValidationIssue {
  name: Array<string | number>;
  message: string;
  step: number;
  label: string;
}

interface ProjectCreationValues {
  application_mode: "new" | "existing";
  existing_application_id?: string;
  customer_id?: string;
  application_code?: string;
  application_date?: Dayjs;
  company_name_en?: string;
  headquarters_address?: string;
  representative_name?: string;
  representative_position?: string;
  representative_phone?: string;
  representative_fax?: string;
  representative_email?: string;
  contact_name?: string;
  contact_position?: string;
  contact_phone?: string;
  contact_fax?: string;
  contact_email?: string;
  certification_type?: string;
  other_certification_type?: string;
  standard_names?: string[];
  excluded_clauses?: string;
  certification_scope?: string;
  external_provider_used?: boolean;
  outsourced_processes?: string;
  total_employee_count?: number;
  employee_count?: number;
  shift1_count?: number;
  shift2_count?: number;
  shift3_count?: number;
  sites?: ApplicationSiteForm[];
  stage1_requested_date?: Dayjs;
  stage2_requested_date?: Dayjs;
  other_management_systems?: boolean;
  management_system_details?: string;
  associated_documents?: string[];
  consultant_organization?: string;
  consultant_name?: string;
  certificate_languages?: string[];
  other_requests?: string;
  declaration_accepted?: boolean;
  review_items?: ReviewItemForm[];
  review_result?: "ACCEPTED" | "REJECTED" | "NEED_MORE_INFO";
  review_comment?: string;
  audit_field?: string;
  iaf_code?: string;
  isic_code?: string;
  industry_scopes?: IndustryScopeSelection[];
  proposed_auditor_id?: string;
  proposed_auditor_ids?: string[];
  ims_integration_criteria?: string[];
  ims_integration_percent?: number;
  combined_audit_capability_percent?: number;
  risk_level?: string;
  ems_complexity?: "HIGH" | "MEDIUM" | "LOW" | "LIMITED";
  ohsms_complexity?: "HIGH" | "MEDIUM" | "LOW";
  manday_method?: "IAF_MD5" | "IAF_MD11" | "OTHER";
  base_mandays?: number;
  increase_factors?: string;
  increase_percent?: number;
  reduction_factors?: string;
  reduction_percent?: number;
  integration_reduction_percent?: number;
  manday_adjustments?: MandayAdjustmentForm[];
  final_mandays?: number;
  stage1_mandays?: number;
  stage2_mandays?: number;
  surveillance_mandays?: number;
  recertification_mandays?: number;
  stage1_proposed_date?: Dayjs;
  stage2_proposed_date?: Dayjs;
  surveillance1_date?: Dayjs;
  surveillance2_date?: Dayjs;
  recertification_date?: Dayjs;
  conclusion?: string;
  client_code?: string;
  approved_by_name?: string;
  reviewer_id?: string;
  workflow_comment?: string;
  contract_mode: "new" | "existing" | "none";
  existing_contract_id?: string;
  contract_number?: string;
  contract_sign_date?: Dayjs;
  contract_start_date?: Dayjs;
  contract_end_date?: Dayjs;
  contract_total_value?: number;
  contract_currency?: string;
  contract_file_kind?: "attachment" | "signed_scan";
  contract_file_list?: UploadFile[];
  agreement_mode: "new" | "existing" | "none";
  existing_agreement_id?: string;
  agreement_number?: string;
  agreement_sign_date?: Dayjs;
  agreement_file_kind?: "attachment" | "signed_scan";
  agreement_file_list?: UploadFile[];
  project_code?: string;
}

interface CertificationProjectsScreenProps {
  onOpenProject: (projectId: string) => void;
  mode?: "projects" | "applications";
  initialReviewId?: string | null;
}

const statusLabels: Record<string, string> = {
  draft: "Bản nháp",
  submitted: "Đã gửi",
  under_review: "Chờ reviewer",
  pending_check: "Chờ kiểm tra kỹ thuật",
  pending_approval: "Chờ phê duyệt",
  returned_to_preparer: "Trả người lập",
  returned_to_checker: "Trả người kiểm tra",
  need_more_info: "Yêu cầu bổ sung",
  accepted: "Đã chấp nhận",
  rejected: "Không chấp nhận",
  in_progress: "Đang thực hiện",
  pending: "Chờ xử lý",
  pending_technical_review: "Chờ thẩm xét",
  technical_review_completed: "Đã thẩm xét",
  corrective_action_required: "Chờ khắc phục NC",
  certificate_issued: "Đã cấp chứng chỉ",
  completed: "Hoàn thành",
  closed: "Đã đóng",
  cancelled: "Đã hủy",
};

const statusColors: Record<string, string> = {
  draft: "default",
  submitted: "blue",
  under_review: "processing",
  pending_check: "gold",
  pending_approval: "purple",
  returned_to_preparer: "orange",
  returned_to_checker: "orange",
  need_more_info: "orange",
  accepted: "green",
  rejected: "red",
  in_progress: "processing",
  pending: "gold",
  pending_technical_review: "cyan",
  technical_review_completed: "green",
  corrective_action_required: "orange",
  certificate_issued: "blue",
  completed: "green",
  closed: "default",
  cancelled: "red",
};

const applicationWizardSteps = [
  { title: "Đăng ký" },
  { title: "Xem xét" },
];

const projectWizardSteps = [
  { title: "Chọn đơn" },
  { title: "Hợp đồng" },
  { title: "Khởi tạo" },
];

const imsIntegrationCriteriaOptions = [
  { value: "INTEGRATED_DOCUMENTATION", label: "Hệ thống tài liệu được thiết lập tích hợp" },
  { value: "INTEGRATED_MANAGEMENT_REVIEW", label: "Xem xét của lãnh đạo bao quát chiến lược và kế hoạch kinh doanh" },
  { value: "INTEGRATED_INTERNAL_AUDIT", label: "Đánh giá nội bộ được thực hiện theo cách tiếp cận tích hợp" },
  { value: "INTEGRATED_POLICY_OBJECTIVES", label: "Chính sách và mục tiêu được xây dựng theo cách tiếp cận tích hợp" },
  { value: "INTEGRATED_PROCESSES", label: "Các quá trình của hệ thống quản lý được tích hợp" },
  { value: "INTEGRATED_IMPROVEMENT", label: "Cơ chế khắc phục, đo lường và cải tiến được tích hợp" },
  { value: "INTEGRATED_RESPONSIBILITIES", label: "Trách nhiệm quản lý và hỗ trợ được phân công thống nhất" },
];

const commonDocumentOptions = [
  "Hồ sơ pháp lý của tổ chức",
  "Chính sách và mục tiêu hệ thống quản lý",
  "Bộ tài liệu hệ thống quản lý và danh mục tài liệu áp dụng",
  "Sơ đồ tổ chức",
  "Sơ đồ nhà máy/nhà xưởng",
  "Danh mục dây chuyền, máy móc thiết bị",
  "Lưu đồ sản xuất/cung cấp dịch vụ theo phạm vi đăng ký",
  "Hồ sơ đánh giá nội bộ và xem xét của lãnh đạo",
];

const iso9001DocumentOptions = [
  "ISO 9001 · Giấy phép/chứng chỉ hoạt động ngành nghề có điều kiện",
  "ISO 9001 · Danh mục thiết bị đo lường",
];

const iso14001DocumentOptions = [
  "ISO 14001 · Giấy phép môi trường/đăng ký môi trường/ĐTM",
  "ISO 14001 · Hồ sơ phòng cháy chữa cháy",
  "ISO 14001 · Hồ sơ xác định khía cạnh môi trường có ý nghĩa",
  "ISO 14001 · Quan trắc môi trường và giấy phép xả thải",
  "ISO 14001 · Chứng từ thu gom, xử lý chất thải nguy hại gần nhất",
];

function getAssociatedDocumentOptions(
  certificationType?: string,
  standards: string[] = [],
) {
  const options = [...commonDocumentOptions];
  const normalizedStandards = standards.map((value) => value.toUpperCase());

  if (normalizedStandards.some((value) => value.includes("9001"))) {
    options.push(...iso9001DocumentOptions);
  }

  if (normalizedStandards.some((value) => value.includes("14001"))) {
    options.push(...iso14001DocumentOptions);
  }

  if (certificationType === "TRANSFER") {
    options.unshift("Chứng chỉ hệ thống quản lý hiện tại còn hiệu lực");
    options.push("Báo cáo đánh giá gần nhất của tổ chức chứng nhận chuyển giao");
    options.push("Tình trạng NC/CAP còn mở của chu kỳ chứng nhận hiện tại");
  }

  if (certificationType === "EXPANSION") {
    options.push("Hồ sơ chứng minh/liên quan trực tiếp đến phạm vi mở rộng");
    options.push("Đánh giá nội bộ và xem xét lãnh đạo đối với phạm vi mở rộng");
  }

  if (certificationType === "RECERTIFICATION") {
    options.push("Tổng hợp kết quả hoạt động của toàn bộ chu kỳ chứng nhận");
    options.push("Kết quả xử lý các phát hiện của các lần đánh giá trước");
  }

  return Array.from(new Set(options));
}

const defaultReviewItems: ReviewItemForm[] = [
  {
    item_code: "REGISTRATION_CLEAR",
    content_vi: "Phiếu đăng ký cung cấp đủ thông tin, rõ ràng",
    content_en: "The registration form provides sufficient and clear information",
    result: "YES",
  },
  {
    item_code: "DOCUMENTS_COMPLETE",
    content_vi: "Khách hàng cung cấp đủ các tài liệu kèm theo đăng ký chứng nhận",
    content_en: "The customer provides all documents attached to the certification registration",
    result: "YES",
  },
  {
    item_code: "AUDIT_ADDRESS_CONFIRMED",
    content_vi: "Địa điểm đánh giá, hoạt động và nhân sự tại từng địa điểm đã được xác định",
    content_en: "Audit addresses, activities and personnel at each site have been identified",
    result: "YES",
  },
  {
    item_code: "AUDIT_FIELD_CONFIRMED",
    content_vi: "Lĩnh vực đánh giá, mã IAF và mã ISIC đã được xác định",
    content_en: "Audit field, IAF code and ISIC code have been identified",
    result: "YES",
  },
  {
    item_code: "PROGRAMME_SCOPE_CONFIRMED",
    content_vi: "Chuẩn mực và phạm vi đăng ký thuộc chương trình mà tổ chức chứng nhận có khả năng cung cấp",
    content_en: "The requested standard and scope are within the certification body capability",
    result: "YES",
  },
  {
    item_code: "CERTIFICATION_TYPE_CONFIRMED",
    content_vi: "Loại hình chứng nhận và thông tin chu kỳ/chứng chỉ trước đó đã được xác định",
    content_en: "Certification type and previous certification-cycle information have been determined",
    result: "YES",
  },
  {
    item_code: "PERSONNEL_AND_SITES_CONFIRMED",
    content_vi: "Nhân sự hiệu dụng, ca làm việc và điều kiện nhiều địa điểm đã được xem xét",
    content_en: "Effective personnel, shifts and multi-site conditions have been reviewed",
    result: "YES",
  },
  {
    item_code: "OUTSOURCING_CONFIRMED",
    content_vi: "Các quá trình thuê ngoài và nguồn bên ngoài ảnh hưởng đến sự phù hợp đã được xem xét",
    content_en: "Outsourced processes and relevant external providers have been reviewed",
    result: "YES",
  },
  {
    item_code: "CB_CAPABILITY_CONFIRMED",
    content_vi: "Năng lực của tổ chức chứng nhận đã được đối chiếu theo chương trình và mã IAF",
    content_en: "Certification body capability has been checked against the programme and IAF scope",
    result: "YES",
  },
  {
    item_code: "IMPARTIALITY_CONFIRMED",
    content_vi: "Đã xem xét tính khách quan, hoạt động tư vấn và xung đột lợi ích",
    content_en: "Impartiality, consultancy and conflict-of-interest risks have been reviewed",
    result: "YES",
  },
  {
    item_code: "RESOURCE_AND_DATE_CONFIRMED",
    content_vi: "Nguồn lực và thời gian đánh giá dự kiến có khả năng đáp ứng",
    content_en: "Resources and proposed audit dates can be accommodated",
    result: "YES",
  },
  {
    item_code: "MANDAY_CONFIRMED",
    content_vi: "Ngày công đánh giá đã được tính toán, điều chỉnh và giải trình",
    content_en: "Audit man-days have been calculated, adjusted and justified",
    result: "YES",
  },
];

const increaseMandayFactorOptions = [
  { value: "MULTI_SITE", label: "Nhiều địa điểm riêng biệt hoặc phạm vi phân tán" },
  { value: "MULTILINGUAL", label: "Nhân sự sử dụng nhiều ngôn ngữ, cần phiên dịch" },
  { value: "LARGE_AREA", label: "Địa bàn rất rộng so với số nhân sự" },
  { value: "HIGH_LEGAL_REQUIREMENTS", label: "Yêu cầu pháp luật cao hoặc phức tạp" },
  { value: "HIGH_COMPLEXITY", label: "Nhiều quá trình phức tạp hoặc độc lập" },
  { value: "HIGH_RISK", label: "Ngành, sản phẩm hoặc hoạt động có rủi ro cao" },
  { value: "OUTSOURCED_PROCESS", label: "Có chức năng hoặc quá trình thuê ngoài quan trọng" },
  { value: "TEMPORARY_SITES", label: "Phải tiếp cận địa điểm tạm thời để xác nhận hoạt động" },
  { value: "COMPLEX_LOGISTICS", label: "Điều kiện đi lại hoặc hậu cần phức tạp" },
  { value: "OTHER_INCREASE", label: "Yếu tố tăng khác" },
];

const reductionMandayFactorOptions = [
  { value: "DESIGN_EXCLUSION", label: "Không áp dụng kiểm soát thiết kế hoặc điều khoản phù hợp (QMS)" },
  { value: "SAME_PROCESS_MAJORITY", label: "Trên 60% nhân sự cùng thực hiện một quá trình" },
  { value: "SIMPLE_PROCESS", label: "Quá trình công nghệ đơn giản hoặc tương đồng" },
  { value: "LOW_RISK", label: "Sản phẩm hoặc quá trình có nguy cơ thấp" },
  { value: "PREVIOUS_CERTIFICATION", label: "Đã được chứng nhận hệ thống quản lý khác phù hợp" },
  { value: "SMALL_SITE_HIGH_HEADCOUNT", label: "Địa bàn nhỏ nhưng có đông nhân sự" },
  { value: "SIMPLE_COMMON_ACTIVITY", label: "Các quá trình liên quan đến một hoạt động chung đơn giản" },
  { value: "MATURE_SYSTEM", label: "Hệ thống quản lý đã trưởng thành và ổn định" },
  { value: "HIGH_AUTOMATION", label: "Mức độ tự động hóa cao (không áp dụng ISO 45001)" },
  { value: "OTHER_REDUCTION", label: "Yếu tố giảm khác" },
];

const imsMandayFactorOptions = [
  { value: "IAF_MD11_MATRIX", label: "Ma trận IAF MD11: mức tích hợp và khả năng đánh giá kết hợp" },
];

function getMandayFactorOptions(
  adjustmentType?: MandayAdjustmentForm["adjustment_type"],
  integratedAudit = false,
) {
  if (adjustmentType === "reduction") return reductionMandayFactorOptions;
  if (adjustmentType === "ims_reduction") return integratedAudit ? imsMandayFactorOptions : [];
  return increaseMandayFactorOptions;
}

const certificationTypeLabels: Record<string, string> = {
  INITIAL: "Chứng nhận lần đầu",
  EXPANSION: "Mở rộng chứng nhận",
  TRANSFER: "Chứng nhận chuyển đổi",
  RECERTIFICATION: "Tái chứng nhận",
  SPECIAL: "Đánh giá đặc biệt",
  OTHER: "Khác",
};

const creationFieldLabels: Record<string, string> = {
  customer_id: "Khách hàng",
  application_code: "Mã đơn đăng ký",
  application_date: "Ngày đăng ký",
  certification_type: "Loại hình chứng nhận",
  other_certification_type: "Loại chứng nhận khác",
  standard_names: "Chuẩn mực chứng nhận",
  certification_scope: "Phạm vi chứng nhận",
  headquarters_address: "Địa chỉ trụ sở",
  representative_name: "Người đại diện",
  contact_name: "Người liên hệ",
  total_employee_count: "Tổng số nhân sự",
  employee_count: "Nhân sự hiệu dụng",
  sites: "Địa điểm chứng nhận",
  declaration_accepted: "Cam kết của tổ chức",
  existing_application_id: "Đơn đăng ký đã chấp nhận",
  review_items: "Nội dung xem xét",
  review_result: "Kết quả xem xét",
  audit_field: "Lĩnh vực đánh giá",
  iaf_code: "Mã IAF",
  isic_code: "Mã ISIC",
  manday_method: "Phương pháp tính ngày công",
  base_mandays: "Ngày công cơ sở",
  final_mandays: "Ngày công lần đầu",
  stage1_mandays: "Ngày công giai đoạn 1",
  stage2_mandays: "Ngày công giai đoạn 2",
  conclusion: "Kết luận xem xét",
  approved_by_name: "Người duyệt",
  reviewer_id: "Reviewer",
  existing_contract_id: "Hợp đồng đã có",
  contract_number: "Số hợp đồng",
  contract_sign_date: "Ngày ký hợp đồng",
  contract_start_date: "Ngày hiệu lực hợp đồng",
  existing_agreement_id: "Thỏa thuận đã có",
  agreement_number: "Số thỏa thuận",
  agreement_sign_date: "Ngày ký thỏa thuận",
  project_code: "Mã hồ sơ chứng nhận",
};

function roundToHalf(value: number) {
  return Math.max(0.5, Math.round((value + Number.EPSILON) * 2) / 2);
}

function round2(value: number) {
  return Math.round((value + Number.EPSILON) * 100) / 100;
}

function getMd5BaseMandays(personnel: number) {
  const table = [
    [5, 1.5], [10, 2], [15, 2.5], [25, 3], [45, 4], [65, 5], [85, 6],
    [125, 7], [175, 8], [275, 9], [425, 10], [625, 11], [875, 12],
    [1175, 13], [1550, 14], [2025, 15], [2675, 16], [3450, 17],
    [4350, 18], [5450, 19], [6800, 20], [8500, 21], [10700, 22],
  ] as const;

  for (const [maximum, mandays] of table) {
    if (personnel <= maximum) return mandays;
  }

  return 23 + Math.ceil((personnel - 10700) / 2500);
}

function calculateMandaySuggestion(
  effectivePersonnel: number,
  standardCount: number,
  _riskLevel?: string,
  increasePercent = 0,
  reductionPercent = 0,
  integrationReductionPercent = 0,
) {
  const baseSingle = getMd5BaseMandays(Math.max(1, effectivePersonnel));
  const rawStartingPoint = baseSingle * Math.max(1, standardCount);
  const base = roundToHalf(rawStartingPoint);
  const adjusted = roundToHalf(
    base *
    (1 + increasePercent / 100 - reductionPercent / 100) *
    (1 - integrationReductionPercent / 100),
  );
  const stage1 = Math.max(0.5, roundToHalf(adjusted * 0.2));
  const stage2 = Math.max(1, roundToHalf(adjusted - stage1));
  const final = round2(stage1 + stage2);

  return {
    base,
    final,
    stage1,
    stage2,
    surveillance: Math.max(1, roundToHalf(final / 3)),
    recertification: Math.max(1, roundToHalf(final * 2 / 3)),
  };
}

function standardFamilyKey(standard: string) {
  const normalized = standard.toUpperCase();
  if (normalized.includes("9001")) return "9001";
  if (normalized.includes("14001")) return "14001";
  if (normalized.includes("45001")) return "45001";
  return normalized.replace(/[^A-Z0-9]/g, "");
}

function expertCompetencyCount(expert: ExpertOption, standards: string[]) {
  const approvedCompetencies = (expert.competencies ?? []).filter((competency) => {
    if (competency.approval_status !== "APPROVED") return false;
    if (!competency.expiry_date) return true;
    return dayjs(competency.expiry_date).endOf("day").isAfter(dayjs());
  });

  return standards.filter((standard) => {
    const family = standardFamilyKey(standard);
    return approvedCompetencies.some((competency) => {
      const haystack = [competency.standard_code, competency.management_system]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      if (haystack.includes(family)) return true;
      if (family === "9001" && haystack.includes("QMS")) return true;
      if (family === "14001" && haystack.includes("EMS")) return true;
      if (family === "45001" && (haystack.includes("OHSMS") || haystack.includes("OH&SMS"))) return true;
      return false;
    });
  }).length;
}

function resolveApplicationEffectivePersonnel(application?: ProjectApplication | null) {
  if (!application) return 1;
  const effective = Number(application.employee_count ?? 0);
  if (Number.isFinite(effective) && effective >= 1) return effective;

  const total = Number(application.total_employee_count ?? 0);
  if (Number.isFinite(total) && total >= 1) return total;

  const shiftTotal = [application.shift1_count, application.shift2_count, application.shift3_count]
    .reduce<number>((sum, value) => sum + Number(value ?? 0), 0);
  return Math.max(1, shiftTotal);
}

function parseJsonStringArray(value?: string | null) {
  if (!value) return [] as string[];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed) ? parsed.filter((item): item is string => typeof item === "string") : [];
  } catch {
    return [];
  }
}

function parseIndustryScopes(value?: string | null): IndustryScopeSelection[] {
  if (!value) return [];
  try {
    const parsed = JSON.parse(value);
    return Array.isArray(parsed)
      ? parsed.filter((item) => item && item.isic_code && item.iaf_code)
      : [];
  } catch {
    return [];
  }
}


function parseMandayAdjustmentField(
  value: string | null | undefined,
  fallbackType: MandayAdjustmentForm["adjustment_type"],
): MandayAdjustmentForm[] {
  if (!value?.trim()) return [];

  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      return parsed
        .filter((item) => item && typeof item === "object")
        .map((item) => ({
          adjustment_type: (["increase", "reduction", "ims_reduction"].includes(String(item.adjustment_type))
            ? item.adjustment_type
            : fallbackType) as MandayAdjustmentForm["adjustment_type"],
          factor_code: String(item.factor_code ?? "").trim() || "Yếu tố khác",
          percentage: Number(item.percentage ?? 0),
          reason: String(item.reason ?? "").trim(),
        }))
        .filter((item) => Number.isFinite(item.percentage) && Number(item.percentage) > 0);
    }
  } catch {
    // Hỗ trợ dữ liệu cũ dạng "Mã: 10% - Căn cứ".
  }

  return value
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .flatMap((line): MandayAdjustmentForm[] => {
      const match = line.match(/^(.+?):\s*([0-9]+(?:[.,][0-9]+)?)%\s*-\s*(.+)$/);
      if (!match) return [];
      return [{
        adjustment_type: fallbackType,
        factor_code: match[1].trim(),
        percentage: Number(match[2].replace(",", ".")),
        reason: match[3].trim(),
      }];
    });
}

function parseSavedMandayAdjustments(
  review?: NonNullable<ProjectApplication["application_reviews"]>[number],
): MandayAdjustmentForm[] {
  if (!review) return [];
  const parsed = [
    ...parseMandayAdjustmentField(review.increase_factors, "increase"),
    ...parseMandayAdjustmentField(review.reduction_factors, "reduction"),
  ];

  return parsed.filter((item) => item.adjustment_type !== "ims_reduction");
}

function serializeMandayAdjustments(
  adjustments: MandayAdjustmentForm[],
  allowedTypes: MandayAdjustmentForm["adjustment_type"][],
) {
  const selected = adjustments.filter((item) => allowedTypes.includes(item.adjustment_type));
  return selected.length ? JSON.stringify(selected) : undefined;
}

function managementSystemsFromStandards(standards: string[]): Array<"QMS" | "EMS" | "OHSMS"> {
  const systems = standards
    .map((standard) => {
      const family = standardFamilyKey(standard);
      if (family === "9001") return "QMS" as const;
      if (family === "14001") return "EMS" as const;
      if (family === "45001") return "OHSMS" as const;
      return null;
    })
    .filter((item): item is "QMS" | "EMS" | "OHSMS" => item !== null);

  return Array.from(new Set(systems));
}

const managementSystemLabels: Record<"QMS" | "EMS" | "OHSMS", string> = {
  QMS: "ISO 9001 / QMS",
  EMS: "ISO 14001 / EMS",
  OHSMS: "ISO 45001 / OH&SMS",
};

function approvedActiveCompetencies(expert: ExpertOption) {
  return (expert.competencies ?? []).filter((competency) => {
    if (competency.approval_status !== "APPROVED") return false;
    if (!competency.expiry_date) return true;
    return dayjs(competency.expiry_date).endOf("day").isAfter(dayjs());
  });
}

function expertSupportedStandardLabels(expert: ExpertOption, standards: string[]) {
  return standards.filter((standard) => {
    const family = standardFamilyKey(standard);
    return approvedActiveCompetencies(expert).some((competency) => {
      const haystack = [competency.standard_code, competency.management_system]
        .filter(Boolean)
        .join(" ")
        .toUpperCase();
      if (haystack.includes(family)) return true;
      if (family === "9001" && haystack.includes("QMS")) return true;
      if (family === "14001" && haystack.includes("EMS")) return true;
      if (family === "45001" && (haystack.includes("OHSMS") || haystack.includes("OH&SMS"))) return true;
      return false;
    });
  });
}

const emsRiskReference = [
  { level: "HIGH", label: "Cao", sectors: "Khai thác mỏ; dầu khí; thuộc da; sản xuất bột giấy; lọc dầu; hóa chất và dược phẩm; sản xuất kim loại sơ cấp; gốm, xi măng; điện than; xây dựng và phá dỡ; xử lý chất thải; xử lý nước thải." },
  { level: "MEDIUM", label: "Trung bình", sectors: "Nông, lâm, ngư nghiệp; dệt may trừ thuộc da; sản xuất giấy và in; xử lý bề mặt kim loại; thiết bị vận tải; khí và cấp nước; chế biến thực phẩm; vận tải; tái chế chất thải không nguy hại; phòng thử nghiệm; y tế; vệ sinh công nghiệp." },
  { level: "LOW", label: "Thấp", sectors: "Khách sạn, nhà hàng; sản phẩm gỗ; sản phẩm giấy; ép phun, tạo hình và lắp ráp cao su/nhựa; tạo hình và gia công kim loại không xử lý hóa chất; lắp ráp cơ khí; bán buôn, bán lẻ; lắp ráp điện, điện tử." },
  { level: "LIMITED", label: "Giới hạn", sectors: "Hoạt động trụ sở và quản lý doanh nghiệp; dịch vụ quản lý vận tải không có đội xe; viễn thông; dịch vụ kinh doanh tổng hợp; giáo dục." },
] as const;

const ohsmsRiskReference = [
  { level: "HIGH", label: "Cao", sectors: "Đánh bắt ngoài khơi; khai khoáng; dầu khí; hóa chất, pin ắc quy và dược phẩm; điện và khí; vật liệu phi kim loại, bê tông, xi măng; kim loại sơ cấp; gia công kim loại nóng/lạnh; kết cấu kim loại; ô tô, hàng không; chất nổ; chất thải; xây dựng và phá dỡ; lò mổ; vận chuyển hàng nguy hiểm; y tế." },
  { level: "MEDIUM", label: "Trung bình", sectors: "Nông, lâm, ngư nghiệp; thực phẩm, đồ uống, thuốc lá; dệt may; gỗ; giấy; thủy tinh, gốm; lắp ráp cơ khí; sản phẩm kim loại; xử lý bề mặt; ép phun cao su/nhựa; lắp ráp điện, điện tử; thiết bị vận tải; vận chuyển hàng không nguy hiểm; phòng thử nghiệm; khách sạn; giáo dục." },
  { level: "LOW", label: "Thấp", sectors: "Hoạt động văn phòng và quản lý; bán buôn, bán lẻ thông thường; dịch vụ kinh doanh; quản lý vận tải không vận hành đội xe; dịch vụ kỹ thuật; viễn thông, bưu chính; nhà hàng; bất động sản; nghiên cứu xã hội; hành chính; tài chính, quảng cáo." },
] as const;

function normalizeApplicationSites(
  sites: ApplicationSiteForm[] | undefined,
  fallbackAddress?: string,
  fallbackActivities?: string,
  fallbackEmployeeCount?: number,
) {
  const normalized = (sites ?? [])
    .map((site, index) => ({
      ...site,
      site_no: index + 1,
      site_name: site.site_name?.trim() || undefined,
      address: site.address?.trim() || undefined,
      activities: site.activities?.trim() || undefined,
      employee_count: Number.isFinite(Number(site.employee_count))
        ? Number(site.employee_count)
        : undefined,
      is_headquarters: index === 0 || site.is_headquarters === true,
    }))
    .filter((site, index) => {
      if (index === 0) return true;
      return Boolean(
        site.address ||
        site.activities ||
        Number(site.employee_count ?? 0) > 0 ||
        (site.site_name && !/^Địa điểm \d+$/i.test(site.site_name)),
      );
    });

  if (!normalized.length) {
    normalized.push({
      site_no: 1,
      site_name: "Trụ sở chính",
      address: fallbackAddress?.trim() || undefined,
      activities: fallbackActivities?.trim() || undefined,
      employee_count: fallbackEmployeeCount,
      is_headquarters: true,
    });
  } else {
    normalized[0] = {
      ...normalized[0],
      site_no: 1,
      site_name: normalized[0].site_name || "Trụ sở chính",
      address: normalized[0].address || fallbackAddress?.trim() || undefined,
      activities: normalized[0].activities || fallbackActivities?.trim() || undefined,
      employee_count: normalized[0].employee_count ?? fallbackEmployeeCount,
      is_headquarters: true,
    };
  }

  // Một địa điểm: nhân sự tại trụ sở phải đồng bộ với nhân sự hiệu dụng
  // của đơn để tránh dò nhầm dòng 1-5 người trong bảng IAF.
  if (
    normalized.length === 1 &&
    Number.isFinite(Number(fallbackEmployeeCount)) &&
    Number(fallbackEmployeeCount) >= 1
  ) {
    normalized[0].employee_count = Number(fallbackEmployeeCount);
  }

  return normalized.map((site, index) => ({
    ...site,
    site_no: index + 1,
    is_headquarters: index === 0,
  }));
}

function normalizeStatus(value?: string | null) {
  return (value ?? "unknown").trim().toLowerCase();
}

function operationalStandardLabel(row: Pick<OperationalStandardEdition, "standard_code" | "edition">) {
  const code = row.standard_code.trim();
  const edition = row.edition.trim();
  return edition && !code.toUpperCase().includes(edition.toUpperCase())
    ? `${code}:${edition}`
    : code;
}

function formatDatePayload(value?: Dayjs) {
  return value?.isValid() ? value.format("YYYY-MM-DD") : undefined;
}

function formatMonthPayload(value?: Dayjs) {
  return value?.isValid() ? value.startOf("month").format("YYYY-MM-DD") : undefined;
}

function generateNextCode(prefix: string, values: Array<string | null | undefined>) {
  const year = dayjs().format("YYYY");
  const expression = new RegExp(`^${prefix}-${year}-(\\d+)$`, "i");
  const largest = values.reduce((current, value) => {
    const match = value?.trim().match(expression);
    return match ? Math.max(current, Number(match[1])) : current;
  }, 0);

  return `${prefix}-${year}-${String(largest + 1).padStart(4, "0")}`;
}

function ProjectStatusTag({ status }: { status: string }) {
  const normalized = normalizeStatus(status);
  const icon = ["certificate_issued", "completed", "closed"].includes(normalized)
    ? <CheckCircleOutlined />
    : normalized === "corrective_action_required"
      ? <WarningOutlined />
      : <ClockCircleOutlined />;

  return (
    <Tag color={statusColors[normalized] ?? "default"} icon={icon}>
      {statusLabels[normalized] ?? normalized.replaceAll("_", " ")}
    </Tag>
  );
}


function ApplicationEntrySection({
  sectionKey,
  title,
  activeSection,
  onActiveSection,
  children,
}: {
  sectionKey: string;
  title: string;
  activeSection: string | null;
  onActiveSection: (section: string | null) => void;
  children: ReactNode;
}) {
  return (
    <Collapse
      className="application-entry-collapse"
      activeKey={activeSection === sectionKey ? [sectionKey] : []}
      onChange={(keys) => onActiveSection(keys.length ? sectionKey : null)}
      items={[{
        key: sectionKey,
        label: title,
        forceRender: true,
        children,
      }]}
    />
  );
}

function applicationEntrySectionForField(field: string) {
  if ([
    "certification_type", "other_certification_type", "standard_names", "excluded_clauses",
    "certification_scope", "external_provider_used", "outsourced_processes",
    "stage1_requested_date", "stage2_requested_date",
  ].includes(field)) return "certification";

  if ([
    "total_employee_count", "employee_count", "shift1_count", "shift2_count", "shift3_count", "sites",
  ].includes(field)) return "personnel";

  if ([
    "other_management_systems", "management_system_details", "associated_documents",
    "consultant_organization", "consultant_name", "certificate_languages", "other_requests",
    "declaration_accepted",
  ].includes(field)) return "documents";

  return "general";
}


function ApplicationReviewSection({
  sectionKey,
  title,
  activeSection,
  onActiveSection,
  children,
}: {
  sectionKey: string;
  title: string;
  activeSection: string | null;
  onActiveSection: (section: string | null) => void;
  children: ReactNode;
}) {
  return (
    <Collapse
      className="application-review-collapse"
      activeKey={activeSection === sectionKey ? [sectionKey] : []}
      onChange={(keys) => onActiveSection(keys.length ? sectionKey : null)}
      items={[{
        key: sectionKey,
        label: title,
        forceRender: true,
        children,
      }]}
    />
  );
}

function applicationReviewSectionForField(field: string) {
  if (["review_items"].includes(field)) return "criteria";

  if (["audit_field", "iaf_code", "isic_code", "industry_scopes"].includes(field)) {
    return "scope";
  }

  if ([
    "proposed_auditor_id", "proposed_auditor_ids", "ims_integration_criteria",
    "ims_integration_percent", "combined_audit_capability_percent", "risk_level",
    "ems_complexity", "ohsms_complexity", "manday_method", "base_mandays",
    "manday_adjustments", "increase_percent", "reduction_percent",
    "integration_reduction_percent", "final_mandays", "stage1_mandays",
    "stage2_mandays", "surveillance_mandays", "recertification_mandays",
    "stage1_proposed_date", "stage2_proposed_date", "surveillance1_date",
    "surveillance2_date", "recertification_date",
  ].includes(field)) return "manday";

  return "conclusion";
}

export function CertificationProjectsScreen({ onOpenProject, mode = "projects", initialReviewId = null }: CertificationProjectsScreenProps) {
  const isApplicationWorkspace = mode === "applications";
  const currentWizardSteps = isApplicationWorkspace ? applicationWizardSteps : projectWizardSteps;
  const queryClient = useQueryClient();
  const [wizardForm] = Form.useForm<ProjectCreationValues>();
  const [searchTerm, setSearchTerm] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [standardFilter, setStandardFilter] = useState("all");
  const [applicationMonthFilter, setApplicationMonthFilter] = useState("all");
  const [applicationYearFilter, setApplicationYearFilter] = useState("all");
  const [creationOpen, setCreationOpen] = useState(false);
  const [applicationEntrySection, setApplicationEntrySection] = useState<string | null>("general");
  const [applicationReviewSection, setApplicationReviewSection] = useState<string | null>("criteria");
  const [applicationDialogMode, setApplicationDialogMode] = useState<"create" | "view" | "edit" | "review" | "status">("create");
  const [creationStep, setCreationStep] = useState(0);
  const [creationSubmitting, setCreationSubmitting] = useState(false);
  const [createdProjectId, setCreatedProjectId] = useState<string | null>(null);
  const [savedApplication, setSavedApplication] = useState<ProjectApplication | null>(null);
  const [creationError, setCreationError] = useState<string | null>(null);
  const [uploadingApplicationDocument, setUploadingApplicationDocument] = useState<string | null>(null);
  const [draftReviewId, setDraftReviewId] = useState<string | null>(null);
  const [validationIssues, setValidationIssues] = useState<CreationValidationIssue[]>([]);
  const actualCreationStep = isApplicationWorkspace ? creationStep : ([0, 2, 3][creationStep] ?? 0);
  const [mandayTableOpen, setMandayTableOpen] = useState(false);
  const [mandayTableType, setMandayTableType] = useState<"QMS" | "EMS" | "OHSMS" | "IMS" | "MULTI_SITE">("QMS");
  const [mandayEngineSuggestion, setMandayEngineSuggestion] = useState<MandayEngineSuggestion | null>(null);
  const [mandayLocalSuggestion, setMandayLocalSuggestion] = useState<ReturnType<typeof calculateMandaySuggestion> | null>(null);
  const [mandayEngineLoading, setMandayEngineLoading] = useState(false);
  const [mandayCalculationDirty, setMandayCalculationDirty] = useState(true);
  const [riskReferenceOpen, setRiskReferenceOpen] = useState(false);
  const [riskReferenceType, setRiskReferenceType] = useState<"EMS" | "OHSMS">("EMS");
  const [riskReferenceSearch, setRiskReferenceSearch] = useState("");
  const [industrySelectorOpen, setIndustrySelectorOpen] = useState(false);
  const [industrySelectorIsicIds, setIndustrySelectorIsicIds] = useState<string[]>([]);
  const [industrySelectorSystems, setIndustrySelectorSystems] = useState<Array<"QMS" | "EMS" | "OHSMS">>([]);
  const [industryResolutionRows, setIndustryResolutionRows] = useState<IndustryResolutionRow[]>([]);
  const [industryResolveLoading, setIndustryResolveLoading] = useState(false);
  const mandayRequestVersionRef = useRef(0);
  const lastMandayCalculationSignatureRef = useRef<string | null>(null);
  const [workflowActionSubmitting, setWorkflowActionSubmitting] = useState(false);
  const [workflowComment, setWorkflowComment] = useState("");
  const openedInitialReviewRef = useRef<string | null>(null);

  const currentSession = useMemo(() => {
    if (typeof window === "undefined") return null;
    const raw = window.sessionStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }, []);
  const currentUserId = currentSession?.user.id ?? "";
  const currentRoles = (currentSession?.user.roles ?? []).map((role) => role.trim().toUpperCase());
  const canManageApplications = currentRoles.some((role) => ["ADMIN", "STAFF", "SALES", "COORDINATOR"].includes(role));

  const projectsQuery = useQuery({
    queryKey: ["certification-projects"],
    queryFn: async () => {
      const response = await api.get<CertificationProject[]>("/certification-projects");
      return response.data;
    },
    enabled: !isApplicationWorkspace,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const customersQuery = useQuery({
    queryKey: ["customers", "project-creation"],
    queryFn: async () => {
      const response = await api.get<ProjectCustomer[]>("/customers");
      return response.data;
    },
    enabled: creationOpen,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const operationalStandardsQuery = useQuery({
    queryKey: ["master-data-configuration", "operational-standards"],
    queryFn: async () => {
      const response = await api.get<OperationalStandardEdition[]>("/master-data-configuration/operational-standards");
      return response.data;
    },
    enabled: creationOpen,
    staleTime: 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const applicationsQuery = useQuery({
    queryKey: ["certification-applications", "project-creation"],
    queryFn: async () => {
      const response = await api.get<ProjectApplication[]>("/certification-applications");
      return response.data;
    },
    staleTime: 30_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
  });

  const contractsQuery = useQuery({
    queryKey: ["contracts", "project-creation"],
    queryFn: async () => {
      const response = await api.get<ProjectContract[]>("/contracts");
      return response.data;
    },
    enabled: creationOpen && !isApplicationWorkspace,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const agreementsQuery = useQuery({
    queryKey: ["certification-agreements", "project-creation"],
    queryFn: async () => {
      const response = await api.get<ProjectAgreement[]>("/certification-agreements");
      return response.data;
    },
    enabled: creationOpen && !isApplicationWorkspace,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
  });

  const expertsQuery = useQuery({
    queryKey: ["experts", "application-review"],
    queryFn: async () => {
      const response = await api.get<ExpertOption[]>("/experts");
      return response.data;
    },
    enabled: creationOpen && actualCreationStep === 1,
    staleTime: 2 * 60_000,
    gcTime: 10 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const reviewAssigneesQuery = useQuery({
    queryKey: ["application-reviews", "assignees"],
    queryFn: async () => {
      const response = await api.get<ReviewAssigneeResponse>("/application-reviews/assignees");
      return response.data;
    },
    enabled: creationOpen && isApplicationWorkspace && actualCreationStep === 1,
    staleTime: 5 * 60_000,
    gcTime: 15 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const isicCodesQuery = useQuery({
    queryKey: ["industry-classifications", "isic", "application-review"],
    queryFn: async () => {
      const response = await api.get<IndustryCodeOption[]>("/industry-classifications/codes?classification_type=ISIC&active=true");
      return response.data;
    },
    enabled: industrySelectorOpen,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const mandayTablesQuery = useQuery({
    queryKey: ["manday-calculations", "reference-tables"],
    queryFn: async () => {
      const response = await api.get<MandayReferenceTables>("/manday-calculations/reference-tables");
      return response.data;
    },
    enabled: mandayTableOpen,
    staleTime: 30 * 60_000,
    gcTime: 60 * 60_000,
    refetchOnWindowFocus: false,
    retry: false,
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);
  const customers = customersQuery.data ?? [];
  const operationalStandards = useMemo(() => operationalStandardsQuery.data ?? [], [operationalStandardsQuery.data]);
  const operationalStandardOptions = useMemo(() => {
    const groups = new Map<string, { label: string; options: Array<{ value: string; label: string }> }>();
    for (const row of operationalStandards) {
      const key = row.scheme.id;
      const group = groups.get(key) ?? {
        label: `${row.scheme.code} · ${row.scheme.name}`,
        options: [],
      };
      const label = operationalStandardLabel(row);
      if (!group.options.some((item) => item.value === label)) {
        group.options.push({ value: label, label });
      }
      groups.set(key, group);
    }
    return Array.from(groups.values());
  }, [operationalStandards]);
  const applications = useMemo(() => applicationsQuery.data ?? [], [applicationsQuery.data]);
  const contracts = useMemo(() => contractsQuery.data ?? [], [contractsQuery.data]);
  const agreements = useMemo(() => agreementsQuery.data ?? [], [agreementsQuery.data]);
  const experts = useMemo(() => expertsQuery.data ?? [], [expertsQuery.data]);
  const reviewAssignees = reviewAssigneesQuery.data ?? { reviewers: [] };
  const isicCodes = useMemo(() => isicCodesQuery.data ?? [], [isicCodesQuery.data]);
  const isicSelectOptions = useMemo(
    () => isicCodes.map((code) => ({
      value: code.id,
      label: `${code.code} · ${code.title_vi ?? code.title_en} · ${code.revision}`,
    })),
    [isicCodes],
  );
  const deferredRiskReferenceSearch = useDeferredValue(riskReferenceSearch);

  const mandayTables = mandayTablesQuery.data;

  const applicationMode = Form.useWatch("application_mode", wizardForm) ?? "new";
  const existingApplicationId = Form.useWatch("existing_application_id", wizardForm);
  const selectedCustomerId = Form.useWatch("customer_id", wizardForm);
  const contractMode = Form.useWatch("contract_mode", wizardForm) ?? "new";
  const agreementMode = Form.useWatch("agreement_mode", wizardForm) ?? "new";
  const certificationType = Form.useWatch("certification_type", wizardForm);
  const watchedStandardNames = Form.useWatch("standard_names", wizardForm);
  const standardNames = useMemo(() => watchedStandardNames ?? [], [watchedStandardNames]);
  const effectivePersonnel = Form.useWatch("employee_count", wizardForm) ?? 1;
  const watchedPlannedAuditorIds = Form.useWatch("proposed_auditor_ids", wizardForm);
  const plannedAuditorIds = useMemo(() => watchedPlannedAuditorIds ?? [], [watchedPlannedAuditorIds]);
  const imsIntegrationCriteria = Form.useWatch("ims_integration_criteria", wizardForm) ?? [];
  const riskLevel = Form.useWatch("risk_level", wizardForm);
  const selectedIndustryScopes = Form.useWatch("industry_scopes", wizardForm) ?? [];
  const emsComplexity = Form.useWatch("ems_complexity", wizardForm) ?? "MEDIUM";
  const ohsmsComplexity = Form.useWatch("ohsms_complexity", wizardForm) ?? "MEDIUM";

  const selectedApplication = useMemo(
    () => applications.find((application) => application.id === existingApplicationId) ?? null,
    [applications, existingApplicationId],
  );
  const selectedApplicationAddress = useMemo(() => (
    selectedApplication?.headquarters_address?.trim() ||
    selectedApplication?.sites?.find((site) => site.is_headquarters)?.address?.trim() ||
    selectedApplication?.sites?.[0]?.address?.trim() ||
    selectedApplication?.customers?.address?.trim() ||
    ""
  ), [selectedApplication]);
  const reviewApplication = savedApplication ?? selectedApplication;
  const latestWorkflowReview = reviewApplication?.application_reviews?.[0] ?? null;
  const applicationDocumentFilesQuery = useQuery({
    queryKey: ["application-document-files", reviewApplication?.id],
    queryFn: async () => (
      await api.get<ApplicationDocumentFile[]>(`/document-files/entity/certification_application/${reviewApplication!.id}/current`)
    ).data,
    enabled: Boolean(reviewApplication?.id),
    retry: false,
  });
  const applicationDocumentFiles = useMemo(() => applicationDocumentFilesQuery.data ?? [], [applicationDocumentFilesQuery.data]);
  const reviewWorkflowStatus = String(latestWorkflowReview?.workflow_status ?? "").toUpperCase();
  const latestInvalidationAction = reviewWorkflowStatus === "RETURNED"
    ? latestWorkflowReview?.workflow_actions?.find(
        (action) => action.action === "INVALIDATE_APPLICATION_CHANGE" && action.to_status === "RETURNED",
      ) ?? null
    : null;
  const activeCapabilityReviewId = latestWorkflowReview?.id ?? draftReviewId;
  const capabilityEvaluationQuery = useQuery({
    queryKey: ["application-review-capability", activeCapabilityReviewId],
    queryFn: async () => (
      await api.get<CertificationBodyCapabilityEvaluation>(
        `/application-reviews/${activeCapabilityReviewId}/capability-evaluation`,
      )
    ).data,
    enabled: Boolean(activeCapabilityReviewId),
  });
  const capabilityEvaluation = capabilityEvaluationQuery.data ?? null;
  const canReviewWorkflow = Boolean(
    latestWorkflowReview?.id &&
    reviewWorkflowStatus === "SUBMITTED" &&
    latestWorkflowReview.reviewer_id === currentUserId,
  );
  const hasActiveWorkflow = [
    "SUBMITTED",
    "APPROVED",
  ].includes(reviewWorkflowStatus);
  const canEditReviewDraft =
    !hasActiveWorkflow || reviewWorkflowStatus === "RETURNED";

  const calculationStandardNames = useMemo(() => {
    if (actualCreationStep === 1 && reviewApplication?.standard_name) {
      return reviewApplication.standard_name.split(" + ").map((item) => item.trim()).filter(Boolean);
    }
    return standardNames;
  }, [actualCreationStep, reviewApplication, standardNames]);
  const supportedCalculationStandards = useMemo(
    () => calculationStandardNames.filter((standard) => /9001|14001|45001/i.test(standard)),
    [calculationStandardNames],
  );
  const effectivePersonnelForCalculation = actualCreationStep === 1 && reviewApplication
    ? resolveApplicationEffectivePersonnel(reviewApplication)
    : Math.max(1, Number(effectivePersonnel || 1));
  const isIntegratedAudit = supportedCalculationStandards.length > 1;
  const selectedPlannedAuditors = useMemo(
    () => plannedAuditorIds
      .map((id) => experts.find((expert) => expert.id === id))
      .filter((expert): expert is ExpertOption => Boolean(expert)),
    [experts, plannedAuditorIds],
  );
  const approvedExperts = useMemo(
    () => experts.filter(
      (expert) => normalizeStatus(expert.status) === "active" && expert.profile_status === "APPROVED",
    ),
    [experts],
  );
  const imsAuditorCandidates = useMemo(
    () => approvedExperts.filter(
      (expert) => expertSupportedStandardLabels(expert, supportedCalculationStandards).length > 0,
    ),
    [approvedExperts, supportedCalculationStandards],
  );
  const reviewAssociatedDocuments = useMemo(() => (
    applicationDocumentFiles
      .filter((file) => file.document_type.startsWith("application_supporting_"))
      .map((file) => file.note?.trim())
      .filter((value): value is string => Boolean(value))
  ), [applicationDocumentFiles]);
  const imsIntegrationPercent = round2(
    Math.min(100, (imsIntegrationCriteria.length / imsIntegrationCriteriaOptions.length) * 100),
  );
  const combinedAuditCapabilityPercent = useMemo(() => {
    const standardCount = supportedCalculationStandards.length;
    const auditorCount = selectedPlannedAuditors.length;
    if (standardCount <= 1 || auditorCount === 0) return 0;

    const numerator = selectedPlannedAuditors.reduce(
      (sum, expert) => sum + Math.max(0, expertCompetencyCount(expert, supportedCalculationStandards) - 1),
      0,
    );
    return round2(Math.min(100, (100 * numerator) / (auditorCount * (standardCount - 1))));
  }, [selectedPlannedAuditors, supportedCalculationStandards]);
  const imsConfigurationReady = !isIntegratedAudit || selectedPlannedAuditors.length > 0;
  const standardMandayBreakdown = useMemo(() => {
    const rows = mandayEngineSuggestion?.site_calculation?.per_site ?? [];
    const aggregated = new Map<string, {
      standard: string;
      family: string;
      complexity?: string;
      mandays: number;
    }>();

    rows.forEach((site) => {
      const siteFactor = site.raw_mandays > 0
        ? Number(site.mandays_after_site_reduction ?? site.raw_mandays) / Number(site.raw_mandays)
        : 1;

      site.standards.forEach((item) => {
        const existing = aggregated.get(item.standard) ?? {
          standard: item.standard,
          family: item.family,
          complexity: item.complexity,
          mandays: 0,
        };
        existing.mandays += Number(item.mandays) * siteFactor;
        aggregated.set(item.standard, existing);
      });
    });

    return Array.from(aggregated.values()).map((item) => ({
      ...item,
      mandays: round2(item.mandays),
    }));
  }, [mandayEngineSuggestion]);

  const calculatedIntegrationReductionPercent = Number(
    mandayEngineSuggestion?.ims_reduction_percent
      ?? mandayEngineSuggestion?.calculated_ims_reduction_percent
      ?? 0,
  );
  const integrationReductionPercent = Math.max(0, calculatedIntegrationReductionPercent);
  const currentMandayInputSignature = useMemo(() => JSON.stringify({
    standards: [...supportedCalculationStandards].sort(),
    effective_personnel: effectivePersonnelForCalculation,
    sites: (reviewApplication?.sites ?? []).map((site) => ({
      site_no: site.site_no,
      employee_count: Number(site.employee_count ?? 0),
      is_headquarters: Boolean(site.is_headquarters),
    })),
    ems_complexity: emsComplexity,
    ohsms_complexity: ohsmsComplexity,
    ims_integration_percent: Number(imsIntegrationPercent || 0),
    combined_audit_capability_percent: Number(combinedAuditCapabilityPercent || 0),
    proposed_auditor_ids: [...plannedAuditorIds].sort(),
  }), [
    combinedAuditCapabilityPercent,
    effectivePersonnelForCalculation,
    emsComplexity,
    imsIntegrationPercent,
    ohsmsComplexity,
    plannedAuditorIds,
    reviewApplication?.sites,
    supportedCalculationStandards,
  ]);
  const externalProviderUsed = Form.useWatch("external_provider_used", wizardForm);
  const otherManagementSystems = Form.useWatch("other_management_systems", wizardForm);
  const associatedDocumentOptions = useMemo(
    () => getAssociatedDocumentOptions(certificationType, standardNames),
    [certificationType, standardNames],
  );
  const mandaySuggestion = mandayEngineSuggestion
    ? {
        base: mandayEngineSuggestion.base_mandays,
        final: mandayEngineSuggestion.final_initial_mandays,
        stage1: mandayEngineSuggestion.stage1_mandays,
        stage2: mandayEngineSuggestion.stage2_mandays,
        surveillance: mandayEngineSuggestion.surveillance_mandays,
        recertification: mandayEngineSuggestion.recertification_mandays,
      }
    : mandayLocalSuggestion;

  const projectApplicationIds = useMemo(
    () => new Set(projects.map((project) => project.application_id)),
    [projects],
  );

  const acceptedApplications = useMemo(
    () => applications.filter((application) => (
      normalizeStatus(application.status) === "accepted" &&
      !projectApplicationIds.has(application.id)
    )),
    [applications, projectApplicationIds],
  );

  const effectiveCustomerId = applicationMode === "existing"
    ? selectedApplication?.customer_id
    : selectedCustomerId;

  const customerContracts = useMemo(
    () => contracts.filter((contract) => contract.customer_id === effectiveCustomerId),
    [contracts, effectiveCustomerId],
  );

  const customerAgreements = useMemo(
    () => agreements.filter((agreement) => agreement.customer_id === effectiveCustomerId),
    [agreements, effectiveCustomerId],
  );

  const getCurrentManualAdjustmentTotals = () => {
    const currentAdjustments = (wizardForm.getFieldValue("manday_adjustments") ?? []) as MandayAdjustmentForm[];
    return currentAdjustments.reduce((totals, adjustment) => {
      const percentage = Number(adjustment?.percentage ?? 0);
      if (!Number.isFinite(percentage) || percentage <= 0) return totals;
      if (adjustment.adjustment_type === "increase") totals.increase += percentage;
      if (adjustment.adjustment_type === "reduction") totals.reduction += percentage;
      return totals;
    }, { increase: 0, reduction: 0 });
  };

  const calculateMandaysNow = async () => {
    const adjustmentTotals = getCurrentManualAdjustmentTotals();
    const currentIncreasePercent = adjustmentTotals.increase;
    const currentReductionPercent = Math.min(30, adjustmentTotals.reduction);

    if (!supportedCalculationStandards.length) {
      message.warning("Chưa xác định tiêu chuẩn để tính man-day.");
      return;
    }
    if (effectivePersonnelForCalculation < 1) {
      message.warning("Nhân sự hiệu dụng phải lớn hơn 0.");
      return;
    }
    if (isIntegratedAudit && !imsConfigurationReady) {
      message.warning("Chọn đoàn chuyên gia dự kiến để tính giảm tích hợp IAF MD11.");
      return;
    }

    const requestVersion = ++mandayRequestVersionRef.current;
    setMandayEngineLoading(true);
    try {
      if (!isIntegratedAudit) {
        setMandayEngineSuggestion(null);
        wizardForm.setFieldsValue({ increase_percent: currentIncreasePercent, reduction_percent: currentReductionPercent, integration_reduction_percent: 0 });
        setMandayLocalSuggestion(calculateMandaySuggestion(
          effectivePersonnelForCalculation,
          1,
          riskLevel,
          Number(currentIncreasePercent || 0),
          Number(currentReductionPercent || 0),
          0,
        ));
        lastMandayCalculationSignatureRef.current = currentMandayInputSignature;
        setMandayCalculationDirty(false);
        return;
      }

      const normalizedEmsComplexity = String(emsComplexity ?? "MEDIUM").toLowerCase();
      const normalizedOhsmsComplexity = String(ohsmsComplexity ?? "MEDIUM").toLowerCase();
      const sourceSites = reviewApplication?.sites?.map((site) => ({
        site_no: site.site_no,
        site_name: site.site_name ?? undefined,
        address: site.address,
        activities: site.activities ?? undefined,
        employee_count: site.employee_count ?? undefined,
        is_headquarters: site.is_headquarters,
      })) ?? (wizardForm.getFieldValue("sites") ?? []);
      const normalizedSites = normalizeApplicationSites(
        sourceSites,
        reviewApplication?.headquarters_address ?? wizardForm.getFieldValue("headquarters_address"),
        reviewApplication?.certification_scope ?? wizardForm.getFieldValue("certification_scope"),
        effectivePersonnelForCalculation,
      );
      const payload: Record<string, unknown> = {
        standards: supportedCalculationStandards,
        effective_personnel: effectivePersonnelForCalculation,
        audit_type: "initial",
        ems_complexity: normalizedEmsComplexity,
        ohsms_complexity: normalizedOhsmsComplexity,
        site_sampling_mode: normalizedSites.length > 1 ? "sampling" : "single",
        sites: normalizedSites.map((site) => ({
          site_name: site.site_name,
          employee_count: site.employee_count,
          is_headquarters: site.is_headquarters,
        })),
        sampled_site_reduction_percent: 0,
        increase_percent: Number(currentIncreasePercent || 0),
        reduction_percent: Number(currentReductionPercent || 0),
        ims_integration_percent: imsIntegrationPercent,
        combined_audit_capability_percent: combinedAuditCapabilityPercent,
      };
      const response = await api.post<MandayEngineSuggestion>(
        "/manday-calculations/suggest",
        payload,
      );
      if (requestVersion !== mandayRequestVersionRef.current) return;
      setMandayLocalSuggestion(null);
      setMandayEngineSuggestion(response.data);
      wizardForm.setFieldsValue({
        increase_percent: currentIncreasePercent,
        reduction_percent: currentReductionPercent,
        integration_reduction_percent: Number(response.data.ims_reduction_percent ?? response.data.calculated_ims_reduction_percent ?? 0),
      });
      lastMandayCalculationSignatureRef.current = currentMandayInputSignature;
      setMandayCalculationDirty(false);
    } catch (error) {
      if (requestVersion === mandayRequestVersionRef.current) {
        message.error(getErrorMessage(error));
      }
    } finally {
      if (requestVersion === mandayRequestVersionRef.current) {
        setMandayEngineLoading(false);
      }
    }
  };

  useEffect(() => {
    if (!creationOpen || actualCreationStep !== 1) return;
    setMandayCalculationDirty(
      lastMandayCalculationSignatureRef.current !== currentMandayInputSignature,
    );
  }, [actualCreationStep, creationOpen, currentMandayInputSignature]);

  useEffect(() => {
    if (!creationOpen || actualCreationStep !== 1) return;

    wizardForm.setFieldsValue({
      employee_count: effectivePersonnelForCalculation,
      integration_reduction_percent: integrationReductionPercent,
      ims_integration_percent: imsIntegrationPercent,
      combined_audit_capability_percent: combinedAuditCapabilityPercent,
    });
  }, [
    actualCreationStep,
    combinedAuditCapabilityPercent,
    creationOpen,
    effectivePersonnelForCalculation,
    imsIntegrationPercent,
    integrationReductionPercent,
    wizardForm,
  ]);

  useEffect(() => {
    if (!creationOpen || actualCreationStep !== 1) return;
    wizardForm.setFieldValue(
      "manday_method",
      supportedCalculationStandards.length > 1 ? "IAF_MD11" : "IAF_MD5",
    );
  }, [
    actualCreationStep,
    creationOpen,
    supportedCalculationStandards.length,
    wizardForm,
  ]);

  const applyMandaySuggestion = () => {
    if (!mandaySuggestion) {
      message.warning("Bấm “Tính đề xuất” trước khi áp dụng.");
      return;
    }
    if (mandayCalculationDirty) {
      message.warning("Dữ liệu đầu vào đã thay đổi. Hãy bấm “Tính lại đề xuất” trước khi áp dụng.");
      return;
    }

    wizardForm.setFieldsValue({
      manday_method: supportedCalculationStandards.length > 1 ? "IAF_MD11" : "IAF_MD5",
      base_mandays: mandaySuggestion.base,
      final_mandays: mandaySuggestion.final,
      stage1_mandays: mandaySuggestion.stage1,
      stage2_mandays: mandaySuggestion.stage2,
      surveillance_mandays: mandaySuggestion.surveillance,
      recertification_mandays: mandaySuggestion.recertification,
      integration_reduction_percent: integrationReductionPercent,
      ims_integration_percent: imsIntegrationPercent,
      combined_audit_capability_percent: combinedAuditCapabilityPercent,
    });
    message.success("Đã áp dụng kết quả man-day đề xuất vào biểu xem xét.");
  };

  const openMandayReferenceTable = () => {
    if (supportedCalculationStandards.length > 1) {
      setMandayTableType("IMS");
    } else if (supportedCalculationStandards.some((standard) => /14001/i.test(standard))) {
      setMandayTableType("EMS");
    } else if (supportedCalculationStandards.some((standard) => /45001/i.test(standard))) {
      setMandayTableType("OHSMS");
    } else {
      setMandayTableType("QMS");
    }
    setMandayTableOpen(true);
  };

  const applyReferenceMandays = (mandays: number, selectedRisk?: "HIGH" | "MEDIUM" | "LOW" | "LIMITED") => {
    const adjustmentTotals = getCurrentManualAdjustmentTotals();
    const adjusted = roundToHalf(
      Number(mandays) *
      (1 + Number(adjustmentTotals.increase || 0) / 100 - Number(Math.min(30, adjustmentTotals.reduction) || 0) / 100) *
      (1 - Number(integrationReductionPercent || 0) / 100),
    );
    const stage1 = Math.max(0.5, roundToHalf(adjusted * 0.2));
    const stage2 = Math.max(1, roundToHalf(adjusted - stage1));
    const final = round2(stage1 + stage2);
    wizardForm.setFieldsValue({
      base_mandays: Number(mandays),
      final_mandays: final,
      stage1_mandays: stage1,
      stage2_mandays: stage2,
      surveillance_mandays: Math.max(1, roundToHalf(final / 3)),
      recertification_mandays: Math.max(1, roundToHalf(final * 2 / 3)),
      ...(selectedRisk ? { risk_level: selectedRisk } : {}),
      ...(selectedRisk && mandayTableType === "EMS" ? { ems_complexity: selectedRisk } : {}),
      ...(selectedRisk && mandayTableType === "OHSMS" && selectedRisk !== "LIMITED" ? { ohsms_complexity: selectedRisk } : {}),
    });
    setMandayTableOpen(false);
    message.success(`Đã chọn ${mandays} MD từ bảng tra cứu`);
  };

  const standards: string[] = useMemo(
    () => Array.from(new Set(projects.map((item) => item.standard_name).filter(Boolean))).sort(),
    [projects],
  );
  const statuses: string[] = useMemo(
    () => Array.from(new Set(projects.map((item) => normalizeStatus(item.status)))).sort(),
    [projects],
  );

  const filteredProjects = useMemo(() => {
    const keyword = searchTerm.trim().toLowerCase();

    return projects.filter((project) => {
      const customer = project.certification_applications?.customers;
      const matchesSearch = !keyword || [
        project.project_code,
        project.standard_name,
        project.certification_applications?.application_code,
        customer?.customer_code,
        customer?.company_name,
      ].some((value) => value?.toLowerCase().includes(keyword));
      const matchesStatus = statusFilter === "all" || normalizeStatus(project.status) === statusFilter;
      const matchesStandard = standardFilter === "all" || project.standard_name === standardFilter;

      return matchesSearch && matchesStatus && matchesStandard;
    });
  }, [projects, searchTerm, standardFilter, statusFilter]);

  const activeProjects = projects.filter((item) => ![
    "certificate_issued",
    "completed",
    "closed",
    "cancelled",
  ].includes(normalizeStatus(item.status))).length;
  const issuedProjects = projects.filter((item) => normalizeStatus(item.status) === "certificate_issued").length;
  const attentionProjects = projects.filter((item) => [
    "corrective_action_required",
    "pending_technical_review",
  ].includes(normalizeStatus(item.status))).length;

  const applicationStatuses = useMemo(
    () => Array.from(new Set(applications.map((item) => normalizeStatus(item.status)))).sort(),
    [applications],
  );

  const applicationStandards = useMemo(
    () => Array.from(new Set(applications.map((item) => item.standard_name).filter(Boolean))).sort(),
    [applications],
  );

  const applicationYears = useMemo(() => Array.from(new Set(
    applications
      .map((item) => dayjs(item.updated_at ?? item.application_date).year())
      .filter((year) => Number.isFinite(year)),
  )).sort((a, b) => b - a), [applications]);

  const filteredApplications = useMemo(() => {
    const keyword = searchTerm.trim().toLocaleLowerCase("vi");
    return applications.filter((application) => {
      const matchesSearch = !keyword || [
        application.application_code,
        application.standard_name,
        application.certification_scope,
        application.customers?.customer_code,
        application.customers?.company_name,
      ].some((value) => value?.toLocaleLowerCase("vi").includes(keyword));
      const matchesStatus = statusFilter === "all" || normalizeStatus(application.status) === statusFilter;
      const matchesStandard = standardFilter === "all" || application.standard_name === standardFilter;
      const applicationDate = dayjs(application.updated_at ?? application.application_date);
      const matchesMonth = applicationMonthFilter === "all" || String(applicationDate.month() + 1) === applicationMonthFilter;
      const matchesYear = applicationYearFilter === "all" || String(applicationDate.year()) === applicationYearFilter;
      return matchesSearch && matchesStatus && matchesStandard && matchesMonth && matchesYear;
    });
  }, [applicationMonthFilter, applicationYearFilter, applications, searchTerm, standardFilter, statusFilter]);

  const pendingApplications = applications.filter((item) => [
    "draft",
    "submitted",
    "under_review",
    "pending_check",
    "pending_approval",
  ].includes(normalizeStatus(item.status))).length;
  const moreInfoApplications = applications.filter((item) => normalizeStatus(item.status) === "need_more_info").length;
  const acceptedApplicationCount = applications.filter((item) => normalizeStatus(item.status) === "accepted").length;

  const applyApplicationToForm = useCallback((application: ProjectApplication) => {
    const latestReview = application.application_reviews?.[0];
    const plannedAuditorIds = parseJsonStringArray(latestReview?.proposed_auditors_json);
    const savedIntegrationCriteria = parseJsonStringArray(latestReview?.ims_integration_criteria_json);
    const savedIndustryScopes = parseIndustryScopes(latestReview?.industry_scopes_json);
    const resolvedEffectivePersonnel = resolveApplicationEffectivePersonnel(application);
    const resolvedHeadquartersAddress =
      application.headquarters_address?.trim() ||
      application.customers?.address?.trim() ||
      undefined;
    const normalizedSites = normalizeApplicationSites(
      application.sites?.map((site) => ({
        site_no: site.site_no,
        site_name: site.site_name ?? undefined,
        address: site.address ?? undefined,
        activities: site.activities ?? undefined,
        employee_count: site.employee_count ?? undefined,
        is_headquarters: site.is_headquarters,
      })),
      resolvedHeadquartersAddress,
      application.certification_scope ?? undefined,
      resolvedEffectivePersonnel,
    );

    wizardForm.setFieldsValue({
      application_mode: isApplicationWorkspace ? "new" : "existing",
      existing_application_id: application.id,
      customer_id: application.customer_id,
      application_code: application.application_code,
      application_date: application.application_date ? dayjs(application.application_date) : dayjs(),
      certification_type: application.certification_type ?? "INITIAL",
      other_certification_type: application.other_certification_type ?? undefined,
      standard_names: application.standard_name.split(" + ").filter(Boolean),
      certification_scope: application.certification_scope ?? undefined,
      excluded_clauses: application.excluded_clauses ?? undefined,
      company_name_en: application.company_name_en ?? undefined,
      headquarters_address: resolvedHeadquartersAddress,
      representative_name: application.representative_name ?? undefined,
      representative_position: application.representative_position ?? undefined,
      representative_phone: application.representative_phone ?? undefined,
      representative_fax: application.representative_fax ?? undefined,
      representative_email: application.representative_email ?? undefined,
      contact_name: application.contact_name ?? undefined,
      contact_position: application.contact_position ?? undefined,
      contact_phone: application.contact_phone ?? undefined,
      contact_fax: application.contact_fax ?? undefined,
      contact_email: application.contact_email ?? undefined,
      total_employee_count: application.total_employee_count ?? resolvedEffectivePersonnel,
      employee_count: resolvedEffectivePersonnel,
      shift1_count: application.shift1_count ?? resolvedEffectivePersonnel,
      shift2_count: application.shift2_count ?? 0,
      shift3_count: application.shift3_count ?? 0,
      sites: normalizedSites,
      external_provider_used: application.external_provider_used ?? false,
      outsourced_processes: application.outsourced_processes ?? undefined,
      stage1_requested_date: application.stage1_requested_date ? dayjs(application.stage1_requested_date) : undefined,
      stage2_requested_date: application.stage2_requested_date ? dayjs(application.stage2_requested_date) : undefined,
      other_management_systems: application.other_management_systems ?? false,
      management_system_details: application.management_system_details ?? undefined,
      consultant_organization: application.consultant_organization ?? undefined,
      consultant_name: application.consultant_name ?? undefined,
      certificate_languages: application.certificate_languages?.split(",").map((item) => item.trim()).filter(Boolean) ?? [],
      other_requests: application.other_requests ?? undefined,
      declaration_accepted: application.declaration_accepted,
      audit_field: latestReview?.audit_field ?? application.certification_scope ?? undefined,
      industry_scopes: savedIndustryScopes,
      iaf_code: savedIndustryScopes[0]?.iaf_code ?? latestReview?.iaf_code ?? undefined,
      isic_code: savedIndustryScopes[0]?.isic_code ?? latestReview?.isic_code ?? undefined,
      review_items: latestReview?.review_items_json
        ? (() => { try { return JSON.parse(latestReview.review_items_json) as ReviewItemForm[]; } catch { return defaultReviewItems; } })()
        : defaultReviewItems,
      review_result: (latestReview?.result as ProjectCreationValues["review_result"]) ?? "ACCEPTED",
      review_comment: latestReview?.comment ?? latestReview?.approver_comment ?? "Tài liệu và hồ sơ khách hàng cung cấp đạt yêu cầu.",
      conclusion: latestReview?.conclusion ?? "Tài liệu và hồ sơ khách hàng cung cấp đạt yêu cầu.",
      reviewer_id: latestReview?.reviewer_id ?? undefined,
      client_code: latestReview?.client_code ?? application.customers?.customer_code,
      proposed_auditor_id: latestReview?.proposed_auditor_id ?? plannedAuditorIds[0] ?? undefined,
      proposed_auditor_ids: plannedAuditorIds,
      ims_integration_criteria: savedIntegrationCriteria,
      ims_integration_percent: Number(latestReview?.ims_integration_percent ?? 0),
      combined_audit_capability_percent: Number(latestReview?.combined_audit_capability_percent ?? 0),
      manday_method: (latestReview?.manday_method as ProjectCreationValues["manday_method"]) ?? undefined,
      base_mandays: latestReview?.base_mandays == null ? undefined : Number(latestReview.base_mandays),
      increase_percent: latestReview?.increase_percent == null ? 0 : Number(latestReview.increase_percent),
      reduction_percent: latestReview?.reduction_percent == null ? 0 : Number(latestReview.reduction_percent),
      integration_reduction_percent: latestReview?.integration_reduction_percent == null ? 0 : Number(latestReview.integration_reduction_percent),
      final_mandays: latestReview?.final_mandays == null ? undefined : Number(latestReview.final_mandays),
      stage1_mandays: latestReview?.stage1_mandays == null ? undefined : Number(latestReview.stage1_mandays),
      stage2_mandays: latestReview?.stage2_mandays == null ? undefined : Number(latestReview.stage2_mandays),
      surveillance_mandays: latestReview?.surveillance_mandays == null ? undefined : Number(latestReview.surveillance_mandays),
      recertification_mandays: latestReview?.recertification_mandays == null ? undefined : Number(latestReview.recertification_mandays),
      stage1_proposed_date: latestReview?.stage1_proposed_date ? dayjs(latestReview.stage1_proposed_date) : undefined,
      stage2_proposed_date: latestReview?.stage2_proposed_date ? dayjs(latestReview.stage2_proposed_date) : undefined,
      surveillance1_date: latestReview?.surveillance1_date ? dayjs(latestReview.surveillance1_date) : undefined,
      surveillance2_date: latestReview?.surveillance2_date ? dayjs(latestReview.surveillance2_date) : undefined,
      recertification_date: latestReview?.recertification_date ? dayjs(latestReview.recertification_date) : undefined,
      risk_level: latestReview?.risk_level ?? "MEDIUM",
      ems_complexity: (latestReview?.ems_complexity as ProjectCreationValues["ems_complexity"]) ?? (latestReview?.risk_level as ProjectCreationValues["ems_complexity"]) ?? "MEDIUM",
      ohsms_complexity: (latestReview?.ohsms_complexity as ProjectCreationValues["ohsms_complexity"]) ?? ((latestReview?.risk_level && latestReview.risk_level !== "LIMITED") ? latestReview.risk_level as ProjectCreationValues["ohsms_complexity"] : "MEDIUM"),
      manday_adjustments: parseSavedMandayAdjustments(latestReview),
    });
  }, [isApplicationWorkspace, wizardForm]);

  const openApplicationView = (application: ProjectApplication) => {
    setApplicationDialogMode("view");
    setCreationStep(0);
    setCreatedProjectId(null);
    setSavedApplication(application);
    setDraftReviewId(null);
    setCreationError(null);
    setValidationIssues([]);
    setCreationOpen(true);
    window.setTimeout(() => {
      wizardForm.resetFields();
      applyApplicationToForm(application);
      wizardForm.setFieldValue("application_mode", "new");
    }, 0);
  };

  const openApplicationEdit = (application: ProjectApplication) => {
    setApplicationDialogMode("edit");
    setApplicationEntrySection("general");
    setCreationStep(0);
    setCreatedProjectId(null);
    setSavedApplication(application);
    setDraftReviewId(null);
    setCreationError(null);
    setValidationIssues([]);
    setCreationOpen(true);
    window.setTimeout(() => {
      wizardForm.resetFields();
      applyApplicationToForm(application);
      wizardForm.setFieldValue("application_mode", "new");
    }, 0);
  };

  const openApplicationReview = useCallback((application: ProjectApplication) => {
    setApplicationDialogMode("review");
    setApplicationReviewSection("criteria");
    setCreationStep(1);
    setCreatedProjectId(null);
    setSavedApplication(application);
    setDraftReviewId(application.application_reviews?.[0]?.id ?? null);
    setCreationError(null);
    setValidationIssues([]);
    setWorkflowComment("");
    mandayRequestVersionRef.current += 1;
    lastMandayCalculationSignatureRef.current = null;
    setMandayEngineSuggestion(null);
    setMandayLocalSuggestion(null);
    setMandayCalculationDirty(true);
    setCreationOpen(true);
    window.setTimeout(() => {
      wizardForm.resetFields();
      applyApplicationToForm(application);
    }, 0);
  }, [applyApplicationToForm, wizardForm]);

  useEffect(() => {
    if (!isApplicationWorkspace || !initialReviewId || !applicationsQuery.data) return;
    if (openedInitialReviewRef.current === initialReviewId) return;

    const application = applicationsQuery.data.find((item) =>
      item.application_reviews?.some((review) => review.id === initialReviewId),
    );

    if (!application) return;

    const timer = window.setTimeout(() => {
      if (openedInitialReviewRef.current === initialReviewId) return;
      openedInitialReviewRef.current = initialReviewId;
      openApplicationReview(application);
    }, 0);

    return () => window.clearTimeout(timer);
  }, [applicationsQuery.data, initialReviewId, isApplicationWorkspace, openApplicationReview]);

  const openApplicationStatus = (application: ProjectApplication) => {
    setApplicationDialogMode("status");
    setApplicationReviewSection("criteria");
    setCreationStep(1);
    setCreatedProjectId(null);
    setSavedApplication(application);
    setDraftReviewId(application.application_reviews?.[0]?.id ?? null);
    setCreationError(null);
    setValidationIssues([]);
    setWorkflowComment("");
    mandayRequestVersionRef.current += 1;
    lastMandayCalculationSignatureRef.current = null;
    setMandayEngineSuggestion(null);
    setMandayLocalSuggestion(null);
    setMandayCalculationDirty(false);
    setCreationOpen(true);
    window.setTimeout(() => {
      wizardForm.resetFields();
      applyApplicationToForm(application);
    }, 0);
  };

  const openCreationWizard = () => {
    setApplicationDialogMode("create");
    setApplicationEntrySection("general");
    setApplicationReviewSection("criteria");
    const today = dayjs();
    setCreationStep(0);
    setCreatedProjectId(null);
    setSavedApplication(null);
    setDraftReviewId(null);
    setCreationError(null);
    setValidationIssues([]);
    setWorkflowComment("");
    mandayRequestVersionRef.current += 1;
    lastMandayCalculationSignatureRef.current = null;
    setMandayEngineSuggestion(null);
    setMandayLocalSuggestion(null);
    setMandayCalculationDirty(true);
    setCreationOpen(true);

    window.setTimeout(() => {
      wizardForm.resetFields();
      wizardForm.setFieldsValue({
        application_mode: isApplicationWorkspace ? "new" : "existing",
        existing_application_id: isApplicationWorkspace ? undefined : acceptedApplications[0]?.id,
        customer_id: isApplicationWorkspace ? undefined : acceptedApplications[0]?.customer_id,
        application_code: undefined,
        application_date: today,
        certification_type: "INITIAL",
        standard_names: isApplicationWorkspace
          ? ["ISO 9001:2015"]
          : acceptedApplications[0]?.standard_name.split(" + ").filter(Boolean) ?? ["ISO 9001:2015"],
        certification_scope: isApplicationWorkspace ? undefined : acceptedApplications[0]?.certification_scope ?? undefined,
        total_employee_count: isApplicationWorkspace ? 1 : acceptedApplications[0]?.total_employee_count ?? acceptedApplications[0]?.employee_count ?? 1,
        employee_count: isApplicationWorkspace ? 1 : acceptedApplications[0]?.employee_count ?? 1,
        shift1_count: 1,
        shift2_count: 0,
        shift3_count: 0,
        sites: [{
          site_no: 1,
          site_name: "Trụ sở chính",
          address: "",
          activities: "",
          employee_count: 1,
          is_headquarters: true,
        }],
        external_provider_used: false,
        other_management_systems: false,
        associated_documents: [],
        certificate_languages: ["Tiếng Việt", "Tiếng Anh"],
        declaration_accepted: false,
        review_items: defaultReviewItems,
        review_result: "ACCEPTED",
        review_comment: "Tài liệu và hồ sơ khách hàng cung cấp đạt yêu cầu.",
        conclusion: "Tài liệu và hồ sơ khách hàng cung cấp đạt yêu cầu.",
        risk_level: "MEDIUM",
        ems_complexity: "MEDIUM",
        ohsms_complexity: "MEDIUM",
        increase_percent: 0,
        reduction_percent: 0,
        integration_reduction_percent: 0,
        proposed_auditor_ids: [],
        ims_integration_criteria: [],
        ims_integration_percent: 0,
        combined_audit_capability_percent: 0,
        manday_adjustments: [],
        stage1_proposed_date: today.add(14, "day"),
        stage2_proposed_date: today.add(30, "day"),
        surveillance1_date: today.add(1, "year"),
        surveillance2_date: today.add(2, "year"),
        recertification_date: today.add(3, "year"),
        contract_mode: "new",
        contract_number: generateNextCode(PLATFORM_BRANDING.documentCodePrefix, contracts.map((item) => item.contract_number)),
        contract_sign_date: today,
        contract_start_date: today,
        contract_currency: "VND",
        contract_file_kind: "signed_scan",
        contract_file_list: [],
        agreement_mode: "new",
        agreement_number: generateNextCode("AGR", agreements.map((item) => item.agreement_number)),
        agreement_sign_date: today,
        agreement_file_kind: "signed_scan",
        agreement_file_list: [],
        project_code: generateNextCode("PRJ", projects.map((item) => item.project_code)),
      });

      if (!isApplicationWorkspace && acceptedApplications[0]) {
        applyApplicationToForm(acceptedApplications[0]);
        wizardForm.setFieldValue("application_mode", "existing");
      }
    }, 0);
  };

  const closeCreationWizard = () => {
    if (creationSubmitting || workflowActionSubmitting) return;
    setCreationOpen(false);
    setApplicationDialogMode("create");
    setCreationStep(0);
    setCreatedProjectId(null);
    setSavedApplication(null);
    setCreationError(null);
    setValidationIssues([]);
    mandayRequestVersionRef.current += 1;
    lastMandayCalculationSignatureRef.current = null;
    setMandayEngineSuggestion(null);
    setMandayLocalSuggestion(null);
    setMandayCalculationDirty(true);
    wizardForm.resetFields();
  };

  const getCreationStepForField = (name: Array<string | number>) => {
    const root = String(name[0] ?? "");
    let actualStep = 0;

    if ([
      "review_items", "review_result", "review_comment", "audit_field", "iaf_code", "isic_code",
      "proposed_auditor_id", "proposed_auditor_ids", "ims_integration_criteria",
      "ims_integration_percent", "combined_audit_capability_percent", "risk_level",
      "manday_method", "base_mandays", "manday_adjustments",
      "increase_percent", "reduction_percent", "integration_reduction_percent", "final_mandays",
      "stage1_mandays", "stage2_mandays", "surveillance_mandays", "recertification_mandays",
      "stage1_proposed_date", "stage2_proposed_date", "surveillance1_date", "surveillance2_date",
      "recertification_date", "conclusion", "client_code", "reviewer_id",
    ].includes(root)) actualStep = 1;

    if ([
      "contract_mode", "existing_contract_id", "contract_number", "contract_sign_date",
      "contract_start_date", "contract_end_date", "contract_total_value", "contract_currency", "contract_file_kind",
      "contract_file_list", "agreement_mode", "existing_agreement_id", "agreement_number",
      "agreement_sign_date", "agreement_file_kind", "agreement_file_list",
    ].includes(root)) actualStep = 2;

    if (root === "project_code") actualStep = 3;

    if (isApplicationWorkspace) return Math.min(actualStep, 1);
    if (actualStep === 2) return 1;
    if (actualStep === 3) return 2;
    return 0;
  };

  const handleCreationFailure = (error: unknown) => {
    const formError = error as {
      errorFields?: Array<{ name: Array<string | number>; errors: string[] }>;
    };

    if (Array.isArray(formError?.errorFields) && formError.errorFields.length > 0) {
      const issues = formError.errorFields.flatMap((field) => field.errors.map((messageText) => ({
        name: field.name,
        message: messageText,
        step: getCreationStepForField(field.name),
        label: creationFieldLabels[String(field.name[0] ?? "")] ?? String(field.name[0] ?? "Trường dữ liệu"),
      })));
      const firstIssue = issues[0];
      setValidationIssues(issues);
      setCreationError(`Còn ${issues.length} nội dung bắt buộc hoặc chưa hợp lệ.`);
      setCreationStep(firstIssue.step);
      if (firstIssue.step === 0) {
        setApplicationEntrySection(applicationEntrySectionForField(String(firstIssue.name[0] ?? "")));
      } else if (firstIssue.step === 1) {
        setApplicationReviewSection(applicationReviewSectionForField(String(firstIssue.name[0] ?? "")));
      }
      window.setTimeout(() => {
        wizardForm.scrollToField(firstIssue.name, { block: "center" });
      }, 80);
      return;
    }

    const apiMessage = getErrorMessage(error);
    const siteAddressMatch = apiMessage.match(/sites\.(\d+)\.address/i);
    if (siteAddressMatch) {
      const siteIndex = Number(siteAddressMatch[1]);
      const issue: CreationValidationIssue = {
        name: ["sites", siteIndex, "address"],
        message: `Nhập địa chỉ địa điểm ${String(siteIndex + 1).padStart(2, "0")}`,
        step: 0,
        label: `Địa chỉ địa điểm ${String(siteIndex + 1).padStart(2, "0")}`,
      };
      setValidationIssues([issue]);
      setCreationError("Dữ liệu địa điểm chứng nhận chưa hoàn chỉnh.");
      setCreationStep(0);
      setApplicationEntrySection("personnel");
      window.setTimeout(() => wizardForm.scrollToField(issue.name, { block: "center" }), 80);
      return;
    }
    const errorMessage = apiMessage !== "Có lỗi xảy ra. Vui lòng thử lại."
      ? apiMessage
      : error instanceof Error
        ? error.message
        : apiMessage;
    const recoverableMessage = savedApplication
      ? `Không thể hoàn tất bước hiện tại: ${errorMessage}. Đơn ${savedApplication.application_code} đã được lưu; không cần nhập lại đơn. Hãy sửa nội dung được báo rồi tiếp tục xem xét.`
      : errorMessage;
    setCreationError(recoverableMessage);
    if (savedApplication) {
      message.warning("Đơn đã được lưu. Hãy xử lý nội dung được cảnh báo trong biểu xem xét.");
    } else {
      message.error(errorMessage);
    }
  };

  const focusValidationIssue = (issue: CreationValidationIssue) => {
    setCreationStep(issue.step);
    if (issue.step === 0) {
      setApplicationEntrySection(applicationEntrySectionForField(String(issue.name[0] ?? "")));
    } else if (issue.step === 1) {
      setApplicationReviewSection(applicationReviewSectionForField(String(issue.name[0] ?? "")));
    }
    window.setTimeout(() => {
      wizardForm.scrollToField(issue.name, { block: "center" });
    }, 120);
  };

  const validateCurrentStep = async (step = creationStep) => {
    const actualStep = isApplicationWorkspace ? step : ([0, 2, 3][step] ?? 0);

    if (actualStep === 0) {
      if (applicationMode === "existing") {
        await wizardForm.validateFields(["existing_application_id"]);
        const selected = applications.find((item) => item.id === wizardForm.getFieldValue("existing_application_id"));
        if (!selected) {
          throw new Error("Không tìm thấy đơn đăng ký đã chọn.");
        }

        const fallbackAddress =
          String(wizardForm.getFieldValue("headquarters_address") ?? "").trim() ||
          selected.headquarters_address?.trim() ||
          selected.sites?.find((site) => site.is_headquarters)?.address?.trim() ||
          selected.sites?.[0]?.address?.trim() ||
          selected.customers?.address?.trim() ||
          undefined;
        const normalizedSites = normalizeApplicationSites(
          selected.sites?.map((site) => ({
            site_no: site.site_no,
            site_name: site.site_name ?? undefined,
            address: site.address ?? undefined,
            activities: site.activities ?? undefined,
            employee_count: site.employee_count ?? undefined,
            is_headquarters: site.is_headquarters,
          })),
          fallbackAddress,
          selected.certification_scope ?? undefined,
          resolveApplicationEffectivePersonnel(selected),
        );

        const missingSiteIndex = normalizedSites.findIndex((site) => !site.address?.trim());
        if (missingSiteIndex >= 0) {
          throw new Error(
            `Đơn ${selected.application_code} chưa có địa chỉ cho địa điểm ${String(missingSiteIndex + 1).padStart(2, "0")}. ` +
            "Hãy bổ sung địa chỉ trong đơn đăng ký trước khi khởi tạo hồ sơ.",
          );
        }

        wizardForm.setFieldsValue({
          headquarters_address: fallbackAddress,
          sites: normalizedSites,
          employee_count: resolveApplicationEffectivePersonnel(selected),
        });
        return;
      }

      const draftValues = wizardForm.getFieldsValue(true);
      const normalizedSites = normalizeApplicationSites(
        draftValues.sites,
        draftValues.headquarters_address,
        draftValues.certification_scope,
        draftValues.employee_count,
      );
      wizardForm.setFieldValue("sites", normalizedSites);

      await wizardForm.validateFields([
        "customer_id",
        "application_date",
        "certification_type",
        "other_certification_type",
        "standard_names",
        "certification_scope",
        "headquarters_address",
        "representative_name",
        "contact_name",
        "total_employee_count",
        "employee_count",
        "sites",
        "outsourced_processes",
        "management_system_details",
        "declaration_accepted",
      ]);

      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      if (Number(values.employee_count ?? 0) > Number(values.total_employee_count ?? 0)) {
        throw new Error("Nhân sự hiệu dụng không được lớn hơn tổng số nhân sự.");
      }
      if (!values.sites?.length) {
        throw new Error("Phải có ít nhất một địa điểm chứng nhận.");
      }
      const missingSiteIndex = values.sites.findIndex((site) => !site?.address?.trim());
      if (missingSiteIndex >= 0) {
        const issue: CreationValidationIssue = {
          name: ["sites", missingSiteIndex, "address"],
          message: `Nhập địa chỉ địa điểm ${String(missingSiteIndex + 1).padStart(2, "0")}`,
          step: 0,
          label: `Địa chỉ địa điểm ${String(missingSiteIndex + 1).padStart(2, "0")}`,
        };
        setValidationIssues([issue]);
        setCreationError("Dữ liệu địa điểm chứng nhận chưa hoàn chỉnh.");
        window.setTimeout(() => wizardForm.scrollToField(issue.name, { block: "center" }), 80);
        throw new Error(issue.message);
      }
      if (!values.sites.some((site) => site?.is_headquarters)) {
        throw new Error("Phải xác định một địa điểm là trụ sở chính.");
      }
      return;
    }

    if (actualStep === 1) {
      await wizardForm.validateFields([
        "review_items",
        "review_result",
        "audit_field",
        "iaf_code",
        "isic_code",
        "manday_method",
        "base_mandays",
        "manday_adjustments",
        "final_mandays",
        "stage1_mandays",
        "stage2_mandays",
        "conclusion",
        "reviewer_id",
      ]);

      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      if (values.reviewer_id === currentUserId) {
        throw new Error("Người lập/coordinator và reviewer phải là hai tài khoản khác nhau.");
      }
      const stage1 = Number(values.stage1_mandays ?? 0);
      const stage2 = Number(values.stage2_mandays ?? 0);
      const total = Number(values.final_mandays ?? 0);
      if (stage1 < 0.5) {
        throw new Error("Ngày công giai đoạn 1 không được thấp hơn 0,5 MD.");
      }
      if (stage2 < 1) {
        throw new Error("Ngày công giai đoạn 2 không được thấp hơn 1 MD.");
      }
      if (Number(values.surveillance_mandays ?? 0) > 0 && Number(values.surveillance_mandays) < 1) {
        throw new Error("Ngày công đánh giá giám sát không được thấp hơn 1 MD.");
      }
      if (Number(values.recertification_mandays ?? 0) > 0 && Number(values.recertification_mandays) < 1) {
        throw new Error("Ngày công tái chứng nhận không được thấp hơn 1 MD.");
      }
      if (Math.abs(stage1 + stage2 - total) > 0.01) {
        throw new Error("Tổng ngày công giai đoạn 1 và giai đoạn 2 phải bằng ngày công lần đầu.");
      }
      const adjustmentTotals = getCurrentManualAdjustmentTotals();
      if (adjustmentTotals.reduction > 30) {
        throw new Error("Tổng tỷ lệ giảm theo IAF MD5 không được vượt quá 30%.");
      }
      if (integrationReductionPercent > 20) {
        throw new Error("Tổng tỷ lệ giảm cho hệ thống tích hợp không được vượt quá 20%.");
      }
      return;
    }

    if (actualStep === 2) {
      if (contractMode === "existing") {
        await wizardForm.validateFields(["existing_contract_id"]);
      } else if (contractMode === "new") {
        await wizardForm.validateFields([
          "contract_number",
          "contract_sign_date",
          "contract_start_date",
        ]);
      }

      if (agreementMode === "existing") {
        await wizardForm.validateFields(["existing_agreement_id"]);
      } else if (agreementMode === "new") {
        await wizardForm.validateFields(["agreement_number", "agreement_sign_date"]);
      }

      if (contractMode === "none" && agreementMode === "none") {
        throw new Error("Phải có ít nhất hợp đồng hoặc thỏa thuận chứng nhận.");
      }
      return;
    }

    if (actualStep === 3) {
      await wizardForm.validateFields(["project_code"]);
    }
  };

  const validateAllCreationSteps = async () => {
    for (let step = 0; step < currentWizardSteps.length; step += 1) {
      try {
        await validateCurrentStep(step);
      } catch (error) {
        setCreationStep(step);
        throw error;
      }
    }
  };

  const goToNextStep = async () => {
    try {
      setCreationError(null);
      setValidationIssues([]);
      await validateCurrentStep();
      if (isApplicationWorkspace && creationStep === 0) {
        setCreationSubmitting(true);
        const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
        await ensureApplicationCreated(values);
      }
      setCreationStep((current) => Math.min(current + 1, currentWizardSteps.length - 1));
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };

  const normalizeMandayAdjustments = (values: ProjectCreationValues) => (
    (values.manday_adjustments ?? [])
      .filter((adjustment) => (
        adjustment?.adjustment_type &&
        adjustment.adjustment_type !== "ims_reduction" &&
        adjustment.factor_code?.trim() &&
        Number(adjustment.percentage ?? 0) > 0 &&
        adjustment.reason?.trim()
      ))
      .map((adjustment) => ({
        adjustment_type: adjustment.adjustment_type,
        factor_code: adjustment.factor_code!.trim(),
        percentage: Number(adjustment.percentage),
        reason: adjustment.reason!.trim(),
      }))
  );

  const buildApplicationPayload = (values: ProjectCreationValues) => ({
    customer_id: values.customer_id,
    application_code: values.application_code?.trim(),
    application_date: formatDatePayload(values.application_date),
    certification_type: values.certification_type,
    other_certification_type: values.other_certification_type?.trim() || undefined,
    standard_name: (values.standard_names ?? []).join(" + "),
    certification_scope: values.certification_scope?.trim(),
    excluded_clauses: values.excluded_clauses?.trim() || undefined,
    company_name_en: values.company_name_en?.trim() || undefined,
    headquarters_address: values.headquarters_address?.trim() || undefined,
    representative_name: values.representative_name?.trim() || undefined,
    representative_position: values.representative_position?.trim() || undefined,
    representative_phone: values.representative_phone?.trim() || undefined,
    representative_fax: values.representative_fax?.trim() || undefined,
    representative_email: values.representative_email?.trim() || undefined,
    contact_name: values.contact_name?.trim() || undefined,
    contact_position: values.contact_position?.trim() || undefined,
    contact_phone: values.contact_phone?.trim() || undefined,
    contact_fax: values.contact_fax?.trim() || undefined,
    contact_email: values.contact_email?.trim() || undefined,
    total_employee_count: values.total_employee_count,
    employee_count: values.employee_count,
    shift_count: [values.shift1_count, values.shift2_count, values.shift3_count]
      .filter((value) => Number(value ?? 0) > 0).length || 1,
    shift1_count: values.shift1_count,
    shift2_count: values.shift2_count,
    shift3_count: values.shift3_count,
    external_provider_used: values.external_provider_used ?? false,
    outsourced_processes: values.outsourced_processes?.trim() || undefined,
    stage1_requested_date: formatDatePayload(values.stage1_requested_date),
    stage2_requested_date: formatDatePayload(values.stage2_requested_date),
    other_management_systems: values.other_management_systems ?? false,
    management_system_details: values.management_system_details?.trim() || undefined,
    associated_documents: values.associated_documents ?? [],
    consultant_organization: values.consultant_organization?.trim() || undefined,
    consultant_name: values.consultant_name?.trim() || undefined,
    certificate_languages: values.certificate_languages ?? [],
    other_requests: values.other_requests?.trim() || undefined,
    declaration_accepted: values.declaration_accepted ?? false,
    sites: normalizeApplicationSites(
      values.sites,
      values.headquarters_address,
      values.certification_scope,
      values.employee_count,
    ).map((site, index) => ({
      site_no: index + 1,
      site_name: site.site_name,
      address: site.address,
      activities: site.activities,
      employee_count: site.employee_count,
      is_headquarters: index === 0,
    })),
  });

  const buildReviewPayload = (
    applicationId: string,
    values: ProjectCreationValues,
    submissionAction: "SAVE_DRAFT" | "SUBMIT",
  ) => {
    const adjustments = normalizeMandayAdjustments(values);

    return {
    application_id: applicationId,
    submission_action: submissionAction,
    review_date: dayjs().format("YYYY-MM-DD"),
    result: values.review_result ?? "ACCEPTED",
    comment: values.review_comment?.trim() || undefined,
    review_items: values.review_items ?? defaultReviewItems,
    audit_field: values.audit_field?.trim() || values.certification_scope?.trim(),
    industry_scopes: values.industry_scopes ?? [],
    iaf_code: values.industry_scopes?.[0]?.iaf_code ?? values.iaf_code?.trim(),
    isic_code: values.industry_scopes?.[0]?.isic_code ?? values.isic_code?.trim(),
    proposed_auditor_id: values.proposed_auditor_id ?? values.proposed_auditor_ids?.[0],
    proposed_auditor_ids: values.proposed_auditor_ids ?? [],
    effective_personnel: effectivePersonnelForCalculation,
    ims_integration_criteria: values.ims_integration_criteria ?? [],
    ims_integration_percent: values.ims_integration_percent ?? imsIntegrationPercent,
    combined_audit_capability_percent:
      values.combined_audit_capability_percent ?? combinedAuditCapabilityPercent,
    risk_level: values.ems_complexity ?? values.ohsms_complexity ?? values.risk_level,
    ems_complexity: values.ems_complexity,
    ohsms_complexity: values.ohsms_complexity,
    manday_method: values.manday_method,
    base_mandays: values.base_mandays,
    increase_factors: serializeMandayAdjustments(adjustments, ["increase"]),
    increase_percent: adjustments
      .filter((item) => item.adjustment_type === "increase")
      .reduce((sum, item) => sum + item.percentage, 0),
    reduction_factors: serializeMandayAdjustments(adjustments, ["reduction"]),
    reduction_percent: adjustments
      .filter((item) => item.adjustment_type === "reduction")
      .reduce((sum, item) => sum + item.percentage, 0),
    integration_reduction_percent: values.integration_reduction_percent ?? 0,
    final_mandays: values.final_mandays,
    stage1_mandays: values.stage1_mandays,
    stage2_mandays: values.stage2_mandays,
    surveillance_mandays: values.surveillance_mandays,
    recertification_mandays: values.recertification_mandays,
    stage1_proposed_date: formatMonthPayload(values.stage1_proposed_date ?? values.stage1_requested_date),
    stage2_proposed_date: formatMonthPayload(values.stage2_proposed_date ?? values.stage2_requested_date),
    surveillance1_date: formatMonthPayload(values.surveillance1_date),
    surveillance2_date: formatMonthPayload(values.surveillance2_date),
    recertification_date: formatMonthPayload(values.recertification_date),
    conclusion: values.conclusion?.trim() || undefined,
    client_code: values.client_code?.trim() || undefined,
    reviewer_id: values.reviewer_id,
    };
  };

  const ensureApplicationCreated = async (values: ProjectCreationValues) => {
    if (values.application_mode === "existing") {
      const matchedApplication = applications.find((item) => item.id === values.existing_application_id) ?? savedApplication;
      if (!matchedApplication) throw new Error("Không tìm thấy đơn đăng ký đã chọn.");
      return matchedApplication;
    }

    if (savedApplication) {
      if (isApplicationWorkspace && applicationDialogMode === "edit") {
        const response = await api.patch<ProjectApplication>(
          `/certification-applications/${savedApplication.id}`,
          buildApplicationPayload(values),
        );
        setSavedApplication(response.data);
        queryClient.setQueryData<ProjectApplication[]>(["certification-applications"], (current) =>
          current?.map((item) => item.id === response.data.id ? response.data : item),
        );
        void queryClient.invalidateQueries({ queryKey: ["certification-applications"] });
        return response.data;
      }
      return savedApplication;
    }

    const applicationResponse = await api.post<ProjectApplication>(
      "/certification-applications",
      buildApplicationPayload(values),
    );
    const application = applicationResponse.data;
    setSavedApplication(application);
    queryClient.setQueryData<ProjectApplication[]>(["certification-applications"], (current) =>
      current ? [application, ...current.filter((item) => item.id !== application.id)] : [application],
    );
    void queryClient.invalidateQueries({ queryKey: ["certification-applications"] });
    wizardForm.setFieldValue("application_code", application.application_code);
    return application;
  };

  const checkCertificationBodyCapability = async () => {
    try {
      setCreationError(null);
      setCreationSubmitting(true);
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      const application = await ensureApplicationCreated(values);
      const response = await api.post<{ id: string }>(
        "/application-reviews",
        buildReviewPayload(application.id, values, "SAVE_DRAFT"),
      );
      setDraftReviewId(response.data.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["application-reviews"] }),
        queryClient.invalidateQueries({ queryKey: ["application-review-capability", response.data.id] }),
      ]);
      message.success("Đã lưu nháp và đối chiếu năng lực tổ chức chứng nhận.");
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };

  const submitApplicationReview = async () => {
    try {
      setCreationError(null);
      setValidationIssues([]);
      await validateCurrentStep(1);
      setCreationSubmitting(true);
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      const application = await ensureApplicationCreated(values);
      await api.post("/application-reviews", buildReviewPayload(application.id, values, "SUBMIT"));
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["application-reviews"] }),
        invalidatePersonalWorkflowQueries(queryClient),
      ]);
      message.success(`Đã gửi bản xem xét đơn ${application.application_code} tới reviewer`);
      closeCreationWizard();
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };

  const saveApplicationReviewDraft = async () => {
    try {
      setCreationError(null);
      setCreationSubmitting(true);
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      const application = await ensureApplicationCreated(values);
      const response = await api.post<{ id: string }>("/application-reviews", buildReviewPayload(application.id, values, "SAVE_DRAFT"));
      setDraftReviewId(response.data.id);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["application-reviews"] }),
      ]);
      message.success("Đã lưu bản nháp Application Review.");
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };

  const submitWorkflowAction = async (action: "RETURN" | "APPROVE") => {
    const reviewId = latestWorkflowReview?.id;
    if (!reviewId) return;
    if (action === "RETURN" && !workflowComment.trim()) {
      message.warning("Nhập lý do trước khi trả lại.");
      return;
    }

    setWorkflowActionSubmitting(true);
    try {
      await api.patch(`/application-reviews/${reviewId}/review`, {
        action,
        comment: workflowComment.trim() || undefined,
      });
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["application-reviews"] }),
        invalidatePersonalWorkflowQueries(queryClient),
        queryClient.invalidateQueries({ queryKey: ["notifications"] }),
      ]);
      const successMessages: Record<string, string> = {
        RETURN: "Đã trả lại bản xem xét để chỉnh sửa.",
        APPROVE: "Đã phê duyệt bản xem xét đăng ký.",
      };
      message.success(successMessages[action]);
      setWorkflowComment("");
      closeCreationWizard();
    } catch (error) {
      message.error(getErrorMessage(error));
    } finally {
      setWorkflowActionSubmitting(false);
    }
  };

  const openIndustrySelector = () => {
    const currentScopes = wizardForm.getFieldValue("industry_scopes") as IndustryScopeSelection[] | undefined;
    const detectedSystems = managementSystemsFromStandards(supportedCalculationStandards);
    setIndustrySelectorIsicIds(Array.from(new Set((currentScopes ?? []).map((scope) => scope.isic_code_id))));
    setIndustrySelectorSystems(detectedSystems.length ? detectedSystems : ["QMS", "EMS", "OHSMS"]);
    setIndustryResolutionRows([]);
    setIndustrySelectorOpen(true);
  };

  const resolveSelectedIndustryCodes = async () => {
    if (!industrySelectorIsicIds.length) return void message.warning("Chọn ít nhất một mã ISIC.");
    if (!industrySelectorSystems.length) return void message.warning("Chọn ít nhất một hệ thống quản lý áp dụng.");

    const requestEntries = industrySelectorIsicIds.flatMap((isicId) => {
      const isic = isicCodes.find((item) => item.id === isicId);
      if (!isic) return [];
      return industrySelectorSystems.map((managementSystem) => ({ isic, managementSystem }));
    });

    if (!requestEntries.length) {
      message.error("Không tìm thấy mã ISIC hợp lệ để tra cứu.");
      return;
    }

    setIndustryResolveLoading(true);
    try {
      const settled = await Promise.allSettled(
        requestEntries.map(async ({ isic, managementSystem }) => {
          const response = await api.get<IndustryResolveResponse>(
            `/industry-classifications/resolve?classification_type=ISIC&revision=${encodeURIComponent(isic.revision)}&code=${encodeURIComponent(isic.code)}&management_system=${managementSystem}`,
          );
          const firstNace = response.data.nace_candidates.find((candidate) => candidate.iaf_candidates.length > 0)
            ?? response.data.nace_candidates[0];

          return {
            key: `${isic.id}:${managementSystem}`,
            response: response.data,
            selected_nace_mapping_id: firstNace?.mapping_id,
            selected_iaf_mapping_id: firstNace?.iaf_candidates[0]?.mapping_id,
            scope_description: reviewApplication?.certification_scope ?? wizardForm.getFieldValue("audit_field") ?? "",
          } satisfies IndustryResolutionRow;
        }),
      );

      const rows = settled.flatMap((result) =>
        result.status === "fulfilled" ? [result.value] : [],
      );
      const failedCount = settled.length - rows.length;

      setIndustryResolutionRows(rows);

      if (!rows.length) {
        message.error("Không tra cứu được mã NACE/IAF. Kiểm tra backend, quyền truy cập và dữ liệu ánh xạ đã phê duyệt.");
        return;
      }

      const noMapping = rows.filter(
        (row) => !row.response.nace_candidates.some((candidate) => candidate.iaf_candidates.length > 0),
      );
      if (failedCount || noMapping.length) {
        message.warning(`${failedCount + noMapping.length} mã/hệ thống chưa tra được ánh xạ NACE–IAF đã phê duyệt.`);
      } else {
        message.success(`Đã tra cứu ${rows.length} kết quả NACE/IAF.`);
      }
    } catch (error) {
      message.error(getErrorMessage(error, "Không tra cứu được mã NACE/IAF"));
    } finally {
      setIndustryResolveLoading(false);
    }
  };

  const updateIndustryResolutionRow = (key: string, patch: Partial<IndustryResolutionRow>) => {
    setIndustryResolutionRows((current) => {
      const sourceRow = current.find((row) => row.key === key);
      if (!sourceRow) return current;
      const sourceId = sourceRow.response.source.id;
      return current.map((row) => {
        const shouldSyncClassification = row.response.source.id === sourceId &&
          (patch.selected_nace_mapping_id !== undefined || patch.selected_iaf_mapping_id !== undefined);
        if (row.key !== key && !shouldSyncClassification) return row;
        const next = { ...row, ...patch };
        if (patch.selected_nace_mapping_id) {
          const candidate = row.response.nace_candidates.find((item) => item.mapping_id === patch.selected_nace_mapping_id);
          if (candidate) {
            next.selected_nace_mapping_id = candidate.mapping_id;
            next.selected_iaf_mapping_id = candidate.iaf_candidates[0]?.mapping_id;
          }
        }
        return next;
      });
    });
  };

  const applyIndustrySelections = () => {
    const scopes: IndustryScopeSelection[] = [];
    for (const row of industryResolutionRows) {
      const naceCandidate = row.response.nace_candidates.find((candidate) => candidate.mapping_id === row.selected_nace_mapping_id);
      const iafCandidate = naceCandidate?.iaf_candidates.find((candidate) => candidate.mapping_id === row.selected_iaf_mapping_id);
      if (!naceCandidate || !iafCandidate) return void message.error(`Chưa chọn đủ NACE và IAF cho ISIC ${row.response.source.code}.`);
      scopes.push({
        isic_code_id: row.response.source.id,
        isic_code: row.response.source.code,
        isic_revision: row.response.source.revision,
        isic_title: row.response.source.title_vi ?? row.response.source.title_en,
        isic_nace_mapping_id: naceCandidate.mapping_id,
        nace_code_id: naceCandidate.nace.id,
        nace_code: naceCandidate.nace.code,
        nace_title: naceCandidate.nace.title_vi ?? naceCandidate.nace.title_en,
        nace_iaf_mapping_id: iafCandidate.mapping_id,
        iaf_code: iafCandidate.iaf_code,
        iaf_name: iafCandidate.iaf_name,
        management_system: row.response.management_system,
        scope_description: row.scope_description.trim() || reviewApplication?.certification_scope || "Chưa mô tả phạm vi",
        is_primary: scopes.length === 0,
      });
    }
    const uniqueScopes = Array.from(new Map(scopes.map((scope) => [`${scope.isic_nace_mapping_id}:${scope.nace_iaf_mapping_id}:${scope.management_system}`, scope])).values());
    wizardForm.setFieldsValue({ industry_scopes: uniqueScopes, isic_code: uniqueScopes[0]?.isic_code, iaf_code: uniqueScopes[0]?.iaf_code });
    setIndustrySelectorOpen(false);
    message.success(`Đã áp dụng ${uniqueScopes.length} phạm vi mã ngành.`);
  };

  const suggestCertificationCycleMonths = (stage2Month?: Dayjs | null, force = false) => {
    if (!stage2Month) return;
    const current = wizardForm.getFieldsValue(["surveillance1_date", "surveillance2_date", "recertification_date"]);
    wizardForm.setFieldsValue({
      surveillance1_date: force || !current.surveillance1_date ? stage2Month.add(12, "month") : current.surveillance1_date,
      surveillance2_date: force || !current.surveillance2_date ? stage2Month.add(24, "month") : current.surveillance2_date,
      recertification_date: force || !current.recertification_date ? stage2Month.add(36, "month") : current.recertification_date,
    });
  };

  const applicationDocumentType = (index: number) => `application_supporting_${String(index + 1).padStart(2, "0")}`;
  const applicationDocumentTypeForName = (documentName: string) => {
    const index = associatedDocumentOptions.findIndex((item) => item === documentName);
    return applicationDocumentType(Math.max(0, index));
  };

  const uploadApplicationSupportingDocument = async (documentName: string, index: number, file: File) => {
    const documentType = applicationDocumentType(index);
    setUploadingApplicationDocument(documentType);
    try {
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      const application = reviewApplication ?? await ensureApplicationCreated(values);
      const formData = new FormData();
      formData.append("file", file);
      formData.append("entity_type", "certification_application");
      formData.append("entity_id", application.id);
      formData.append("document_type", documentType);
      formData.append("file_kind", "attachment");
      formData.append("note", documentName);
      await api.post("/document-files/upload", formData, {
        headers: { "Content-Type": "multipart/form-data" },
        timeout: 120_000,
      });
      const selectedDocuments = wizardForm.getFieldValue("associated_documents") ?? [];
      if (!selectedDocuments.includes(documentName)) {
        wizardForm.setFieldValue("associated_documents", [...selectedDocuments, documentName]);
      }
      await queryClient.invalidateQueries({ queryKey: ["application-document-files", application.id] });
      message.success(`Đã tải lên: ${documentName}`);
    } catch (error) {
      message.error(getErrorMessage(error, "Không tải được tài liệu"));
    } finally {
      setUploadingApplicationDocument(null);
    }
    return false;
  };

  const applicationDocumentDownloadLabel = (file: ApplicationDocumentFile) => (
    /\.(doc|docx)$/i.test(file.original_name) ? "Tải Word" : "Tải file"
  );

  const canPreviewApplicationDocument = (file: ApplicationDocumentFile) =>
    isBrowserPreviewableDocument(file.original_name, file.mime_type);

  const previewApplicationDocument = async (file: ApplicationDocumentFile) => {
    if (!canPreviewApplicationDocument(file)) {
      message.info("Tệp Word/Office chưa thể xem trực tiếp ổn định trong trình duyệt. Dùng nút Tải file; viewer PDF sẽ được bổ sung theo cơ chế chuyển đổi và cache để không làm nặng màn hình.");
      return;
    }
    try {
      await openDocumentFile({
        url: file.download_url || `/document-files/${file.id}/download`,
        filename: file.original_name,
        mimeType: file.mime_type ?? undefined,
        title: file.note || file.original_name,
      });
    } catch (error) {
      message.error(getErrorMessage(error));
    }
  };

  const downloadApplicationDocument = async (file: ApplicationDocumentFile) => {
    try {
      await downloadDocumentFile({
        url: file.download_url || `/document-files/${file.id}/download`,
        filename: file.original_name,
        mimeType: file.mime_type ?? undefined,
      });
    } catch (error) {
      message.error(getErrorMessage(error, "Không tải được tài liệu"));
    }
  };

  const saveApplicationDraft = async () => {
    try {
      setCreationError(null);
      setValidationIssues([]);
      await validateCurrentStep(0);
      setCreationSubmitting(true);
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      const application = await ensureApplicationCreated(values);
      message.success(`Đã lưu đơn ${application.application_code}`);
      closeCreationWizard();
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };

  const ensureApplicationReviewed = async (values: ProjectCreationValues) => {
    const application = await ensureApplicationCreated(values);
    if (normalizeStatus(application.status) !== "accepted") {
      throw new Error("Chỉ có thể khởi tạo hồ sơ từ đơn đăng ký đã được chấp nhận.");
    }
    return application;
  };

  const uploadCommercialFile = async (
    fileList: UploadFile[] | undefined,
    entityType: "contract" | "certification_agreement",
    entityId: string | null | undefined,
    documentType: "signed_contract" | "signed_certification_agreement",
    fileKind: "attachment" | "signed_scan",
  ) => {
    const file = fileList?.[0]?.originFileObj;
    if (!file || !entityId) return false;

    const formData = new FormData();
    formData.append("file", file);
    formData.append("entity_type", entityType);
    formData.append("entity_id", entityId);
    formData.append("document_type", documentType);
    formData.append("file_kind", fileKind);
    formData.append(
      "note",
      fileKind === "signed_scan"
        ? "Bản đã ký tải lên khi khởi tạo hồ sơ chứng nhận"
        : "Tệp đính kèm tải lên khi khởi tạo hồ sơ chứng nhận",
    );

    await api.post("/document-files/upload", formData, {
      headers: { "Content-Type": "multipart/form-data" },
      timeout: 120_000,
    });
    return true;
  };

  const submitProjectCreation = async () => {
    try {
      setCreationError(null);
      setValidationIssues([]);
      await validateAllCreationSteps();
      const values = wizardForm.getFieldsValue(true) as ProjectCreationValues;
      setCreationSubmitting(true);

      if (values.application_mode === "new" && values.review_result !== "ACCEPTED") {
        throw new Error("Hồ sơ chỉ được khởi tạo khi kết quả xem xét đơn đăng ký là Chấp nhận.");
      }

      const application = await ensureApplicationReviewed(values);
      const normalizedAdjustments = normalizeMandayAdjustments(values);

      const projectResponse = await api.post<CertificationProject>("/certification-projects/complete", {
        application_id: application.id,
        project_code: values.project_code?.trim(),
        standard_name: application.standard_name,
        headquarters_address: values.headquarters_address?.trim() || undefined,
        contract_mode: values.contract_mode,
        contract_id: values.contract_mode === "existing" ? values.existing_contract_id : undefined,
        contract: values.contract_mode === "new" ? {
          contract_number: values.contract_number?.trim(),
          sign_date: formatDatePayload(values.contract_sign_date),
          start_date: formatDatePayload(values.contract_start_date),
          end_date: formatDatePayload(values.contract_end_date),
          total_value: values.contract_total_value,
          currency: values.contract_currency?.trim().toUpperCase(),
        } : undefined,
        agreement_mode: values.agreement_mode,
        agreement_id: values.agreement_mode === "existing" ? values.existing_agreement_id : undefined,
        agreement: values.agreement_mode === "new" ? {
          agreement_number: values.agreement_number?.trim(),
          sign_date: formatDatePayload(values.agreement_sign_date),
        } : undefined,
      });

      const commercialUploadFailures: string[] = [];
      const contractEntityId = projectResponse.data.contracts?.id ?? projectResponse.data.contract_id;
      const agreementEntityId = projectResponse.data.certification_agreements?.id ?? projectResponse.data.agreement_id;

      try {
        await uploadCommercialFile(
          values.contract_file_list,
          "contract",
          contractEntityId,
          "signed_contract",
          values.contract_file_kind ?? "signed_scan",
        );
      } catch (error) {
        commercialUploadFailures.push(`Hợp đồng: ${getErrorMessage(error)}`);
      }

      try {
        await uploadCommercialFile(
          values.agreement_file_list,
          "certification_agreement",
          agreementEntityId,
          "signed_certification_agreement",
          values.agreement_file_kind ?? "signed_scan",
        );
      } catch (error) {
        commercialUploadFailures.push(`Thỏa thuận: ${getErrorMessage(error)}`);
      }

      if (commercialUploadFailures.length) {
        message.warning(
          `Hồ sơ đã tạo nhưng chưa tải được một số tệp: ${commercialUploadFailures.join("; ")}`,
          8,
        );
      }

      if (values.final_mandays && values.base_mandays && values.employee_count) {
        try {
          await api.post("/manday-calculations", {
            project_id: projectResponse.data.id,
            audit_type: values.certification_type === "RECERTIFICATION"
              ? "recertification"
              : values.certification_type === "TRANSFER"
                ? "transfer"
                : "initial",
            standard_type: application.standard_name,
            effective_personnel: values.employee_count,
            total_sites: Math.max(1, values.sites?.length ?? 1),
            sampled_sites: Math.max(1, values.sites?.length ?? 1),
            complexity_level: (values.ems_complexity ?? values.ohsms_complexity ?? values.risk_level)?.toLowerCase(),
            base_mandays: values.base_mandays,
            stage1_mandays: values.stage1_mandays,
            stage2_mandays: values.stage2_mandays,
            increase_percent: normalizedAdjustments
              .filter((item) => item.adjustment_type === "increase")
              .reduce((sum, item) => sum + item.percentage, 0),
            reduction_percent: normalizedAdjustments
              .filter((item) => item.adjustment_type === "reduction")
              .reduce((sum, item) => sum + item.percentage, 0),
            ims_reduction_percent: Number(values.integration_reduction_percent ?? 0),
            adjustments: normalizedAdjustments,
            calculation_basis: [
              values.manday_method,
              values.iaf_code ? `IAF ${values.iaf_code}` : undefined,
              values.isic_code ? `ISIC ${values.isic_code}` : undefined,
              ...normalizedAdjustments.map((item) => `${item.factor_code}: ${item.percentage}% - ${item.reason}`),
            ].filter(Boolean).join(" · "),
            status: "submitted",
          });
        } catch {
          message.warning("Hồ sơ đã tạo nhưng bản tính man-day chưa được lưu. Có thể bổ sung trong hồ sơ.");
        }
      }

      await Promise.all([
        queryClient.invalidateQueries({ queryKey: ["certification-projects"] }),
        queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
        queryClient.invalidateQueries({ queryKey: ["contracts"] }),
        queryClient.invalidateQueries({ queryKey: ["certification-agreements"] }),
        queryClient.invalidateQueries({ queryKey: ["document-files"] }),
        queryClient.invalidateQueries({ queryKey: ["dashboard"] }),
        invalidatePersonalWorkflowQueries(queryClient),
      ]);

      setCreatedProjectId(projectResponse.data.id);
      message.success(`Đã tạo hồ sơ ${projectResponse.data.project_code}`);
    } catch (error) {
      handleCreationFailure(error);
    } finally {
      setCreationSubmitting(false);
    }
  };


  const applicationHasProject = (application: ProjectApplication) => (
    Boolean(application.certification_projects?.length) ||
    normalizeStatus(application.status) === "project_created"
  );

  const applicationHasActiveWorkflow = (application: ProjectApplication) => {
    const workflow = String(application.application_reviews?.[0]?.workflow_status ?? "").toUpperCase();
    return ["SUBMITTED", "APPROVED"].includes(workflow);
  };

  const canEditApplication = (application: ProjectApplication) => (
    canManageApplications && !applicationHasProject(application) && !applicationHasActiveWorkflow(application)
  );

  const canDeleteApplication = (application: ProjectApplication) => (
    canManageApplications && !applicationHasProject(application) && !applicationHasActiveWorkflow(application)
  );

  const confirmDeleteApplication = (application: ProjectApplication) => {
    Modal.confirm({
      title: `Xóa đơn ${application.application_code}?`,
      content: "Thao tác sẽ xóa đơn, địa điểm và lịch sử xem xét liên quan. Không thể hoàn tác.",
      okText: "Xóa đơn",
      okButtonProps: { danger: true },
      cancelText: "Hủy",
      onOk: async () => {
        try {
          await api.delete(`/certification-applications/${application.id}`);
          await Promise.all([
            queryClient.invalidateQueries({ queryKey: ["certification-applications"] }),
            queryClient.invalidateQueries({ queryKey: ["application-reviews"] }),
            invalidatePersonalWorkflowQueries(queryClient),
          ]);
          message.success(`Đã xóa đơn ${application.application_code}`);
        } catch (error) {
          message.error(getErrorMessage(error, "Không xóa được đơn đăng ký"));
          throw error;
        }
      },
    });
  };

  const columns: TableColumnsType<CertificationProject> = [
    {
      title: "Mã hồ sơ",
      dataIndex: "project_code",
      key: "project_code",
      width: 145,
      render: (value: string, record) => (
        <button className="project-code-link" onClick={() => onOpenProject(record.id)} type="button">
          {value}
        </button>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 220,
      render: (_, record) => (
        <div className="project-customer-cell">
          <strong>{record.certification_applications?.customers?.company_name ?? "Chưa xác định"}</strong>
          <small>{record.certification_applications?.customers?.customer_code ?? "—"}</small>
        </div>
      ),
    },
    { title: "Tiêu chuẩn", dataIndex: "standard_name", key: "standard_name", width: 145 },
    {
      title: "Đơn đăng ký",
      key: "application",
      responsive: ["lg"],
      width: 135,
      render: (_, record) => record.certification_applications?.application_code ?? "—",
    },
    {
      title: "Hợp đồng / thỏa thuận",
      key: "commercial_documents",
      responsive: ["xl"],
      width: 190,
      render: (_, record) => (
        <div className="project-reference-cell">
          <span>{record.contracts?.contract_number ?? "Chưa có hợp đồng"}</span>
          <small>{record.certification_agreements?.agreement_number ?? "Chưa có thỏa thuận"}</small>
        </div>
      ),
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 155,
      render: (value: string) => <ProjectStatusTag status={value} />,
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      responsive: ["xl"],
      width: 105,
      render: (value: string) => dayjs(value).format("DD/MM/YYYY"),
    },
    {
      title: "",
      key: "action",
      width: 92,
      render: (_, record) => <Button onClick={() => onOpenProject(record.id)} size="small">Mở hồ sơ</Button>,
    },
  ];

  const applicationColumns: TableColumnsType<ProjectApplication> = [
    {
      title: "Mã đơn",
      dataIndex: "application_code",
      key: "application_code",
      width: 150,
      render: (value: string, record) => (
        <button
          className="project-code-link"
          onClick={(event) => { event.stopPropagation(); openApplicationView(record); }}
          type="button"
        >
          {value}
        </button>
      ),
    },
    {
      title: "Khách hàng",
      key: "customer",
      width: 240,
      render: (_, record) => (
        <div className="project-customer-cell">
          <strong>{record.customers?.company_name ?? "Chưa xác định"}</strong>
          <small>{record.customers?.customer_code ?? "—"}</small>
        </div>
      ),
    },
    {
      title: "Tiêu chuẩn / phạm vi",
      key: "standard_scope",
      width: 300,
      render: (_, record) => (
        <div className="project-reference-cell">
          <span>{record.standard_name}</span>
          <small>{record.certification_scope ?? "—"}</small>
        </div>
      ),
    },
    {
      title: "Nhân sự / địa điểm",
      key: "resources",
      responsive: ["lg"],
      width: 150,
      render: (_, record) => `${record.employee_count ?? "—"} người · ${record.sites?.length ?? record.site_count ?? 1} địa điểm`,
    },
    {
      title: "Trạng thái",
      dataIndex: "status",
      key: "status",
      width: 150,
      render: (value: string, record) => {
        const workflow = String(record.application_reviews?.[0]?.workflow_status ?? "").toUpperCase();
        if (workflow === "SUBMITTED") return <Tag color="purple" icon={<ClockCircleOutlined />}>Đã gửi reviewer</Tag>;
        if (workflow === "RETURNED") return <Tag color="orange" icon={<WarningOutlined />}>Cần chỉnh sửa xem xét</Tag>;
        if (workflow === "APPROVED") return <Tag color="green" icon={<CheckCircleOutlined />}>Đã phê duyệt xem xét</Tag>;
        if (workflow === "DRAFT") return <Tag color="blue" icon={<FileSearchOutlined />}>Đang lập xem xét</Tag>;
        return <ProjectStatusTag status={value} />;
      },
    },
    {
      title: "Cập nhật",
      dataIndex: "updated_at",
      key: "updated_at",
      responsive: ["xl"],
      width: 110,
      render: (value?: string) => value ? dayjs(value).format("DD/MM/YYYY") : "—",
    },
    {
      title: "",
      key: "action",
      width: 260,
      render: (_, record) => (
        <Space size={4} wrap onClick={(event) => event.stopPropagation()}>
          <Button icon={<EyeOutlined />} onClick={() => openApplicationView(record)} size="small">Xem đơn</Button>
          <Button
            icon={<FileSearchOutlined />}
            onClick={() => {
              const workflow = String(record.application_reviews?.[0]?.workflow_status ?? "").toUpperCase();
              const assignedReviewerId = record.application_reviews?.[0]?.reviewer_id;
              if (workflow === "SUBMITTED" && assignedReviewerId !== currentUserId) return openApplicationStatus(record);
              if (workflow === "APPROVED") return openApplicationStatus(record);
              return openApplicationReview(record);
            }}
            size="small"
            type={normalizeStatus(record.status) === "accepted" ? "default" : "primary"}
          >
            {(() => {
              const workflow = String(record.application_reviews?.[0]?.workflow_status ?? "").toUpperCase();
              if (workflow === "SUBMITTED") {
                const assignedReviewerId = record.application_reviews?.[0]?.reviewer_id;
                return assignedReviewerId === currentUserId ? "Xem xét" : "Xem trạng thái";
              }
              if (workflow === "RETURNED") return "Sửa & gửi lại";
              if (workflow === "APPROVED") return "Xem lại";
              if (workflow === "DRAFT") return "Tiếp tục xem xét";
              return normalizeStatus(record.status) === "accepted" ? "Xem lại" : "Xem xét";
            })()}
          </Button>
          <Button
            disabled={!canEditApplication(record)}
            icon={<EditOutlined />}
            onClick={() => openApplicationEdit(record)}
            size="small"
          />
          <Button
            danger
            disabled={!canDeleteApplication(record)}
            icon={<DeleteOutlined />}
            onClick={() => confirmDeleteApplication(record)}
            size="small"
          />
        </Space>
      ),
    },
  ];

  const creationQueriesLoading = customersQuery.isLoading || applicationsQuery.isLoading || contractsQuery.isLoading || agreementsQuery.isLoading;
  const creationQueryError = customersQuery.error || applicationsQuery.error || contractsQuery.error || agreementsQuery.error;

  const primaryListQuery = isApplicationWorkspace ? applicationsQuery : projectsQuery;

  if (primaryListQuery.isLoading) {
    return <Card className="projects-screen-loading"><Skeleton active paragraph={{ rows: 12 }} /></Card>;
  }

  if (primaryListQuery.isError) {
    return (
      <Card className="projects-screen-error">
        <Empty description={getErrorMessage(primaryListQuery.error)} />
        <Button onClick={() => void primaryListQuery.refetch()}>Thử lại</Button>
      </Card>
    );
  }

  return (
    <div className="projects-screen">
      <div className="module-page-heading">
        <div>
          <span className="eyebrow">QUẢN LÝ CHỨNG NHẬN</span>
          <Title level={2}>{isApplicationWorkspace ? "Đơn đăng ký chứng nhận" : "Hồ sơ chứng nhận"}</Title>
          <Text type="secondary">
            {isApplicationWorkspace
              ? "Tiếp nhận đơn, yêu cầu bổ sung và thực hiện xem xét trước khi khởi tạo hồ sơ chứng nhận."
              : "Quản lý các hồ sơ đã được khởi tạo từ đơn đăng ký được chấp nhận."}
          </Text>
        </div>
        <Button icon={<PlusOutlined />} onClick={openCreationWizard} type="primary">
          {isApplicationWorkspace ? "Tạo đơn đăng ký" : "Khởi tạo từ đơn đã duyệt"}
        </Button>
      </div>

      <section className="project-summary-strip" aria-label={isApplicationWorkspace ? "Tổng hợp đơn đăng ký" : "Tổng hợp hồ sơ chứng nhận"}>
        {isApplicationWorkspace ? (
          <>
            <div><FileSearchOutlined /><span>Tổng đơn</span><strong>{applications.length}</strong></div>
            <div><ClockCircleOutlined /><span>Chờ xem xét</span><strong>{pendingApplications}</strong></div>
            <div><WarningOutlined /><span>Chờ bổ sung</span><strong>{moreInfoApplications}</strong></div>
            <div><CheckCircleOutlined /><span>Đã chấp nhận</span><strong>{acceptedApplicationCount}</strong></div>
          </>
        ) : (
          <>
            <div><FolderOpenOutlined /><span>Tổng hồ sơ</span><strong>{projects.length}</strong></div>
            <div><ClockCircleOutlined /><span>Đang thực hiện</span><strong>{activeProjects}</strong></div>
            <div><WarningOutlined /><span>Cần xử lý</span><strong>{attentionProjects}</strong></div>
            <div><CheckCircleOutlined /><span>Đã cấp chứng chỉ</span><strong>{issuedProjects}</strong></div>
          </>
        )}
      </section>

      <Card className="projects-list-card">
        <div className="project-list-toolbar">
          <Input
            allowClear
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder={isApplicationWorkspace ? "Tìm mã đơn, khách hàng, tiêu chuẩn..." : "Tìm mã hồ sơ, khách hàng, đơn đăng ký..."}
            prefix={<SearchOutlined />}
            value={searchTerm}
          />
          <Select
            aria-label="Lọc theo trạng thái"
            onChange={setStatusFilter}
            options={[
              { value: "all", label: "Tất cả trạng thái" },
              ...(isApplicationWorkspace ? applicationStatuses : statuses).map((status) => ({ value: status, label: statusLabels[status] ?? status.replaceAll("_", " ") })),
            ]}
            value={statusFilter}
          />
          <Select
            aria-label="Lọc theo tiêu chuẩn"
            onChange={setStandardFilter}
            options={[
              { value: "all", label: "Tất cả tiêu chuẩn" },
              ...(isApplicationWorkspace ? applicationStandards : standards).map((standard) => ({ value: standard, label: standard })),
            ]}
            value={standardFilter}
          />
          {isApplicationWorkspace && (
            <Select
              aria-label="Lọc theo tháng cập nhật"
              onChange={setApplicationMonthFilter}
              options={[
                { value: "all", label: "Tất cả tháng" },
                ...Array.from({ length: 12 }, (_, index) => ({ value: String(index + 1), label: `Tháng ${index + 1}` })),
              ]}
              value={applicationMonthFilter}
            />
          )}
          {isApplicationWorkspace && (
            <Select
              aria-label="Lọc theo năm cập nhật"
              onChange={setApplicationYearFilter}
              options={[
                { value: "all", label: "Tất cả năm" },
                ...applicationYears.map((year) => ({ value: String(year), label: String(year) })),
              ]}
              value={applicationYearFilter}
            />
          )}
        </div>

        <Table<CertificationWorkspaceRow>
          columns={(isApplicationWorkspace ? applicationColumns : columns) as TableColumnsType<CertificationWorkspaceRow>}
          dataSource={isApplicationWorkspace ? filteredApplications : filteredProjects}
          locale={{
            emptyText: (
              <Empty
                image={Empty.PRESENTED_IMAGE_SIMPLE}
                description={isApplicationWorkspace
                  ? (applications.length ? "Không có đơn phù hợp bộ lọc" : "Chưa có đơn đăng ký chứng nhận")
                  : (projects.length ? "Không có hồ sơ phù hợp bộ lọc" : "Chưa có hồ sơ chứng nhận")}
              />
            ),
          }}
          onRow={(record) => isApplicationWorkspace
            ? ({
                className: "clickable-project-row",
                onClick: () => openApplicationView(record as ProjectApplication),
              })
            : ({
                className: "clickable-project-row",
                onClick: () => onOpenProject((record as CertificationProject).id),
              })}
          pagination={{
            pageSize: 10,
            showSizeChanger: false,
            showTotal: (total) => `${total} ${isApplicationWorkspace ? "đơn" : "hồ sơ"}`,
          }}
          rowKey="id"
        />
      </Card>

      <Modal
        className={isApplicationWorkspace ? "application-wizard-modal" : "project-wizard-modal"}
        cancelText="Đóng"
        destroyOnHidden
        footer={createdProjectId ? (
          <Space>
            <Button onClick={closeCreationWizard}>Đóng</Button>
            <Button
              onClick={() => {
                const projectId = createdProjectId;
                closeCreationWizard();
                onOpenProject(projectId);
              }}
              type="primary"
            >
              Mở hồ sơ vừa tạo
            </Button>
          </Space>
        ) : isApplicationWorkspace ? (
          applicationDialogMode === "status" ? (
            <Button onClick={closeCreationWizard}>Đóng</Button>
          ) : applicationDialogMode === "view" ? (
            <Space wrap>
              <Button onClick={closeCreationWizard}>Đóng</Button>
              {savedApplication && canEditApplication(savedApplication) && (
                <Button icon={<EditOutlined />} onClick={() => openApplicationEdit(savedApplication)}>Chỉnh sửa đơn</Button>
              )}
              {savedApplication && (
                <Button icon={<FileSearchOutlined />} onClick={() => openApplicationReview(savedApplication)} type="primary">Mở xem xét</Button>
              )}
            </Space>
          ) : applicationDialogMode === "edit" ? (
            <Space wrap>
              <Button disabled={creationSubmitting} onClick={closeCreationWizard}>Hủy</Button>
              <Button loading={creationSubmitting} onClick={() => void saveApplicationDraft()} type="primary">Lưu thay đổi</Button>
            </Space>
          ) : hasActiveWorkflow ? (
            <Space wrap>
              <Button onClick={closeCreationWizard}>Đóng</Button>
              {canReviewWorkflow && (
                <>
                  <Button
                    danger
                    loading={workflowActionSubmitting}
                    onClick={() => void submitWorkflowAction("RETURN")}
                  >
                    Trả coordinator
                  </Button>
                  <Button
                    disabled={capabilityEvaluation?.overall_result !== "CAPABLE"}
                    loading={workflowActionSubmitting || capabilityEvaluationQuery.isLoading}
                    onClick={() => void submitWorkflowAction("APPROVE")}
                    type="primary"
                  >
                    Phê duyệt
                  </Button>
                </>
              )}
            </Space>
          ) : (
            <Space wrap>
              <Button disabled={creationSubmitting} onClick={closeCreationWizard}>Hủy</Button>
              {creationStep > 0 && (
                <Button disabled={creationSubmitting} onClick={() => setCreationStep((current) => Math.max(current - 1, 0))}>
                  Quay lại
                </Button>
              )}
              {actualCreationStep === 0 && (
                <Button loading={creationSubmitting} onClick={() => void saveApplicationDraft()}>
                  Lưu đơn
                </Button>
              )}
              {creationStep < currentWizardSteps.length - 1 ? (
                <Button loading={creationSubmitting} onClick={() => void goToNextStep()} type="primary">
                  Lưu & lập xem xét
                </Button>
              ) : (
                <>
                  <Button loading={creationSubmitting} onClick={() => void saveApplicationReviewDraft()}>
                    Lưu nháp
                  </Button>
                  <Button loading={creationSubmitting} onClick={() => void submitApplicationReview()} type="primary">
                    {reviewWorkflowStatus === "RETURNED" ? "Gửi lại reviewer" : "Gửi reviewer"}
                  </Button>
                </>
              )}
            </Space>
          )
        ) : (
          <Space wrap>
            <Button disabled={creationSubmitting} onClick={closeCreationWizard}>Hủy</Button>
            {creationStep > 0 && (
              <Button disabled={creationSubmitting} onClick={() => setCreationStep((current) => Math.max(current - 1, 0))}>
                Quay lại
              </Button>
            )}
            {creationStep < currentWizardSteps.length - 1 ? (
              <Button loading={creationSubmitting} onClick={() => void goToNextStep()} type="primary">
                Tiếp tục
              </Button>
            ) : (
              <Button loading={creationSubmitting} onClick={() => void submitProjectCreation()} type="primary">
                Tạo hồ sơ
              </Button>
            )}
          </Space>
        )}
        maskClosable={false}
        onCancel={closeCreationWizard}
        open={creationOpen}
        styles={{ body: { maxHeight: "78vh", overflowY: "auto" } }}
        title={isApplicationWorkspace ? "Đơn đăng ký chứng nhận" : "Khởi tạo hồ sơ chứng nhận"}
        width={isApplicationWorkspace ? (actualCreationStep === 0 ? 980 : 1080) : 1180}
      >
        {createdProjectId ? (
          <Result
            status="success"
            subTitle="Đơn đăng ký, kết quả xem xét, hồ sơ thương mại, bản tính man-day và dự án chứng nhận đã được liên kết."
            title="Khởi tạo hồ sơ thành công"
          />
        ) : creationQueriesLoading ? (
          <Skeleton active paragraph={{ rows: 10 }} />
        ) : creationQueryError ? (
          <Alert description={getErrorMessage(creationQueryError)} message="Không tải được dữ liệu tạo hồ sơ" showIcon type="error" />
        ) : (
          <Form<ProjectCreationValues>
            className={isApplicationWorkspace ? "application-wizard-form" : "project-wizard-form"}
            disabled={isApplicationWorkspace && (applicationDialogMode === "view" || applicationDialogMode === "status" || (applicationDialogMode === "review" && ["SUBMITTED", "APPROVED"].includes(reviewWorkflowStatus)))}
            form={wizardForm}
            layout="vertical"
            preserve
            requiredMark="optional"
          >
            {(!isApplicationWorkspace || ["create", "review"].includes(applicationDialogMode)) ? (
              <>
                <Steps className="project-creation-steps" current={creationStep} items={currentWizardSteps} size="small" />
                <Divider />
              </>
            ) : (
              <Alert
                message={applicationDialogMode === "view" ? "Thông tin đơn đăng ký ban đầu" : applicationDialogMode === "status" ? "Trạng thái Application Review — chỉ đọc" : "Chỉnh sửa đơn đăng ký"}
                description={applicationDialogMode === "edit" && savedApplication && ["accepted", "rejected"].includes(normalizeStatus(savedApplication.status))
                  ? "Khi lưu thay đổi, kết quả xem xét cũ không còn là căn cứ cuối cùng và đơn sẽ chuyển về trạng thái cần xem xét lại."
                  : undefined}
                showIcon
                type={["view", "status"].includes(applicationDialogMode) ? "info" : "warning"}
                style={{ marginBottom: 16 }}
              />
            )}

            {actualCreationStep === 0 && (
              <div className="project-creation-step">
                <Form.Item hidden name="application_mode"><Input /></Form.Item>
                {!isApplicationWorkspace && (
                  <Alert
                    description="Chỉ các đơn đã được xem xét và chấp nhận mới có thể khởi tạo hồ sơ chứng nhận."
                    message="Chọn đơn đăng ký đã duyệt"
                    showIcon
                    type="info"
                  />
                )}

                {!isApplicationWorkspace && applicationMode === "existing" ? (
                  <>
                    <Alert
                      description="Danh sách chỉ hiển thị đơn đã được chấp nhận và chưa liên kết với hồ sơ chứng nhận."
                      message="Đơn đủ điều kiện khởi tạo"
                      showIcon
                      type="info"
                    />
                    <Form.Item
                      label="Đơn đăng ký"
                      name="existing_application_id"
                      rules={[{ required: true, message: "Chọn đơn đăng ký" }]}
                    >
                      <Select
                        onChange={(value) => {
                          const application = applications.find((item) => item.id === value);
                          setCreationError(null);
                          setValidationIssues([]);
                          if (application) {
                            applyApplicationToForm(application);
                            wizardForm.setFieldValue("application_mode", "existing");
                          }
                          wizardForm.setFieldsValue({
                            existing_contract_id: undefined,
                            existing_agreement_id: undefined,
                          });
                        }}
                        optionFilterProp="label"
                        options={acceptedApplications.map((application) => ({
                          value: application.id,
                          label: `${application.application_code} · ${application.customers?.company_name ?? "Chưa xác định"} · ${application.standard_name}`,
                        }))}
                        placeholder={acceptedApplications.length ? "Chọn đơn đăng ký" : "Chưa có đơn đã chấp nhận chưa tạo hồ sơ"}
                        showSearch
                      />
                    </Form.Item>
                    {selectedApplication && (
                      <div className="project-creation-summary">
                        <div><span>Khách hàng</span><strong>{selectedApplication.customers?.company_name ?? "—"}</strong></div>
                        <div><span>Tiêu chuẩn</span><strong>{selectedApplication.standard_name}</strong></div>
                        <div><span>Phạm vi</span><strong>{selectedApplication.certification_scope ?? "—"}</strong></div>
                        <div><span>Địa điểm</span><strong>{selectedApplication.sites?.length ?? selectedApplication.site_count ?? 1}</strong></div>
                        <div className="span-2">
                          <span>Địa chỉ trụ sở</span>
                          <strong>
                            {selectedApplicationAddress || "Chưa có địa chỉ"}
                          </strong>
                        </div>
                      </div>
                    )}
                    {selectedApplication && !selectedApplicationAddress && (
                      <Alert
                        description="Đơn cũ đã được duyệt nhưng chưa đồng bộ địa chỉ trụ sở với địa điểm 01. Nhập địa chỉ một lần; hệ thống sẽ cập nhật đơn khi tạo hồ sơ."
                        message="Thiếu địa chỉ trong dữ liệu cũ"
                        showIcon
                        type="warning"
                      />
                    )}
                    {selectedApplication && !selectedApplicationAddress && (
                      <Form.Item
                        label="Địa chỉ trụ sở / địa điểm 01"
                        name="headquarters_address"
                        rules={[{ required: true, message: "Nhập địa chỉ trụ sở / địa điểm 01" }]}
                      >
                        <TextArea
                          autoSize={{ minRows: 2, maxRows: 4 }}
                          placeholder="Nhập địa chỉ đã được khách hàng đăng ký và người xem xét xác nhận"
                        />
                      </Form.Item>
                    )}
                  </>
                ) : (
                  <div className="application-entry-stack">
                    <ApplicationEntrySection
                      sectionKey="general"
                      title="1. Thông tin chung"
                      activeSection={applicationEntrySection}
                      onActiveSection={setApplicationEntrySection}
                    >
                      <div className="project-creation-grid application-general-grid">
                        <Form.Item
                          className="span-2"
                          label="Khách hàng"
                          name="customer_id"
                          rules={[{ required: true, message: "Chọn khách hàng" }]}
                        >
                          <Select
                            onChange={(value) => {
                              const customer = customers.find((item) => item.id === value);
                              wizardForm.setFieldsValue({
                                headquarters_address: customer?.address ?? undefined,
                                contact_phone: customer?.phone ?? undefined,
                                contact_email: customer?.email ?? undefined,
                                client_code: customer?.customer_code,
                                sites: [{
                                  site_no: 1,
                                  site_name: "Trụ sở chính",
                                  address: customer?.address ?? "",
                                  activities: wizardForm.getFieldValue("certification_scope") ?? "",
                                  employee_count: wizardForm.getFieldValue("employee_count") ?? 1,
                                  is_headquarters: true,
                                }],
                                existing_contract_id: undefined,
                                existing_agreement_id: undefined,
                              });
                            }}
                            optionFilterProp="label"
                            options={customers
                              .filter((customer) => normalizeStatus(customer.status) !== "inactive")
                              .map((customer) => ({
                                value: customer.id,
                                label: `${customer.customer_code} · ${customer.company_name}`,
                              }))}
                            placeholder="Chọn khách hàng đang hoạt động"
                            showSearch
                          />
                        </Form.Item>
                        {applicationDialogMode !== "create" ? (
                          <Form.Item label="Mã đơn đăng ký" name="application_code">
                            <Input disabled maxLength={50} />
                          </Form.Item>
                        ) : null}
                        <Form.Item label="Ngày đăng ký" name="application_date" rules={[{ required: true, message: "Chọn ngày đăng ký" }]}>
                          <DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item className="span-2" label="Tên tổ chức bằng tiếng Anh" name="company_name_en">
                          <Input maxLength={255} placeholder="Organization name in English" />
                        </Form.Item>
                        <Form.Item className="span-2" label="Địa chỉ trụ sở" name="headquarters_address" rules={[{ required: true, message: "Nhập địa chỉ trụ sở" }]}>
                          <TextArea
                            autoSize={{ minRows: 2, maxRows: 4 }}
                            onBlur={(event) => {
                              const sites = wizardForm.getFieldValue("sites") ?? [];
                              if (sites[0] && !sites[0].address?.trim()) {
                                sites[0].address = event.target.value;
                                wizardForm.setFieldsValue({ sites });
                              }
                            }}
                          />
                        </Form.Item>
                      </div>

                      <div className="application-contact-pair">
                        <section>
                          <div className="application-contact-pair__title">Đại diện tổ chức</div>
                          <div className="project-creation-grid compact">
                            <Form.Item label="Họ và tên" name="representative_name" rules={[{ required: true, message: "Nhập người đại diện" }]}><Input /></Form.Item>
                            <Form.Item label="Chức vụ" name="representative_position"><Input /></Form.Item>
                            <Form.Item label="Điện thoại" name="representative_phone"><Input /></Form.Item>
                            <Form.Item label="Fax" name="representative_fax"><Input /></Form.Item>
                            <Form.Item className="span-2" label="Email" name="representative_email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item>
                          </div>
                        </section>
                        <section>
                          <div className="application-contact-pair__title">Người liên hệ</div>
                          <div className="project-creation-grid compact">
                            <Form.Item label="Họ và tên" name="contact_name" rules={[{ required: true, message: "Nhập người liên hệ" }]}><Input /></Form.Item>
                            <Form.Item label="Chức vụ" name="contact_position"><Input /></Form.Item>
                            <Form.Item label="Điện thoại" name="contact_phone"><Input /></Form.Item>
                            <Form.Item label="Fax" name="contact_fax"><Input /></Form.Item>
                            <Form.Item className="span-2" label="Email" name="contact_email" rules={[{ type: "email", message: "Email không hợp lệ" }]}><Input /></Form.Item>
                          </div>
                        </section>
                      </div>
                    </ApplicationEntrySection>

                    <ApplicationEntrySection
                      sectionKey="certification"
                      title="2. Chứng nhận"
                      activeSection={applicationEntrySection}
                      onActiveSection={setApplicationEntrySection}
                    >
                      <div className="project-creation-grid wide">
                        <Form.Item label="Loại hình chứng nhận" name="certification_type" rules={[{ required: true, message: "Chọn loại chứng nhận" }]}>
                          <Select options={[
                            { value: "INITIAL", label: "Chứng nhận lần đầu" },
                            { value: "EXPANSION", label: "Mở rộng chứng nhận" },
                            { value: "TRANSFER", label: "Chứng nhận chuyển đổi" },
                            { value: "RECERTIFICATION", label: "Tái chứng nhận" },
                            { value: "SPECIAL", label: "Đánh giá đặc biệt" },
                            { value: "OTHER", label: "Khác" },
                          ]} />
                        </Form.Item>
                        {certificationType === "OTHER" ? (
                          <Form.Item label="Loại chứng nhận khác" name="other_certification_type" rules={[{ required: true, message: "Nhập loại chứng nhận" }]}>
                            <Input />
                          </Form.Item>
                        ) : <div />}
                        <Form.Item
                          className="span-2"
                          extra="Danh sách được lấy từ cấu hình Chương trình & tiêu chuẩn đang sẵn sàng cho hồ sơ mới."
                          label="Chuẩn mực chứng nhận"
                          name="standard_names"
                          rules={[{ required: true, message: "Chọn ít nhất một tiêu chuẩn" }]}
                        >
                          <Select
                            disabled={operationalStandardsQuery.isError || (!operationalStandardsQuery.isLoading && operationalStandards.length === 0)}
                            loading={operationalStandardsQuery.isLoading}
                            mode="multiple"
                            optionFilterProp="label"
                            options={operationalStandardOptions}
                            placeholder={operationalStandardsQuery.isLoading ? "Đang tải tiêu chuẩn..." : "Chọn tiêu chuẩn đang áp dụng"}
                            showSearch
                          />
                        </Form.Item>
                        {operationalStandardsQuery.isError ? (
                          <Alert
                            className="span-2"
                            description="Không thể tải danh sách tiêu chuẩn đang áp dụng. Thử lại trước khi lưu đơn đăng ký mới."
                            message="Chưa tải được Chương trình & tiêu chuẩn"
                            showIcon
                            type="error"
                          />
                        ) : !operationalStandardsQuery.isLoading && operationalStandards.length === 0 ? (
                          <Alert
                            className="span-2"
                            description="Quản trị viên cần hoàn tất chương trình, phiên bản tiêu chuẩn và bộ quy tắc chứng nhận trước khi tiếp nhận đơn mới."
                            message="Chưa có tiêu chuẩn sẵn sàng cho hồ sơ mới"
                            showIcon
                            type="warning"
                          />
                        ) : null}
                        <Form.Item className="span-2" label="Điều khoản loại trừ (nếu có)" name="excluded_clauses"><Input placeholder="Ví dụ: 8.3" /></Form.Item>
                        <Form.Item className="span-2" label="Phạm vi đăng ký chứng nhận" name="certification_scope" validateTrigger="onBlur" rules={[{ required: true, message: "Nhập phạm vi chứng nhận" }]}>
                          <TextArea
                            rows={3}
                            maxLength={4000}
                            onBlur={(event) => {
                              const sites = wizardForm.getFieldValue("sites") ?? [];
                              if (sites[0] && !sites[0].activities) {
                                sites[0].activities = event.target.value;
                                wizardForm.setFieldsValue({ sites });
                              }
                              wizardForm.setFieldsValue({ audit_field: event.target.value });
                            }}
                          />
                        </Form.Item>
                        <Form.Item label="Có quá trình thuê ngoài ảnh hưởng sự phù hợp?" name="external_provider_used">
                          <Radio.Group><Radio value> Có</Radio><Radio value={false}> Không</Radio></Radio.Group>
                        </Form.Item>
                        {externalProviderUsed ? (
                          <Form.Item label="Các quá trình thuê ngoài" name="outsourced_processes" rules={[{ required: true, message: "Liệt kê quá trình thuê ngoài" }]}>
                            <Input />
                          </Form.Item>
                        ) : <div />}
                        <Form.Item label="Đánh giá giai đoạn 1 đề nghị" name="stage1_requested_date"><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Đánh giá giai đoạn 2 đề nghị" name="stage2_requested_date"><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                      </div>
                    </ApplicationEntrySection>

                    <ApplicationEntrySection
                      sectionKey="personnel"
                      title="3. Nhân sự & địa điểm"
                      activeSection={applicationEntrySection}
                      onActiveSection={setApplicationEntrySection}
                    >
                      <div className="project-creation-grid wide">
                        <Form.Item label="Tổng số nhân sự" name="total_employee_count" rules={[{ required: true, message: "Nhập tổng số nhân sự" }]}>
                          <InputNumber min={0} precision={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Số nhân sự hiệu dụng" name="employee_count" rules={[{ required: true, message: "Nhập số nhân sự hiệu dụng" }]}>
                          <InputNumber min={1} precision={0} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Ca 1" name="shift1_count"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Ca 2" name="shift2_count"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Ca 3" name="shift3_count"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                      </div>

                      <Divider titlePlacement="start" plain>Địa điểm chứng nhận</Divider>
                      <Form.List name="sites">
                        {(fields, { add, remove }) => (
                          <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            {fields.map((field, index) => (
                              <div className="application-site-card" key={field.key}>
                                <div className="application-site-card__heading">
                                  <strong>Địa điểm {String(index + 1).padStart(2, "0")}{index === 0 ? " · Trụ sở chính" : ""}</strong>
                                  {index > 0 && <Button danger onClick={() => { remove(field.name); setMandayCalculationDirty(true); }} size="small">Xóa</Button>}
                                </div>
                                <div className="project-creation-grid wide">
                                  <Form.Item label="Tên địa điểm" name={[field.name, "site_name"]}><Input /></Form.Item>
                                  <Form.Item label="Số nhân sự" name={[field.name, "employee_count"]}><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                                  <Form.Item className="span-2" label="Địa chỉ" name={[field.name, "address"]} validateTrigger="onBlur" rules={[{ required: true, message: "Nhập địa chỉ địa điểm" }]}><TextArea rows={2} /></Form.Item>
                                  <Form.Item className="span-2" label="Sản phẩm, dịch vụ, hoạt động" name={[field.name, "activities"]}><TextArea rows={2} /></Form.Item>
                                </div>
                              </div>
                            ))}
                            <Button onClick={() => add({ site_name: "", employee_count: 0, address: "", activities: "" })} type="dashed">
                              + Thêm địa điểm
                            </Button>
                          </Space>
                        )}
                      </Form.List>
                    </ApplicationEntrySection>

                    <ApplicationEntrySection
                      sectionKey="documents"
                      title="4. Hồ sơ & thông tin khác"
                      activeSection={applicationEntrySection}
                      onActiveSection={setApplicationEntrySection}
                    >
                      <div className="project-creation-grid wide">
                        <Form.Item label="Đã áp dụng hệ thống quản lý khác?" name="other_management_systems">
                          <Radio.Group><Radio value> Có</Radio><Radio value={false}> Không</Radio></Radio.Group>
                        </Form.Item>
                        {otherManagementSystems ? (
                          <Form.Item label="Tiêu chuẩn và tổ chức chứng nhận" name="management_system_details"><Input /></Form.Item>
                        ) : <div />}
                        <Form.Item className="span-2" label="Tài liệu, hồ sơ kèm theo" name="associated_documents">
                          <Checkbox.Group style={{ width: "100%" }}>
                            <div className="application-document-upload-grid">
                              {associatedDocumentOptions.map((documentName, index) => {
                                const documentType = applicationDocumentType(index);
                                const uploaded = applicationDocumentFiles.find((file) => file.document_type === documentType);
                                return (
                                  <div className="application-document-upload-row" key={documentName}>
                                    <div style={{ minWidth: 0, flex: 1 }}>
                                      <Checkbox disabled value={documentName}>{documentName}</Checkbox>
                                      {uploaded ? <div style={{ paddingLeft: 24 }}><Text type="secondary" ellipsis={{ tooltip: uploaded.original_name }}>{uploaded.original_name}</Text></div> : null}
                                    </div>
                                    <Space size={6}>
                                      {uploaded ? (
                                        canPreviewApplicationDocument(uploaded) ? (
                                          <Button icon={<EyeOutlined />} onClick={() => void previewApplicationDocument(uploaded)} size="small">
                                            Xem file
                                          </Button>
                                        ) : (
                                          <Button onClick={() => void downloadApplicationDocument(uploaded)} size="small">
                                            {applicationDocumentDownloadLabel(uploaded)}
                                          </Button>
                                        )
                                      ) : null}
                                      <Upload
                                        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                                        beforeUpload={(file) => {
                                          void uploadApplicationSupportingDocument(documentName, index, file as File);
                                          return Upload.LIST_IGNORE;
                                        }}
                                        maxCount={1}
                                        showUploadList={false}
                                      >
                                        <Button
                                          icon={<UploadOutlined />}
                                          loading={uploadingApplicationDocument === documentType}
                                          size="small"
                                        >
                                          {uploaded ? "Thay file" : "Tải file"}
                                        </Button>
                                      </Upload>
                                    </Space>
                                  </div>
                                );
                              })}
                            </div>
                          </Checkbox.Group>
                        </Form.Item>
                        <Form.Item label="Đơn vị tư vấn" name="consultant_organization"><Input /></Form.Item>
                        <Form.Item label="Chuyên gia tư vấn" name="consultant_name"><Input /></Form.Item>
                        <Form.Item className="span-2" label="Ngôn ngữ chứng chỉ" name="certificate_languages">
                          <Select mode="tags" options={["Tiếng Việt", "Tiếng Anh", "Tiếng Trung", "Tiếng Nhật"].map((value) => ({ value, label: value }))} />
                        </Form.Item>
                        <Form.Item className="span-2" label="Yêu cầu khác" name="other_requests"><TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
                        <Form.Item
                          className="span-2"
                          name="declaration_accepted"
                          rules={[{
                            validator: (_, value) => value
                              ? Promise.resolve()
                              : Promise.reject(new Error("Phải xác nhận cam kết thông tin đăng ký")),
                          }]}
                          valuePropName="checked"
                        >
                          <Checkbox>
                            Tổ chức cam đoan các thông tin đăng ký là đúng và cam kết tuân thủ quy định chứng nhận của tổ chức chứng nhận.
                          </Checkbox>
                        </Form.Item>
                      </div>
                    </ApplicationEntrySection>
                  </div>
                )}
              </div>
            )}

            {actualCreationStep === 1 && (
              <div className="project-creation-step">
                <div className="application-review-workspace">
                  <div className="application-review-context">
                    <div>
                      <span>Đơn đăng ký</span>
                      <strong>{savedApplication?.application_code ?? selectedApplication?.application_code ?? "—"}</strong>
                    </div>
                    <div>
                      <span>Khách hàng</span>
                      <strong>{savedApplication?.customers?.company_name ?? selectedApplication?.customers?.company_name ?? "Chưa xác định"}</strong>
                    </div>
                    <div>
                      <span>Tiêu chuẩn</span>
                      <strong>{reviewApplication?.standard_name || calculationStandardNames.join(" + ") || "—"}</strong>
                    </div>
                    <div>
                      <span>Nhân sự hiệu dụng</span>
                      <strong>{effectivePersonnelForCalculation}</strong>
                    </div>
                  </div>
                  {latestWorkflowReview?.id && (
                    <Collapse
                      className="application-workflow-collapse"
                      items={[{
                        key: "workflow-status",
                        label: (
                          <div className="application-workflow-label">
                            <span>Quy trình xem xét</span>
                            <Tag color={
                              reviewWorkflowStatus === "APPROVED" ? "green" :
                              reviewWorkflowStatus === "RETURNED" ? "orange" :
                              reviewWorkflowStatus === "SUBMITTED" ? "purple" : "gold"
                            }>
                              {{
                                DRAFT: "Bản nháp",
                                SUBMITTED: "Đã gửi reviewer",
                                RETURNED: latestInvalidationAction ? "Cần xem xét lại" : "Reviewer trả lại",
                                APPROVED: "Đã phê duyệt",
                              }[reviewWorkflowStatus] ?? reviewWorkflowStatus}
                            </Tag>
                          </div>
                        ),
                        children: (
                          <>
                            {latestInvalidationAction && (
                              <Alert
                                description={latestInvalidationAction.comment || "Dữ liệu trọng yếu của đơn đã thay đổi sau phê duyệt. Cần thực hiện lại Application Review trước khi lập hợp đồng."}
                                message="Bản xem xét cần thực hiện lại"
                                showIcon
                                style={{ marginBottom: 8 }}
                                type="warning"
                              />
                            )}
                            <Descriptions column={{ xs: 1, md: 3 }} size="small">
                              <Descriptions.Item label="Người lập">
                                {latestWorkflowReview.prepared_by?.full_name || latestWorkflowReview.prepared_by?.username || "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Reviewer">
                                {latestWorkflowReview.users?.full_name || latestWorkflowReview.users?.username || latestWorkflowReview.approved_by_name || "—"}
                              </Descriptions.Item>
                              <Descriptions.Item label="Ý kiến reviewer">
                                {latestWorkflowReview.approver_comment || "—"}
                              </Descriptions.Item>
                            </Descriptions>
                            {reviewWorkflowStatus === "SUBMITTED" && !canReviewWorkflow && (
                              <Alert
                                message={`Đang chờ reviewer: ${latestWorkflowReview.users?.full_name || latestWorkflowReview.users?.username || latestWorkflowReview.approved_by_name || "Chưa xác định"}`}
                                showIcon
                                style={{ marginTop: 6 }}
                                type="info"
                              />
                            )}
                            {canReviewWorkflow && (
                              <ConfigProvider componentDisabled={false}>
                                <TextArea
                                  className="application-workflow-comment"
                                  maxLength={4000}
                                  onChange={(event) => setWorkflowComment(event.target.value)}
                                  placeholder="Nhận xét reviewer; bắt buộc khi trả lại"
                                  rows={2}
                                  value={workflowComment}
                                />
                              </ConfigProvider>
                            )}
                          </>
                        ),
                      }]}
                    />
                  )}
                    <Collapse
                      className="application-source-collapse"
                      items={[{
                        key: "application-summary",
                        label: `Xem thông tin gốc của đơn ${reviewApplication?.application_code ?? ""}`,
                        children: (
                          <Space direction="vertical" size={12} style={{ width: "100%" }}>
                            <Card size="small" title="1. Tổ chức và đầu mối liên hệ">
                              <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} size="small">
                                <Descriptions.Item label="Tên tổ chức">
                                  {reviewApplication?.customers?.company_name ?? "Chưa xác định"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tên tiếng Anh">
                                  {reviewApplication?.company_name_en ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Mã khách hàng">
                                  {reviewApplication?.customers?.customer_code ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Quốc gia">
                                  {reviewApplication?.customers?.country_code ?? "VN"}
                                </Descriptions.Item>
                                <Descriptions.Item label={(reviewApplication?.customers?.country_code ?? "VN") === "VN" ? "Mã số thuế" : "Tax ID / Business ID"}>
                                  {reviewApplication?.customers?.tax_code ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Điện thoại tổ chức">
                                  {reviewApplication?.customers?.phone ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Email tổ chức">
                                  {reviewApplication?.customers?.email ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Địa chỉ trụ sở" span={3}>
                                  {reviewApplication?.headquarters_address ?? reviewApplication?.customers?.address ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Người đại diện" span={3}>
                                  {[
                                    reviewApplication?.representative_name,
                                    reviewApplication?.representative_position,
                                    reviewApplication?.representative_phone,
                                    reviewApplication?.representative_email,
                                  ].filter(Boolean).join(" · ") || "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Người liên hệ" span={3}>
                                  {[
                                    reviewApplication?.contact_name,
                                    reviewApplication?.contact_position,
                                    reviewApplication?.contact_phone,
                                    reviewApplication?.contact_email,
                                  ].filter(Boolean).join(" · ") || "—"}
                                </Descriptions.Item>
                              </Descriptions>
                            </Card>

                            <Card size="small" title="2. Nội dung đăng ký chứng nhận">
                              <Descriptions bordered column={{ xs: 1, sm: 2, lg: 3 }} size="small">
                                <Descriptions.Item label="Loại chứng nhận">
                                  {certificationTypeLabels[String(reviewApplication?.certification_type ?? "")] ?? reviewApplication?.certification_type ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Tiêu chuẩn" span={2}>
                                  <Text strong>{reviewApplication?.standard_name ?? (calculationStandardNames.join(" + ") || "—")}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Điều khoản loại trừ" span={3}>
                                  {reviewApplication?.excluded_clauses ?? "Không có"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Phạm vi đăng ký" span={3}>
                                  {reviewApplication?.certification_scope ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Quá trình thuê ngoài">
                                  {reviewApplication?.external_provider_used ? "Có" : "Không"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Chi tiết thuê ngoài" span={2}>
                                  {reviewApplication?.outsourced_processes ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày đề nghị GĐ1">
                                  {reviewApplication?.stage1_requested_date ? dayjs(reviewApplication.stage1_requested_date).format("DD/MM/YYYY") : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngày đề nghị GĐ2">
                                  {reviewApplication?.stage2_requested_date ? dayjs(reviewApplication.stage2_requested_date).format("DD/MM/YYYY") : "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ngôn ngữ chứng chỉ">
                                  {reviewApplication?.certificate_languages ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Hệ thống quản lý khác">
                                  {reviewApplication?.other_management_systems ? "Có" : "Không"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Chi tiết hệ thống khác" span={2}>
                                  {reviewApplication?.management_system_details ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Đơn vị tư vấn">
                                  {reviewApplication?.consultant_organization ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Chuyên gia tư vấn">
                                  {reviewApplication?.consultant_name ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Yêu cầu khác">
                                  {reviewApplication?.other_requests ?? "—"}
                                </Descriptions.Item>
                              </Descriptions>
                              <Divider titlePlacement="start" plain style={{ margin: "14px 0 10px" }}>
                                Tài liệu kèm theo <Tag>{reviewAssociatedDocuments.length}</Tag>
                              </Divider>
                              {reviewAssociatedDocuments.length > 0 ? (
                                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(360px, 1fr))", gap: 8 }}>
                                  {reviewAssociatedDocuments.map((documentName, index) => {
                                    const uploaded = applicationDocumentFiles.find((file) => file.document_type === applicationDocumentTypeForName(documentName));
                                    return (
                                      <div className="application-review-document-row" key={`${documentName}-${index}`}>
                                        <CheckCircleOutlined style={{ color: "#1677ff", marginTop: 3 }} />
                                        <div style={{ flex: 1, minWidth: 0 }}>
                                          <Text>{documentName}</Text>
                                          {uploaded ? <div><Text type="secondary">{uploaded.original_name}</Text></div> : null}
                                        </div>
                                        {uploaded ? (
                                          canPreviewApplicationDocument(uploaded) ? (
                                            <Button icon={<EyeOutlined />} onClick={() => void previewApplicationDocument(uploaded)} size="small">Xem file</Button>
                                          ) : (
                                            <Button onClick={() => void downloadApplicationDocument(uploaded)} size="small">{applicationDocumentDownloadLabel(uploaded)}</Button>
                                          )
                                        ) : <Tag>Chưa tải file</Tag>}
                                      </div>
                                    );
                                  })}
                                </div>
                              ) : (
                                <Empty description="Chưa khai báo tài liệu kèm theo" image={Empty.PRESENTED_IMAGE_SIMPLE} />
                              )}
                            </Card>

                            <Card size="small" title="3. Nhân sự và địa điểm chứng nhận">
                              <Descriptions bordered column={{ xs: 1, sm: 2, lg: 4 }} size="small">
                                <Descriptions.Item label="Tổng nhân sự">
                                  {reviewApplication?.total_employee_count ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Nhân sự hiệu dụng">
                                  <Text strong>{effectivePersonnelForCalculation}</Text>
                                </Descriptions.Item>
                                <Descriptions.Item label="Ca 1">
                                  {reviewApplication?.shift1_count ?? "—"}
                                </Descriptions.Item>
                                <Descriptions.Item label="Ca 2 / Ca 3">
                                  {[reviewApplication?.shift2_count, reviewApplication?.shift3_count].map((value) => value ?? "—").join(" / ")}
                                </Descriptions.Item>
                                <Descriptions.Item label="Số địa điểm" span={4}>
                                  {reviewApplication?.sites?.length ?? reviewApplication?.site_count ?? 1}
                                </Descriptions.Item>
                              </Descriptions>
                              {(reviewApplication?.sites?.length ?? 0) > 0 ? (
                                <Table
                                  dataSource={reviewApplication?.sites ?? []}
                                  pagination={false}
                                  rowKey={(site) => site.id ?? String(site.site_no)}
                                  size="small"
                                  style={{ marginTop: 12 }}
                                  columns={[
                                    { title: "Địa điểm", dataIndex: "site_no", width: 90, render: (value: number) => `Số ${value}` },
                                    { title: "Tên địa điểm", dataIndex: "site_name", render: (value?: string | null) => value || "—" },
                                    { title: "Địa chỉ", dataIndex: "address" },
                                    { title: "Hoạt động/phạm vi", dataIndex: "activities", render: (value?: string | null) => value || "—" },
                                    { title: "Nhân sự", dataIndex: "employee_count", width: 90, render: (value?: number | null) => value ?? "—" },
                                  ]}
                                />
                              ) : (
                                <Alert message="Đơn chưa có danh sách địa điểm chứng nhận chi tiết." showIcon type="warning" />
                              )}
                            </Card>
                          </Space>
                        ),
                      }]}
                    />

                    <ApplicationReviewSection
                      sectionKey="criteria"
                      title="1. Nội dung xem xét"
                      activeSection={applicationReviewSection}
                      onActiveSection={setApplicationReviewSection}
                    >
                      <Form.List name="review_items">
                        {(fields) => (
                          <div className="application-review-list">
                            {fields.map((field, index) => {
                              const item = wizardForm.getFieldValue(["review_items", field.name]) as ReviewItemForm | undefined;
                              return (
                                <div className="application-review-row" key={field.key}>
                                  <span className="application-review-row__number">{index + 1}</span>
                                  <div className="application-review-row__content">
                                    <strong>{item?.content_vi}</strong>
                                    <small>{item?.content_en}</small>
                                    <Form.Item name={[field.name, "item_code"]} hidden><Input /></Form.Item>
                                    <Form.Item name={[field.name, "content_vi"]} hidden><Input /></Form.Item>
                                    <Form.Item name={[field.name, "content_en"]} hidden><Input /></Form.Item>
                                  </div>
                                  <Form.Item name={[field.name, "result"]} rules={[{ required: true, message: "Chọn kết quả" }]}>
                                    <Select options={[
                                      { value: "YES", label: "Đạt" },
                                      { value: "NO", label: "Không đạt" },
                                      { value: "NA", label: "Không áp dụng" },
                                    ]} style={{ width: 150 }} />
                                  </Form.Item>
                                  <Form.Item name={[field.name, "comment"]}>
                                    <Input placeholder="Nhận xét" style={{ width: 280 }} />
                                  </Form.Item>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </Form.List>
                    </ApplicationReviewSection>

                    <ApplicationReviewSection
                      sectionKey="scope"
                      title="2. Mã ngành & năng lực"
                      activeSection={applicationReviewSection}
                      onActiveSection={setApplicationReviewSection}
                    >
                      <div className="project-creation-grid wide">
                        <Form.Item className="span-2" label="Lĩnh vực đánh giá" name="audit_field" rules={[{ required: true, message: "Nhập lĩnh vực đánh giá" }]}>
                          <TextArea autoSize={{ minRows: 2, maxRows: 4 }} />
                        </Form.Item>
                        <Form.Item hidden name="iaf_code"><Input /></Form.Item>
                        <Form.Item hidden name="isic_code"><Input /></Form.Item>
                        <Form.Item
                          className="span-2"
                          name="industry_scopes"
                          rules={[{
                            validator: async (_, value: IndustryScopeSelection[] | undefined) => {
                              if (!value?.length) throw new Error("Chọn ít nhất một mã ISIC và xác nhận NACE/IAF");
                            },
                          }]}
                        >
                          <Input type="hidden" />
                        </Form.Item>

                        <div className="span-2">
                          <Card
                            size="small"
                            title={<Space><span>Phạm vi mã ngành</span><Tag>{selectedIndustryScopes.length}</Tag></Space>}
                            extra={<Button onClick={openIndustrySelector}>Chọn mã ISIC / NACE / IAF</Button>}
                          >
                            {selectedIndustryScopes.length ? (
                              <Table
                                dataSource={selectedIndustryScopes}
                                pagination={false}
                                rowKey={(scope) => `${scope.isic_nace_mapping_id}:${scope.nace_iaf_mapping_id}:${scope.management_system}`}
                                size="small"
                                scroll={{ x: 920 }}
                                columns={[
                                  { title: "Hệ thống", dataIndex: "management_system", width: 135, render: (value: "QMS" | "EMS" | "OHSMS") => managementSystemLabels[value] },
                                  { title: "ISIC", width: 190, render: (_, scope) => <><strong>{scope.isic_code}</strong><br /><Text type="secondary">{scope.isic_title}</Text></> },
                                  { title: "NACE", width: 190, render: (_, scope) => <><strong>{scope.nace_code}</strong><br /><Text type="secondary">{scope.nace_title}</Text></> },
                                  { title: "IAF", width: 170, render: (_, scope) => <><strong>IAF {scope.iaf_code}</strong><br /><Text type="secondary">{scope.iaf_name}</Text></> },
                                  { title: "Phạm vi áp dụng", dataIndex: "scope_description", ellipsis: true },
                                  {
                                    title: "",
                                    width: 70,
                                    fixed: "right",
                                    render: (_, scope) => (
                                      <Button
                                        danger
                                        type="link"
                                        onClick={() => {
                                          const next = selectedIndustryScopes.filter((item) => item !== scope);
                                          wizardForm.setFieldsValue({ industry_scopes: next, isic_code: next[0]?.isic_code, iaf_code: next[0]?.iaf_code });
                                        }}
                                      >Xóa</Button>
                                    ),
                                  },
                                ]}
                              />
                            ) : (
                              <Empty description="Chưa chọn mã ngành. Bấm nút để mở bảng tra cứu." image={Empty.PRESENTED_IMAGE_SIMPLE} />
                            )}
                          </Card>
                        </div>

                        <div className="span-2">
                          <Card size="small" title="Đối chiếu năng lực tổ chức chứng nhận">
                            {!activeCapabilityReviewId ? (
                              <Alert
                                message="Đối chiếu năng lực tổ chức trước khi gửi reviewer"
                                description={
                                  <Space direction="vertical" size={8}>
                                    <Text>Năng lực được đánh giá theo Chương trình/Tiêu chuẩn + mã IAF của tổ chức chứng nhận; không phụ thuộc chuyên gia dự kiến.</Text>
                                    <Button loading={creationSubmitting} onClick={() => void checkCertificationBodyCapability()} type="primary">
                                      Đối chiếu năng lực tổ chức
                                    </Button>
                                  </Space>
                                }
                                showIcon
                                type="info"
                              />
                            ) : capabilityEvaluationQuery.isLoading ? (
                              <Skeleton active paragraph={{ rows: 2 }} />
                            ) : capabilityEvaluation ? (
                              <Space direction="vertical" size={8} style={{ width: "100%" }}>
                                <div className="cb-capability-grid">
                                  {capabilityEvaluation.items.map((item, index) => (
                                    <div className="cb-capability-item" key={`${item.program_code}-${item.iaf_code ?? "unresolved"}-${index}`}>
                                      <div><Text strong>{item.program_name}</Text> · IAF {item.iaf_code ?? "—"}</div>
                                      <Tag color={item.result === "CAPABLE" ? "green" : item.result === "NOT_CAPABLE" ? "red" : "orange"}>
                                        {item.result === "CAPABLE" ? "ĐỦ NĂNG LỰC" : item.result === "NOT_CAPABLE" ? "KHÔNG ĐỦ NĂNG LỰC" : "CẦN XEM XÉT"}
                                      </Tag>
                                      <Text type="secondary">{item.reason}</Text>
                                    </div>
                                  ))}
                                </div>
                                <Alert
                                  message={`Kết luận năng lực tổ chức: ${capabilityEvaluation.overall_result === "CAPABLE" ? "ĐỦ NĂNG LỰC" : capabilityEvaluation.overall_result === "NOT_CAPABLE" ? "KHÔNG ĐỦ NĂNG LỰC" : "CẦN XEM XÉT"}`}
                                  showIcon
                                  type={capabilityEvaluation.overall_result === "CAPABLE" ? "success" : capabilityEvaluation.overall_result === "NOT_CAPABLE" ? "error" : "warning"}
                                />
                                {canEditReviewDraft ? (
                                  <Button loading={creationSubmitting} onClick={() => void checkCertificationBodyCapability()}>
                                    Kiểm tra lại năng lực tổ chức
                                  </Button>
                                ) : null}
                              </Space>
                            ) : (
                              <Alert message="Chưa thể đối chiếu năng lực tổ chức" showIcon type="warning" />
                            )}
                          </Card>
                        </div>
                      </div>
                    </ApplicationReviewSection>

                    <ApplicationReviewSection
                      sectionKey="manday"
                      title="3. Ngày công & kế hoạch"
                      activeSection={applicationReviewSection}
                      onActiveSection={setApplicationReviewSection}
                    >
                      <div className="manday-standard-basis">
                        <Text strong>Cơ sở tính theo tiêu chuẩn:</Text>
                        <Space wrap>
                          {supportedCalculationStandards.map((standard) => (
                            <Tag key={standard}>
                              {standard} · {standard.includes("9001")
                                ? "QMS — không phân loại rủi ro"
                                : standard.includes("14001")
                                  ? "EMS — theo độ phức tạp môi trường"
                                  : "OH&SMS — theo mức rủi ro OH&S"}
                            </Tag>
                          ))}
                          {isIntegratedAudit && <Tag>IAF MD11 — đánh giá tích hợp</Tag>}
                        </Space>
                      </div>

                      {isIntegratedAudit && (
                        <Card className="ims-configuration-card" size="small" title="Thiết lập giảm thời gian đánh giá tích hợp theo IAF MD11">
                          <Alert
                            description="Đây là giả định phục vụ tính man-day tích hợp, không phải quyết định phân công đoàn chính thức. Phân công đoàn thực hiện tại Lịch & nguồn lực."
                            message="Chuyên gia dự kiến dùng để xác định khả năng đánh giá kết hợp theo IAF MD11"
                            showIcon
                            style={{ marginBottom: 12 }}
                            type="info"
                          />
                          <Form.Item
                            label="Đoàn chuyên gia dự kiến dùng để tính IAF MD11"
                            name="proposed_auditor_ids"
                            rules={[{ required: true, message: "Chọn ít nhất một chuyên gia dự kiến để tính IAF MD11" }]}
                          >
                            <Select
                              mode="multiple"
                              optionFilterProp="label"
                              options={imsAuditorCandidates.map((expert) => ({
                                value: expert.id,
                                label: `${expert.employee_code ?? "Chưa có mã"} · ${expert.full_name} · ${expertSupportedStandardLabels(expert, supportedCalculationStandards).join(", ")}`,
                              }))}
                              placeholder="Chọn chuyên gia dự kiến và xem năng lực theo từng tiêu chuẩn"
                              showSearch
                            />
                          </Form.Item>
                          {imsAuditorCandidates.length === 0 && (
                            <Alert
                              description="Chưa có chuyên gia đã được phê duyệt năng lực cho các tiêu chuẩn đang tích hợp. Có thể chạy file dữ liệu thử đi kèm Patch 19 để kiểm tra luồng."
                              message="Không có dữ liệu chuyên gia phù hợp để thử công thức"
                              showIcon
                              style={{ marginBottom: 12 }}
                              type="warning"
                            />
                          )}
                          {selectedPlannedAuditors.length > 0 && (
                            <div style={{ display: "grid", gap: 8, marginBottom: 12 }}>
                              {selectedPlannedAuditors.map((expert) => {
                                const supported = expertSupportedStandardLabels(expert, supportedCalculationStandards);
                                return (
                                  <div key={expert.id} style={{ border: "1px solid #f0f0f0", borderRadius: 8, padding: "8px 10px" }}>
                                    <Text strong>{expert.full_name}</Text>
                                    <Space wrap style={{ marginLeft: 10 }}>
                                      {supportedCalculationStandards.map((standard) => (
                                        <Tag color={supported.includes(standard) ? "green" : "default"} key={standard}>
                                          {standard}: {supported.includes(standard) ? "Đủ năng lực" : "Chưa có năng lực"}
                                        </Tag>
                                      ))}
                                    </Space>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                          <Form.Item
                            label="Mức độ tích hợp của hệ thống quản lý"
                            name="ims_integration_criteria"
                          >
                            <Checkbox.Group options={imsIntegrationCriteriaOptions} />
                          </Form.Item>
                          <Descriptions bordered column={{ xs: 1, sm: 3 }} size="small">
                            <Descriptions.Item label="Số tiêu chuẩn">{supportedCalculationStandards.length}</Descriptions.Item>
                            <Descriptions.Item label="Số chuyên gia dự kiến">{selectedPlannedAuditors.length}</Descriptions.Item>
                            <Descriptions.Item label="Mức tích hợp">{imsIntegrationPercent}%</Descriptions.Item>
                            <Descriptions.Item label="Khả năng đánh giá kết hợp">{combinedAuditCapabilityPercent}%</Descriptions.Item>
                            <Descriptions.Item label="Giảm tích hợp đề xuất">{integrationReductionPercent}%</Descriptions.Item>
                            <Descriptions.Item label="Căn cứ">Ma trận IAF MD11</Descriptions.Item>
                          </Descriptions>
                          {!imsConfigurationReady && (
                            <Alert
                              message="Chọn đoàn chuyên gia dự kiến để hệ thống tính khả năng đánh giá kết hợp."
                              showIcon
                              style={{ marginTop: 12 }}
                              type="warning"
                            />
                          )}
                        </Card>
                      )}

                      {(supportedCalculationStandards.some((standard) => /14001/i.test(standard)) || supportedCalculationStandards.some((standard) => /45001/i.test(standard))) && (
                        <Card size="small" title="Mức độ phức tạp/rủi ro dùng để tra bảng IAF">
                          <div className="project-creation-grid">
                            {supportedCalculationStandards.some((standard) => /14001/i.test(standard)) && (
                              <Form.Item label="Độ phức tạp EMS" required>
                                <Space.Compact block>
                                  <Form.Item name="ems_complexity" noStyle rules={[{ required: true, message: "Chọn độ phức tạp EMS" }]}>
                                    <Select options={[
                                      { value: "LOW", label: "Thấp" },
                                      { value: "MEDIUM", label: "Trung bình" },
                                      { value: "HIGH", label: "Cao" },
                                      { value: "LIMITED", label: "Giới hạn" },
                                    ]} />
                                  </Form.Item>
                                  <Button onClick={() => { setRiskReferenceType("EMS"); setRiskReferenceSearch(""); setRiskReferenceOpen(true); }}>Đối chiếu bảng rủi ro</Button>
                                </Space.Compact>
                              </Form.Item>
                            )}
                            {supportedCalculationStandards.some((standard) => /45001/i.test(standard)) && (
                              <Form.Item label="Mức rủi ro OH&amp;S" required>
                                <Space.Compact block>
                                  <Form.Item name="ohsms_complexity" noStyle rules={[{ required: true, message: "Chọn mức rủi ro OH&S" }]}>
                                    <Select options={[
                                      { value: "LOW", label: "Thấp" },
                                      { value: "MEDIUM", label: "Trung bình" },
                                      { value: "HIGH", label: "Cao" },
                                    ]} />
                                  </Form.Item>
                                  <Button onClick={() => { setRiskReferenceType("OHSMS"); setRiskReferenceSearch(""); setRiskReferenceOpen(true); }}>Đối chiếu bảng rủi ro</Button>
                                </Space.Compact>
                              </Form.Item>
                            )}
                          </div>
                          <Text type="secondary">ISO 9001 không sử dụng mức độ phức tạp/rủi ro để chọn dòng MD. Mức đã chọn ở đây được dùng xuyên suốt, không nhập lại ở phần dưới.</Text>
                        </Card>
                      )}

                      {standardMandayBreakdown.length > 0 && (
                        <Card
                          size="small"
                          title={isIntegratedAudit
                            ? "Bước 1 · Tính riêng từng tiêu chuẩn và xác định điểm bắt đầu T"
                            : "Căn cứ xác định MD cơ sở"}
                        >
                          <Table
                            dataSource={standardMandayBreakdown}
                            pagination={false}
                            rowKey="standard"
                            size="small"
                            columns={[
                              { title: "Tiêu chuẩn", dataIndex: "standard" },
                              {
                                title: "Bảng áp dụng",
                                dataIndex: "family",
                                width: 130,
                                render: (value: string) => value === "QMS"
                                  ? "QMS"
                                  : value === "EMS"
                                    ? "EMS"
                                    : "OH&SMS",
                              },
                              {
                                title: "Mức phức tạp/rủi ro",
                                dataIndex: "complexity",
                                width: 180,
                                render: (value?: string) => value
                                  ? value.toLocaleUpperCase("vi")
                                  : "Không áp dụng",
                              },
                              {
                                title: "MD",
                                dataIndex: "mandays",
                                width: 100,
                                render: (value: number) => <Text strong>{value}</Text>,
                              },
                              {
                                title: "Đối chiếu",
                                width: 120,
                                render: (_: unknown, record: { family: string }) => (
                                  <Button
                                    onClick={() => {
                                      setMandayTableType(
                                        record.family === "QMS"
                                          ? "QMS"
                                          : record.family === "EMS"
                                            ? "EMS"
                                            : "OHSMS",
                                      );
                                      setMandayTableOpen(true);
                                    }}
                                    size="small"
                                  >
                                    Mở bảng
                                  </Button>
                                ),
                              },
                            ]}
                          />
                          <Descriptions
                            bordered
                            column={{ xs: 1, sm: 3 }}
                            size="small"
                            style={{ marginTop: 12 }}
                          >
                            <Descriptions.Item label="Tổng trước làm tròn">
                              {mandayEngineSuggestion?.starting_point_raw ?? "—"} MD
                            </Descriptions.Item>
                            <Descriptions.Item label={isIntegratedAudit ? "Điểm bắt đầu T" : "MD cơ sở"}>
                              <Text strong>{mandayEngineSuggestion?.base_mandays ?? "—"} MD</Text>
                            </Descriptions.Item>
                            <Descriptions.Item label="Quy tắc">
                              Làm tròn xuống bội số 0,5 trước mọi điều chỉnh
                            </Descriptions.Item>
                          </Descriptions>
                          {isIntegratedAudit && !imsConfigurationReady && (
                            <Alert
                              description="MD của từng tiêu chuẩn và điểm bắt đầu T đã được tính. Cần chọn chuyên gia dự kiến để xác định khả năng đánh giá kết hợp, mức giảm IAF MD11 và MD cuối cùng."
                              message="Chưa hoàn tất tính đánh giá tích hợp"
                              showIcon
                              style={{ marginTop: 12 }}
                              type="warning"
                            />
                          )}
                        </Card>
                      )}

                      <Alert
                        message="Trình tự tính man-day"
                        description="Hoàn thiện mức rủi ro/độ phức tạp, chuyên gia dự kiến cho IAF MD11 (nếu có) và toàn bộ yếu tố tăng/giảm trước. Sau đó bấm Tính đề xuất; kiểm tra kết quả rồi bấm Áp dụng đề xuất để lưu vào biểu mẫu."
                        showIcon
                        type="info"
                        style={{ marginBottom: 12 }}
                      />

                      <Divider titlePlacement="start" plain>Yếu tố tăng/giảm và căn cứ</Divider>
                      <Form.List name="manday_adjustments">
                        {(fields, { add, remove }) => (
                          <div className="manday-adjustment-list">
                            {fields.length === 0 && (
                              <Empty
                                description="Chưa có yếu tố điều chỉnh. MD cuối cùng đang bằng MD cơ sở sau hệ số rủi ro/tích hợp."
                                image={Empty.PRESENTED_IMAGE_SIMPLE}
                              />
                            )}
                            {fields.map((field, index) => (
                              <div className="manday-adjustment-row" key={field.key}>
                                <span className="manday-adjustment-row__number">{index + 1}</span>
                                <Form.Item
                                  label="Loại điều chỉnh"
                                  name={[field.name, "adjustment_type"]}
                                  rules={[{ required: true, message: "Chọn loại" }]}
                                >
                                  <Select
                                    onChange={(value: MandayAdjustmentForm["adjustment_type"]) => {
                                      setMandayCalculationDirty(true);
                                      const options = getMandayFactorOptions(value, isIntegratedAudit);
                                      wizardForm.setFieldValue(
                                        ["manday_adjustments", field.name, "factor_code"],
                                        options[0]?.value,
                                      );
                                      wizardForm.setFieldValue(
                                        ["manday_adjustments", field.name, "percentage"],
                                        10,
                                      );
                                    }}
                                    options={[
                                      { value: "increase", label: "Tăng ngày công" },
                                      { value: "reduction", label: "Giảm theo MD5" },
                                    ]}
                                  />
                                </Form.Item>
                                <Form.Item
                                  noStyle
                                  shouldUpdate={(previous, current) => (
                                    previous?.manday_adjustments?.[field.name]?.adjustment_type !==
                                    current?.manday_adjustments?.[field.name]?.adjustment_type
                                  )}
                                >
                                  {() => {
                                    const adjustmentType = wizardForm.getFieldValue([
                                      "manday_adjustments",
                                      field.name,
                                      "adjustment_type",
                                    ]) as MandayAdjustmentForm["adjustment_type"] | undefined;
                                    return (
                                      <Form.Item
                                        label="Yếu tố"
                                        name={[field.name, "factor_code"]}
                                        rules={[{ required: true, message: "Chọn yếu tố đúng loại điều chỉnh" }]}
                                      >
                                        <Select
                                          onChange={() => setMandayCalculationDirty(true)}
                                          optionFilterProp="label"
                                          options={getMandayFactorOptions(adjustmentType, isIntegratedAudit)}
                                          popupMatchSelectWidth={620}
                                          showSearch
                                        />
                                      </Form.Item>
                                    );
                                  }}
                                </Form.Item>
                                <Form.Item
                                  label="Tỷ lệ (%)"
                                  name={[field.name, "percentage"]}
                                  rules={[
                                    { required: true, message: "Nhập tỷ lệ" },
                                    { type: "number", min: 0.01, max: 100, message: "Tỷ lệ phải lớn hơn 0" },
                                  ]}
                                >
                                  <InputNumber min={0.01} max={100} precision={2} style={{ width: "100%" }} />
                                </Form.Item>
                                <Form.Item
                                  className="manday-adjustment-row__reason"
                                  label="Lý do/căn cứ áp dụng"
                                  name={[field.name, "reason"]}
                                  rules={[{ required: true, message: "Nhập lý do/căn cứ" }]}
                                >
                                  <Input placeholder="Nêu điều kiện thực tế, tài liệu kiểm tra và căn cứ tăng/giảm" />
                                </Form.Item>
                                <Button danger onClick={() => { remove(field.name); setMandayCalculationDirty(true); }} type="text">Xóa</Button>
                              </div>
                            ))}
                            <Button
                              block
                              onClick={() => add({
                                adjustment_type: "increase",
                                factor_code: increaseMandayFactorOptions[0].value,
                                percentage: 10,
                                reason: "",
                              })}
                              type="dashed"
                            >
                              <PlusOutlined /> Thêm yếu tố tăng/giảm
                            </Button>
                          </div>
                        )}
                      </Form.List>

                      {mandaySuggestion ? (
                        <Alert
                          className="manday-suggestion-alert"
                          description={(
                            <div>
                              <div className="manday-suggestion-values">
                                <span>MD cơ sở: <strong>{mandaySuggestion.base}</strong></span>
                                <span>MD lần đầu: <strong>{mandaySuggestion.final}</strong></span>
                                <span>GĐ1: <strong>{mandaySuggestion.stage1}</strong></span>
                                <span>GĐ2: <strong>{mandaySuggestion.stage2}</strong></span>
                                <span>Giám sát (1/3): <strong>{mandaySuggestion.surveillance}</strong></span>
                                <span>Tái chứng nhận (2/3): <strong>{mandaySuggestion.recertification}</strong></span>
                              </div>
                              <Text type={mandayCalculationDirty ? "warning" : "secondary"}>
                                {mandayCalculationDirty
                                  ? "Dữ liệu đầu vào đã thay đổi. Kết quả trên là lần tính trước; bấm Tính lại đề xuất trước khi áp dụng."
                                  : `Cơ sở: ${effectivePersonnelForCalculation} nhân sự hiệu dụng; ${supportedCalculationStandards.join(" + ")}.`}
                                {!mandayCalculationDirty && (isIntegratedAudit
                                  ? " MD riêng từng tiêu chuẩn được cộng thành điểm bắt đầu T, sau đó mới áp dụng giảm tích hợp."
                                  : " ISO 9001 không cần phân loại rủi ro; ISO 14001 và ISO 45001 dùng mức phức tạp/rủi ro tương ứng.")}
                              </Text>
                            </div>
                          )}
                          action={(
                            <Space wrap>
                              <Button
                                disabled={isIntegratedAudit && !imsConfigurationReady}
                                loading={mandayEngineLoading}
                                onClick={() => void calculateMandaysNow()}
                              >
                                {mandayCalculationDirty ? "Tính lại sau khi hoàn tất thông tin" : "Tính lại đề xuất"}
                              </Button>
                              <Button
                                disabled={mandayCalculationDirty || (isIntegratedAudit && !imsConfigurationReady)}
                                onClick={applyMandaySuggestion}
                                type="primary"
                              >
                                Áp dụng đề xuất
                              </Button>
                            </Space>
                          )}
                          message={mandayEngineLoading
                            ? "Đang tính đề xuất ngày công..."
                            : mandayCalculationDirty
                              ? "Đề xuất cần tính lại"
                              : "Đề xuất ngày công của hệ thống"}
                          showIcon
                          type={mandayCalculationDirty ? "warning" : "info"}
                        />
                      ) : (
                        <Alert
                          action={(
                            <Button
                              disabled={isIntegratedAudit && !imsConfigurationReady}
                              loading={mandayEngineLoading}
                              onClick={() => void calculateMandaysNow()}
                              type="primary"
                            >
                              {isIntegratedAudit && !imsConfigurationReady ? "Chọn chuyên gia trước" : "Tính đề xuất"}
                            </Button>
                          )}
                          message="Chưa chạy phép tính man-day"
                          description="Hệ thống chỉ tính khi bấm nút. Sau khi thay đổi nhân sự, tiêu chuẩn, rủi ro hoặc yếu tố điều chỉnh, bấm Tính đề xuất để cập nhật."
                          showIcon
                          type="info"
                        />
                      )}

                      <Form.Item hidden name="manday_method"><Input /></Form.Item>
                      <div className="project-creation-grid manday-grid">
                        <Form.Item
                          label="Nhân sự hiệu dụng theo đơn"
                          tooltip="Giá trị được lấy trực tiếp từ đơn đăng ký và dùng để chọn dòng trong bảng IAF."
                        >
                          <InputNumber disabled value={effectivePersonnelForCalculation} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Phương pháp">
                          <Input
                            disabled
                            value={isIntegratedAudit
                              ? "IAF MD11 · Cộng MD từng tiêu chuẩn rồi giảm tích hợp"
                              : "IAF MD5 · 01 tiêu chuẩn"}
                          />
                        </Form.Item>
                        <Form.Item label="MD cơ sở" required>
                          <Space.Compact block>
                            <Form.Item name="base_mandays" noStyle rules={[{ required: true, message: "Nhập ngày công cơ sở" }]}>
                              <InputNumber min={0.5} step={0.5} style={{ width: "100%" }} />
                            </Form.Item>
                            <Button onClick={openMandayReferenceTable} type="default">Mở bảng IAF</Button>
                          </Space.Compact>
                        </Form.Item>
                        <Form.Item label="Tổng tăng (%)" name="increase_percent"><InputNumber disabled style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Tổng giảm MD5 (%)" name="reduction_percent"><InputNumber disabled style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Giảm tích hợp (%)" name="integration_reduction_percent"><InputNumber disabled style={{ width: "100%" }} /></Form.Item>
                        <Form.Item
                          label="MD lần đầu"
                          name="final_mandays"
                          rules={(!isIntegratedAudit || imsConfigurationReady) ? [{ required: true, message: "Nhập ngày công lần đầu" }] : []}
                        >
                          <InputNumber disabled={isIntegratedAudit && !imsConfigurationReady} min={0.5} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item
                          label="Giai đoạn 1"
                          name="stage1_mandays"
                          rules={(!isIntegratedAudit || imsConfigurationReady) ? [{ required: true, message: "Nhập ngày công giai đoạn 1" }] : []}
                        >
                          <InputNumber disabled={isIntegratedAudit && !imsConfigurationReady} min={0.5} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item
                          label="Giai đoạn 2"
                          name="stage2_mandays"
                          rules={(!isIntegratedAudit || imsConfigurationReady) ? [{ required: true, message: "Nhập ngày công giai đoạn 2" }] : []}
                        >
                          <InputNumber disabled={isIntegratedAudit && !imsConfigurationReady} min={1} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Giám sát hằng năm (1/3 MD lần đầu)" name="surveillance_mandays">
                          <InputNumber disabled={isIntegratedAudit && !imsConfigurationReady} min={1} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                        <Form.Item label="Tái chứng nhận (2/3 MD lần đầu)" name="recertification_mandays">
                          <InputNumber disabled={isIntegratedAudit && !imsConfigurationReady} min={1} step={0.5} style={{ width: "100%" }} />
                        </Form.Item>
                      </div>


                      <Divider titlePlacement="start" plain>Phân bổ và thời gian đánh giá</Divider>
                      <Alert
                        action={<Button onClick={() => suggestCertificationCycleMonths(wizardForm.getFieldValue("stage2_proposed_date"), true)} size="small">Gợi ý lại từ GĐ2</Button>}
                        description="Chọn tháng GĐ2 để hệ thống tự gợi ý GS1 = +12 tháng, GS2 = +24 tháng và tái chứng nhận = +36 tháng. Có thể chỉnh thủ công."
                        showIcon
                        style={{ marginBottom: 12 }}
                        type="info"
                      />
                      <div className="project-creation-grid manday-grid">
                        <Form.Item label="Dự kiến giai đoạn 1" name="stage1_proposed_date"><DatePicker className="notranslate" popupClassName="notranslate" picker="month" format="MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Dự kiến giai đoạn 2" name="stage2_proposed_date"><DatePicker className="notranslate" onChange={(value) => suggestCertificationCycleMonths(value)} popupClassName="notranslate" picker="month" format="MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Giám sát lần 1" name="surveillance1_date"><DatePicker className="notranslate" popupClassName="notranslate" picker="month" format="MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Giám sát lần 2" name="surveillance2_date"><DatePicker className="notranslate" popupClassName="notranslate" picker="month" format="MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Tái chứng nhận" name="recertification_date"><DatePicker className="notranslate" popupClassName="notranslate" picker="month" format="MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                      </div>
                    </ApplicationReviewSection>

                    <ApplicationReviewSection
                      sectionKey="conclusion"
                      title="4. Kết luận & reviewer"
                      activeSection={applicationReviewSection}
                      onActiveSection={setApplicationReviewSection}
                    >
                      <div className="project-creation-grid wide">
                        <Form.Item label="Kết quả" name="review_result" rules={[{ required: true }]}>
                          <Select options={[
                            { value: "ACCEPTED", label: "Chấp nhận" },
                            { value: "NEED_MORE_INFO", label: "Yêu cầu bổ sung" },
                            { value: "REJECTED", label: "Không chấp nhận" },
                          ]} />
                        </Form.Item>
                        <Form.Item label="Mã khách hàng" name="client_code"><Input readOnly /></Form.Item>
                        <Form.Item className="span-2" label="Kết luận" name="conclusion" rules={[{ required: true, message: "Nhập kết luận" }]}><TextArea autoSize={{ minRows: 2, maxRows: 4 }} /></Form.Item>
                        <Form.Item
                          label="Reviewer"
                          name="reviewer_id"
                          rules={[{ required: true, message: "Chọn một reviewer" }]}
                        >
                          <Select
                            allowClear
                            loading={reviewAssigneesQuery.isLoading}
                            optionFilterProp="label"
                            options={reviewAssignees.reviewers.map((user) => ({
                              value: user.id,
                              label: `${user.full_name?.trim() || user.username} · ${user.roles?.join(", ") || "Tài khoản nội bộ"}`,
                            }))}
                            placeholder="Chọn đánh giá viên/chuyên gia khác coordinator"
                            showSearch
                          />
                        </Form.Item>
                        <div className="review-preparer-note">
                          <Text type="secondary">
                            Người lập là điều phối viên đang đăng nhập và được hệ thống tự động ghi nhận.
                          </Text>
                        </div>
                        <Form.Item className="span-2" label="Nhận xét bổ sung" name="review_comment"><TextArea autoSize={{ minRows: 2, maxRows: 5 }} /></Form.Item>
                      </div>
                    </ApplicationReviewSection>
                </div>
              </div>
            )}

            {actualCreationStep === 2 && (
              <div className="project-creation-step">
                <Alert
                  description="Hồ sơ phải có ít nhất một trong hai: hợp đồng hoặc thỏa thuận chứng nhận."
                  message="Hồ sơ thương mại"
                  showIcon
                  type="warning"
                />
                <div className="project-commercial-columns">
                  <Card size="small" title="Hợp đồng">
                    <Form.Item name="contract_mode">
                      <Radio.Group>
                        <Space direction="vertical">
                          <Radio value="new">Tạo hợp đồng mới</Radio>
                          <Radio value="existing">Chọn hợp đồng đã có</Radio>
                          <Radio value="none">Không sử dụng hợp đồng</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                    {contractMode === "existing" && (
                      <Form.Item name="existing_contract_id" rules={[{ required: true, message: "Chọn hợp đồng" }]}>
                        <Select
                          optionFilterProp="label"
                          options={customerContracts.map((contract) => ({
                            value: contract.id,
                            label: `${contract.contract_number} · ${contract.sign_date ? dayjs(contract.sign_date).format("DD/MM/YYYY") : "Chưa có ngày ký"}`,
                          }))}
                          placeholder={effectiveCustomerId ? "Chọn hợp đồng" : "Chọn khách hàng trước"}
                          showSearch
                        />
                      </Form.Item>
                    )}
                    {contractMode === "new" && (
                      <div className="project-creation-grid compact">
                        <Form.Item className="span-2" label="Số hợp đồng" name="contract_number" rules={[{ required: true, message: "Nhập số hợp đồng" }]}><Input maxLength={50} /></Form.Item>
                        <Form.Item label="Ngày ký" name="contract_sign_date" rules={[{ required: true, message: "Chọn ngày ký" }]}><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Ngày hiệu lực" name="contract_start_date" rules={[{ required: true, message: "Chọn ngày hiệu lực" }]}><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Ngày kết thúc" name="contract_end_date"><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Giá trị hợp đồng" name="contract_total_value"><InputNumber min={0} precision={0} style={{ width: "100%" }} /></Form.Item>
                        <Form.Item label="Tiền tệ" name="contract_currency"><Select options={["VND", "USD", "EUR"].map((value) => ({ value, label: value }))} /></Form.Item>
                      </div>
                    )}
                    {contractMode !== "none" && (
                      <Card className="commercial-file-card" size="small" type="inner" title={<Space><PaperClipOutlined />Tệp hợp đồng</Space>}>
                        <div className="project-creation-grid compact">
                          <Form.Item label="Loại tệp" name="contract_file_kind">
                            <Select
                              options={[
                                { value: "signed_scan", label: "Bản đã ký" },
                                { value: "attachment", label: "Bản dự thảo / phụ lục" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            className="span-2"
                            label="Tải tệp hợp đồng"
                            name="contract_file_list"
                            valuePropName="fileList"
                            getValueFromEvent={(event) => Array.isArray(event) ? event : event?.fileList}
                            extra="PDF, Word, JPG hoặc PNG; tối đa 20 MB. Tải lại cùng loại sẽ tự tạo phiên bản mới."
                          >
                            <Upload
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                              beforeUpload={(file) => {
                                if (file.size > 20 * 1024 * 1024) {
                                  message.error("Tệp hợp đồng không được vượt quá 20 MB");
                                  return Upload.LIST_IGNORE;
                                }
                                return false;
                              }}
                              maxCount={1}
                            >
                              <Button icon={<UploadOutlined />}>Chọn tệp hợp đồng</Button>
                            </Upload>
                          </Form.Item>
                        </div>
                      </Card>
                    )}
                  </Card>

                  <Card size="small" title="Thỏa thuận chứng nhận">
                    <Form.Item name="agreement_mode">
                      <Radio.Group>
                        <Space direction="vertical">
                          <Radio value="new">Tạo thỏa thuận mới</Radio>
                          <Radio value="existing">Chọn thỏa thuận đã có</Radio>
                          <Radio value="none">Không sử dụng thỏa thuận</Radio>
                        </Space>
                      </Radio.Group>
                    </Form.Item>
                    {agreementMode === "existing" && (
                      <Form.Item name="existing_agreement_id" rules={[{ required: true, message: "Chọn thỏa thuận" }]}>
                        <Select
                          onChange={(value) => {
                            const agreement = customerAgreements.find((item) => item.id === value);
                            if (agreement?.contract_id) {
                              wizardForm.setFieldsValue({ contract_mode: "existing", existing_contract_id: agreement.contract_id });
                            }
                          }}
                          optionFilterProp="label"
                          options={customerAgreements.map((agreement) => ({
                            value: agreement.id,
                            label: `${agreement.agreement_number} · ${agreement.sign_date ? dayjs(agreement.sign_date).format("DD/MM/YYYY") : "Chưa có ngày ký"}`,
                          }))}
                          placeholder={effectiveCustomerId ? "Chọn thỏa thuận" : "Chọn khách hàng trước"}
                          showSearch
                        />
                      </Form.Item>
                    )}
                    {agreementMode === "new" && (
                      <div className="project-creation-grid compact">
                        <Form.Item className="span-2" label="Số thỏa thuận" name="agreement_number" rules={[{ required: true, message: "Nhập số thỏa thuận" }]}><Input maxLength={50} /></Form.Item>
                        <Form.Item className="span-2" label="Ngày ký" name="agreement_sign_date" rules={[{ required: true, message: "Chọn ngày ký" }]}><DatePicker className="notranslate" popupClassName="notranslate" format="DD/MM/YYYY" style={{ width: "100%" }} /></Form.Item>
                      </div>
                    )}
                    {agreementMode !== "none" && (
                      <Card className="commercial-file-card" size="small" type="inner" title={<Space><PaperClipOutlined />Tệp thỏa thuận</Space>}>
                        <div className="project-creation-grid compact">
                          <Form.Item label="Loại tệp" name="agreement_file_kind">
                            <Select
                              options={[
                                { value: "signed_scan", label: "Bản đã ký" },
                                { value: "attachment", label: "Bản dự thảo / phụ lục" },
                              ]}
                            />
                          </Form.Item>
                          <Form.Item
                            className="span-2"
                            label="Tải tệp thỏa thuận"
                            name="agreement_file_list"
                            valuePropName="fileList"
                            getValueFromEvent={(event) => Array.isArray(event) ? event : event?.fileList}
                            extra="PDF, Word, JPG hoặc PNG; tối đa 20 MB. Tải lại cùng loại sẽ tự tạo phiên bản mới."
                          >
                            <Upload
                              accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.zip,.rar"
                              beforeUpload={(file) => {
                                if (file.size > 20 * 1024 * 1024) {
                                  message.error("Tệp thỏa thuận không được vượt quá 20 MB");
                                  return Upload.LIST_IGNORE;
                                }
                                return false;
                              }}
                              maxCount={1}
                            >
                              <Button icon={<UploadOutlined />}>Chọn tệp thỏa thuận</Button>
                            </Upload>
                          </Form.Item>
                        </div>
                      </Card>
                    )}
                  </Card>
                </div>
              </div>
            )}

            {actualCreationStep === 3 && (
              <div className="project-creation-step">
                <Alert
                  description="Kiểm tra mã hồ sơ trước khi tạo. Các dữ liệu đăng ký, xem xét, man-day và hồ sơ thương mại sẽ được liên kết."
                  message="Khởi tạo dự án chứng nhận"
                  showIcon
                  type="info"
                />
                <Form.Item label="Mã hồ sơ chứng nhận" name="project_code" rules={[{ required: true, message: "Nhập mã hồ sơ" }]}>
                  <Input maxLength={50} />
                </Form.Item>
                <div className="project-creation-summary final">
                  <div><span>Đơn đăng ký</span><strong>{applicationMode === "existing" ? selectedApplication?.application_code : wizardForm.getFieldValue("application_code")}</strong></div>
                  <div><span>Khách hàng</span><strong>{customers.find((item) => item.id === effectiveCustomerId)?.company_name ?? selectedApplication?.customers?.company_name ?? "—"}</strong></div>
                  <div><span>Tiêu chuẩn</span><strong>{selectedApplication?.standard_name ?? standardNames.join(" + ") ?? "—"}</strong></div>
                  <div><span>IAF / ISIC</span><strong>{wizardForm.getFieldValue("iaf_code") ?? "—"} / {wizardForm.getFieldValue("isic_code") ?? "—"}</strong></div>
                  <div><span>Ngày công lần đầu</span><strong>{wizardForm.getFieldValue("final_mandays") ?? "—"} MD</strong></div>
                  <div><span>Hợp đồng</span><strong>{contractMode === "none" ? "Không sử dụng" : contractMode === "existing" ? customerContracts.find((item) => item.id === wizardForm.getFieldValue("existing_contract_id"))?.contract_number ?? "Chưa chọn" : wizardForm.getFieldValue("contract_number")}</strong></div>
                  <div><span>Thỏa thuận</span><strong>{agreementMode === "none" ? "Không sử dụng" : agreementMode === "existing" ? customerAgreements.find((item) => item.id === wizardForm.getFieldValue("existing_agreement_id"))?.agreement_number ?? "Chưa chọn" : wizardForm.getFieldValue("agreement_number")}</strong></div>
                  <div><span>Tệp hợp đồng</span><strong>{wizardForm.getFieldValue("contract_file_list")?.[0]?.name ?? "Chưa tải"}</strong></div>
                  <div><span>Tệp thỏa thuận</span><strong>{wizardForm.getFieldValue("agreement_file_list")?.[0]?.name ?? "Chưa tải"}</strong></div>
                  <div><span>Trạng thái ban đầu</span><strong>Khởi tạo</strong></div>
                </div>
              </div>
            )}

            {(creationError || validationIssues.length > 0) && (
              <div className="project-creation-validation-panel">
                <Alert
                  description={(
                    <div className="project-creation-validation-content">
                      {validationIssues.length > 0 ? (
                        <>
                          <strong>Các nội dung cần bổ sung:</strong>
                          <div className="project-creation-validation-list">
                            {validationIssues.map((issue, index) => (
                              <button
                                key={`${issue.name.join(".")}-${index}`}
                                onClick={() => focusValidationIssue(issue)}
                                type="button"
                              >
                                <span>Bước {issue.step + 1} · {issue.label}</span>
                                <small>{issue.message}</small>
                              </button>
                            ))}
                          </div>
                        </>
                      ) : null}
                    </div>
                  )}
                  message={creationError ?? "Dữ liệu chưa hoàn chỉnh"}
                  showIcon
                  type="error"
                />
              </div>
            )}
          </Form>
        )}
      </Modal>

      <Modal
        destroyOnHidden
        onCancel={() => setIndustrySelectorOpen(false)}
        open={industrySelectorOpen}
        title="Chọn và đối chiếu mã ISIC → NACE → IAF"
        width={1280}
        footer={[
          <Button key="cancel" onClick={() => setIndustrySelectorOpen(false)}>Hủy</Button>,
          <Button key="resolve" loading={industryResolveLoading} onClick={resolveSelectedIndustryCodes}>Tra cứu NACE / IAF</Button>,
          <Button key="apply" type="primary" disabled={!industryResolutionRows.length} onClick={applyIndustrySelections}>Áp dụng mã đã chọn</Button>,
        ]}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            message="Chọn một hoặc nhiều mã ISIC"
            description="Có thể tra nhiều ISIC cùng lúc. Mỗi ISIC được đối chiếu NACE → IAF; kết quả sau đó áp dụng cho các chương trình quản lý đã chọn."
            showIcon
            type="info"
          />
          <div className="project-creation-grid wide">
            <div className="span-2">
              <Text strong>Mã ISIC đăng ký</Text>
              <Select
                mode="multiple"
                maxTagCount="responsive"
                showSearch
                virtual
                listHeight={360}
                loading={isicCodesQuery.isLoading}
                optionFilterProp="label"
                value={industrySelectorIsicIds}
                onChange={setIndustrySelectorIsicIds}
                style={{ width: "100%", marginTop: 8 }}
                placeholder="Tìm theo mã hoặc mô tả"
                options={isicSelectOptions}
              />
            </div>
            <div className="span-2">
              <Text strong>Hệ thống quản lý áp dụng</Text>
              <Checkbox.Group
                value={industrySelectorSystems}
                onChange={(values) => setIndustrySelectorSystems(values as Array<"QMS" | "EMS" | "OHSMS">)}
                style={{ display: "flex", gap: 20, marginTop: 12, flexWrap: "wrap" }}
                options={(managementSystemsFromStandards(supportedCalculationStandards).length
                  ? managementSystemsFromStandards(supportedCalculationStandards)
                  : (["QMS", "EMS", "OHSMS"] as const)
                ).map((system) => ({ value: system, label: managementSystemLabels[system] }))}
              />
            </div>
          </div>
          {industryResolutionRows.length > 0 && (
            <>
              <Alert
                message={`${new Set(industryResolutionRows.map((row) => row.response.source.id)).size} mã ISIC · ${industryResolutionRows.length} dòng đối chiếu theo chương trình`}
                description="Một hoạt động/ISIC dùng cùng lựa chọn NACE → IAF cho các chương trình áp dụng; hệ thống tự đồng bộ lựa chọn giữa các dòng cùng ISIC."
                showIcon
                type="success"
              />
              <Table
              dataSource={industryResolutionRows}
              pagination={false}
              virtual
              rowKey="key"
              scroll={{ x: 1080, y: 430 }}
              columns={[
                { title: "ISIC / hệ thống", width: 220, render: (_, row) => <div><strong>{row.response.source.code}</strong> · {managementSystemLabels[row.response.management_system]}<br /><Text type="secondary">{row.response.source.title_vi ?? row.response.source.title_en}</Text></div> },
                { title: "NACE đề xuất", width: 270, render: (_, row) => <Select className="industry-resolution-select" popupMatchSelectWidth={480} value={row.selected_nace_mapping_id} onChange={(value) => updateIndustryResolutionRow(row.key, { selected_nace_mapping_id: value })} style={{ width: "100%" }} optionFilterProp="label" options={row.response.nace_candidates.map((candidate) => ({ value: candidate.mapping_id, label: `${candidate.nace.code} · ${candidate.nace.title_vi ?? candidate.nace.title_en} · ${candidate.mapping_type}` }))} /> },
                { title: "IAF đề xuất", width: 250, render: (_, row) => { const nace = row.response.nace_candidates.find((candidate) => candidate.mapping_id === row.selected_nace_mapping_id); return <Select className="industry-resolution-select" popupMatchSelectWidth={420} value={row.selected_iaf_mapping_id} onChange={(value) => updateIndustryResolutionRow(row.key, { selected_iaf_mapping_id: value })} style={{ width: "100%" }} optionFilterProp="label" options={(nace?.iaf_candidates ?? []).map((candidate) => ({ value: candidate.mapping_id, label: `IAF ${candidate.iaf_code} · ${candidate.iaf_name}` }))} />; } },
                { title: "Phạm vi/hoạt động áp dụng", render: (_, row) => <Input value={row.scope_description} onChange={(event) => updateIndustryResolutionRow(row.key, { scope_description: event.target.value })} placeholder="Mô tả hoạt động tương ứng" /> },
              ]}
              />
            </>
          )}
        </Space>
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setMandayTableOpen(false)}
        open={mandayTableOpen}
        title="Bảng tra cứu ngày công IAF"
        width={1040}
      >
        <Space direction="vertical" size={16} style={{ width: "100%" }}>
          <Alert
            message="Chọn trực tiếp giá trị trong bảng"
            description={`Nhân sự hiệu dụng hiện tại: ${Number(effectivePersonnelForCalculation || 0)}. Dòng phù hợp được tô nền. Bấm vào giá trị MD để áp dụng vào biểu mẫu.`}
            showIcon
            type="info"
          />
          <Select
            value={mandayTableType}
            onChange={setMandayTableType}
            style={{ width: 360 }}
            options={[
              { value: "QMS", label: "IAF MD5 · ISO 9001 (QMS)" },
              { value: "EMS", label: "IAF MD5 · ISO 14001 (EMS)" },
              { value: "OHSMS", label: "IAF MD5 · ISO 45001 (OH&SMS)" },
              { value: "IMS", label: "IAF MD11 · Hệ thống tích hợp" },
              { value: "MULTI_SITE", label: "IAF MD1 · Tổ chức nhiều địa điểm" },
            ]}
          />

          {mandayTablesQuery.isLoading && <Skeleton active paragraph={{ rows: 8 }} />}
          {!mandayTablesQuery.isLoading && !mandayTables && (
            <Result
              status="warning"
              title="Chưa tải được bảng tra cứu"
              subTitle="Kiểm tra backend và quyền mandays.read, sau đó mở lại bảng."
            />
          )}

          {mandayTables && mandayTableType === "QMS" && (
            <Table
              bordered
              pagination={false}
              rowKey="personnel_label"
              scroll={{ y: 470 }}
              dataSource={mandayTables.qms}
              onRow={(record) => ({
                style: Number(effectivePersonnelForCalculation) >= record.minimum && Number(effectivePersonnelForCalculation) <= record.maximum
                  ? { background: "#e6f4ff" }
                  : undefined,
              })}
              columns={[
                { title: "Nhân sự hiệu dụng", dataIndex: "personnel_label", width: 220 },
                {
                  title: "Stage 1 + Stage 2 (MD)",
                  dataIndex: "mandays",
                  align: "center",
                  render: (value: number) => (
                    <Button type="link" onClick={() => applyReferenceMandays(value)}><strong>{value}</strong></Button>
                  ),
                },
              ]}
            />
          )}

          {mandayTables && mandayTableType === "EMS" && (
            <Table
              bordered
              pagination={false}
              rowKey="personnel_label"
              scroll={{ x: 760, y: 470 }}
              dataSource={mandayTables.ems}
              onRow={(record) => ({
                style: Number(effectivePersonnelForCalculation) >= record.minimum && Number(effectivePersonnelForCalculation) <= record.maximum
                  ? { background: "#e6f4ff" }
                  : undefined,
              })}
              columns={[
                { title: "Nhân sự hiệu dụng", dataIndex: "personnel_label", width: 190 },
                { title: "Cao", dataIndex: "high", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "HIGH")}><strong>{value}</strong></Button> },
                { title: "Trung bình", dataIndex: "medium", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "MEDIUM")}><strong>{value}</strong></Button> },
                { title: "Thấp", dataIndex: "low", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "LOW")}><strong>{value}</strong></Button> },
                { title: "Giới hạn", dataIndex: "limited", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "LIMITED")}><strong>{value}</strong></Button> },
              ]}
            />
          )}

          {mandayTables && mandayTableType === "OHSMS" && (
            <Table
              bordered
              pagination={false}
              rowKey="personnel_label"
              scroll={{ x: 700, y: 470 }}
              dataSource={mandayTables.ohsms}
              onRow={(record) => ({
                style: Number(effectivePersonnelForCalculation) >= record.minimum && Number(effectivePersonnelForCalculation) <= record.maximum
                  ? { background: "#e6f4ff" }
                  : undefined,
              })}
              columns={[
                { title: "Nhân sự hiệu dụng", dataIndex: "personnel_label", width: 210 },
                { title: "Rủi ro cao", dataIndex: "high", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "HIGH")}><strong>{value}</strong></Button> },
                { title: "Rủi ro trung bình", dataIndex: "medium", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "MEDIUM")}><strong>{value}</strong></Button> },
                { title: "Rủi ro thấp", dataIndex: "low", align: "center", render: (value: number) => <Button type="link" onClick={() => applyReferenceMandays(value, "LOW")}><strong>{value}</strong></Button> },
              ]}
            />
          )}

          {mandayTables && mandayTableType === "IMS" && (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Alert
                message="Ma trận giảm thời gian đánh giá tích hợp"
                description="Dòng là mức độ tích hợp của hệ thống; cột là khả năng thực hiện đánh giá kết hợp của đoàn. Bảng chỉ dùng để đối chiếu; tỷ lệ giảm được hệ thống tính tự động từ dữ liệu đã chọn."
                type="warning"
                showIcon
              />
              <Table
                bordered
                pagination={false}
                rowKey="integration"
                dataSource={mandayTables.ims.integration_levels.map((integration) => ({
                  integration,
                  values: mandayTables.ims.matrix[String(integration)] ?? [],
                }))}
                columns={[
                  { title: "Mức độ tích hợp", dataIndex: "integration", render: (value: number) => `${value}%` },
                  ...mandayTables.ims.capability_levels.map((capability, columnIndex) => ({
                    title: `Khả năng ${capability}%`,
                    key: String(capability),
                    align: "center" as const,
                    render: (_: unknown, record: { integration: number; values: number[] }) => {
                      const value = record.values[columnIndex] ?? 0;
                      return <Text strong>{value}%</Text>;
                    },
                  })),
                ]}
              />
            </Space>
          )}

          {mandayTables && mandayTableType === "MULTI_SITE" && (
            <Space direction="vertical" size={12} style={{ width: "100%" }}>
              <Alert
                message="Quy tắc lấy mẫu nhiều địa điểm"
                description="Các công thức này xác định số địa điểm tối thiểu cần đánh giá. Điều kiện cho phép lấy mẫu vẫn phải được người xem xét xác nhận."
                showIcon
                type="info"
              />
              <Card size="small" title="Đánh giá lần đầu">{mandayTables.multi_site.initial}</Card>
              <Card size="small" title="Đánh giá giám sát">{mandayTables.multi_site.surveillance}</Card>
              <Card size="small" title="Tái chứng nhận">{mandayTables.multi_site.recertification}</Card>
              <Card size="small" title="Không áp dụng lấy mẫu">{mandayTables.multi_site.non_sampling_surveillance}</Card>
            </Space>
          )}

          {mandayTables && (
            <Text type="secondary">
              {mandayTables.rules.base_rounding} {mandayTables.rules.stage_split}
            </Text>
          )}
        </Space>
      </Modal>

      <Modal
        destroyOnHidden
        footer={null}
        onCancel={() => setRiskReferenceOpen(false)}
        open={riskReferenceOpen}
        title={riskReferenceType === "EMS" ? "Bảng đối chiếu độ phức tạp EMS" : "Bảng đối chiếu mức rủi ro OH&S"}
        width={1080}
      >
        <Space direction="vertical" size={12} style={{ width: "100%" }}>
          <Alert
            description="Bảng dùng để đối chiếu ngành điển hình. Người xem xét vẫn phải cân nhắc hoạt động thực tế, công nghệ, mối nguy, khía cạnh môi trường và điều kiện riêng của tổ chức."
            message="Đối chiếu theo R.01 / IAF MD5"
            showIcon
            type="info"
          />
          <Input
            allowClear
            onChange={(event) => setRiskReferenceSearch(event.target.value)}
            placeholder="Tìm ngành hoặc hoạt động..."
            prefix={<SearchOutlined />}
            value={riskReferenceSearch}
          />
          <Table
            bordered
            dataSource={(riskReferenceType === "EMS" ? emsRiskReference : ohsmsRiskReference).filter((row) => {
              const keyword = deferredRiskReferenceSearch.trim().toLocaleLowerCase("vi");
              return !keyword || `${row.label} ${row.sectors}`.toLocaleLowerCase("vi").includes(keyword);
            })}
            pagination={false}
            rowKey="level"
            columns={[
              { title: "Mức", dataIndex: "label", width: 130, render: (value: string) => <Tag>{value}</Tag> },
              { title: "Lĩnh vực/hoạt động điển hình", dataIndex: "sectors" },
              {
                title: "Áp dụng",
                key: "action",
                width: 130,
                render: (_: unknown, row: { level: string; label: string }) => (
                  <Button
                    onClick={() => {
                      if (riskReferenceType === "EMS") {
                        wizardForm.setFieldValue("ems_complexity", row.level);
                      } else {
                        wizardForm.setFieldValue("ohsms_complexity", row.level);
                      }
                      setRiskReferenceOpen(false);
                      message.success(`Đã chọn mức ${row.label}`);
                    }}
                    type="primary"
                  >
                    Chọn mức này
                  </Button>
                ),
              },
            ]}
          />
        </Space>
      </Modal>
    </div>
  );
}
