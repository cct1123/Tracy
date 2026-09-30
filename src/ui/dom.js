/** Escape user-supplied names and imported text before HTML interpolation. */
export function escapeHTML(value) {
  return String(value ?? '').replace(
    /[&<>"']/g,
    (char) =>
      ({
        '&': '&amp;',
        '<': '&lt;',
        '>': '&gt;',
        '"': '&quot;',
        "'": '&#39;',
      })[char],
  );
}

/** Keep fine axial adjustments visible without trailing floating-point noise. */
export function formatPosition(value, minimumDecimals = 2) {
  if (!Number.isFinite(value)) return '—';
  const [whole, fraction] = value.toFixed(6).split('.');
  return `${whole}.${fraction.replace(/0+$/, '').padEnd(minimumDecimals, '0')}`;
}
