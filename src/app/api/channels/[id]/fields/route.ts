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

  const { data: fields, error } = await supabase
    .from('channel_fields')
    .select('*')
    .eq('channel_id', params.id)
    .eq('is_active', true);

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(fields);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const body = await request.json();
  const supabase = await createSupabaseServerClient();

  // Get workspace_id
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', params.id)
    .single();

  const { data: field, error } = await supabase
    .from('channel_fields')
    .insert({
      ...body,
      channel_id: params.id,
      workspace_id: channel?.workspace_id,
      is_active: true
    })
    .select()
    .single();

  if (error) return new NextResponse('Database error', { status: 500 });

  return NextResponse.json(field);
}
