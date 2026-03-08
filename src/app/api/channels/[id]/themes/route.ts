import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { searchParams } = new URL(request.url);
  const topicId = searchParams.get('topicId');
  const period = searchParams.get('period') || '30';

  const supabase = await createSupabaseServerClient();

  const { data: channel } = await supabase
    .from('channels')
    .select('last_analyzed_at')
    .eq('id', params.id)
    .single();

  const { count: totalDataPoints } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', params.id);

  let query = supabase
    .from('themes')
    .select(`
      id, name, summary, data_point_count, sentiment_breakdown, is_pinned, created_at, last_updated_at, topic_id, description, is_manual,
      data_point_themes (
        data_points (
          id, content, sender_name, message_timestamp, sentiment
        )
      )
    `)
    .eq('channel_id', params.id);

  if (topicId && topicId !== 'all') {
    query = query.eq('topic_id', topicId);
  }

  const { data: themesRaw, error: thError } = await query
    .order('is_pinned', { ascending: false })
    .order('data_point_count', { ascending: false });

  if (thError) return new NextResponse('Database error', { status: 500 });

  // 3. Fetch snapshots for trends
  const themeIds = (themesRaw || []).map(t => t.id);
  const { data: snapshots } = await supabase
    .from('theme_snapshots')
    .select('*')
    .in('theme_id', themeIds)
    .order('snapshot_date', { ascending: false });

  const themes = (themesRaw || []).map((t: any) => {
    const themeSnapshots = (snapshots || [])
      .filter(s => s.theme_id === t.id)
      .slice(0, 8)
      .reverse();

    const trendData = themeSnapshots.map(s => ({
      date: s.snapshot_date,
      count: s.data_point_count
    }));

    // Calculate direction (latest vs 7 days ago approx)
    let direction: 'rising' | 'falling' | 'stable' = 'stable';
    let percentChange = 0;

    if (trendData.length >= 2) {
      const latest = trendData[trendData.length - 1].count;
      const previous = trendData[trendData.length - 2].count;
      if (previous > 0) {
        percentChange = Math.round(((latest - previous) / previous) * 100);
        if (percentChange > 10) direction = 'rising';
        else if (percentChange < -10) direction = 'falling';
      } else if (latest > 0) {
        direction = 'rising';
        percentChange = 100;
      }
    }

    return {
      id: t.id,
      name: t.name,
      summary: t.summary,
      description: t.description,
      is_manual: t.is_manual,
      data_point_count: t.data_point_count,
      sentiment_breakdown: t.sentiment_breakdown,
      is_pinned: t.is_pinned,
      created_at: t.created_at,
      last_updated_at: t.last_updated_at,
      topic_id: t.topic_id,
      trend_data: trendData,
      trend_direction: direction,
      trend_percent_change: percentChange,
      data_points: t.data_point_themes
        .map((dpt: any) => dpt.data_points)
        .filter((dp: any) => dp !== null)
        .sort((a: any, b: any) => new Date(b.message_timestamp).getTime() - new Date(a.message_timestamp).getTime())
    };
  });

  return NextResponse.json({
    themes,
    total_data_points: totalDataPoints || 0,
    last_analyzed_at: channel?.last_analyzed_at
  });
}
