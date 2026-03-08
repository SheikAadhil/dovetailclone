import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { WeeklyDigestEmail } from '@/components/email/WeeklyDigestEmail';
import * as React from 'react';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
  const supabase = createSupabaseAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Get all active channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*, workspaces(owner_id)')
    .eq('is_active', true);

  if (!channels) return NextResponse.json({ sent: 0 });

  let sentCount = 0;

  for (const channel of channels) {
    const workspace: any = channel.workspaces;
    const ownerId = workspace?.owner_id;
    if (!ownerId) continue;

    // 2. Count new messages
    const { count: newMessages } = await supabase
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channel.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!newMessages || newMessages === 0) continue;

    // 3. Get themes
    const { data: themes } = await supabase
      .from('themes')
      .select('name, summary, data_point_count, sentiment_breakdown')
      .eq('channel_id', channel.id)
      .order('data_point_count', { ascending: false })
      .limit(5);

    // 4. Send Email
    try {
      const user = await clerkClient.users.getUser(ownerId);
      const email = user.emailAddresses[0]?.emailAddress;

      if (email && process.env.RESEND_API_KEY) {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/channels/${channel.id}`;
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: `Weekly Pulse digest: ${channel.name}`,
          react: WeeklyDigestEmail({
            channelName: channel.name,
            newMessageCount: newMessages,
            themes: themes || [],
            dashboardUrl
          }) as React.ReactElement,
        });
      }
    } catch (e) {
      console.error(`Error sending email to user ${ownerId}:`, e);
    }

    // 5. FEATURE 9: Send to Slack Webhook
    if (channel.digest_slack_enabled && channel.digest_slack_webhook_url) {
      try {
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/channels/${channel.id}`;
        
        const blocks = [
          { type: "header", text: { type: "plain_text", text: `📊 Weekly Pulse: ${channel.name}`, emoji: true }},
          { type: "section", text: { type: "mrkdwn", text: `*${newMessages}* new messages identified this week.` }},
          { type: "divider" }
        ];

        themes?.forEach(theme => {
          const breakdown = theme.sentiment_breakdown || {};
          const pos = breakdown.positive || 0;
          const neg = breakdown.negative || 0;
          let emoji = "⚪";
          if (pos > neg) emoji = "🟢";
          else if (neg > pos) emoji = "🔴";

          blocks.push({
            type: "section",
            text: {
              type: "mrkdwn",
              text: `*${theme.name}* (${theme.data_point_count} messages) ${emoji}\n${theme.summary}`
            }
          } as any);
        });

        blocks.push({
          type: "actions",
          elements: [
            { type: "button", text: { type: "plain_text", text: "View Channel", emoji: true }, url: dashboardUrl, style: "primary" }
          ]
        } as any);

        await fetch(channel.digest_slack_webhook_url, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ blocks })
        });
      } catch (e) {
        console.error(`Error sending Slack digest for channel ${channel.id}:`, e);
      }
    }
    
    sentCount++;
  }

  return NextResponse.json({ sent: sentCount });
}
