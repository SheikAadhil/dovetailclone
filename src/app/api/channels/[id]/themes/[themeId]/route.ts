import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function PATCH(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { name, description, topic_id, is_pinned } = await request.json();
  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (topic_id !== undefined) updates.topic_id = topic_id === 'none' ? null : topic_id;
  if (is_pinned !== undefined) updates.is_pinned = is_pinned;
  updates.last_updated_at = new Date().toISOString();

  const supabase = await createSupabaseServerClient();

  const { data: theme, error } = await supabase
    .from('themes')
    .update(updates)
    .eq('id', params.themeId)
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(theme);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string; themeId: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Deleting theme will cascade to data_point_themes associations automatically
  const { error } = await supabase
    .from('themes')
    .delete()
    .eq('id', params.themeId);

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json({ deleted: true });
}
