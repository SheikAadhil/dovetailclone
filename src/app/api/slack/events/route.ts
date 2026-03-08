import { NextResponse } from 'next/server';
import { verifySlackSignature, getUserDisplayName } from '@/lib/slack';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  // 1. Read raw body
  const rawBody = await request.text();
  
  // 2. Verify Slack signature
  const timestamp = request.headers.get('x-slack-request-timestamp');
  const signature = request.headers.get('x-slack-signature');
  
  if (!timestamp || !signature) {
    return new NextResponse('Missing Slack headers', { status: 400 });
  }

  const isValid = verifySlackSignature(
    process.env.SLACK_SIGNING_SECRET!,
    rawBody,
    timestamp,
    signature
  );

  if (!isValid) {
    return new NextResponse('Invalid signature', { status: 401 });
  }

  // 3. Parse body
  const body = JSON.parse(rawBody);

  // 4. Handle url_verification
  if (body.type === 'url_verification') {
    return NextResponse.json({ challenge: body.challenge });
  }

  // 5. Handle message events
  // Slack events are wrapped in body.event
  if (body.event) {
    const event = body.event;
    
    // Check if it's a message
    if (event.type !== 'message') {
      return new NextResponse('Ok', { status: 200 });
    }
    
    // Ignore subtypes (edits, deletions, joins, etc.) usually have subtypes.
    // Prompt says: "if body.event.subtype exists (edits/deletions) -> return 200"
    if (event.subtype) {
      return new NextResponse('Ok', { status: 200 });
    }

    // Ignore bots
    if (event.bot_id) {
      return new NextResponse('Ok', { status: 200 });
    }

    // Extract details
    const { text, user, ts, channel } = event;

    // Look up channel row using Admin Client (bypass RLS)
    const supabase = createSupabaseAdminClient();
    
    const { data: channels, error } = await supabase
      .from('channels')
      .select('id, workspace_id, slack_team_id')
      .eq('slack_channel_id', channel)
      .eq('is_active', true);

    if (error || !channels || channels.length === 0) {
      // Channel not monitored
      return new NextResponse('Channel not monitored', { status: 200 });
    }

    // Process for each matching channel (usually one)
    for (const ch of channels) {
      // Get sender name (need bot token)
      // We need the bot token for this workspace.
      const { data: connection } = await supabase
        .from('slack_connections')
        .select('bot_token')
        .eq('slack_team_id', ch.slack_team_id)
        .single();
        
      let senderName = 'Unknown';
      if (connection?.bot_token) {
        const name = await getUserDisplayName(connection.bot_token, user);
        if (name) senderName = name;
      }

      // Insert data_point
      const { data: inserted, error: insertError } = await supabase
        .from('data_points')
        .insert({
          channel_id: ch.id,
          workspace_id: ch.workspace_id,
          source: 'slack',
          external_id: ts,
          content: text,
          sender_name: senderName,
          sender_slack_id: user,
          slack_channel_id: channel,
          message_timestamp: new Date(parseFloat(ts) * 1000).toISOString(),
          sentiment: null // To be filled by embed
        })
        .select('id')
        .single();
        
      if (!insertError && inserted) {
        // Trigger embedding async
        // fetch is fire-and-forget
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${appUrl}/api/data-points/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            // Pass CRON_SECRET as authorization for internal call
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({ dataPointId: inserted.id })
        }).catch(err => console.error('Error triggering embed:', err));
      }
    }

    return new NextResponse('Ok', { status: 200 });
  }

  return new NextResponse('Ok', { status: 200 });
}
