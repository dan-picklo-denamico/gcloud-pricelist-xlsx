const express = require('express');
const { sheetsToXlsx } = require('./xlsx');
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
 * Output: XLSX file stored in GCS, response { "url": "https://storage.googleapis.com/..." }
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

    const firstSheet = sheets[0];
    if (!Array.isArray(firstSheet?.data?.rows)) {
      return res.status(400).json({ error: 'First sheet must have data.rows (array)' });
    }

    const buffer = await sheetsToXlsx(sheets);
    const baseName = filename.replace(/\.(csv|xlsx)$/i, '');
    const objectName = `${baseName}.xlsx`;

    const url = await uploadToGcs(BUCKET_NAME, objectName, buffer);

    return res.status(200).json({ url });
  } catch (err) {
    console.error('Convert error:', err);

    const is404 =
      err.response?.status === 404 ||
      err.code === 404 ||
      (err.code && String(err.code).includes('404')) ||
      (err.message && err.message.includes('Not Found'));
    let message = err.message;
    if (is404) {
      message =
        'Bucket not found (404). Check that GCS_BUCKET_NAME is correct, the bucket exists, ' +
        'and it is in the same project (set GOOGLE_CLOUD_PROJECT or GCP_PROJECT if needed).';
    }

    return res.status(500).json({
      error: 'Conversion or upload failed',
      message,
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
