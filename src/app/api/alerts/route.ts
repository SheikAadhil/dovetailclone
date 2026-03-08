import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Get user's workspace
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId);

  if (!workspaces || workspaces.length === 0) return NextResponse.json([]);

  const workspaceIds = workspaces.map(w => w.id);

  const { data: alerts, error } = await supabase
    .from('anomaly_alerts')
    .select('*, channels(name)')
    .in('workspace_id', workspaceIds)
    .eq('is_read', false)
    .order('created_at', { ascending: false });

  if (error) return new NextResponse('Database error', { status: 500 });

  const formatted = (alerts || []).map((a: any) => ({
    ...a,
    channel_name: a.channels?.name
  }));

  return NextResponse.json(formatted);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { id, action } = await request.json();
  const supabase = await createSupabaseServerClient();

  if (action === 'mark_all_read') {
    // Get workspace
    const { data: workspace } = await supabase
      .from('workspaces')
      .select('id')
      .eq('owner_id', userId)
      .single();

    if (workspace) {
      await supabase
        .from('anomaly_alerts')
        .update({ is_read: true })
        .eq('workspace_id', workspace.id);
    }
  } else if (action === 'mark_read' && id) {
    await supabase
      .from('anomaly_alerts')
      .update({ is_read: true })
      .eq('id', id);
  }

  return NextResponse.json({ success: true });
}
