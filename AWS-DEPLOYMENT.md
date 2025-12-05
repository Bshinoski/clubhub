# 🚀 AWS Deployment Guide - Lambda + Amplify

Deploy ClubHub using:
- **Backend**: AWS Lambda + API Gateway (serverless, pay-per-request)
- **Frontend**: AWS Amplify (static hosting with CI/CD)

**Time to deploy**: 30-45 minutes
**Cost**: ~$5-10/month with free tier, likely $0 if you have AWS credits

---

## Prerequisites

### 1. Install AWS CLI

**macOS/Linux:**
```bash
curl "https://awscli.amazonaws.com/AWSCLIV2.pkg" -o "AWSCLIV2.pkg"
sudo installer -pkg AWSCLIV2.pkg -target /
```

**Windows:**
Download from: https://aws.amazon.com/cli/

**Verify:**
```bash
aws --version
```

### 2. Install AWS SAM CLI

```bash
pip install aws-sam-cli
# or with Homebrew (macOS):
brew install aws-sam-cli
```

**Verify:**
```bash
sam --version
```

### 3. Configure AWS Credentials

```bash
aws configure
```

Enter:
- **AWS Access Key ID**: From AWS Console → IAM → Users → Security Credentials
- **AWS Secret Access Key**: From same place
- **Default region**: `us-east-1` (recommended)
- **Output format**: `json`

---

## Part 1: Deploy Backend (Lambda + API Gateway)

### Step 1: Generate JWT Secret

```bash
# Generate a secure random string
openssl rand -hex 32
# Copy the output - you'll need it in Step 3
```

### Step 2: Navigate to Backend

```bash
cd backend
```

### Step 3: Deploy with SAM

**Option A: Guided Deployment (Recommended for first time)**

```bash
./deploy-aws.sh
```

This will:
1. Build your Lambda package
2. Create an S3 bucket for deployment artifacts
3. Deploy Lambda function + API Gateway
4. Prompt you for configuration:
   - **Stack Name**: `clubhub-api` (press Enter)
   - **AWS Region**: `us-east-1` (or your preferred region)
   - **JWTSecretKey**: Paste the secret from Step 1
   - **FrontendURL**: `https://main.d1234567890.amplifyapp.com` (update after frontend deploy)
   - **UseS3Storage**: `false` (use `true` if you want S3 for photos)
   - **S3BucketName**: `clubhub-photos-yourname` (must be globally unique)
   - Confirm changes: `y`
   - Allow SAM to create IAM roles: `y`
   - Save config: `y`

**Option B: One-Line Deployment (After first time)**

```bash
sam build && sam deploy
```

### Step 4: Get Your API URL

After deployment, you'll see:
```
CloudFormation outputs from deployed stack
-------------------------------------------------
Outputs
-------------------------------------------------
Key                 ApiEndpoint
Description         API Gateway endpoint URL
Value               https://abc123.execute-api.us-east-1.amazonaws.com
-------------------------------------------------
```

**Copy this API endpoint URL** - you'll need it for the frontend!

### Step 5: Test Your Backend

```bash
# Replace with your actual API URL
curl https://abc123.execute-api.us-east-1.amazonaws.com/health

# Should return:
# {"status":"healthy","app":"ClubHub API","version":"1.0.0"}
```

---

## Part 2: Deploy Frontend (AWS Amplify)

### Step 1: Push Code to GitHub

```bash
cd ..  # back to root
git add .
git commit -m "Add AWS deployment configuration"
git push origin main
```

### Step 2: Open AWS Amplify Console

1. Go to: https://console.aws.amazon.com/amplify/
2. Click **"New app"** → **"Host web app"**

### Step 3: Connect GitHub

1. Select **GitHub**
2. Click **Authorize AWS Amplify**
3. Select your **clubhub** repository
4. Select **main** branch (or your deployment branch)
5. Click **Next**

### Step 4: Configure Build Settings

Amplify will auto-detect the `amplify.yml` file. Review it shows:
- **Build command**: `npm run build`
- **Output directory**: `frontend/dist`

Click **Next**

### Step 5: Add Environment Variable

1. In **"Advanced settings"**, click **"Add environment variable"**
2. Add:
   - **Variable**: `VITE_API_URL`
   - **Value**: Your API URL from Part 1, Step 4 (e.g., `https://abc123.execute-api.us-east-1.amazonaws.com`)
3. Click **Next**

### Step 6: Deploy

1. Review settings
2. Click **"Save and deploy"**
3. Wait 3-5 minutes for build and deployment

### Step 7: Get Your Frontend URL

After deployment, you'll see:
```
Domain: https://main.d1234567890.amplifyapp.com
```

**Copy this URL** - this is your live app!

---

## Part 3: Update CORS Settings

Now that you have your frontend URL, update the backend:

### Option A: Update via AWS Console (Easiest)

1. Go to: https://console.aws.amazon.com/lambda/
2. Click **clubhub-api** function
3. Go to **Configuration** → **Environment variables**
4. Click **Edit**
5. Update:
   - **CORS_ORIGINS**: Your Amplify URL (e.g., `https://main.d1234567890.amplifyapp.com`)
   - **FRONTEND_URL**: Same URL
6. Click **Save**

### Option B: Update via SAM

Edit `backend/samconfig.toml`:
```toml
parameter_overrides = "JWTSecretKey=\"your-secret\" FrontendURL=\"https://main.d1234567890.amplifyapp.com\" ..."
```

Then redeploy:
```bash
cd backend
sam build && sam deploy
```

---

## ✅ You're Live!

Visit your Amplify URL and start using ClubHub on AWS! 🎉

**Your URLs:**
- Frontend: `https://main.d1234567890.amplifyapp.com`
- Backend: `https://abc123.execute-api.us-east-1.amazonaws.com`
- API Docs: `https://abc123.execute-api.us-east-1.amazonaws.com/docs` (if DEBUG=true)

---

## 📊 What You've Deployed

| Service | Purpose | Cost (Free Tier) |
|---------|---------|------------------|
| **Lambda** | Backend API | 1M requests/month free |
| **API Gateway** | HTTP endpoints | 1M requests/month free |
| **Amplify** | Frontend hosting | 1000 build mins/month free |
| **S3** (optional) | Photo storage | 5GB storage free |

**Estimated monthly cost after free tier**: $5-10 for low traffic

---

## 🔧 Common Tasks

### Update Backend Code

```bash
cd backend
sam build && sam deploy
```

### Update Frontend Code

Just push to GitHub:
```bash
git add .
git commit -m "Update frontend"
git push origin main
```
Amplify auto-deploys in ~3 minutes!

### View Logs

**Backend:**
```bash
sam logs -n ClubHubAPI --stack-name clubhub-api --tail
```

Or in AWS Console: CloudWatch → Log Groups → `/aws/lambda/clubhub-api`

**Frontend:**
AWS Console → Amplify → Your App → "Build logs"

### Update Environment Variables

**Backend:**
AWS Console → Lambda → clubhub-api → Configuration → Environment variables

**Frontend:**
AWS Console → Amplify → Your App → Environment variables

---

## 🚨 Troubleshooting

### "Command not found: sam"
Install AWS SAM CLI: `pip install aws-sam-cli`

### "Unable to locate credentials"
Run: `aws configure` and enter your AWS credentials

### "Backend returns 502 errors"
- Lambda cold start can take 5-10 seconds on first request
- Check CloudWatch logs: `sam logs -n ClubHubAPI --stack-name clubhub-api --tail`

### "Frontend can't connect to backend"
1. Check VITE_API_URL is set correctly in Amplify
2. Verify CORS_ORIGINS includes your Amplify URL in Lambda config
3. Test backend directly: `curl https://your-api.execute-api.us-east-1.amazonaws.com/health`

### "Stack already exists" error
If you need to start fresh:
```bash
aws cloudformation delete-stack --stack-name clubhub-api
# Wait ~2 minutes, then redeploy
sam build && sam deploy --guided
```

### Lambda cold starts are slow
First request after inactivity takes 5-10 seconds. Options:
1. **Free**: Accept cold starts (fine for MVP)
2. **Paid**: Enable "Provisioned Concurrency" (~$15/month for always-warm)
3. **Alternative**: Switch to App Runner (no cold starts)

---

## 🎯 Important Notes

### Database Persistence

⚠️ **Current setup**: SQLite database stored in `/tmp` directory
- **Pros**: Simple, works immediately
- **Cons**: Data is lost on Lambda cold starts (every ~15 minutes of inactivity)

**For production, choose one:**

1. **Amazon RDS (PostgreSQL)** - Recommended
   - Persistent, reliable
   - ~$15/month for smallest instance
   - Requires code changes to switch from SQLite

2. **Amazon EFS** - Keep SQLite
   - Mount as persistent filesystem
   - ~$0.30/GB/month
   - Requires VPC configuration (complex)

3. **DynamoDB** - Serverless NoSQL
   - Very scalable, pay-per-request
   - Free tier: 25GB storage
   - Requires significant code rewrite

**For MVP with free credits**: `/tmp` is fine for testing!

### Photo Storage

Current setup: Photos stored in Lambda `/tmp` (max 512MB, cleared on cold start)

**For real users, enable S3**:
1. Set `UseS3Storage=true` in deployment
2. Your S3 code is already implemented!
3. Free tier: 5GB storage

### Custom Domain (Optional)

To use your own domain (e.g., `api.clubhub.com`):

1. **Backend**:
   - AWS Console → API Gateway → Custom domain names
   - Add SSL certificate from ACM
   - Point domain DNS to API Gateway

2. **Frontend**:
   - AWS Console → Amplify → Domain management
   - Add custom domain
   - Update DNS records

---

## 📈 Monitoring & Costs

### View Current Costs

AWS Console → Billing Dashboard → Cost Explorer

### Set Up Cost Alerts

1. AWS Console → Billing → Budgets
2. Create budget: $10/month threshold
3. Get email alerts before overspending

### Monitor Performance

- **Lambda**: CloudWatch → Metrics → Lambda
- **API Gateway**: CloudWatch → Metrics → ApiGateway
- **Amplify**: Amplify Console → Monitoring

---

## 🔄 Continuous Deployment

**Backend**:
- Manual: Run `sam build && sam deploy`
- Automated: Set up GitHub Actions (can add if needed)

**Frontend**:
- Automatic on every push to main branch!
- Enable branch deployments in Amplify for staging environments

---

## 🆘 Need Help?

- **AWS SAM**: https://docs.aws.amazon.com/serverless-application-model/
- **AWS Amplify**: https://docs.amplify.aws/
- **Lambda + FastAPI**: https://aws.amazon.com/blogs/compute/
- **Cost Calculator**: https://calculator.aws/

---

## Next Steps

- ✅ App is live on AWS
- 📊 Set up monitoring and alerts
- 💾 Plan database migration (RDS or EFS)
- 🗄️ Enable S3 for photo storage
- 🔒 Set up AWS WAF for security (optional)
- 🌐 Add custom domain (optional)
