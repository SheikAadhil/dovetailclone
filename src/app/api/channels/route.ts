import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();
  
  // Get user's workspace(s)
  const { data: workspaces, error: wsError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId);

  if (wsError || !workspaces || workspaces.length === 0) {
    return NextResponse.json([]); // No workspace, no channels
  }

  const workspaceIds = workspaces.map(w => w.id);

  const { data: channels, error } = await supabase
    .from('channels')
    .select('*')
    .in('workspace_id', workspaceIds)
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse('Database error', { status: 500 });
  }

  return NextResponse.json(channels);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const { name, description, slack_channel_id, slack_channel_name, slack_team_id, backfillDays } = json;

  if (!name) {
    return new NextResponse('Name is required', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Get user's workspace
  const { data: workspace, error: wsError } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (wsError || !workspace) {
    return new NextResponse('Workspace not found', { status: 404 });
  }

  const { data: channel, error } = await supabase
    .from('channels')
    .insert({
      workspace_id: workspace.id,
      name,
      description,
      created_by: userId,
      is_active: true,
      slack_channel_id: slack_channel_id || null,
      slack_channel_name: slack_channel_name || null,
      slack_team_id: slack_team_id || null,
    })
    .select()
    .single();

  if (error) {
    console.error('Error creating channel:', error);
    return new NextResponse('Database error', { status: 500 });
  }

  // Trigger backfill if requested and channel connected
  if (backfillDays && slack_channel_id && slack_team_id) {
    const vercelUrl = process.env.VERCEL_URL;
    const appUrl = vercelUrl
      ? `https://${vercelUrl}`
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://dovetailclone.vercel.app');
    // Fire and forget
    fetch(`${appUrl}/api/channels/${channel.id}/backfill`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Cookie': request.headers.get('cookie') || '' // Pass auth cookie
      },
      body: JSON.stringify({ daysBack: backfillDays })
    }).catch(e => console.error('Backfill trigger error:', e));
  }

  return NextResponse.json(channel);
}
