import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Check snapshot count
  const { count: snapshotCount } = await supabase
    .from('theme_snapshots')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', params.id);

  // Get recent snapshots
  const { data: recentSnapshots } = await supabase
    .from('theme_snapshots')
    .select('theme_id, snapshot_date, data_point_count')
    .eq('channel_id', params.id)
    .order('snapshot_date', { ascending: false })
    .limit(10);

  // Get theme count
  const { count: themeCount } = await supabase
    .from('themes')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', params.id);

  return NextResponse.json({
    channel_id: params.id,
    snapshot_count: snapshotCount || 0,
    theme_count: themeCount || 0,
    recent_snapshots: recentSnapshots || [],
    has_data: (snapshotCount || 0) > 0
  });
}
