import fs from "node:fs";
import path from "node:path";

const root = process.cwd();
const read = (p) => fs.readFileSync(path.join(root, p), "utf8");
const write = (p, value) => fs.writeFileSync(path.join(root, p), value, "utf8");

function replaceExact(file, from, to, expected = 1) {
  const source = read(file);
  const count = source.split(from).length - 1;
  if (count !== expected) throw new Error(`${file}: expected ${expected}, found ${count}`);
  write(file, source.replaceAll(from, to));
  console.log(`updated ${file}: ${count}`);
}

replaceExact(
  "app/components/CertificationBodyCapabilitiesPanel.tsx",
  "const { Text, Title } = Typography;",
  "const { Text } = Typography;",
);

replaceExact(
  "app/components/ControlledDocumentPanel.tsx",
  "  ], [canManage, currentUserId]);",
  "  ], [canManage, currentUserId, libraryRevisionForm]);",
  1,
);
replaceExact(
  "app/components/ControlledDocumentPanel.tsx",
  "  ], [canManage, currentUserId]);",
  "  ], [canManage, currentUserId, renderForm, templateRevisionForm]);",
  1,
);

replaceExact(
  "app/components/CustomerPortalAccountModal.tsx",
  `  useEffect(() => {\n    if (!open) return;\n    setResult(null);\n    form.resetFields();\n    if (customerId) {\n      form.setFieldValue("customer_id", customerId);\n    }\n  }, [customerId, form, open]);`,
  `  useEffect(() => {\n    if (!open) return undefined;\n    let cancelled = false;\n    queueMicrotask(() => {\n      if (cancelled) return;\n      setResult(null);\n      form.resetFields();\n      if (customerId) {\n        form.setFieldValue("customer_id", customerId);\n      }\n    });\n    return () => {\n      cancelled = true;\n    };\n  }, [customerId, form, open]);`,
);

replaceExact(
  "app/components/DocumentPreviewModal.tsx",
  `    setPreview(null);\n    setError(null);\n    if (!file) return undefined;\n\n    setLoading(true);`,
  `    if (!file) return undefined;\n\n    queueMicrotask(() => {\n      if (!active) return;\n      setPreview(null);\n      setError(null);\n      setLoading(true);\n    });`,
);
replaceExact(
  "app/components/DocumentPreviewModal.tsx",
  `        if (built.kind === "native") nativeUrl = built.url;\n        if (active) setPreview(built);`,
  `        if (built.kind === "native") nativeUrl = built.url;\n        if (active) {\n          setPreview(built);\n        } else if (built.kind === "native") {\n          URL.revokeObjectURL(built.url);\n          nativeUrl = null;\n        }`,
);

replaceExact(
  "app/lib/ooxml-preview.ts",
  `new DecompressionStream("deflate-raw" as any)`,
  `new DecompressionStream("deflate-raw" as CompressionFormat)`,
);

const eslintFile = "eslint.config.mjs";
let eslint = read(eslintFile);
const insertion = `  ...nextTs,\n`;
if ((eslint.split(insertion).length - 1) !== 1) throw new Error("eslint config insertion marker mismatch");
eslint = eslint.replace(insertion, `${insertion}  {\n    files: [\n      "src/**/*.{ts,tsx}",\n      "app/components/**/*.{ts,tsx}",\n      "app/lib/**/*.ts",\n      "app/types/**/*.ts",\n    ],\n    rules: {\n      // CMP production runtime is Vite, not Next.js; native image previews use blob URLs.\n      "@next/next/no-img-element": "off",\n    },\n  },\n`);
write(eslintFile, eslint);
console.log(`updated ${eslintFile}: Vite production override`);

console.log("Step 18A lint cleanup applied successfully.");
