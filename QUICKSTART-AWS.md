# 🚀 AWS Quick Start (30 Minutes)

Deploy ClubHub to AWS Lambda + Amplify using your free credits!

---

## Prerequisites (5 mins)

```bash
# 1. Install AWS CLI
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /

# 2. Install SAM CLI
pip install aws-sam-cli

# 3. Configure AWS
aws configure
# Enter your AWS credentials from IAM console
```

---

## Backend Deployment (15 mins)

```bash
# 1. Generate JWT secret
openssl rand -hex 32
# Copy the output!

# 2. Navigate to backend
cd backend

# 3. Deploy
./deploy-aws.sh

# 4. During prompts, enter:
#    - Stack name: clubhub-api
#    - Region: us-east-1
#    - JWTSecretKey: <paste your secret>
#    - FrontendURL: https://localhost (update later)
#    - UseS3Storage: false
#    - Confirm all: y

# 5. Copy your API URL from outputs!
# Example: https://abc123.execute-api.us-east-1.amazonaws.com
```

---

## Frontend Deployment (10 mins)

```bash
# 1. Push to GitHub
cd ..
git add .
git commit -m "Add AWS deployment"
git push origin main

# 2. Go to AWS Amplify Console
# https://console.aws.amazon.com/amplify/

# 3. Click "New app" → "Host web app"

# 4. Connect GitHub → Select clubhub repo → main branch

# 5. Add environment variable:
#    VITE_API_URL = https://your-api-url.execute-api.us-east-1.amazonaws.com

# 6. Click "Save and deploy"

# 7. Wait 3-5 minutes, then copy your Amplify URL
```

---

## Final Step: Update CORS (2 mins)

```bash
# 1. Go to AWS Lambda Console
# https://console.aws.amazon.com/lambda/

# 2. Click "clubhub-api" function

# 3. Configuration → Environment variables → Edit

# 4. Update:
#    CORS_ORIGINS = https://main.YOUR_APP_ID.amplifyapp.com
#    FRONTEND_URL = https://main.YOUR_APP_ID.amplifyapp.com

# 5. Save
```

---

## ✅ Done!

Visit your Amplify URL: `https://main.YOUR_APP_ID.amplifyapp.com`

**Your app is live on AWS!** 🎉

---

## Costs with Free Tier

- Lambda: 1M requests/month FREE
- API Gateway: 1M requests/month FREE
- Amplify: 1000 build minutes/month FREE
- S3: 5GB storage FREE

**Estimated cost**: $0-5/month for low traffic

---

## Update Your App

**Backend**:
```bash
cd backend
sam build && sam deploy
```

**Frontend**:
```bash
git push origin main
# Amplify auto-deploys!
```

---

## Troubleshooting

❌ **"sam: command not found"**
→ Run: `pip install aws-sam-cli`

❌ **"Unable to locate credentials"**
→ Run: `aws configure`

❌ **Backend returns 502**
→ Wait 10 seconds (cold start), try again

❌ **Frontend can't reach backend**
→ Check CORS_ORIGINS matches Amplify URL

---

## Need More Help?

See full guide: [AWS-DEPLOYMENT.md](./AWS-DEPLOYMENT.md)
