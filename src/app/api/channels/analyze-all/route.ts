import { NextResponse } from 'next/server';
import { createSupabaseAdminClient } from '@/lib/supabase-server';
import { Resend } from 'resend';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  const authHeader = request.headers.get('Authorization');
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const resend = new Resend(process.env.RESEND_API_KEY || 're_dummy_key');
  const supabase = createSupabaseAdminClient();
  const oneDayAgo = new Date();
  oneDayAgo.setHours(oneDayAgo.getHours() - 23);

  // 1. Fetch channels to analyze
  const { data: channels } = await supabase
    .from('channels')
    .select('*, workspaces(owner_id)')
    .eq('is_active', true)
    .or(`last_analyzed_at.is.null,last_analyzed_at.lt.${oneDayAgo.toISOString()}`);

  if (!channels) return NextResponse.json({ analyzed: 0 });

  const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
  let analyzedCount = 0;
  let alertsCount = 0;

  for (const channel of channels) {
    try {
      const res = await fetch(`${appUrl}/api/channels/${channel.id}/analyze`, {
        method: 'POST',
        headers: { 'Authorization': `Bearer ${process.env.CRON_SECRET}` }
      });
      
      if (res.ok) {
        analyzedCount++;
        
        // Take Snapshots
        const { data: themes } = await supabase
          .from('themes')
          .select('id, name, data_point_count, sentiment_breakdown')
          .eq('channel_id', channel.id);

        if (themes && themes.length > 0) {
          const snapshots = themes.map(theme => ({
            theme_id: theme.id,
            channel_id: channel.id,
            snapshot_date: new Date().toISOString().split('T')[0],
            data_point_count: theme.data_point_count,
            sentiment_breakdown: theme.sentiment_breakdown
          }));

          await supabase.from('theme_snapshots').upsert(snapshots, { onConflict: 'theme_id,snapshot_date' });

          // FEATURE 6: Anomaly Detection
          const sevenDaysAgo = new Date();
          sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
          const dateStr = sevenDaysAgo.toISOString().split('T')[0];

          for (const theme of themes) {
            // Get previous snapshot (approx 7 days ago)
            const { data: prev } = await supabase
              .from('theme_snapshots')
              .select('data_point_count')
              .eq('theme_id', theme.id)
              .lte('snapshot_date', dateStr)
              .order('snapshot_date', { ascending: false })
              .limit(1)
              .single();

            const current = theme.data_point_count;
            const previous = prev?.data_point_count || 0;
            const threshold = channel.alert_threshold_percent || 50;

            let triggered = false;
            let alertType: 'spike' | 'drop' = 'spike';
            let change = 0;

            if (previous === 0 && current > 5) {
              triggered = true;
              change = 100;
            } else if (previous > 0) {
              change = ((current - previous) / previous) * 100;
              if (change >= threshold) { triggered = true; alertType = 'spike'; }
              else if (change <= -threshold) { triggered = true; alertType = 'drop'; }
            }

            if (triggered) {
              alertsCount++;
              // Save Alert
              await supabase.from('anomaly_alerts').insert({
                channel_id: channel.id,
                workspace_id: channel.workspace_id,
                theme_id: theme.id,
                theme_name: theme.name,
                alert_type: alertType,
                current_count: current,
                previous_count: previous,
                percent_change: change
              });

              // Optional: Immediate email alert via Resend could go here
            }
          }
        }
      }
    } catch (e) {
      console.error(`Error analyzing channel ${channel.id}:`, e);
    }
  }

  return NextResponse.json({ analyzed: analyzedCount, alerts_triggered: alertsCount });
}
