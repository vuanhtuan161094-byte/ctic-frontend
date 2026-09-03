import { Typography } from "antd";

import { EvidenceList, SectionHeader } from "../design-system";
import { DOCUMENT_GROUP_LABELS, documentGroup, formatCaseDate, type DocumentGroupKey } from "./case-model";
import type { CertificationCaseFile, CertificationCaseWorkspaceData } from "./types";

const groupOrder: DocumentGroupKey[] = ["customer", "audit", "cap", "review", "decision", "certificate", "other"];

export function CertificationCaseDocuments({ data, onOpenFile }: { data: CertificationCaseWorkspaceData; onOpenFile: (file: CertificationCaseFile) => void }) {
  const grouped = new Map<DocumentGroupKey, CertificationCaseFile[]>();
  for (const file of data.dossier.files) {
    const key = documentGroup(file);
    grouped.set(key, [...(grouped.get(key) ?? []), file]);
  }
  const visibleGroups = groupOrder.filter((key) => grouped.has(key));

  return (
    <div className="cmp-case-area" data-case-area="documents">
      <section className="cmp-case-section">
        <SectionHeader
          title="Tài liệu"
          description="Tệp được nhóm theo ý nghĩa nghiệp vụ từ metadata hiện có; không trộn thành một bảng kỹ thuật duy nhất."
        />
        {visibleGroups.length ? (
          <div className="cmp-case-document-groups">
            {visibleGroups.map((key) => {
              const files = [...(grouped.get(key) ?? [])].sort((left, right) => new Date(right.uploaded_at).getTime() - new Date(left.uploaded_at).getTime());
              return (
                <section className="cmp-case-document-group" key={key}>
                  <SectionHeader title={DOCUMENT_GROUP_LABELS[key]} description={`${files.length} tệp có thể truy cập`} />
                  <EvidenceList items={files.map((file) => ({
                    key: file.id,
                    name: file.original_name,
                    owner: `Phiên bản ${file.version_no}`,
                    metadata: formatCaseDate(file.uploaded_at),
                    preview: () => onOpenFile(file),
                  }))} />
                </section>
              );
            })}
          </div>
        ) : <Typography.Text type="secondary">Chưa có tệp nào được nguồn nghiệp vụ liên kết với hồ sơ này.</Typography.Text>}
      </section>
    </div>
  );
}
