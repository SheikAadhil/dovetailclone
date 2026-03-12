import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Get user's workspace(s)
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId);

  if (!workspaces || workspaces.length === 0) {
    return NextResponse.json([]);
  }

  const workspaceIds = workspaces.map(w => w.id);

  const { data: queries, error } = await supabase
    .from('sensing_queries')
    .select('*')
    .in('workspace_id', workspaceIds)
    .order('created_at', { ascending: false });

  if (error) {
    return new NextResponse('Database error', { status: 500 });
  }

  return NextResponse.json(queries || []);
}

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  // Get user's workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId)
    .single();

  if (!workspace) {
    return new NextResponse('Workspace not found', { status: 404 });
  }

  const body = await request.json();
  const { query } = body;

  if (!query || typeof query !== 'string' || query.trim().length === 0) {
    return new NextResponse('Query is required', { status: 400 });
  }

  const { data, error } = await supabase
    .from('sensing_queries')
    .insert({
      user_id: userId,
      workspace_id: workspace.id,
      query: query.trim(),
      status: 'pending',
      results: {}
    })
    .select()
    .single();

  if (error) {
    console.error('Sensing query creation error:', error);
    return new NextResponse('Failed to create sensing query', { status: 500 });
  }

  return NextResponse.json(data);
}
