import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const supabase = await createSupabaseServerClient();

  // Fetch topics with theme counts
  const { data: topics, error } = await supabase
    .from('topics')
    .select('*, themes(count)')
    .eq('channel_id', params.id)
    .order('display_order', { ascending: true });

  if (error) return new NextResponse('Database error', { status: 500 });

  const formatted = (topics || []).map(t => ({
    ...t,
    theme_count: t.themes?.[0]?.count || 0
  }));

  return NextResponse.json(formatted);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { name, description } = await request.json();
  if (!name || name.length > 30) {
    return new NextResponse('Invalid name (max 30 chars)', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();

  // Check limit (max 10)
  const { count } = await supabase
    .from('topics')
    .select('*', { count: 'exact', head: true })
    .eq('channel_id', params.id);

  if ((count || 0) >= 10) {
    return new NextResponse('Maximum 10 topics reached', { status: 400 });
  }

  // Get workspace_id for the channel
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', params.id)
    .single();

  const { data: topic, error } = await supabase
    .from('topics')
    .insert({
      channel_id: params.id,
      workspace_id: channel?.workspace_id,
      name,
      description,
      created_by: userId,
      display_order: (count || 0)
    })
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(topic);
}
