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

  const { data: sources, error } = await supabase
    .from('channel_sources')
    .select('*')
    .eq('channel_id', params.id)
    .order('created_at', { ascending: true });

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(sources);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { source_type, slack_channel_id, slack_channel_name, slack_team_id } = await request.json();
  
  const supabase = await createSupabaseServerClient();

  // Get workspace_id
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', params.id)
    .single();

  const { data: source, error } = await supabase
    .from('channel_sources')
    .insert({
      channel_id: params.id,
      workspace_id: channel?.workspace_id,
      source_type,
      source_label: source_type === 'slack' ? `#${slack_channel_name}` : 'CSV Import',
      slack_channel_id,
      slack_channel_name,
      slack_team_id,
      is_active: true
    })
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(source);
}
