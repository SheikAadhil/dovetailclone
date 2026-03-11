import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { WebClient } from '@slack/web-api';
import { getUserDisplayName } from '@/lib/slack';

export const dynamic = 'force-dynamic';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const { daysBack } = await request.json();
  const days = daysBack || 30; // Default 30
  const oldest = (Date.now() / 1000) - (days * 86400);

  const supabase = await createSupabaseServerClient();

  // 1. Get channel
  const { data: channel, error: chError } = await supabase
    .from('channels')
    .select('id, workspace_id, slack_channel_id, slack_team_id')
    .eq('id', params.id)
    .single();

  if (chError || !channel || !channel.slack_channel_id || !channel.slack_team_id) {
    return new NextResponse('Channel not found or not connected to Slack', { status: 404 });
  }

  // 2. Get bot token
  const { data: connection, error: connError } = await supabase
    .from('slack_connections')
    .select('bot_token')
    .eq('slack_team_id', channel.slack_team_id)
    .single();

  if (connError || !connection || !connection.bot_token) {
    return new NextResponse('Slack connection not found', { status: 404 });
  }

  const client = new WebClient(connection.bot_token);
  let importedCount = 0;
  let cursor: string | undefined;
  const newIds: string[] = [];
  const userCache = new Map<string, string>();

  try {
    do {
      const result = await client.conversations.history({
        channel: channel.slack_channel_id,
        oldest: oldest.toString(),
        limit: 200,
        cursor,
      });

      if (!result.messages) break;

      const dataPoints = [];

      for (const msg of result.messages) {
        // Skip bots and subtypes (edits, joins, etc.)
        if (msg.bot_id || msg.subtype) continue;
        if (!msg.ts || !msg.text) continue;

        let senderName = 'Unknown';
        if (msg.user) {
          if (userCache.has(msg.user)) {
            senderName = userCache.get(msg.user)!;
          } else {
            const name = await getUserDisplayName(connection.bot_token, msg.user);
            if (name) {
              senderName = name;
              userCache.set(msg.user, name);
            }
          }
        }

        dataPoints.push({
          channel_id: channel.id,
          workspace_id: channel.workspace_id,
          source: 'slack',
          external_id: msg.ts,
          content: msg.text,
          sender_name: senderName,
          sender_slack_id: msg.user,
          slack_channel_id: channel.slack_channel_id,
          message_timestamp: new Date(parseFloat(msg.ts) * 1000).toISOString(),
        });
      }

      if (dataPoints.length > 0) {
        // Batch upsert
        const { data: inserted, error: upsertError } = await supabase
          .from('data_points')
          .upsert(dataPoints, { 
            onConflict: 'channel_id,external_id', 
            ignoreDuplicates: true 
          })
          .select('id');

        if (upsertError) {
          console.error('Error inserting backfill data:', upsertError);
        } else if (inserted) {
          importedCount += inserted.length;
          newIds.push(...inserted.map(row => row.id));
        }
      }

      cursor = result.response_metadata?.next_cursor;
    } while (cursor);

    // 6. Trigger embedding for new rows
    const vercelUrl = process.env.VERCEL_URL;
    const appUrl = vercelUrl
      ? `https://${vercelUrl}`
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://dovetailclone.vercel.app');

    newIds.forEach(id => {
      fetch(`${appUrl}/api/data-points/embed`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        },
        body: JSON.stringify({ dataPointId: id })
      }).catch(e => console.error('Embed trigger error', e));
    });

    // 7. Update last_synced_at
    await supabase
      .from('channels')
      .update({ last_synced_at: new Date().toISOString() })
      .eq('id', params.id);

    return NextResponse.json({ imported: importedCount });

  } catch (error) {
    console.error('Backfill error:', error);
    return new NextResponse('Backfill failed', { status: 500 });
  }
}
