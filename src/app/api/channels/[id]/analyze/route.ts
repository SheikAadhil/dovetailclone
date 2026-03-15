import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { analyzeThemesLayer1, analyzeThemesLayer2, ThemeResult, setProgressCallback } from '@/lib/ai';

function sendProgress(writer: any, progress: string, step?: number) {
  if (writer && typeof writer.write === 'function') {
    try {
      const data = JSON.stringify({ progress, step });
      writer.write(`data: ${data}\n\n`);
    } catch (e) {
      // Ignore write errors
    }
  }
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  // Check if client wants SSE
  const accept = request.headers.get('Accept') || '';
  const useSSE = accept.includes('text/event-stream');

  // If not using SSE, return a regular JSON response
  if (!useSSE) {
    return handleAnalysis(request, params.id);
  }

  // For SSE, return streaming response
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    async start(controller) {
      const writer = controller.writer;

      try {
        await handleAnalysis(request, params.id, writer, sendProgress);
        try {
          writer.write('data: [DONE]\n\n');
        } catch (e) { /* ignore */ }
        controller.close();
      } catch (error) {
        console.error('Analysis error:', error);
        try {
          sendProgress(writer, `Error: ${error}`, 2);
        } catch (e) { /* ignore write errors */ }
        setProgressCallback(null);
        try {
          controller.close();
        } catch (e) { /* ignore */ }
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
    },
  });
}

async function handleAnalysis(
  request: Request,
  channelId: string,
  writer: any = null,
  sendProgressFn: any = null
) {
  // Set up progress callback for AI functions
  const sendProgress = (progress: string, step?: number) => {
    sendProgressFn?.(writer, progress, step);
  };
  setProgressCallback(sendProgress);

  const authHeader = request.headers.get('Authorization');
  let supabase;

  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    supabase = createSupabaseAdminClient();
  } else {
    const { userId } = await auth();
    if (!userId) {
      if (writer) {
        writer.write('data: {"error":"Unauthorized"}\n\n');
        writer.write('data: [DONE]\n\n');
        writer.close();
      }
      setProgressCallback(null);
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    supabase = await createSupabaseServerClient();
  }

  // Parse optional messageIds and forceRefresh from body
  let messageIds: string[] | null = null;
  let forceRefresh = false;
  try {
    const body = await request.json();
    if (body.messageIds && Array.isArray(body.messageIds)) {
      messageIds = body.messageIds;
    }
    if (body.forceRefresh === true) {
      forceRefresh = true;
    }
  } catch (e) {
    // No body or invalid JSON is fine
  }

  // 1. Fetch data points and channel context
  sendProgress?.("Fetching signals from database...", 0);

  const { data: channel } = await supabase
    .from('channels')
    .select('ai_context, workspace_id')
    .eq('id', channelId)
    .single();

  let query = supabase
    .from('data_points')
    .select('id, content, sentiment, workspace_id')
    .eq('channel_id', channelId);

  if (messageIds && messageIds.length > 0) {
    query = query.in('id', messageIds);
  } else if (!forceRefresh) {
    query = query.order('message_timestamp', { ascending: false }).limit(200);
  } else {
    query = query.order('message_timestamp', { ascending: false }).limit(1000);
  }

  const { data: dataPoints, error: dpError } = await query;

  if (dpError) {
    if (writer) {
      const data = JSON.stringify({ error: 'Database error fetching messages' });
      writer.write(`data: ${data}\n\n`);
    }
    setProgressCallback(null);
    return NextResponse.json({ error: 'Database error fetching messages' }, { status: 500 });
  }

  if (!dataPoints || dataPoints.length === 0) {
    if (writer) {
      const data = JSON.stringify({ error: 'No signals found to analyze' });
      writer.write(`data: ${data}\n\n`);
    }
    setProgressCallback(null);
    return NextResponse.json({ error: 'No signals found to analyze' }, { status: 400 });
  }

  sendProgress?.(`[FETCHING] GOAL: Load all signals for analysis | DOING: Retrieved ${dataPoints.length} signals from database | OBSERVATIONS: Found ${dataPoints.length} feedback signals to analyze | DECISIONS: Proceeding with full dataset | QUESTIONS: | PROGRESS: ${dataPoints.length} signals loaded`, 0);

  const messagesForAi = dataPoints.map(dp => ({
    id: dp.id,
    content: dp.content
  }));

  // 2. STAGE 1: PRIMARY ANALYSIS
  sendProgress?.(`[LAYER 1] GOAL: Extract product-level themes from signals | DOING: Analyzing ${messagesForAi.length} signals for patterns and themes | OBSERVATIONS: Processing feedback through UX research methodology | DECISIONS: Using 8-stage thematic analysis framework | QUESTIONS: What patterns emerge from the data? | PROGRESS: Starting primary analysis...`, 1);
  const layer1Themes = await analyzeThemesLayer1(messagesForAi, channel?.ai_context);
  console.log(`Layer 1 returned ${layer1Themes?.length || 0} themes`);

  // 3. STAGE 2: DEEP REVIEW - always run to get deep themes
  let layer2Themes: ThemeResult[] = [];
  sendProgress?.(`[LAYER 1 COMPLETE] GOAL: Synthesize findings | DOING: Layer 1 analysis complete - found ${layer1Themes?.length || 0} themes | OBSERVATIONS: ${layer1Themes?.length || 0} product-level themes identified | DECISIONS: Proceeding to deep review for cross-theme patterns | QUESTIONS: What systemic patterns exist across themes? | PROGRESS: Found ${layer1Themes?.length || 0} themes`, 1);
  sendProgress?.(`[LAYER 2] GOAL: Identify latent patterns across themes | DOING: Running deep thematic analysis to find systemic dynamics | OBSERVATIONS: Looking for cross-theme patterns and underlying assumptions | DECISIONS: Using reflexive thematic analysis methodology | QUESTIONS: What connects these themes at a deeper level? | PROGRESS: Starting deep review...`, 2);
  layer2Themes = await analyzeThemesLayer2(messagesForAi, channel?.ai_context);
  console.log(`Layer 2 returned ${layer2Themes?.length || 0} themes`);

  // 4. Ensure System Topics exist for categorization
  const LAYER_TOPICS = [
    { name: 'Product Insights (Layer 1)', description: 'Immediate actionable feedback and product improvements.' },
    { name: 'Deep Analysis (Layer 2)', description: 'Latent patterns, systemic dynamics, and reflexive research insights.' }
  ];

  const processedThemeIds: string[] = [];

  const processLayer = async (themesResult: ThemeResult[], topicName: string) => {
    // Get or create the topic for this layer
    let { data: topic } = await supabase
      .from('topics')
      .select('id')
      .eq('channel_id', channelId)
      .eq('name', topicName)
      .maybeSingle();

    if (!topic) {
      const { data: newTopic } = await supabase
        .from('topics')
        .insert({
          channel_id: channelId,
          workspace_id: channel?.workspace_id,
          name: topicName,
          description: LAYER_TOPICS.find(t => t.name === topicName)?.description,
          is_ai_generated: true,
          created_by: 'system'
        })
        .select('id')
        .single();
      topic = newTopic;
    }

    if (!topic) return;

    for (const theme of themesResult) {
      console.log(`Processing theme: ${theme.name}, message_ids: ${JSON.stringify(theme.message_ids)}`);

      const validMessageIds = (theme.message_ids || []).filter(id =>
        dataPoints.some(dp => dp.id.trim() === id.trim())
      );

      console.log(`Valid message IDs for theme ${theme.name}: ${validMessageIds.length} out of ${theme.message_ids?.length || 0}`);

      if (validMessageIds.length === 0) {
        console.log(`Skipping theme ${theme.name} - no matching data points`);
        continue;
      }

      const breakdown: Record<string, number> = { positive: 0, negative: 0, neutral: 0 };
      validMessageIds.forEach(id => {
        const dp = dataPoints.find(d => d.id.trim() === id.trim());
        if (dp?.sentiment) {
          breakdown[dp.sentiment] = (breakdown[dp.sentiment] || 0) + 1;
        } else {
          breakdown['neutral'] = (breakdown['neutral'] || 0) + 1;
        }
      });

      // Check if theme exists in THIS layer
      const { data: existing } = await supabase
        .from('themes')
        .select('id')
        .eq('channel_id', channelId)
        .eq('name', theme.name)
        .eq('topic_id', topic.id)
        .maybeSingle();

      let themeId = existing?.id;

      if (themeId) {
        await supabase
          .from('themes')
          .update({
            summary: theme.summary,
            description: theme.deep_analysis,
            sentiment_breakdown: breakdown,
            last_updated_at: new Date().toISOString()
          })
          .eq('id', themeId);
      } else {
        const { data: newTheme } = await supabase
          .from('themes')
          .insert({
            channel_id: channelId,
            workspace_id: dataPoints[0].workspace_id,
            name: theme.name,
            summary: theme.summary,
            description: theme.deep_analysis,
            data_point_count: validMessageIds.length,
            sentiment_breakdown: breakdown,
            topic_id: topic.id,
            is_pinned: false
          })
          .select('id')
          .single();

        themeId = newTheme?.id;
      }

      if (themeId) {
        processedThemeIds.push(themeId);
        // Refresh relations
        await supabase.from('data_point_themes').delete().eq('theme_id', themeId);
        const relations = validMessageIds.map(dpId => ({
          data_point_id: dpId,
          theme_id: themeId,
          relevance_score: 1.0
        }));
        await supabase.from('data_point_themes').insert(relations);
      }
    }
  };

  sendProgress?.(`[SAVING] GOAL: Persist analysis results | DOING: Saving themes to database and creating topic categories | OBSERVATIONS: Writing ${layer1Themes?.length || 0} Layer 1 themes and ${layer2Themes?.length || 0} Layer 2 themes | DECISIONS: Creating topic categories for organization | QUESTIONS: | PROGRESS: Saving themes...`, 2);
  try {
    await processLayer(layer1Themes, 'Product Insights (Layer 1)');
  } catch (e) {
    console.error("Error processing Layer 1 themes:", e);
  }
  try {
    await processLayer(layer2Themes, 'Deep Analysis (Layer 2)');
  } catch (e) {
    console.error("Error processing Layer 2 themes:", e);
  }

  // 5. Update channel timestamp
  await supabase
    .from('channels')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', channelId);

  // 6. Create theme snapshots
  const today = new Date().toISOString().split('T')[0];
  const { data: allThemes } = await supabase
    .from('themes')
    .select('id, data_point_count, sentiment_breakdown')
    .in('id', processedThemeIds);

  const actualSnapshots = (allThemes || []).map(theme => ({
    theme_id: theme.id,
    channel_id: channelId,
    snapshot_date: today,
    data_point_count: theme.data_point_count,
    sentiment_breakdown: theme.sentiment_breakdown
  }));

  if (actualSnapshots.length > 0) {
    await supabase
      .from('theme_snapshots')
      .upsert(actualSnapshots, { onConflict: 'theme_id,snapshot_date' });
  }

  sendProgress?.(`[COMPLETE] GOAL: Analysis finished | DOING: All themes saved and organized | OBSERVATIONS: Generated ${processedThemeIds.length} total themes across both layers | DECISIONS: Analysis complete - ready for review | QUESTIONS: | PROGRESS: Analysis complete! Generated ${processedThemeIds.length} themes.`, 2);

  // Clean up progress callback
  setProgressCallback(null);

  return NextResponse.json({
    themes: processedThemeIds.length,
    layers: 2
  });
}
