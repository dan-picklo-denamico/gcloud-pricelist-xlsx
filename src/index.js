const express = require('express');
const { rowsToCsv } = require('./csv');
const { uploadToGcs } = require('./storage');

const app = express();
app.use(express.json({ limit: '10mb' }));

const BUCKET_NAME = process.env.GCS_BUCKET_NAME || process.env.CLOUD_STORAGE_BUCKET;
const PORT = parseInt(process.env.PORT || '8080', 10);

if (!BUCKET_NAME) {
  console.warn('Warning: GCS_BUCKET_NAME (or CLOUD_STORAGE_BUCKET) not set; uploads will fail.');
}

/**
 * Expected body:
 * {
 *   "filename": "report",
 *   "sheets": [
 *     { "sheetName": "Data", "data": { "rows": [ [], ["Name","Create Date",...], ... ] } }
 *   ]
 * }
 * Output: CSV file stored in GCS, response { "url": "https://storage.googleapis.com/..." }
 */
app.post('/convert', async (req, res) => {
  try {
    const { filename, sheets } = req.body || {};

    if (!filename || typeof filename !== 'string') {
      return res.status(400).json({ error: 'Missing or invalid "filename"' });
    }
    if (!Array.isArray(sheets) || sheets.length === 0) {
      return res.status(400).json({ error: 'Missing or empty "sheets" array' });
    }

    if (!BUCKET_NAME) {
      return res.status(500).json({ error: 'GCS bucket not configured (set GCS_BUCKET_NAME)' });
    }

    // Use first sheet's rows; multiple sheets could be concatenated here if needed
    const firstSheet = sheets[0];
    const rows = firstSheet?.data?.rows;
    if (!Array.isArray(rows)) {
      return res.status(400).json({ error: 'First sheet must have data.rows (array)' });
    }

    const csv = rowsToCsv(rows);
    const baseName = filename.replace(/\.csv$/i, '');
    const objectName = `${baseName}.csv`;

    const url = await uploadToGcs(BUCKET_NAME, objectName, csv);

    return res.status(200).json({ url });
  } catch (err) {
    console.error('Convert error:', err);
    return res.status(500).json({
      error: 'Conversion or upload failed',
      message: err.message,
    });
  }
});

// Health check for GCP
app.get('/', (req, res) => {
  res.send('OK');
});

app.listen(PORT, () => {
  console.log(`Listening on port ${PORT}`);
});
