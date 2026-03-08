import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Get user's workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id, plan')
    .eq('owner_id', userId)
    .single();

  if (!workspace) return new NextResponse('Workspace not found', { status: 404 });

  // Get start of current month
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();

  // Count messages this month
  const { count: messageCount } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id)
    .gte('created_at', startOfMonth);

  // Count active channels
  const { count: channelCount } = await supabase
    .from('channels')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  // Count active sources
  const { count: sourceCount } = await supabase
    .from('channel_sources')
    .select('*', { count: 'exact', head: true })
    .eq('workspace_id', workspace.id);

  return NextResponse.json({
    data_points_this_month: messageCount || 0,
    data_points_limit: 1000, // Hardcoded for MVP
    channels_count: channelCount || 0,
    sources_count: sourceCount || 0,
    plan: workspace.plan
  });
}
