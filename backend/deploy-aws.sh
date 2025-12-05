#!/bin/bash
set -e

echo "🚀 Deploying ClubHub Backend to AWS Lambda..."
echo ""

# Check if AWS SAM CLI is installed
if ! command -v sam &> /dev/null; then
    echo "❌ AWS SAM CLI not found!"
    echo "Install it with: pip install aws-sam-cli"
    echo "Or see: https://docs.aws.amazon.com/serverless-application-model/latest/developerguide/install-sam-cli.html"
    exit 1
fi

# Check if AWS CLI is configured
if ! aws sts get-caller-identity &> /dev/null; then
    echo "❌ AWS CLI not configured!"
    echo "Run: aws configure"
    exit 1
fi

echo "✅ Prerequisites checked"
echo ""

# Build the SAM application
echo "📦 Building SAM application..."
sam build

echo ""
echo "🚀 Deploying to AWS..."
echo ""
echo "⚠️  IMPORTANT: During deployment you'll be asked to provide:"
echo "   - JWTSecretKey: Generate a secure random string"
echo "   - FrontendURL: Your Amplify app URL (can update later)"
echo "   - UseS3Storage: 'true' or 'false' for photo storage"
echo ""

# Deploy using SAM
sam deploy --guided

echo ""
echo "✅ Deployment complete!"
echo ""
echo "📝 Next steps:"
echo "1. Copy the API endpoint URL from the outputs above"
echo "2. Use that URL for your frontend's VITE_API_URL"
echo "3. Deploy your frontend to Amplify (see AWS-DEPLOYMENT.md)"
