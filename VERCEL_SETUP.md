# Vercel Deployment Setup Guide

## Current Issue
The Vercel deployment is getting stuck on the CLI setup prompt because the project isn't properly linked to Vercel.

## Solution Steps

### 1. Link the Project to Vercel

First, you need to link this repository to a Vercel project:

```bash
# Install Vercel CLI globally
npm install -g vercel

# Login to Vercel
vercel login

# Link the project (run this in the project root)
vercel link
```

When prompted:
- Choose "Link to existing project" if you have an existing Vercel project
- Or "Create new project" if starting fresh
- Follow the prompts to complete the setup

### 2. Configure GitHub Secrets

After linking, you need to add these secrets to your GitHub repository:

1. Go to your GitHub repository → Settings → Secrets and variables → Actions
2. Add these repository secrets:

```
VERCEL_TOKEN=your_vercel_token_here
ORG_ID=your_vercel_org_id_here  
PROJECT_ID=your_vercel_project_id_here
```

### 3. Get Vercel Credentials

To get the required values:

1. **VERCEL_TOKEN**: 
   - Go to https://vercel.com/account/tokens
   - Create a new token with "Full Account" scope

2. **ORG_ID** and **PROJECT_ID**:
   - Go to your Vercel project dashboard
   - Click "Settings" → "General"
   - Copy the "Project ID" and "Team ID" (this is your ORG_ID)

### 4. Environment Variables

Make sure these environment variables are set in your Vercel project:

- `HAYWARD_USERNAME`
- `HAYWARD_PASSWORD` 
- `INFLUXDB_URL`
- `INFLUX_DB_TOKEN`
- `INFLUXDB_ORG`
- `INFLUXDB_BUCKET`
- `CORS_ORIGIN`
- `SESSION_SECRET`

### 5. Test Deployment

After setting up the secrets, push a commit to trigger the deployment:

```bash
git add .
git commit -m "Test Vercel deployment"
git push origin main
```

## Troubleshooting

### If deployment still fails:

1. **Check Vercel CLI locally**:
   ```bash
   vercel --version
   vercel whoami
   ```

2. **Verify project link**:
   ```bash
   vercel ls
   ```

3. **Manual deployment test**:
   ```bash
   vercel --prod
   ```

### Common Issues:

- **"Set up and deploy" prompt**: Project not linked properly
- **Missing secrets**: Check GitHub repository secrets
- **Environment variables**: Ensure all required env vars are set in Vercel dashboard

## Current Configuration

The project uses:
- `vercel.json` for deployment configuration
- GitHub Actions for CI/CD
- Node.js server with Express
- InfluxDB for data storage
- Cron jobs for automated data collection 