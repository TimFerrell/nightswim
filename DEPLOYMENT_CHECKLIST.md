# 🚀 Vercel Deployment Checklist

## Pre-Deployment Setup

### 1. Environment Variables in Vercel Dashboard
Make sure these are configured in your Vercel project settings:

**Required:**
- `HAYWARD_USERNAME` - Your Hayward account email
- `HAYWARD_PASSWORD` - Your Hayward account password

**Optional but Recommended:**
- `INFLUXDB_URL` - Your InfluxDB Cloud URL
- `INFLUX_DB_TOKEN` - Your InfluxDB API token
- `INFLUXDB_ORG` - Your InfluxDB organization name
- `INFLUXDB_BUCKET` - Your InfluxDB bucket name
- `CORS_ORIGIN` - Your production domain (e.g., `https://your-app.vercel.app`)
- `SESSION_SECRET` - A secure random string for session encryption

## Post-Deployment Testing

### 2. Quick Health Check
```bash
# Replace with your actual Vercel URL
curl https://your-app.vercel.app/api/health
```

Expected response:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "hasCredentials": true,
  "environment": "production"
}
```

### 3. Run Full Test Suite
```bash
# Set your deployment URL
export DEPLOYMENT_URL=https://your-app.vercel.app

# Run the test script
npm run test:deployment
```

### 4. Manual Testing Checklist

#### ✅ Basic Functionality
- [ ] Main page loads (`/`)
- [ ] Health check returns 200 (`/api/health`)
- [ ] JavaScript file serves correctly (`/script.js`)
- [ ] 404 errors handled properly

#### ✅ API Endpoints
- [ ] Pool status endpoint (`/api/pool/status`)
- [ ] Cron endpoint responds (`/api/cron/collect-data`)
- [ ] Home environment data (`/api/home/environment`)
- [ ] Home environment time series (`/api/home/timeseries`)
- [ ] Home environment statistics (`/api/home/timeseries/stats`)
- [ ] Home environment comfort analysis (`/api/home/comfort`)

#### ✅ Cron Job Verification
- [ ] Check Vercel dashboard for cron job execution logs
- [ ] Verify data collection is working (check InfluxDB if configured)

#### ✅ Environment Variables
- [ ] `hasCredentials` shows `true` in health check
- [ ] No environment-related errors in logs

#### ✅ Home Environment Features
- [ ] Home temperature card displays correctly
- [ ] Home humidity card displays correctly  
- [ ] Home feels-like card displays correctly
- [ ] Home environment chart loads with data
- [ ] Comfort level calculations work properly
- [ ] Time range selector functions correctly

### 5. Vercel Dashboard Monitoring

#### Function Logs
- Check Vercel dashboard → Functions tab
- Look for any error logs or failed deployments

#### Cron Job Monitoring
- Vercel dashboard → Cron Jobs tab
- Verify the job is scheduled and executing every 5 minutes

#### Analytics
- Monitor function execution times
- Check for any timeout errors (functions have 10s timeout on Hobby plan)

### 6. Troubleshooting Common Issues

#### ❌ Health check shows `hasCredentials: false`
- **Solution**: Check environment variables in Vercel dashboard
- Verify `HAYWARD_USERNAME` and `HAYWARD_PASSWORD` are set

#### ❌ Cron job not executing
- **Solution**: Check Vercel cron job logs
- Verify the cron schedule: `*/5 * * * *` (every 5 minutes)

#### ❌ API endpoints returning 500 errors
- **Solution**: Check function logs in Vercel dashboard
- Verify all required environment variables are set

#### ❌ CORS errors in browser
- **Solution**: Set `CORS_ORIGIN` environment variable to your domain

### 7. Performance Monitoring

#### Expected Response Times
- Health check: < 500ms
- Pool status: < 2s
- Cron job: < 10s

#### Resource Usage
- Monitor function execution duration
- Check for memory usage spikes

## 🎉 Success Indicators

Your deployment is working correctly when:
- ✅ All test endpoints return expected status codes
- ✅ Health check shows `hasCredentials: true`
- ✅ Cron jobs are executing successfully
- ✅ No errors in Vercel function logs
- ✅ Pool data is being collected (if InfluxDB configured)

## 📞 Need Help?

If you encounter issues:
1. Check Vercel function logs first
2. Verify environment variables are correctly set
3. Test locally with `npm run dev` to isolate issues
4. Check the [Vercel documentation](https://vercel.com/docs) for deployment troubleshooting 