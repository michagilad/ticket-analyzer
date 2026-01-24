import { NextRequest, NextResponse } from 'next/server';

interface FlaggedExperience {
  instanceId: string;
  ticketKey: string;
  ticketName: string;
  ticketDescription?: string;
}

interface CategoryGroup {
  category: string;
  experiences: FlaggedExperience[];
}

export async function POST(request: NextRequest) {
  try {
    const { data, date } = await request.json();
    
    // Get Slack webhook URL from environment variable
    const slackWebhookUrl = process.env.SLACK_WEBHOOK_URL;
    
    if (!slackWebhookUrl) {
      console.log('Slack webhook URL not configured, skipping notification');
      return NextResponse.json({ 
        success: false, 
        message: 'Slack webhook not configured' 
      });
    }

    // Calculate statistics
    const categoryGroups = data as CategoryGroup[];
    const totalCount = categoryGroups.reduce((sum, group) => sum + group.experiences.length, 0);
    
    // Get top 5 categories by count
    const topCategories = categoryGroups
      .map(group => ({
        category: group.category,
        count: group.experiences.length
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Format date nicely
    const formattedDate = new Date(date).toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      year: 'numeric'
    });

    // Create the Slack message
    const slackMessage = {
      blocks: [
        {
          type: 'header',
          text: {
            type: 'plain_text',
            text: '🚩 New QC Flagging',
            emoji: true
          }
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: `*Date:* ${formattedDate}\n*Total Experiences Flagged:* ${totalCount}`
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'section',
          text: {
            type: 'mrkdwn',
            text: '*Top Issues:*\n' + topCategories
              .map(cat => `• *${cat.category}:* ${cat.count} experience${cat.count !== 1 ? 's' : ''}`)
              .join('\n')
          }
        },
        {
          type: 'divider'
        },
        {
          type: 'actions',
          elements: [
            {
              type: 'button',
              text: {
                type: 'plain_text',
                text: '🔗 Review Flagged Experiences',
                emoji: true
              },
              url: `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/flagged?date=${date}`,
              style: 'primary'
            }
          ]
        }
      ]
    };

    // Send to Slack
    const slackResponse = await fetch(slackWebhookUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(slackMessage)
    });

    if (!slackResponse.ok) {
      throw new Error(`Slack API error: ${slackResponse.status}`);
    }

    return NextResponse.json({ 
      success: true, 
      message: 'Slack notification sent',
      totalCount 
    });

  } catch (error) {
    console.error('Error sending Slack notification:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      },
      { status: 500 }
    );
  }
}
