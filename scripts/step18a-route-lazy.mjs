import fs from "node:fs";

const file = "app/components/DashboardShell.tsx";
let source = fs.readFileSync(file, "utf8");

function replaceExactlyOnce(from, to, label) {
  const count = source.split(from).length - 1;
  if (count !== 1) {
    throw new Error(`${label}: expected exactly one match, found ${count}`);
  }
  source = source.replace(from, to);
}

replaceExactlyOnce(
  'import { useEffect, useMemo, useRef, useState } from "react";',
  'import { lazy, Suspense, useEffect, useMemo, useRef, useState } from "react";',
  "React lazy/Suspense import",
);

for (const line of [
  'import { CertificationProjectDetailScreen } from "./CertificationProjectDetailScreen";\n',
  'import { CertificationProjectsScreen } from "./CertificationProjectsScreen";\n',
  'import { ExpertsScreen } from "./ExpertsScreen";\n',
  'import { ScheduleResourcesScreen } from "./ScheduleResourcesScreen";\n',
]) {
  replaceExactlyOnce(line, "", `remove static screen import: ${line.trim()}`);
}

const lazyDefinitions = `const CertificationProjectDetailScreen = lazy(() =>\n  import("./CertificationProjectDetailScreen").then((module) => ({ default: module.CertificationProjectDetailScreen })),\n);\nconst CertificationProjectsScreen = lazy(() =>\n  import("./CertificationProjectsScreen").then((module) => ({ default: module.CertificationProjectsScreen })),\n);\nconst ExpertsScreen = lazy(() =>\n  import("./ExpertsScreen").then((module) => ({ default: module.ExpertsScreen })),\n);\nconst ScheduleResourcesScreen = lazy(() =>\n  import("./ScheduleResourcesScreen").then((module) => ({ default: module.ScheduleResourcesScreen })),\n);\n\n`;

replaceExactlyOnce(
  "const { Header, Content, Sider } = Layout;\n",
  `${lazyDefinitions}const { Header, Content, Sider } = Layout;\n`,
  "insert lazy screen definitions",
);

replaceExactlyOnce(
  `          ) : null}\n          {accessQuery.isError && !customerPortalMode ? (`,
  `          ) : null}\n          <Suspense fallback={<LoadingSkeleton variant="detail" rows={10} />}>\n          {accessQuery.isError && !customerPortalMode ? (`,
  "open local screen Suspense boundary",
);

replaceExactlyOnce(
  `              onOpenSchedule={() => setActiveView("schedule-resources")}\n            />\n          )}\n        </Content>`,
  `              onOpenSchedule={() => setActiveView("schedule-resources")}\n            />\n          )}\n          </Suspense>\n        </Content>`,
  "close local screen Suspense boundary",
);

fs.writeFileSync(file, source, "utf8");
console.log("Step 18A route-level lazy loading applied to four heavy screens.");
