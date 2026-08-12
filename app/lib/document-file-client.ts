import { api } from "./api";

export interface DocumentFileLike {
  original_name?: string | null;
  mime_type?: string | null;
  download_url?: string | null;
}

export interface DocumentFileRequest {
  url: string;
  filename?: string | null;
  mimeType?: string | null;
  timeoutMs?: number;
}

export interface DocumentPreviewRequest extends DocumentFileRequest {
  title?: string;
}

const DEFAULT_FILE_TIMEOUT_MS = 120_000;
const OBJECT_URL_LIFETIME_MS = 5 * 60_000;

const mimeByExtension: Record<string, string> = {
  pdf: "application/pdf",
  png: "image/png",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  gif: "image/gif",
  webp: "image/webp",
  svg: "image/svg+xml",
  txt: "text/plain;charset=utf-8",
  csv: "text/csv;charset=utf-8",
  doc: "application/msword",
  docx: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  xls: "application/vnd.ms-excel",
  xlsx: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
};

function extensionOf(filename?: string | null) {
  const normalized = (filename ?? "").trim().toLowerCase();
  const dot = normalized.lastIndexOf(".");
  return dot >= 0 && dot < normalized.length - 1 ? normalized.slice(dot + 1) : "";
}

function normalizeMime(value?: string | null) {
  return (value ?? "").split(";", 1)[0].trim().toLowerCase();
}

export function inferDocumentMimeType(filename?: string | null, mimeType?: string | null) {
  const supplied = normalizeMime(mimeType);
  if (supplied && supplied !== "application/octet-stream") return supplied;
  return (mimeByExtension[extensionOf(filename)] ?? supplied) || "application/octet-stream";
}

export function isPdfDocument(filename?: string | null, mimeType?: string | null) {
  return inferDocumentMimeType(filename, mimeType) === "application/pdf" || extensionOf(filename) === "pdf";
}

export function isBrowserPreviewableDocument(filename?: string | null, mimeType?: string | null) {
  const mime = inferDocumentMimeType(filename, mimeType);
  return mime === "application/pdf" || mime.startsWith("image/") || mime.startsWith("text/");
}

export function isWordDocument(filename?: string | null, mimeType?: string | null) {
  const mime = inferDocumentMimeType(filename, mimeType);
  const extension = extensionOf(filename);
  return extension === "doc" || extension === "docx" || mime === "application/msword" || mime.includes("wordprocessingml");
}

function safeFilename(filename?: string | null) {
  const trimmed = (filename ?? "").trim();
  return trimmed || "tai-lieu";
}

function scheduleRevoke(objectUrl: string, delay = OBJECT_URL_LIFETIME_MS) {
  window.setTimeout(() => URL.revokeObjectURL(objectUrl), delay);
}

function createLoadingWindow(title = "Đang mở tài liệu") {
  const previewWindow = window.open("about:blank", "_blank");
  if (!previewWindow) return null;

  previewWindow.opener = null;
  try {
    previewWindow.document.title = title;
    previewWindow.document.body.style.fontFamily = "Arial, sans-serif";
    previewWindow.document.body.style.padding = "24px";
    previewWindow.document.body.style.color = "#334155";
    previewWindow.document.body.textContent = "Đang tải tài liệu...";
  } catch {
    // Một số trình duyệt có thể khóa thao tác DOM với cửa sổ mới; việc điều hướng vẫn hoạt động.
  }

  return previewWindow;
}

async function fetchDocumentBlob(request: DocumentFileRequest) {
  const response = await api.get<Blob>(request.url, {
    responseType: "blob",
    timeout: request.timeoutMs ?? DEFAULT_FILE_TIMEOUT_MS,
  });

  const responseMime = String(response.headers["content-type"] ?? "");
  const mimeType = inferDocumentMimeType(request.filename, responseMime || request.mimeType);
  const rawBlob = response.data instanceof Blob
    ? response.data
    : new Blob([response.data], { type: mimeType });

  // Axios/SQL storage cũ đôi khi trả application/octet-stream dù file là PDF.
  // Bọc lại Blob với MIME suy luận từ tên file để trình duyệt preview đúng thay vì tải xuống.
  const blob = rawBlob.type === mimeType
    ? rawBlob
    : new Blob([rawBlob], { type: mimeType });

  return { blob, mimeType };
}

export async function downloadDocumentFile(request: DocumentFileRequest) {
  const { blob } = await fetchDocumentBlob(request);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = window.document.createElement("a");
  anchor.href = objectUrl;
  anchor.download = safeFilename(request.filename);
  anchor.style.display = "none";
  window.document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  scheduleRevoke(objectUrl, 2_000);
}

export async function previewDocumentFile(request: DocumentPreviewRequest) {
  if (!isBrowserPreviewableDocument(request.filename, request.mimeType)) {
    throw new Error(
      isWordDocument(request.filename, request.mimeType)
        ? "Tệp Word không thể xem trực tiếp ổn định trên trình duyệt. Hãy dùng nút Tải Word."
        : "Định dạng tệp này không hỗ trợ xem trực tiếp. Hãy tải tệp xuống để mở.",
    );
  }

  // Mở cửa sổ ngay trong thao tác click để tránh popup blocker sau khi await API.
  const previewWindow = createLoadingWindow(request.title);
  if (!previewWindow) {
    throw new Error("Trình duyệt đang chặn cửa sổ xem tài liệu. Hãy cho phép popup rồi thử lại.");
  }

  try {
    const { blob } = await fetchDocumentBlob(request);
    const objectUrl = URL.createObjectURL(blob);
    previewWindow.location.replace(objectUrl);
    scheduleRevoke(objectUrl);
  } catch (error) {
    previewWindow.close();
    throw error;
  }
}

/**
 * Hành vi dùng cho nút chung kiểu “Mở tệp”:
 * - PDF/ảnh/text: xem trực tiếp.
 * - Word và định dạng không preview được: tải xuống.
 * Nút có nhãn “Xem PDF” nên gọi previewDocumentFile để không bao giờ tự tải xuống.
 */
export async function openDocumentFile(request: DocumentPreviewRequest) {
  if (isBrowserPreviewableDocument(request.filename, request.mimeType)) {
    return previewDocumentFile(request);
  }
  return downloadDocumentFile(request);
}

export function documentRequestFromFile(
  file: DocumentFileLike,
  fallbackUrl?: string,
): DocumentFileRequest {
  const url = file.download_url || fallbackUrl;
  if (!url) throw new Error("Tài liệu chưa có đường dẫn tải tệp.");

  return {
    url,
    filename: file.original_name,
    mimeType: file.mime_type,
  };
}
