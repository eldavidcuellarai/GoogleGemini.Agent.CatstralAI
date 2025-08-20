# Google Cloud Run Deployment Guide

## Quick Fix for Current Issue

Your current 500 error is likely due to missing environment variables or improper deployment. Follow these steps:

### 1. Set the Environment Variable
```bash
gcloud run services update catastral-analyzer \
  --update-env-vars GEMINI_API_KEY=your_actual_api_key_here \
  --region us-east1 \
  --project deivid-853701587624
```

### 2. Check Current Service Status
```bash
gcloud run services describe catastral-analyzer \
  --region us-east1 \
  --project deivid-853701587624
```

## Full Deployment Process

### Prerequisites
1. Install Google Cloud SDK
2. Authenticate: `gcloud auth login`
3. Set project: `gcloud config set project deivid-853701587624`
4. Enable APIs:
   ```bash
   gcloud services enable run.googleapis.com
   gcloud services enable cloudbuild.googleapis.com
   ```

### Deployment Options

#### Option 1: Using the deployment script
```bash
chmod +x deploy-cloudrun.sh
./deploy-cloudrun.sh deivid-853701587624
```

#### Option 2: Manual deployment
```bash
# Build and push container
gcloud builds submit --tag gcr.io/deivid-853701587624/catastral-analyzer

# Deploy to Cloud Run
gcloud run deploy catastral-analyzer \
  --image gcr.io/deivid-853701587624/catastral-analyzer \
  --platform managed \
  --region us-east1 \
  --allow-unauthenticated \
  --memory 4Gi \
  --cpu 4 \
  --timeout 900 \
  --max-instances 20 \
  --concurrency 100 \
  --port 8080

# Set environment variables
gcloud run services update catastral-analyzer \
  --update-env-vars GEMINI_API_KEY=your_api_key_here \
  --region us-east1
```

### Environment Variables Required
- `GEMINI_API_KEY`: Your Google Gemini AI API key

### Troubleshooting

#### Check logs
```bash
gcloud logging read "resource.type=cloud_run_revision AND resource.labels.service_name=catastral-analyzer" --limit 50 --format json
```

#### Test endpoint directly
```bash
curl -X POST https://catastral-analyzer-us-east1.run.app/api/gemini \
  -H "Content-Type: application/json" \
  -d '{"text": "test", "model": "gemini-2.5-flash"}'
```

### Service URL
Your service should be available at:
`https://catastral-analyzer-us-east1.run.app`

## Common Issues

1. **500 Internal Server Error**: Usually missing `GEMINI_API_KEY` environment variable
2. **Build failures**: Check that all dependencies are in package.json
3. **Timeout errors**: Increase timeout settings in cloudrun.yaml
4. **Memory issues**: Increase memory allocation for large PDFs

## Performance Notes

- Current configuration supports up to 4Gi memory and 4 CPU cores
- Timeout set to 900 seconds for large file processing
- Concurrency set to 100 for handling multiple requests
- Auto-scaling up to 20 instances