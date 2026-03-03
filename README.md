# Price List JSON → CSV (GCP)

Node.js service that accepts sheet data as JSON, converts it to CSV (same format as the Trim-Tex pricelist example), uploads the file to a Google Cloud Storage bucket, and returns the file URL.

## Request format

**POST** `/convert`  
**Content-Type:** `application/json`

```json
{
  "filename": "report",
  "sheets": [
    {
      "sheetName": "Data",
      "data": {
        "rows": [
          [],
          ["Name", "Create Date", "Age", "Subscribed"],
          ["John", "2024-01-15", 35, "true"],
          ["Marc", "2024-01-15", "", ""]
        ]
      }
    }
  ]
}
```

- `filename`: Base name for the output file (e.g. `report` → `report.csv`).
- `sheets`: Array of sheet objects. Each must have `sheetName` and `data.rows` (array of row arrays). The first sheet’s `rows` are used to generate the CSV.

## Response

**200** – Success

```json
{
  "url": "https://storage.googleapis.com/YOUR_BUCKET/report.csv"
}
```

If `GCS_SIGNED_URL_MINUTES` is set (see below), `url` is a signed URL for private buckets.

**4xx/5xx** – JSON body with `error` (and optional `message`).

## Environment variables

| Variable | Required | Description |
|----------|----------|-------------|
| `GCS_BUCKET_NAME` or `CLOUD_STORAGE_BUCKET` | Yes | GCS bucket where CSV files are written. |
| `GCS_SIGNED_URL_MINUTES` | No | If set to a number > 0, the returned `url` is a signed URL valid for that many minutes (use for private buckets). |
| `PORT` | No | HTTP port (default `8080`). |

## Google Cloud Platform

### Build and run locally with Docker

```bash
docker build -t price-list-csv .
docker run -p 8080:8080 \
  -e GCS_BUCKET_NAME=your-bucket-name \
  -v /path/to/service-account-key.json:/app/gcp-key.json \
  -e GOOGLE_APPLICATION_CREDENTIALS=/app/gcp-key.json \
  price-list-csv
```

### Push to Artifact Registry and run on Cloud Run

```bash
# Set your GCP project and region
export PROJECT_ID=your-project-id
export REGION=us-central1
export BUCKET_NAME=your-csv-bucket

# Build and push
gcloud builds submit --tag gcr.io/$PROJECT_ID/price-list-csv

# Deploy to Cloud Run (uses default service account; grant Storage Object Creator on the bucket)
gcloud run deploy price-list-csv \
  --image gcr.io/$PROJECT_ID/price-list-csv \
  --platform managed \
  --region $REGION \
  --set-env-vars "GCS_BUCKET_NAME=$BUCKET_NAME" \
  --allow-unauthenticated
```

For a **private** bucket, set a signed URL expiry so the response URL is usable:

```bash
gcloud run deploy price-list-csv \
  ... \
  --set-env-vars "GCS_BUCKET_NAME=$BUCKET_NAME,GCS_SIGNED_URL_MINUTES=60"
```

Ensure the Cloud Run service account (or the account in `GOOGLE_APPLICATION_CREDENTIALS`) has **Storage Object Creator** (and **Storage Object Viewer** if using signed URLs) on the bucket.

### Example curl

```bash
curl -X POST https://your-service-url/convert \
  -H "Content-Type: application/json" \
  -d '{"filename":"report","sheets":[{"sheetName":"Data","data":{"rows":[["Name","Age"],["Alice",30],["Bob",25]]}}]}'
```

Response: `{"url":"https://storage.googleapis.com/your-bucket/report.csv"}`
