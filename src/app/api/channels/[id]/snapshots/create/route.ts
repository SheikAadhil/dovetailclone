import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Fetch all themes for this channel
  const { data: themes, error } = await supabase
    .from('themes')
    .select('id, data_point_count, sentiment_breakdown')
    .eq('channel_id', params.id);

  if (error) return new NextResponse('Database error', { status: 500 });
  if (!themes || themes.length === 0) {
    return new NextResponse('No themes found', { status: 404 });
  }

  // Create snapshots for today
  const today = new Date().toISOString().split('T')[0];
  const snapshots = themes.map(theme => ({
    theme_id: theme.id,
    channel_id: params.id,
    snapshot_date: today,
    data_point_count: theme.data_point_count,
    sentiment_breakdown: theme.sentiment_breakdown
  }));

  // Upsert snapshots
  const { data: result, error: upsertError } = await supabase
    .from('theme_snapshots')
    .upsert(snapshots, { onConflict: 'theme_id,snapshot_date' })
    .select();

  if (upsertError) return new NextResponse('Failed to create snapshots', { status: 500 });

  return NextResponse.json({ 
    success: true, 
    snapshots_created: result?.length || 0,
    today: today 
  });
}
