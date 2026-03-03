const { Storage } = require('@google-cloud/storage');

const SIGNED_URL_MINUTES = parseInt(process.env.GCS_SIGNED_URL_MINUTES || '0', 10);

/**
 * Upload string content to GCS and return the URL of the object.
 * If GCS_SIGNED_URL_MINUTES > 0, returns a signed URL (for private buckets).
 * @param {string} bucketName - GCS bucket name
 * @param {string} objectName - Object path (e.g. "reports/report-123.csv")
 * @param {string} content - File content
 * @param {string} [contentType='text/csv'] - Content-Type
 * @returns {Promise<string>} - URL to access the uploaded object
 */
async function uploadToGcs(bucketName, objectName, content, contentType = 'text/csv') {
  const storage = new Storage();
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
