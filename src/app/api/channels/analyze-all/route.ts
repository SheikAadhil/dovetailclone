import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    // Check if it's called by Vercel Cron which uses x-vercel-cron header or similar
    // But prompt says "Verify request has CRON_SECRET header matching env var"
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const supabase = createSupabaseAdminClient();
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 23);

  // Fetch channels to analyze
  // (last_analyzed_at is null OR last_analyzed_at < now() - interval '23 hours')
  const { data: channels } = await supabase
    .from('channels')
    .select('id')
    .eq('is_active', true)
    .or(`last_analyzed_at.is.null,last_analyzed_at.lt.${oneDayAgo.toISOString()}`);

  if (!channels) return NextResponse.json({ analyzed: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let analyzedCount = 0;

  for (const channel of channels) {
    try {
      // Call internal analyze endpoint
      // Note: analyze endpoint expects Clerk auth.
      // But we are in a Cron job.
      // I should update /api/channels/[id]/analyze to also accept CRON_SECRET.
      // I'll do that next.
      
      const res = await fetch(`${appUrl}/api/channels/${channel.id}/analyze`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${process.env.CRON_SECRET}`
        }
      });
      
      if (res.ok) analyzedCount++;
    } catch (e) {
      console.error(`Error analyzing channel ${channel.id}:`, e);
    }
  }

  return NextResponse.json({ analyzed: analyzedCount });
}
