#!/bin/bash

# Cloud Run Deployment Script for Catastral Analyzer
# Usage: ./deploy-cloudrun.sh PROJECT_ID

if [ -z "$1" ]; then
    echo "Usage: $0 PROJECT_ID"
    echo "Example: $0 deivid-853701587624"
    exit 1
fi

PROJECT_ID=$1
SERVICE_NAME="catastral-analyzer"
REGION="us-east1"

echo "🚀 Deploying to Cloud Run..."
echo "Project: $PROJECT_ID"
echo "Service: $SERVICE_NAME"
echo "Region: $REGION"

# Build and push the container
echo "📦 Building container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME --project $PROJECT_ID

# Deploy to Cloud Run
echo "🌐 Deploying to Cloud Run..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --allow-unauthenticated \
    --memory 4Gi \
    --cpu 4 \
    --timeout 900 \
    --max-instances 20 \
    --concurrency 100 \
    --port 8080 \
    --project $PROJECT_ID

echo "✅ Deployment complete!"
echo "🔗 Service URL: https://$SERVICE_NAME-$REGION.run.app"
echo ""
echo "⚠️  Don't forget to set your environment variable:"
echo "gcloud run services update $SERVICE_NAME --update-env-vars GEMINI_API_KEY=your_api_key_here --region $REGION --project $PROJECT_ID"