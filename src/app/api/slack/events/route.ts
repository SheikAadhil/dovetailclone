import { NextResponse } from 'next/server';
import { verifySlackSignature, getUserDisplayName } from '@/lib/slack';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  
  if (!timestamp || !signature) return new NextResponse('Missing Slack headers', { status: 400 });

  const isValid = verifySlackSignature(process.env.SLACK_SIGNING_SECRET!, rawBody, timestamp, signature);
  if (!isValid) return new NextResponse('Invalid signature', { status: 401 });

  const body = JSON.parse(rawBody);
  if (body.type === 'url_verification') return NextResponse.json({ challenge: body.challenge });

  if (body.event) {
    const event = body.event;
    if (event.type !== 'message' || event.subtype || event.bot_id) {
      return new NextResponse('Ok', { status: 200 });
    }

    const { text, user, ts, channel } = event;
    const supabase = createSupabaseAdminClient();
    
    // Find ALL sources matching this slack_channel_id
    const { data: sources, error } = await supabase
      .from('channel_sources')
      .select('id, channel_id, workspace_id, slack_team_id, source_label')
      .eq('slack_channel_id', channel)
      .eq('is_active', true);

    if (error || !sources || sources.length === 0) return new NextResponse('Ok', { status: 200 });

    for (const src of sources) {
      const { data: connection } = await supabase
        .from('slack_connections')
        .select('bot_token')
        .eq('slack_team_id', src.slack_team_id)
        .single();
        
      let senderName = 'Unknown';
      if (connection?.bot_token) {
        const name = await getUserDisplayName(connection.bot_token, user);
        if (name) senderName = name;
      }

      const { data: inserted, error: insertError } = await supabase
        .from('data_points')
        .insert({
          channel_id: src.channel_id,
          workspace_id: src.workspace_id,
          source: 'slack',
          source_id: src.id,
          source_label: src.source_label,
          external_id: ts,
          content: text,
          sender_name: senderName,
          sender_slack_id: user,
          slack_channel_id: channel,
          message_timestamp: new Date(parseFloat(ts) * 1000).toISOString(),
        })
        .select('id')
        .single();
        
      if (!insertError && inserted) {
        // Increment source count
        await supabase.rpc('increment_source_count', { source_uuid: src.id });

        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${appUrl}/api/data-points/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({ dataPointId: inserted.id })
        }).catch(err => console.error('Error triggering embed:', err));
      }
    }
  }

  return new NextResponse('Ok', { status: 200 });
}
