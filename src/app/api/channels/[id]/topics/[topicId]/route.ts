import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; topicId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { name, description } = await request.json();
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  updates.updated_at = new Date().toISOString();

  const supabase = await createSupabaseServerClient();

  const { data: topic, error } = await supabase
    .from('topics')
    .update(updates)
    .eq('id', params.topicId)
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(topic);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; topicId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // First, find themes that will be orphaned
  const { count } = await supabase
    .from('themes')
    .select('*', { count: 'exact', head: true })
    .eq('topic_id', params.topicId);

  // Delete the topic (themes table has ON DELETE SET NULL on topic_id)
  const { error } = await supabase
    .from('topics')
    .delete()
    .eq('id', params.topicId);

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json({ deleted: true, orphaned_themes: count || 0 });
}
