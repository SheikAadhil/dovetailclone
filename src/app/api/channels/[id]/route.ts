import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !channel) {
    return new NextResponse('Channel not found', { status: 404 });
  }

  return NextResponse.json(channel);
}

export async function PUT(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const json = await request.json();
  const { name, description, is_active } = json;

  const supabase = await createSupabaseServerClient();

  const updates: any = {};
  if (name !== undefined) updates.name = name;
  if (description !== undefined) updates.description = description;
  if (is_active !== undefined) updates.is_active = is_active;

  const { data: channel, error } = await supabase
    .from('channels')
    .update(updates)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return new NextResponse('Database error', { status: 500 });
  }

  return NextResponse.json(channel);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const { error } = await supabase
    .from('channels')
    .delete()
    .eq('id', params.id);

  if (error) {
    return new NextResponse('Database error', { status: 500 });
  }

  return new NextResponse('Deleted', { status: 200 });
}
