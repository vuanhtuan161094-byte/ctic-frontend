import fs from "node:fs";

const file = "app/components/CertificationProjectDetailScreen.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceExactlyOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${label}: expected exactly one match, found ${count}`);
  source = source.replace(from, to);
}

replaceExactlyOnce(
  'import { useEffect, useRef, useState } from "react";',
  'import { lazy, Suspense, useEffect, useRef, useState } from "react";',
  "React lazy/Suspense import",
);

replaceExactlyOnce(
  'import AuditExecutionWorkspaceModal, { type AuditExecutionWorkspaceMode } from "./AuditExecutionWorkspaceModal";',
  'import type { AuditExecutionWorkspaceMode } from "./AuditExecutionWorkspaceModal";',
  "Audit execution runtime import",
);
replaceExactlyOnce(
  'import CorrectiveActionWorkspaceModal from "./CorrectiveActionWorkspaceModal";\n',
  "",
  "Corrective action runtime import",
);
replaceExactlyOnce(
  'import TechnicalReviewWorkspaceModal from "./TechnicalReviewWorkspaceModal";\n',
  "",
  "Technical review runtime import",
);
replaceExactlyOnce(
  'import CertificationResultWorkspaceModal from "./CertificationResultWorkspaceModal";\n',
  "",
  "Certification result runtime import",
);
replaceExactlyOnce(
  'import CertificateIssuanceWorkspaceModal from "./CertificateIssuanceWorkspaceModal";\n',
  "",
  "Certificate issuance runtime import",
);
replaceExactlyOnce(
  `import AuditDocumentCenterModal, {\n  type AuditDocumentFocus,\n  type AuditDocumentPreview,\n  type AuditDocumentType,\n} from "./AuditDocumentCenterModal";`,
  `import type {\n  AuditDocumentFocus,\n  AuditDocumentPreview,\n  AuditDocumentType,\n} from "./AuditDocumentCenterModal";`,
  "Audit document runtime import",
);
replaceExactlyOnce(
  'import SurveillanceInformationSnapshotModal from "./SurveillanceInformationSnapshotModal";\n',
  "",
  "Surveillance snapshot runtime import",
);
replaceExactlyOnce(
  'import { ScheduleResourcesScreen } from "./ScheduleResourcesScreen";\n',
  "",
  "Schedule runtime import",
);

const lazyDefinitions = `const AuditExecutionWorkspaceModal = lazy(() => import("./AuditExecutionWorkspaceModal"));\nconst CorrectiveActionWorkspaceModal = lazy(() => import("./CorrectiveActionWorkspaceModal"));\nconst TechnicalReviewWorkspaceModal = lazy(() => import("./TechnicalReviewWorkspaceModal"));\nconst CertificationResultWorkspaceModal = lazy(() => import("./CertificationResultWorkspaceModal"));\nconst CertificateIssuanceWorkspaceModal = lazy(() => import("./CertificateIssuanceWorkspaceModal"));\nconst AuditDocumentCenterModal = lazy(() => import("./AuditDocumentCenterModal"));\nconst SurveillanceInformationSnapshotModal = lazy(() => import("./SurveillanceInformationSnapshotModal"));\nconst ScheduleResourcesScreen = lazy(() =>\n  import("./ScheduleResourcesScreen").then((module) => ({ default: module.ScheduleResourcesScreen })),\n);\n\n`;
replaceExactlyOnce(
  "const { Text, Title } = Typography;\n",
  `${lazyDefinitions}const { Text, Title } = Typography;\n`,
  "lazy component definitions",
);

function wrapSelfClosingComponent(componentName, condition) {
  const startMarker = `      <${componentName}`;
  const start = source.indexOf(startMarker);
  if (start === -1) throw new Error(`${componentName}: component start not found`);
  if (source.indexOf(startMarker, start + 1) !== -1) throw new Error(`${componentName}: expected exactly one rendered instance`);
  const closeMarker = "\n      />";
  const closeStart = source.indexOf(closeMarker, start);
  if (closeStart === -1) throw new Error(`${componentName}: self-closing boundary not found`);
  const end = closeStart + closeMarker.length;
  const block = source.slice(start, end);
  const indented = block.split("\n").map((line) => `  ${line}`).join("\n");
  const wrapped = `      {${condition} ? (\n        <Suspense fallback={null}>\n${indented}\n        </Suspense>\n      ) : null}`;
  source = source.slice(0, start) + wrapped + source.slice(end);
}

wrapSelfClosingComponent("AuditExecutionWorkspaceModal", "focusedExecutionWorkspace");
wrapSelfClosingComponent("SurveillanceInformationSnapshotModal", "surveillanceInformationEventId");
wrapSelfClosingComponent("CorrectiveActionWorkspaceModal", "correctiveActionFindingId");
wrapSelfClosingComponent("TechnicalReviewWorkspaceModal", "technicalReviewWorkspacePlanId");
wrapSelfClosingComponent("CertificateIssuanceWorkspaceModal", "certificateIssuancePlanId");
wrapSelfClosingComponent("CertificationResultWorkspaceModal", "certificationResultWorkspace");
wrapSelfClosingComponent("AuditDocumentCenterModal", "auditDocumentWorkspace");

const scheduleStart = `      {coordinationTarget ? (\n        <ScheduleResourcesScreen`;
const scheduleStartCount = source.split(scheduleStart).length - 1;
if (scheduleStartCount !== 1) throw new Error(`ScheduleResourcesScreen conditional: expected one start, found ${scheduleStartCount}`);
source = source.replace(
  scheduleStart,
  `      {coordinationTarget ? (\n        <Suspense fallback={null}>\n          <ScheduleResourcesScreen`,
);
const scheduleClose = `        />\n      ) : null}`;
const scheduleIndex = source.indexOf("<ScheduleResourcesScreen");
const scheduleCloseIndex = source.indexOf(scheduleClose, scheduleIndex);
if (scheduleCloseIndex === -1) throw new Error("ScheduleResourcesScreen conditional close not found");
source = source.slice(0, scheduleCloseIndex)
  + `          />\n        </Suspense>\n      ) : null}`
  + source.slice(scheduleCloseIndex + scheduleClose.length);

fs.writeFileSync(file, source, "utf8");
console.log("Step 18A detail compatibility surfaces are lazy-loaded and mounted only on demand.");
