function escapeHtml(text) {
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function inlineFormat(text) {
  let out = escapeHtml(text);
  // Bold-italic combos first
  out = out.replace(/\*\*_(.+?)_\*\*/g, '<strong><em>$1</em></strong>');
  out = out.replace(/_\*\*(.+?)\*\*_/g, '<strong><em>$1</em></strong>');
  // Bold
  out = out.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  // Italic
  out = out.replace(/\*(.+?)\*/g, '<em>$1</em>');
  out = out.replace(/(?<![a-zA-Z0-9])_(.+?)_(?![a-zA-Z0-9])/g, '<em>$1</em>');
  return out;
}

export function markdownToHtml(source) {
  if (!source) return '';

  const blocks = source.trim().split(/\n\n+/);
  const parts = [];

  for (const block of blocks) {
    const trimmed = block.trim();
    if (!trimmed) continue;

    const lines = trimmed.split('\n');
    const isList = lines.every((l) => /^[\*\-]\s/.test(l.trim()) || l.trim() === '');

    if (isList && lines.some((l) => /^[\*\-]\s/.test(l.trim()))) {
      const items = lines
        .filter((l) => /^[\*\-]\s/.test(l.trim()))
        .map((l) => `<li>${inlineFormat(l.trim().replace(/^[\*\-]\s/, ''))}</li>`)
        .join('');
      parts.push(`<ul>${items}</ul>`);
      continue;
    }

    parts.push(`<p>${lines.map((l) => inlineFormat(l)).join('<br>')}</p>`);
  }

  return parts.join('');
}
