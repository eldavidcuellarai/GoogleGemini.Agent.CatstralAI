#!/bin/bash

# Quick update script for Cloud Run
PROJECT_ID="deivid-853701587624"
SERVICE_NAME="catastral-analyzer"
REGION="us-east1"

echo "🔄 Quick updating Cloud Run service..."

# Build and push the container
echo "📦 Building updated container image..."
gcloud builds submit --tag gcr.io/$PROJECT_ID/$SERVICE_NAME --project $PROJECT_ID

# Update the existing service
echo "🚀 Updating Cloud Run service..."
gcloud run deploy $SERVICE_NAME \
    --image gcr.io/$PROJECT_ID/$SERVICE_NAME \
    --platform managed \
    --region $REGION \
    --project $PROJECT_ID

echo "✅ Update complete!"
echo "🔗 Service URL: https://$SERVICE_NAME-$REGION.run.app"