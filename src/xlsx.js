const ExcelJS = require('exceljs');

/**
 * Sanitize sheet name for Excel (max 31 chars, no : \ / ? * [ ])
 */
function sanitizeSheetName(name) {
  if (!name || typeof name !== 'string') return 'Sheet1';
  const sanitized = name.replace(/[:\\/?*[\]]/g, '').trim() || 'Sheet';
  return sanitized.slice(0, 31);
}

/**
 * Build an XLSX workbook from the API payload and return a Buffer.
 * @param {Array<{ sheetName: string, data: { rows: unknown[][] } }>} sheets
 * @returns {Promise<Buffer>}
 */
async function sheetsToXlsx(sheets) {
  const workbook = new ExcelJS.Workbook();

  for (const sheet of sheets) {
    const name = sanitizeSheetName(sheet.sheetName);
    const worksheet = workbook.addWorksheet(name, { headerFooter: { firstHeader: '', firstFooter: '' } });
    const rows = sheet?.data?.rows;
    if (!Array.isArray(rows)) continue;
    for (const row of rows) {
      if (!Array.isArray(row)) continue;
      worksheet.addRow(row);
    }
  }

  return workbook.xlsx.writeBuffer();
}

module.exports = { sheetsToXlsx, sanitizeSheetName };
