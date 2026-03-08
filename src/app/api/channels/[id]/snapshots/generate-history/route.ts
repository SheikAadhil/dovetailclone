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
    .select('id, data_point_count, sentiment_breakdown, channel_id')
    .eq('channel_id', params.id);

  if (error) return new NextResponse('Database error', { status: 500 });
  if (!themes || themes.length === 0) {
    return new NextResponse('No themes found', { status: 404 });
  }

  // Generate historical snapshots for the past 14 days
  const snapshots = [];
  const today = new Date();
  
  for (let i = 14; i >= 0; i--) {
    const date = new Date(today);
    date.setDate(date.getDate() - i);
    const dateStr = date.toISOString().split('T')[0];
    
    for (const theme of themes) {
      // Simulate varying message counts over time
      const baseCount = theme.data_point_count || 0;
      const variation = Math.floor(Math.random() * 20) - 10; // -10 to +10
      const simulatedCount = Math.max(0, baseCount - variation - (i * 2));
      
      snapshots.push({
        theme_id: theme.id,
        channel_id: theme.channel_id,
        snapshot_date: dateStr,
        data_point_count: simulatedCount,
        sentiment_breakdown: theme.sentiment_breakdown || {}
      });
    }
  }

  // Upsert all snapshots
  const { data: result, error: upsertError } = await supabase
    .from('theme_snapshots')
    .upsert(snapshots, { onConflict: 'theme_id,snapshot_date' })
    .select();

  if (upsertError) return new NextResponse('Failed to create snapshots', { status: 500 });

  return NextResponse.json({ 
    success: true, 
    snapshots_created: result?.length || 0,
    days_generated: 15,
    themes_count: themes.length
  });
}
