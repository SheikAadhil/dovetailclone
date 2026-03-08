import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; sourceId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { is_active } = await request.json();
  const supabase = await createSupabaseServerClient();

  const { data: source, error } = await supabase
    .from('channel_sources')
    .update({ is_active })
    .eq('id', params.sourceId)
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(source);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; sourceId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // 1. Count data points to be removed for response info
  const { count } = await supabase
    .from('data_points')
    .select('*', { count: 'exact', head: true })
    .eq('source_id', params.sourceId);

  // 2. Delete data points (cascades aren't set up for this specific relation usually, so manual)
  // Actually, standard setup is data_points link to sources.
  await supabase
    .from('data_points')
    .delete()
    .eq('source_id', params.sourceId);

  // 3. Delete source row
  const { error } = await supabase
    .from('channel_sources')
    .delete()
    .eq('id', params.sourceId);

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json({ deleted: true, removed_data_points: count || 0 });
}
