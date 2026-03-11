import { NextResponse } from 'next/server';
import { verifySlackSignature, getUserDisplayName } from '@/lib/slack';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const challenge = searchParams.get('challenge');
  
  if (challenge) {
    console.log('[Slack Events] URL verification GET request');
    return NextResponse.json({ challenge });
  }
  
  return new NextResponse('Method not allowed', { status: 405 });
}

export async function POST(request: Request) {
  const rawBody = await request.text();
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  
  if (!process.env.SLACK_SIGNING_SECRET) {
    console.error('[Slack Events] CRITICAL: SLACK_SIGNING_SECRET is not defined in environment variables');
    return new NextResponse('Configuration error', { status: 500 });
  }
  
  if (!timestamp || !signature) {
    console.log('[Slack Events] Missing Slack headers. Timestamp:', timestamp, 'Signature:', signature ? 'present' : 'missing');
    return new NextResponse('Missing Slack headers', { status: 400 });
  }

  const isValid = verifySlackSignature(process.env.SLACK_SIGNING_SECRET, rawBody, timestamp, signature);
  if (!isValid) {
    console.error('[Slack Events] Invalid signature detected. Check SLACK_SIGNING_SECRET.');
    return new NextResponse('Invalid signature', { status: 401 });
  }

  const body = JSON.parse(rawBody);
  if (body.type === 'url_verification') {
    console.log('[Slack Events] URL verification challenge received');
    return NextResponse.json({ challenge: body.challenge });
  }

  console.log('[Slack Events] Event received:', body.type, body.event?.type, body.event?.subtype);

  if (body.event) {
    const event = body.event;
    
    // Ignore bot messages and non-message events
    if (event.type !== 'message') {
      console.log('[Slack Events] Ignoring non-message event:', event.type);
      return new NextResponse('Ok', { status: 200 });
    }

    if (event.bot_id) {
      console.log('[Slack Events] Ignoring bot message:', event.bot_id);
      return new NextResponse('Ok', { status: 200 });
    }

    // We allow some subtypes like file_share if they have text, but ignore message_deleted etc.
    if (event.subtype && !['file_share', 'thread_broadcast'].includes(event.subtype)) {
      console.log('[Slack Events] Ignoring message subtype:', event.subtype);
      return new NextResponse('Ok', { status: 200 });
    }

    const { text, user, ts, channel } = event;
    console.log('[Slack Events] Processing message from channel:', channel, 'user:', user);

    const supabase = createSupabaseAdminClient();
    
    // Find ALL sources matching this slack_channel_id
    const { data: sources, error } = await supabase
      .from('channel_sources')
      .select('id, channel_id, workspace_id, slack_team_id, source_label, is_active')
      .eq('slack_channel_id', channel);

    if (error) {
      console.error('[Slack Events] Database error finding sources:', error);
      return new NextResponse('Error', { status: 500 });
    }

    if (!sources || sources.length === 0) {
      console.log('[Slack Events] No active sources found for slack_channel_id:', channel);
      return new NextResponse('Ok', { status: 200 });
    }

    console.log(`[Slack Events] Found ${sources.length} potential sources for channel ${channel}`);

    for (const src of sources) {
      if (!src.is_active) {
        console.log(`[Slack Events] Source ${src.id} is inactive, skipping.`);
        continue;
      }

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

      console.log(`[Slack Events] Inserting data point for channel_id: ${src.channel_id}, source: ${src.source_label}`);

      const { data: inserted, error: insertError } = await supabase
        .from('data_points')
        .insert({
          channel_id: src.channel_id,
          workspace_id: src.workspace_id,
          source: 'slack',
          source_id: src.id,
          source_label: src.source_label,
          external_id: ts,
          content: text || '',
          sender_name: senderName,
          sender_slack_id: user,
          slack_channel_id: channel,
          message_timestamp: new Date(parseFloat(ts) * 1000).toISOString(),
        })
        .select('id')
        .single();
        
      if (insertError) {
        console.error('[Slack Events] Error inserting data point:', insertError);
        continue;
      }

      if (inserted) {
        console.log('[Slack Events] Data point inserted successfully:', inserted.id);
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
        }).catch(err => console.error('[Slack Events] Error triggering embed:', err));
      }
    }
  }

  return new NextResponse('Ok', { status: 200 });
}
