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
  const period = searchParams.get('period') || '30'; // Default 30 days

  const supabase = await createSupabaseServerClient();

  // 1. Get channel stats
  const { data: channel } = await supabase
    .from('channels')
    .select('last_analyzed_at')
    .eq('id', params.id)
    .single();

  const { count: totalDataPoints } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', params.id);

  // 2. Build Themes Query
  let query = supabase
    .from('themes')
    .select(`
      id, name, summary, data_point_count, sentiment_breakdown, is_pinned, created_at, last_updated_at, topic_id,
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

  const { data: themesRaw, error: thError } = await query.order('is_pinned', { ascending: false }).order('data_point_count', { ascending: false });

  if (thError) return new NextResponse('Database error', { status: 500 });

  // 3. Transform
  const themes = (themesRaw || []).map((t: any) => ({
    id: t.id,
    name: t.name,
    summary: t.summary,
    data_point_count: t.data_point_count,
    sentiment_breakdown: t.sentiment_breakdown,
    is_pinned: t.is_pinned,
    created_at: t.created_at,
    last_updated_at: t.last_updated_at,
    topic_id: t.topic_id,
    data_points: t.data_point_themes
      .map((dpt: any) => dpt.data_points)
      .filter((dp: any) => dp !== null)
      .sort((a: any, b: any) => new Date(b.message_timestamp).getTime() - new Date(a.message_timestamp).getTime())
  }));

  return NextResponse.json({
    themes,
    total_data_points: totalDataPoints || 0,
    last_analyzed_at: channel?.last_analyzed_at
  });
}
