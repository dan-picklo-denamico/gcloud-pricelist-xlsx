const { Storage } = require('@google-cloud/storage');

const SIGNED_URL_MINUTES = parseInt(process.env.GCS_SIGNED_URL_MINUTES || '0', 10);
const PROJECT_ID = process.env.GOOGLE_CLOUD_PROJECT || process.env.GCP_PROJECT;

const XLSX_CONTENT_TYPE = 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';

/**
 * Upload file content (string or Buffer) to GCS and return the URL of the object.
 * If GCS_SIGNED_URL_MINUTES > 0, returns a signed URL (for private buckets).
 * @param {string} bucketName - GCS bucket name
 * @param {string} objectName - Object path (e.g. "reports/report.xlsx")
 * @param {string|Buffer} content - File content
 * @param {string} [contentType] - Content-Type (default: XLSX for Buffer, text/csv for string)
 * @returns {Promise<string>} - URL to access the uploaded object
 */
async function uploadToGcs(bucketName, objectName, content, contentType) {
  if (contentType === undefined) {
    contentType = Buffer.isBuffer(content) ? XLSX_CONTENT_TYPE : 'text/csv';
  }
  const options = PROJECT_ID ? { projectId: PROJECT_ID } : {};
  const storage = new Storage(options);
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(objectName);

  await file.save(content, {
    contentType,
    metadata: {
      cacheControl: 'no-cache',
    },
  });

  if (SIGNED_URL_MINUTES > 0) {
    const [signedUrl] = await file.getSignedUrl({
      action: 'read',
      expires: Date.now() + SIGNED_URL_MINUTES * 60 * 1000,
    });
    return signedUrl;
  }
  return `https://storage.googleapis.com/${bucketName}/${objectName}`;
}

module.exports = { uploadToGcs };
