import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function POST(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = await createSupabaseServerClient();

  const body = await request.json();
  const { sensing_query_id, channel_id, signal_indices } = body;

  if (!sensing_query_id || !channel_id) {
    return new NextResponse('sensing_query_id and channel_id are required', { status: 400 });
  }

  // Get the sensing query results
  const { data: sensingQuery, error: fetchError } = await supabase
    .from('sensing_queries')
    .select('*')
    .eq('id', sensing_query_id)
    .eq('user_id', userId)
    .single();

  if (fetchError || !sensingQuery) {
    return new NextResponse('Sensing query not found', { status: 404 });
  }

  // Verify channel belongs to user's workspace
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', channel_id)
    .single();

  if (!channel) {
    return new NextResponse('Channel not found', { status: 404 });
  }

  // Verify user owns the workspace
  const { data: workspace } = await supabase
    .from('workspaces')
    .select('id')
    .eq('id', channel.workspace_id)
    .eq('owner_id', userId)
    .single();

  if (!workspace) {
    return new NextResponse('Channel not accessible', { status: 403 });
  }

  const results = sensingQuery.results as any;
  const signals = results?.signals || [];

  // If signal_indices is provided, use only those; otherwise copy all
  const signalsToCopy = signal_indices && Array.isArray(signal_indices)
    ? signal_indices.map((i: number) => signals[i]).filter(Boolean)
    : signals;

  if (signalsToCopy.length === 0) {
    return new NextResponse('No signals to copy', { status: 400 });
  }

  // Create data points for each signal
  const dataPoints = signalsToCopy.map((signal: any) => ({
    channel_id: channel_id,
    workspace_id: channel.workspace_id,
    source: 'sensing',
    external_id: `sensing_${sensingQuery.id}_${signal.title}`,
    content: `${signal.title}\n\n${signal.description}\n\nSource: ${signal.source}${signal.source_url ? `\nURL: ${signal.source_url}` : ''}`,
    sender_name: signal.source,
    message_timestamp: new Date().toISOString(),
    sentiment: 'neutral'
  }));

  const { data, error } = await supabase
    .from('data_points')
    .insert(dataPoints)
    .select();

  if (error) {
    console.error('Error copying signals:', error);
    return new NextResponse('Failed to copy signals', { status: 500 });
  }

  return NextResponse.json({
    success: true,
    copied_count: data?.length || 0,
    data_points: data
  });
}
