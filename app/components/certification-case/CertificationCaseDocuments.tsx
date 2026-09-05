import { Typography } from "antd";

import { EvidenceList, SectionHeader } from "../design-system";
import { DOCUMENT_GROUP_LABELS, formatCaseDate } from "./case-model";
import type { CertificationCaseProjectedFile, CertificationCaseWorkspaceProjection } from "./types";

export function CertificationCaseDocuments({ data, onOpenFile }: { data: CertificationCaseWorkspaceProjection; onOpenFile: (file: CertificationCaseProjectedFile) => void }) {
  const visibleGroups = data.document_summary.groups.filter((group) => group.count > 0);

  return (
    <div className="cmp-case-area" data-case-area="documents">
      <section className="cmp-case-section">
        <SectionHeader
          title="Tài liệu"
          description={`${data.document_summary.total} tệp hiện hành được nhóm theo ý nghĩa nghiệp vụ; danh sách đầy đủ và tải xuống vẫn dùng endpoint tài liệu đã được phân quyền.`}
        />
        {visibleGroups.length ? (
          <div className="cmp-case-document-groups">
            {visibleGroups.map((group) => (
              <section className="cmp-case-document-group" key={group.key} data-document-ready={group.ready}>
                <SectionHeader title={DOCUMENT_GROUP_LABELS[group.key]} description={`${group.count} tệp · ${group.ready ? "Đã có tài liệu hiện hành" : "Chưa sẵn sàng"}`} />
                <EvidenceList items={group.items.map((file) => ({
                  key: file.id,
                  name: file.original_name,
                  owner: `Phiên bản ${file.version_no}`,
                  metadata: formatCaseDate(file.uploaded_at),
                  preview: () => onOpenFile(file),
                }))} />
              </section>
            ))}
          </div>
        ) : <Typography.Text type="secondary">Chưa có tệp hiện hành được liên kết với hồ sơ này.</Typography.Text>}
      </section>
    </div>
  );
}
