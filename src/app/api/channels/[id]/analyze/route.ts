import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { analyzeThemes } from '@/lib/ai';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const authHeader = request.headers.get('Authorization');
  let supabase;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    supabase = createSupabaseAdminClient();
  } else {
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    supabase = await createSupabaseServerClient();
  }

  // Parse optional messageIds from body
  let messageIds: string[] | null = null;
  try {
    const body = await request.json();
    if (body.messageIds && Array.isArray(body.messageIds)) {
      messageIds = body.messageIds;
    }
  } catch (e) {
    // No body or invalid JSON is fine, we just fall back to all messages
  }

  // 1. Fetch data points
  let query = supabase
    .from('data_points')
    .select('id, content, sentiment, workspace_id')
    .eq('channel_id', params.id);

  // If specific IDs provided, filter by them
  if (messageIds && messageIds.length > 0) {
    query = query.in('id', messageIds);
  } else {
    // Default fallback: latest 200 messages
    query = query.order('message_timestamp', { ascending: false }).limit(200);
  }

  const { data: dataPoints, error: dpError } = await query;

  if (dpError) {
    return NextResponse.json({ error: 'Database error fetching messages' }, { status: 500 });
  }

  if (!dataPoints || dataPoints.length < 2) {
    return NextResponse.json({ 
      error: `Not enough messages selected. Need at least 2 for analysis.`,
      found: dataPoints?.length || 0 
    }, { status: 400 });
  }

  // 2. Prepare for AI
  const messagesForAi = dataPoints.map(dp => ({
    id: dp.id,
    content: dp.content
  }));

  // 3. Call AI
  const themesResult = await analyzeThemes(messagesForAi);

  if (!themesResult || themesResult.length === 0) {
    return NextResponse.json({ themes: 0 });
  }

  // 4. Fetch existing themes to handle upsert
  const { data: existingThemes } = await supabase
    .from('themes')
    .select('id, name')
    .eq('channel_id', params.id);

  const existingThemesMap = new Map((existingThemes || []).map(t => [t.name, t.id]));
  const processedThemeIds: string[] = [];

  // 5. Process themes
  for (const theme of themesResult) {
    const validMessageIds = theme.message_ids.filter(id => 
      dataPoints.some(dp => dp.id === id)
    );
    
    if (validMessageIds.length === 0) continue;

    const breakdown: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
    validMessageIds.forEach(id => {
      const dp = dataPoints.find(d => d.id === id);
      if (dp?.sentiment) {
        breakdown[dp.sentiment] = (breakdown[dp.sentiment] || 0) + 1;
      } else {
        breakdown['neutral'] = (breakdown['neutral'] || 0) + 1;
      }
    });

    let themeId = existingThemesMap.get(theme.name);

    if (themeId) {
      await supabase
        .from('themes')
        .update({
          summary: theme.summary,
          data_point_count: validMessageIds.length,
          sentiment_breakdown: breakdown,
          last_updated_at: new Date().toISOString()
        })
        .eq('id', themeId);
    } else {
      const { data: newTheme, error: insertError } = await supabase
        .from('themes')
        .insert({
          channel_id: params.id,
          workspace_id: dataPoints[0].workspace_id,
          name: theme.name,
          summary: theme.summary,
          data_point_count: validMessageIds.length,
          sentiment_breakdown: breakdown,
          is_pinned: false
        })
        .select('id')
        .single();
      
      if (insertError || !newTheme) continue;
      themeId = newTheme.id;
    }

    processedThemeIds.push(themeId);

    if (themeId) {
      // For selective analysis, we might want to APPEND instead of replace associations
      // But for simplicity and matching standard behavior, we'll follow the original logic
      await supabase.from('data_point_themes').delete().eq('theme_id', themeId);
      
      const relations = validMessageIds.map(dpId => ({
        data_point_id: dpId,
        theme_id: themeId,
        relevance_score: 1.0
      }));
      
      await supabase.from('data_point_themes').insert(relations);
    }
  }

  // 7. Update channel timestamp
  await supabase
    .from('channels')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', params.id);

  return NextResponse.json({ themes: processedThemeIds.length });
}
