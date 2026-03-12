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

  const { data, error } = await supabase
    .from('sensing_queries')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', userId)
    .single();

  if (error || !data) {
    return new NextResponse('Sensing query not found', { status: 404 });
  }

  return NextResponse.json(data);
}
