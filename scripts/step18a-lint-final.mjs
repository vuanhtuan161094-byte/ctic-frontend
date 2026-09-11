import fs from "node:fs";

// One-shot migration; workflow deletes this file after the verified bounded patch.
const file = "app/components/ControlledDocumentPanel.tsx";
let source = fs.readFileSync(file, "utf8");
const replacements = [
  ["], [canManage, currentUserId, libraryRevisionForm]);", "], [canManage, libraryRevisionForm]);"],
  ["], [canManage, currentUserId, renderForm, templateRevisionForm]);", "], [canManage, renderForm, templateRevisionForm]);"],
];
for (const [from, to] of replacements) {
  const count = source.split(from).length - 1;
  if (count !== 1) throw new Error(`${file}: expected exactly one ${from}, found ${count}`);
  source = source.replace(from, to);
}
fs.writeFileSync(file, source, "utf8");
console.log("Removed two verified unnecessary useMemo dependencies.");
