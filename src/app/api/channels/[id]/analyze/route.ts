import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { analyzeThemes, suggestTopics, classifyThemesIntoTopics } from '@/lib/ai';

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
    // No body or invalid JSON is fine
  }

  // 1. Fetch data points and channel context
  const { data: channel } = await supabase
    .from('channels')
    .select('ai_context, workspace_id')
    .eq('id', params.id)
    .single();

  let query = supabase
    .from('data_points')
    .select('id, content, sentiment, workspace_id')
    .eq('channel_id', params.id);

  if (messageIds && messageIds.length > 0) {
    query = query.in('id', messageIds);
  } else {
    query = query.order('message_timestamp', { ascending: false }).limit(200);
  }

  const { data: dataPoints, error: dpError } = await query;

  if (dpError) {
    return NextResponse.json({ error: 'Database error fetching messages' }, { status: 500 });
  }

  if (!dataPoints || dataPoints.length < 2) {
    return NextResponse.json({ 
      error: `Not enough messages. Found ${dataPoints?.length || 0}, need 2.`,
    }, { status: 400 });
  }

  // 2. Prepare for AI
  const messagesForAi = dataPoints.map(dp => ({
    id: dp.id,
    content: dp.content
  }));

  // 3. Call AI with optional context
  const themesResult = await analyzeThemes(messagesForAi, channel?.ai_context);

  if (!themesResult || themesResult.length === 0) {
    return NextResponse.json({ 
      themes: 0, 
      debug: { 
        messageCount: dataPoints.length, 
        aiReason: "AI returned empty themes list" 
      } 
    });
  }

  // 4. Fetch existing themes and topics
  const { data: existingThemes } = await supabase
    .from('themes')
    .select('id, name')
    .eq('channel_id', params.id);

  const { data: existingTopics } = await supabase
    .from('topics')
    .select('id, name, description')
    .eq('channel_id', params.id);

  const existingThemesMap = new Map((existingThemes || []).map(t => [t.name, t.id]));
  const processedThemes: { id: string; name: string; summary: string }[] = [];
  const processedThemeIds: string[] = [];

  // 5. Process themes
  for (const theme of themesResult) {
    const validMessageIds = (theme.message_ids || []).filter(id => 
      dataPoints.some(dp => dp.id.trim() === id.trim())
    );
    
    if (validMessageIds.length === 0) continue;

    const breakdown: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
    validMessageIds.forEach(id => {
      const dp = dataPoints.find(d => d.id.trim() === id.trim());
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
    processedThemes.push({ id: themeId, name: theme.name, summary: theme.summary });

    if (themeId) {
      await supabase.from('data_point_themes').delete().eq('theme_id', themeId);
      const relations = validMessageIds.map(dpId => ({
        data_point_id: dpId,
        theme_id: themeId,
        relevance_score: 1.0
      }));
      await supabase.from('data_point_themes').insert(relations);
    }
  }

  // 6. Handle Topics
  let topicsToClassify = existingTopics || [];
  if (!existingTopics || existingTopics.length === 0) {
    const suggested = await suggestTopics(processedThemes);
    if (suggested && suggested.length > 0) {
      const { data: newTopics } = await supabase
        .from('topics')
        .insert(suggested.map((t, idx) => ({
          channel_id: params.id,
          workspace_id: channel?.workspace_id,
          name: t.name,
          description: t.description,
          is_ai_generated: true,
          display_order: idx,
          created_by: 'system'
        })))
        .select('id, name, description');
      
      if (newTopics) topicsToClassify = newTopics;
    }
  }

  if (topicsToClassify.length > 0 && processedThemes.length > 0) {
    const classifications = await classifyThemesIntoTopics(processedThemes, topicsToClassify);
    for (const item of classifications) {
      if (item.topic_id) {
        await supabase
          .from('themes')
          .update({ topic_id: item.topic_id })
          .eq('id', item.theme_id);
      }
    }
  }

  // 7. Update channel timestamp
  await supabase
    .from('channels')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', params.id);

  // 8. Create theme snapshots for trend tracking
  const today = new Date().toISOString().split('T')[0];
  const snapshots = processedThemeIds.map(themeId => {
    const theme = processedThemes.find(t => t.id === themeId);
    return {
      theme_id: themeId,
      channel_id: params.id,
      snapshot_date: today,
      data_point_count: theme?.summary ? validMessageIds.length : 0,
      sentiment_breakdown: {}
    };
  });

  // Fetch actual theme data for snapshots
  const { data: allThemes } = await supabase
    .from('themes')
    .select('id, data_point_count, sentiment_breakdown')
    .in('id', processedThemeIds);

  const actualSnapshots = (allThemes || []).map(theme => ({
    theme_id: theme.id,
    channel_id: params.id,
    snapshot_date: today,
    data_point_count: theme.data_point_count,
    sentiment_breakdown: theme.sentiment_breakdown
  }));

  if (actualSnapshots.length > 0) {
    await supabase
      .from('theme_snapshots')
      .upsert(actualSnapshots, { onConflict: 'theme_id,snapshot_date' });
  }

  return NextResponse.json({
    themes: processedThemeIds.length,
    topics: topicsToClassify.length
  });
}
