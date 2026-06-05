export function agentDocumentPreviewUrl(storedPath: string): string {
  return `/api/supervision/user/b2b/agent-documents?storedPath=${encodeURIComponent(storedPath)}`;
}

export function isPdfFileName(name: string): boolean {
  return name.toLowerCase().endsWith(".pdf");
}

export function isImageFileName(name: string): boolean {
  const lower = name.toLowerCase();
  return lower.endsWith(".jpg") || lower.endsWith(".jpeg") || lower.endsWith(".png");
}
