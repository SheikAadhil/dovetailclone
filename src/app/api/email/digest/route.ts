import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { clerkClient } from '@clerk/nextjs/server';
import { Resend } from 'resend';
import { WeeklyDigestEmail } from '@/components/email/WeeklyDigestEmail';
import * as React from 'react';

export const dynamic = 'force-dynamic';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  // Initialize Resend inside the handler to prevent build-time errors
  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');

  if (!process.env.RESEND_API_KEY) {
    console.error('RESEND_API_KEY is missing');
    return new NextResponse('Internal Server Error', { status: 500 });
  }

  const supabase = createSupabaseAdminClient();
  const sevenDaysAgo = new Date();
  sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);

  // 1. Get all active channels
  const { data: channels } = await supabase
    .from('channels')
    .select('*, workspaces(owner_id)')
    .eq('is_active', true);

  if (!channels) return NextResponse.json({ sent: 0 });

  let sentCount = 0;

  for (const channel of channels) {
    const workspace: any = channel.workspaces;
    const ownerId = workspace?.owner_id;
    if (!ownerId) continue;

    // 2. Count new messages
    const { count: newMessages } = await supabase
      .from('data_points')
      .select('*', { count: 'exact', head: true })
      .eq('channel_id', channel.id)
      .gte('created_at', sevenDaysAgo.toISOString());

    if (!newMessages || newMessages === 0) continue;

    // 3. Get themes
    const { data: themes } = await supabase
      .from('themes')
      .select('name, summary, data_point_count')
      .eq('channel_id', channel.id)
      .order('data_point_count', { ascending: false })
      .limit(5);

    // 4. Get owner email from Clerk
    try {
      const user = await clerkClient.users.getUser(ownerId);
      const email = user.emailAddresses[0]?.emailAddress;

      if (email) {
        // 5. Send email
        const dashboardUrl = `${process.env.NEXT_PUBLIC_APP_URL}/channels/${channel.id}`;
        
        await resend.emails.send({
          from: process.env.RESEND_FROM_EMAIL!,
          to: email,
          subject: `Weekly Pulse digest: ${channel.name}`,
          react: WeeklyDigestEmail({
            channelName: channel.name,
            newMessageCount: newMessages,
            themes: themes || [],
            dashboardUrl
          }) as React.ReactElement,
        });
        
        sentCount++;
      }
    } catch (e) {
      console.error(`Error sending email to user ${ownerId}:`, e);
    }
  }

  return NextResponse.json({ sent: sentCount });
}
