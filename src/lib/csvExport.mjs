export function escapeCsvCell(value) {
  const text = String(value ?? '');
  const safeText = typeof value === 'string' && /^[\s\u0000-\u001f]*[=+\-@]/.test(text)
    ? `'${text}`
    : text;

  if (safeText.includes(',') || safeText.includes('"') || /[\r\n]/.test(safeText)) {
    return `"${safeText.replace(/"/g, '""')}"`;
  }
  return safeText;
}
