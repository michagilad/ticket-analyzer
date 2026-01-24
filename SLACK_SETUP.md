# Slack Integration Setup

The QC Ticket Analyzer can send notifications to Slack whenever experiences are flagged for QC.

## Setup Instructions

### 1. Create a Slack Webhook

1. Go to https://api.slack.com/apps
2. Click **"Create New App"** → **"From scratch"**
3. Give it a name (e.g., "QC Ticket Analyzer") and select your workspace
4. In the left sidebar, click **"Incoming Webhooks"**
5. Toggle **"Activate Incoming Webhooks"** to ON
6. Click **"Add New Webhook to Workspace"**
7. Select the channel where you want notifications (e.g., #qc-alerts or DM yourself)
8. Click **"Allow"**
9. Copy the Webhook URL (it looks like: `https://hooks.slack.com/services/T00000000/B00000000/XXXXXXXXXXXXXXXXXXXX`)

### 2. Add to Environment Variables

#### Local Development:
1. Create a `.env.local` file in the project root (if it doesn't exist)
2. Add the following:
```bash
SLACK_WEBHOOK_URL=https://hooks.slack.com/services/YOUR/WEBHOOK/URL
NEXT_PUBLIC_BASE_URL=http://localhost:3000
```

#### Production (Vercel):
1. Go to your Vercel project settings
2. Navigate to **Settings** → **Environment Variables**
3. Add:
   - Key: `SLACK_WEBHOOK_URL`
   - Value: Your webhook URL
   - Key: `NEXT_PUBLIC_BASE_URL`
   - Value: Your production URL (e.g., `https://your-app.vercel.app`)
4. Redeploy your application

### 3. Test It

1. Run an analysis in the app
2. Click **"Flag Experiences to QC"**
3. Check your Slack channel - you should see a notification! 🎉

## What Gets Posted

The notification includes:
- 🚩 Header with date
- 📊 Total number of flagged experiences
- Top 5 issues by count
- 🔗 Button to review the flagged experiences

## Troubleshooting

- **No notification?** Check that `SLACK_WEBHOOK_URL` is set in your environment variables
- **Wrong channel?** Create a new webhook for a different channel
- **Link doesn't work?** Make sure `NEXT_PUBLIC_BASE_URL` is set to your production URL

## Optional: Disable Slack Notifications

Simply remove the `SLACK_WEBHOOK_URL` environment variable. The app will work fine without it - Slack notifications are completely optional.
