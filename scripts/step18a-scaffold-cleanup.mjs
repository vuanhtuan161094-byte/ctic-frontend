import fs from "node:fs";

const requiredFiles = [
  "vite.ctic.config.ts",
  "src/main.tsx",
  "index.html",
  "vite.config.ts",
  "next.config.ts",
  "app/layout.tsx",
  "app/page.tsx",
  "app/chatgpt-auth.ts",
  "worker/index.ts",
  "db/index.ts",
  "drizzle.config.ts",
  ".openai/hosting.json",
  "eslint.config.mjs",
  ".github/workflows/frontend-quality.yml",
];
for (const file of requiredFiles) {
  if (!fs.existsSync(file)) throw new Error(`Expected scaffold/runtime boundary file missing: ${file}`);
}

const viteEntry = fs.readFileSync("src/main.tsx", "utf8");
const indexHtml = fs.readFileSync("index.html", "utf8");
const productionVite = fs.readFileSync("vite.ctic.config.ts", "utf8");
const staleVite = fs.readFileSync("vite.config.ts", "utf8");
const worker = fs.readFileSync("worker/index.ts", "utf8");
const globalsCss = fs.readFileSync("app/globals.css", "utf8");
const oldEslint = fs.readFileSync("eslint.config.mjs", "utf8");
const qualityWorkflow = fs.readFileSync(".github/workflows/frontend-quality.yml", "utf8");

if (!indexHtml.includes('src="/src/main.tsx"')) throw new Error("Vite browser entrypoint contract changed");
if (!viteEntry.includes("CticApplication")) throw new Error("CMP Vite entrypoint contract changed");
if (!productionVite.includes('@vitejs/plugin-react')) throw new Error("Expected CMP Vite config not found");
if (!staleVite.includes('vinext') || !staleVite.includes('@cloudflare/vite-plugin')) throw new Error("vite.config.ts is no longer the verified vinext/Cloudflare scaffold");
if (!worker.includes("vinext-starter template")) throw new Error("worker/index.ts is no longer the verified starter worker");
if (!globalsCss.includes('@import "tailwindcss"')) throw new Error("Tailwind usage changed; abort cleanup rather than removing styling dependencies");
if (!oldEslint.includes("eslint-config-next")) throw new Error("ESLint is no longer coupled to Next; review cleanup assumptions");
if (!qualityWorkflow.includes("continue-on-error: true")) throw new Error("Full-repository typecheck is no longer a debt snapshot; review cleanup assumptions");

for (const target of [
  ".openai",
  "app/chatgpt-auth.ts",
  "app/layout.tsx",
  "app/page.tsx",
  "db",
  "drizzle",
  "drizzle.config.ts",
  "examples",
  "next.config.ts",
  "vite.config.ts",
  "worker",
]) {
  fs.rmSync(target, { recursive: true, force: true });
}

const pkg = JSON.parse(fs.readFileSync("package.json", "utf8"));
if (pkg.scripts?.build !== "vite build --config vite.ctic.config.ts") throw new Error("Production build script is no longer the verified Vite build");
if (pkg.scripts?.dev !== "vite --config vite.ctic.config.ts --port 5173") throw new Error("Development script is no longer the verified Vite runtime");
delete pkg.scripts["db:generate"];

for (const name of ["drizzle-orm", "next"]) {
  if (!(name in pkg.dependencies)) throw new Error(`Expected scaffold dependency missing before cleanup: ${name}`);
  delete pkg.dependencies[name];
}
for (const name of [
  "@cloudflare/vite-plugin",
  "@vitejs/plugin-rsc",
  "drizzle-kit",
  "eslint-config-next",
  "react-server-dom-webpack",
  "vinext",
  "wrangler",
]) {
  if (!(name in pkg.devDependencies)) throw new Error(`Expected scaffold devDependency missing before cleanup: ${name}`);
  delete pkg.devDependencies[name];
}
fs.writeFileSync("package.json", `${JSON.stringify(pkg, null, 2)}\n`);

const eslintConfig = `import js from "@eslint/js";\nimport tsParser from "@typescript-eslint/parser";\nimport reactHooks from "eslint-plugin-react-hooks";\nimport { defineConfig, globalIgnores } from "eslint/config";\nimport globals from "globals";\n\nconst hookRules =\n  reactHooks.configs?.flat?.["recommended-latest"]?.rules ??\n  reactHooks.configs?.flat?.recommended?.rules ??\n  reactHooks.configs?.recommended?.rules ??\n  {};\n\nexport default defineConfig([\n  globalIgnores(["node_modules/**", "dist/**"]),\n  js.configs.recommended,\n  {\n    files: [\n      "src/**/*.{ts,tsx}",\n      "app/components/**/*.{ts,tsx}",\n      "app/lib/**/*.ts",\n      "app/types/**/*.ts",\n      "vite.ctic.config.ts",\n    ],\n    languageOptions: {\n      parser: tsParser,\n      parserOptions: {\n        ecmaVersion: "latest",\n        sourceType: "module",\n        ecmaFeatures: { jsx: true },\n      },\n      globals: { ...globals.browser, ...globals.node },\n    },\n    plugins: {\n      "react-hooks": reactHooks,\n    },\n    rules: {\n      "no-undef": "off",\n      "no-unused-vars": "off",\n      ...hookRules,\n      "react-hooks/rules-of-hooks": "error",\n      "react-hooks/exhaustive-deps": "warn",\n    },\n  },\n  {\n    files: ["tests/**/*.mjs", "scripts/**/*.mjs", "eslint.config.mjs"],\n    languageOptions: {\n      ecmaVersion: "latest",\n      sourceType: "module",\n      globals: globals.node,\n    },\n  },\n]);\n`;
fs.writeFileSync("eslint.config.mjs", eslintConfig);

const allTsConfig = {
  extends: "./tsconfig.json",
  include: [
    "src/**/*.ts",
    "src/**/*.tsx",
    "src/**/*.d.ts",
    "app/components/**/*.ts",
    "app/components/**/*.tsx",
    "app/lib/**/*.ts",
    "app/types/**/*.ts",
    "vite.ctic.config.ts",
  ],
  exclude: ["node_modules", "dist"],
};
fs.writeFileSync("tsconfig.all.json", `${JSON.stringify(allTsConfig, null, 2)}\n`);

const readme = `# CMP Frontend\n\nFrontend của **Certification Management Platform (CMP)**. Runtime production hiện tại là **Vite + React + TypeScript + Ant Design**.\n\n## Yêu cầu\n\n- Node.js 24.x (repo cũng chấp nhận Node 22.12+)\n- Backend CMP chạy riêng; frontend gọi API qua cấu hình môi trường\n\n## Lệnh chính\n\n\`\`\`bash\nnpm ci\nnpm run dev\nnpm run typecheck\nnpm run typecheck:all\nnpm run lint\nnpm test\n\`\`\`\n\n- \`npm run dev\`: Vite development server tại cổng 5173.\n- \`npm run build\`: production build bằng \`vite.ctic.config.ts\`.\n- \`npm run typecheck\`: kiểm tra TypeScript của production app.\n- \`npm run typecheck:all\`: gate TypeScript cho toàn bộ source TypeScript còn thuộc frontend CMP.\n- \`npm run lint\`: ESLint + React Hooks, không cho phép warning tích lũy.\n- \`npm test\`: production build + toàn bộ regression tests frontend.\n\n## Production\n\nCấu hình mẫu nằm tại \`.env.production.example\`. Production ưu tiên same-origin/reverse-proxy; khi \`VITE_DEPLOYMENT_TARGET=production\`, build sẽ từ chối API URL trỏ về localhost. Source map production được tắt.\n\n## Kiến trúc runtime\n\n- Browser entry: \`index.html\` → \`src/main.tsx\`.\n- Application root: \`app/components/CticApplication.tsx\`.\n- Authenticated shell được lazy-load sau khi khôi phục/xác thực session.\n- Các màn hình nghiệp vụ lớn được code-split theo route để giảm tải ban đầu.\n- Backend vẫn là authority cuối cùng cho quyền, workflow và mutation.\n\n## Lưu ý\n\nRepo này không dùng Next.js, vinext, Cloudflare Worker/D1 hay Drizzle cho runtime CMP. Scaffold thử nghiệm cũ được loại khỏi repository trong Step 18A stabilization. Tailwind/PostCSS vẫn được giữ vì stylesheet CMP hiện dùng \`@import "tailwindcss"\`.\n`;
fs.writeFileSync("README.md", readme);

const hardenedQualityWorkflow = qualityWorkflow
  .replace("      - name: Full-repository TypeScript debt snapshot\n        continue-on-error: true\n        run: npm run typecheck:all\n", "      - name: Repository TypeScript\n        run: npm run typecheck:all\n");
if (hardenedQualityWorkflow === qualityWorkflow) throw new Error("Failed to harden repository typecheck gate");
fs.writeFileSync(".github/workflows/frontend-quality.yml", hardenedQualityWorkflow);

console.log("Prepared bounded removal of obsolete Next/vinext/Cloudflare/Drizzle scaffold, standalone Vite linting, and mandatory repository typecheck.");
