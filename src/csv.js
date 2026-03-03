/**
 * Convert a cell value to a CSV-safe string.
 * Values containing comma, quote, or newline are wrapped in quotes; internal " → "".
 */
function escapeCell(value) {
  if (value === null || value === undefined) return '';
  const s = String(value);
  if (s.includes(',') || s.includes('"') || s.includes('\n') || s.includes('\r')) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

/**
 * Convert an array of row arrays into CSV text (RFC 4180-style).
 * @param {unknown[][]} rows - Array of rows, each row an array of cell values
 * @returns {string}
 */
function rowsToCsv(rows) {
  if (!Array.isArray(rows) || rows.length === 0) return '';
  return rows
    .map((row) => {
      if (!Array.isArray(row)) return '';
      return row.map(escapeCell).join(',');
    })
    .join('\n');
}

module.exports = { rowsToCsv, escapeCell };
