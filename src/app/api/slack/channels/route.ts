import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { getSlackChannelList } from '@/lib/slack';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
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

  // Get Slack connection
  const { data: connection } = await supabase
    .from('slack_connections')
    .select('bot_token, slack_team_name, slack_team_id')
    .eq('workspace_id', workspace.id)
    .eq('is_active', true)
    .single();

  if (!connection) {
    return NextResponse.json({ connected: false, workspaceId: workspace.id, channels: [] });
  }

  const channels = await getSlackChannelList(connection.bot_token);

  return NextResponse.json({
    connected: true,
    workspaceId: workspace.id,
    teamName: connection.slack_team_name,
    teamId: connection.slack_team_id,
    channels
  });
}
