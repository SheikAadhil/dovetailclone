import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';
import { researchTopic } from '@/lib/sensing';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Get the sensing query
  const { data: sensingQuery, error: fetchError } = await supabase
    .from('sensing_queries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !sensingQuery) {
    return new NextResponse('Sensing query not found', { status: 404 });
  }

  if (sensingQuery.status === 'completed') {
    return NextResponse.json({ message: 'Already completed', results: sensingQuery.results });
  }

  // Update status to processing
  await supabase
    .from('sensing_queries')
    .update({ status: 'processing' })
    .eq('id', params.id);

  try {
    // Run the research
    const results = await researchTopic(sensingQuery.query);

    // Update with results
    await supabase
      .from('sensing_queries')
      .update({
        status: 'completed',
        results: results,
        completed_at: new Date().toISOString()
      })
      .eq('id', params.id);

    return NextResponse.json({ success: true, results });
  } catch (error: any) {
    console.error('Sensing research error:', error);

    // Update status to failed
    await supabase
      .from('sensing_queries')
      .update({
        status: 'failed',
        error_message: error.message
      })
      .eq('id', params.id);

    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
