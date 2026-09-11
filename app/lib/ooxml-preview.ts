export interface PreviewSheet {
  name: string;
  html: string;
}

export type BuiltPreview =
  | { kind: "docx"; html: string }
  | { kind: "xlsx"; sheets: PreviewSheet[] }
  | { kind: "text"; text: string }
  | { kind: "native"; url: string; mimeType: string }
  | { kind: "unsupported"; message: string };

const decoder = new TextDecoder("utf-8");

function extensionOf(filename?: string | null) {
  const value = (filename ?? "").trim().toLowerCase();
  const dot = value.lastIndexOf(".");
  return dot >= 0 ? value.slice(dot + 1) : "";
}

function escapeHtml(value: string) {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function readU16(bytes: Uint8Array, offset: number) {
  return bytes[offset] | (bytes[offset + 1] << 8);
}

function readU32(bytes: Uint8Array, offset: number) {
  return (bytes[offset] | (bytes[offset + 1] << 8) | (bytes[offset + 2] << 16) | (bytes[offset + 3] << 24)) >>> 0;
}

interface ZipEntry {
  name: string;
  compression: number;
  compressedSize: number;
  uncompressedSize: number;
  localOffset: number;
}

function parseZipEntries(bytes: Uint8Array) {
  const eocdSignature = 0x06054b50;
  let eocd = -1;
  const min = Math.max(0, bytes.length - 65_557);
  for (let offset = bytes.length - 22; offset >= min; offset -= 1) {
    if (readU32(bytes, offset) === eocdSignature) {
      eocd = offset;
      break;
    }
  }
  if (eocd < 0) throw new Error("Không đọc được cấu trúc file Office.");

  const totalEntries = readU16(bytes, eocd + 10);
  const centralOffset = readU32(bytes, eocd + 16);
  let offset = centralOffset;
  const entries = new Map<string, ZipEntry>();

  for (let index = 0; index < totalEntries; index += 1) {
    if (readU32(bytes, offset) !== 0x02014b50) break;
    const compression = readU16(bytes, offset + 10);
    const compressedSize = readU32(bytes, offset + 20);
    const uncompressedSize = readU32(bytes, offset + 24);
    const fileNameLength = readU16(bytes, offset + 28);
    const extraLength = readU16(bytes, offset + 30);
    const commentLength = readU16(bytes, offset + 32);
    const localOffset = readU32(bytes, offset + 42);
    const name = decoder.decode(bytes.slice(offset + 46, offset + 46 + fileNameLength));
    entries.set(name, { name, compression, compressedSize, uncompressedSize, localOffset });
    offset += 46 + fileNameLength + extraLength + commentLength;
  }
  return entries;
}

async function inflateRaw(data: Uint8Array) {
  if (typeof DecompressionStream === "undefined") {
    throw new Error("Trình duyệt này chưa hỗ trợ xem nhanh Word/Excel. Hãy dùng Chrome/Edge mới hoặc tải file gốc.");
  }
  const copy = new Uint8Array(data.byteLength);
  copy.set(data);
  const stream = new Blob([copy.buffer]).stream().pipeThrough(new DecompressionStream("deflate-raw" as any));
  return new Uint8Array(await new Response(stream).arrayBuffer());
}

async function readZipEntry(bytes: Uint8Array, entry: ZipEntry) {
  const offset = entry.localOffset;
  if (readU32(bytes, offset) !== 0x04034b50) throw new Error("File Office có cấu trúc không hợp lệ.");
  const fileNameLength = readU16(bytes, offset + 26);
  const extraLength = readU16(bytes, offset + 28);
  const start = offset + 30 + fileNameLength + extraLength;
  const compressed = bytes.slice(start, start + entry.compressedSize);
  if (entry.compression === 0) return compressed;
  if (entry.compression === 8) return inflateRaw(compressed);
  throw new Error(`Kiểu nén Office chưa được hỗ trợ (${entry.compression}).`);
}

async function readZipText(bytes: Uint8Array, entries: Map<string, ZipEntry>, name: string) {
  const entry = entries.get(name);
  if (!entry) return null;
  return decoder.decode(await readZipEntry(bytes, entry));
}

function xml(text: string) {
  const doc = new DOMParser().parseFromString(text, "application/xml");
  if (doc.querySelector("parsererror")) throw new Error("Không đọc được nội dung XML trong file Office.");
  return doc;
}

function localName(node: Node) {
  return (node as Element).localName || node.nodeName.split(":").pop() || node.nodeName;
}

function descendantText(element: Element) {
  const parts: string[] = [];
  const walk = (node: Node) => {
    if (node.nodeType === Node.TEXT_NODE) return;
    if (node.nodeType === Node.ELEMENT_NODE) {
      const name = localName(node);
      if (name === "t") parts.push(node.textContent ?? "");
      else if (name === "tab") parts.push("\t");
      else if (name === "br" || name === "cr") parts.push("\n");
    }
    node.childNodes.forEach(walk);
  };
  walk(element);
  return parts.join("");
}

function paragraphHtml(element: Element) {
  const text = descendantText(element).trimEnd();
  if (!text) return '<p class="cmp-docx-empty">&nbsp;</p>';
  const styleNode = Array.from(element.getElementsByTagName("*")).find((node) => localName(node) === "pStyle");
  const style = styleNode?.getAttribute("w:val") || styleNode?.getAttribute("val") || "";
  const tag = /heading1|title/i.test(style) ? "h2" : /heading2/i.test(style) ? "h3" : /heading3/i.test(style) ? "h4" : "p";
  return `<${tag}>${escapeHtml(text).replaceAll("\n", "<br/>").replaceAll("\t", "&emsp;")}</${tag}>`;
}

function tableHtml(table: Element) {
  const rows = Array.from(table.children).filter((node) => localName(node) === "tr");
  const body = rows.map((row) => {
    const cells = Array.from(row.children).filter((node) => localName(node) === "tc");
    return `<tr>${cells.map((cell) => `<td>${escapeHtml(descendantText(cell).trim()).replaceAll("\n", "<br/>") || "&nbsp;"}</td>`).join("")}</tr>`;
  }).join("");
  return `<div class="cmp-preview-table-wrap"><table class="cmp-preview-table"><tbody>${body}</tbody></table></div>`;
}

async function previewDocx(bytes: Uint8Array, entries: Map<string, ZipEntry>): Promise<BuiltPreview> {
  const documentXml = await readZipText(bytes, entries, "word/document.xml");
  if (!documentXml) throw new Error("Không tìm thấy nội dung Word trong file.");
  const doc = xml(documentXml);
  const body = Array.from(doc.getElementsByTagName("*")).find((node) => localName(node) === "body");
  if (!body) throw new Error("Không tìm thấy phần nội dung chính của Word.");
  const blocks = Array.from(body.children).map((child) => {
    const name = localName(child);
    if (name === "p") return paragraphHtml(child);
    if (name === "tbl") return tableHtml(child);
    return "";
  }).filter(Boolean);
  return {
    kind: "docx",
    html: `<article class="cmp-docx-preview">${blocks.join("") || "<p>Tài liệu không có nội dung văn bản có thể xem nhanh.</p>"}</article>`,
  };
}

function columnIndex(ref: string) {
  const letters = (ref.match(/[A-Z]+/i)?.[0] ?? "A").toUpperCase();
  let value = 0;
  for (const char of letters) value = value * 26 + (char.charCodeAt(0) - 64);
  return Math.max(0, value - 1);
}

function cellValue(cell: Element, sharedStrings: string[]) {
  const type = cell.getAttribute("t") ?? "";
  const values = Array.from(cell.getElementsByTagName("*")).filter((node) => localName(node) === "v");
  const raw = values[0]?.textContent ?? "";
  if (type === "s") return sharedStrings[Number(raw)] ?? raw;
  if (type === "inlineStr") return descendantText(cell);
  if (type === "b") return raw === "1" ? "TRUE" : "FALSE";
  return raw;
}

async function previewXlsx(bytes: Uint8Array, entries: Map<string, ZipEntry>): Promise<BuiltPreview> {
  const sharedXml = await readZipText(bytes, entries, "xl/sharedStrings.xml");
  const sharedStrings = sharedXml
    ? Array.from(xml(sharedXml).getElementsByTagName("*")).filter((node) => localName(node) === "si").map((node) => descendantText(node))
    : [];

  const workbookXml = await readZipText(bytes, entries, "xl/workbook.xml");
  const relsXml = await readZipText(bytes, entries, "xl/_rels/workbook.xml.rels");
  const relMap = new Map<string, string>();
  if (relsXml) {
    const relDoc = xml(relsXml);
    Array.from(relDoc.getElementsByTagName("*")).filter((node) => localName(node) === "Relationship").forEach((node) => {
      const id = node.getAttribute("Id");
      const target = node.getAttribute("Target");
      if (id && target) relMap.set(id, target.startsWith("/") ? target.slice(1) : `xl/${target.replace(/^\.\//, "")}`);
    });
  }

  const sheetDefs: Array<{ name: string; path: string }> = [];
  if (workbookXml) {
    const workbook = xml(workbookXml);
    Array.from(workbook.getElementsByTagName("*")).filter((node) => localName(node) === "sheet").forEach((node, index) => {
      const name = node.getAttribute("name") || `Sheet ${index + 1}`;
      const relId = node.getAttribute("r:id") || node.getAttributeNS("http://schemas.openxmlformats.org/officeDocument/2006/relationships", "id") || "";
      const path = relMap.get(relId) || `xl/worksheets/sheet${index + 1}.xml`;
      sheetDefs.push({ name, path });
    });
  }
  if (!sheetDefs.length) {
    Array.from(entries.keys()).filter((name) => /^xl\/worksheets\/sheet\d+\.xml$/i.test(name)).sort().forEach((path, index) => sheetDefs.push({ name: `Sheet ${index + 1}`, path }));
  }

  const sheets: PreviewSheet[] = [];
  for (const sheet of sheetDefs.slice(0, 10)) {
    const sheetXml = await readZipText(bytes, entries, sheet.path);
    if (!sheetXml) continue;
    const sheetDoc = xml(sheetXml);
    const rowElements = Array.from(sheetDoc.getElementsByTagName("*")).filter((node) => localName(node) === "row").slice(0, 200);
    const matrix: string[][] = [];
    let maxColumns = 0;
    for (const row of rowElements) {
      const cells = Array.from(row.children).filter((node) => localName(node) === "c");
      const values: string[] = [];
      for (const cell of cells) {
        const index = columnIndex(cell.getAttribute("r") || "A1");
        if (index >= 40) continue;
        while (values.length <= index) values.push("");
        values[index] = cellValue(cell, sharedStrings);
        maxColumns = Math.max(maxColumns, index + 1);
      }
      matrix.push(values);
    }
    const rows = matrix.map((row) => `<tr>${Array.from({ length: Math.max(1, maxColumns) }, (_, index) => `<td>${escapeHtml(row[index] ?? "") || "&nbsp;"}</td>`).join("")}</tr>`).join("");
    sheets.push({
      name: sheet.name,
      html: `<div class="cmp-preview-table-wrap"><table class="cmp-preview-table cmp-xlsx-preview-table"><tbody>${rows || '<tr><td>Sheet không có dữ liệu hiển thị.</td></tr>'}</tbody></table></div>`,
    });
  }
  return { kind: "xlsx", sheets: sheets.length ? sheets : [{ name: "Sheet 1", html: "<p>Không đọc được dữ liệu sheet.</p>" }] };
}

export async function buildDocumentPreview(blob: Blob, filename?: string | null, mimeType?: string | null): Promise<BuiltPreview> {
  const extension = extensionOf(filename);
  const mime = (mimeType || blob.type || "").toLowerCase();
  if (extension === "docx") {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return previewDocx(bytes, parseZipEntries(bytes));
  }
  if (extension === "xlsx") {
    const bytes = new Uint8Array(await blob.arrayBuffer());
    return previewXlsx(bytes, parseZipEntries(bytes));
  }
  if (extension === "pdf" || mime.includes("pdf") || mime.startsWith("image/")) {
    return { kind: "native", url: URL.createObjectURL(blob), mimeType: mime || "application/octet-stream" };
  }
  if (mime.startsWith("text/") || ["txt", "csv"].includes(extension)) {
    return { kind: "text", text: await blob.text() };
  }
  return {
    kind: "unsupported",
    message: "Định dạng này chưa hỗ trợ xem nhanh trong CMP. Hãy dùng nút Tải file gốc.",
  };
}
