import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { messageIds } = await request.json();
  if (!messageIds || !Array.isArray(messageIds)) {
    return new NextResponse('Invalid messageIds', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // 1. Create associations
  const associations = messageIds.map(id => ({
    data_point_id: id,
    theme_id: params.themeId,
    relevance_score: 1.0
  }));

  const { error } = await supabase
    .from('data_point_themes')
    .upsert(associations, { onConflict: 'data_point_id,theme_id' });

  if (error) return new NextResponse('Database error', { status: 500 });

  // 2. Recalculate theme stats
  const { data: allAssoc } = await supabase
    .from('data_point_themes')
    .select('data_points(sentiment)')
    .eq('theme_id', params.themeId);

  const count = allAssoc?.length || 0;
  const breakdown: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
  
  allAssoc?.forEach((a: any) => {
    const s = a.data_points?.sentiment || 'neutral';
    breakdown[s] = (breakdown[s] || 0) + 1;
  });

  await supabase
    .from('themes')
    .update({
      data_point_count: count,
      sentiment_breakdown: breakdown,
      last_updated_at: new Date().toISOString()
    })
    .eq('id', params.themeId);

  return NextResponse.json({ success: true, count });
}
