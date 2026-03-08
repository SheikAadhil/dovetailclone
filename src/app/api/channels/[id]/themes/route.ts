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

  const themeIds = (themesRaw || []).map(t => t.id);
  
  // Calculate start date based on period
  const startDate = new Date();
  if (period !== 'all') {
    startDate.setDate(startDate.getDate() - parseInt(period));
  } else {
    startDate.setFullYear(startDate.getFullYear() - 1); // Default 'all' to 1 year
  }
  const startDateStr = startDate.toISOString().split('T')[0];

  const { data: snapshots } = await supabase
    .from('theme_snapshots')
    .select('*')
    .in('theme_id', themeIds)
    .gte('snapshot_date', startDateStr)
    .order('snapshot_date', { ascending: false });

  const themes = (themesRaw || []).map((t: any) => {
    const themeSnapshots = (snapshots || [])
      .filter(s => s.theme_id === t.id)
      .sort((a: any, b: any) => a.snapshot_date.localeCompare(b.snapshot_date));

    const trendData = themeSnapshots.map(s => ({
      date: s.snapshot_date,
      count: s.data_point_count
    }));

    let direction: 'rising' | 'falling' | 'stable' = 'stable';
    let percentChange = 0;

    // Calculate trend by comparing latest snapshot with the beginning of the selected period (or earliest available)
    if (trendData.length >= 2) {
      const latest = trendData[trendData.length - 1].count;
      const earliest = trendData[0].count;
      
      if (earliest === 0 && latest > 0) {
        direction = 'rising';
        percentChange = 100;
      } else if (earliest > 0) {
        percentChange = Math.round(((latest - earliest) / earliest) * 100);
        if (percentChange > 10) direction = 'rising';
        else if (percentChange < -10) direction = 'falling';
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
      trend_data: trendData, // Return all data for the requested period
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

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  try {
    const { name, description, topic_id } = await request.json();
    const supabase = await createSupabaseServerClient();

    const { data: channel, error: chanError } = await supabase
      .from('channels')
      .select('workspace_id')
      .eq('id', params.id)
      .single();

    if (chanError || !channel) {
      console.error("Error fetching channel:", chanError);
      return new NextResponse('Channel not found', { status: 404 });
    }

    const { data: theme, error: insertError } = await supabase
      .from('themes')
      .insert({
        channel_id: params.id,
        workspace_id: channel.workspace_id,
        name,
        description,
        topic_id: (!topic_id || topic_id === 'none') ? null : topic_id,
        summary: description || '', // Use description as summary for manual themes
        is_manual: true,
        data_point_count: 0
      })
      .select()
      .single();

    if (insertError) {
      console.error("Database Insert Error:", insertError);
      return NextResponse.json({ error: insertError.message }, { status: 500 });
    }

    // Create initial snapshot
    const today = new Date().toISOString().split('T')[0];
    await supabase.from('theme_snapshots').insert({
      theme_id: theme.id,
      channel_id: params.id,
      snapshot_date: today,
      data_point_count: 0,
      sentiment_breakdown: {}
    });

    return NextResponse.json(theme);
  } catch (e: any) {
    console.error("General Theme POST Error:", e);
    return new NextResponse(e.message, { status: 500 });
  }
}
