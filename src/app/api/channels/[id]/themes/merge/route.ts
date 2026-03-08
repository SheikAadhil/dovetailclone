import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { source_theme_ids, target_theme_id } = await request.json();
  if (!source_theme_ids || !target_theme_id || source_theme_ids.length === 0) {
    return new NextResponse('Missing parameters', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // 1. Move message associations
  // Loop through sources and update their associations to target
  for (const sourceId of source_theme_ids) {
    // Note: We use a raw SQL approach or individual updates to handle CONFLICTS
    // Simple way: get all data points for source, then insert to target with IGNORE
    const { data: associations } = await supabase
      .from('data_point_themes')
      .select('data_point_id, relevance_score')
      .eq('theme_id', sourceId);

    if (associations && associations.length > 0) {
      const newAssociations = associations.map(a => ({
        data_point_id: a.data_point_id,
        theme_id: target_theme_id,
        relevance_score: a.relevance_score
      }));

      await supabase
        .from('data_point_themes')
        .upsert(newAssociations, { onConflict: 'data_point_id,theme_id' });
    }
  }

  // 2. Recalculate target stats
  // Get all unique messages now linked to target
  const { data: finalAssociations } = await supabase
    .from('data_point_themes')
    .select(`
      data_points ( sentiment )
    `)
    .eq('theme_id', target_theme_id);

  const count = finalAssociations?.length || 0;
  const breakdown: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
  
  finalAssociations?.forEach((a: any) => {
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
    .eq('id', target_theme_id);

  // 3. Delete sources
  await supabase
    .from('themes')
    .delete()
    .in('id', source_theme_ids);

  return NextResponse.json({ success: true });
}
