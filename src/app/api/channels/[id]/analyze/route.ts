import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { analyzeThemes, ThemeResult } from '@/lib/ai';

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

  // 1. Fetch data points
  const { data: dataPoints, error: dpError } = await supabase
    .from('data_points')
    .select('id, content, sentiment, workspace_id')
    .eq('channel_id', params.id)
    .order('message_timestamp', { ascending: false })
    .limit(200);

  if (dpError) {
    return NextResponse.json({ error: 'Database error fetching messages', details: dpError }, { status: 500 });
  }

  if (!dataPoints || dataPoints.length < 5) {
    return NextResponse.json({ 
      error: `Not enough data. Found ${dataPoints?.length || 0} messages, need at least 5.`,
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
    return NextResponse.json({ 
      themes: 0, 
      debug: { 
        messageCount: dataPoints.length,
        aiCalled: true,
        reason: 'AI returned no themes'
      } 
    });
  }

  // 4. Fetch existing themes to handle upsert manually
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
      
      if (insertError || !newTheme) {
        console.error('Error inserting theme:', insertError);
        continue;
      }
      themeId = newTheme.id;
    }

    processedThemeIds.push(themeId);

    if (themeId) {
      await supabase
        .from('data_point_themes')
        .delete()
        .eq('theme_id', themeId);
      
      if (validMessageIds.length > 0) {
        const relations = validMessageIds.map(dpId => ({
          data_point_id: dpId,
          theme_id: themeId,
          relevance_score: 1.0
        }));
        
        await supabase
          .from('data_point_themes')
          .insert(relations);
      }
    }
  }

  // 6. Delete stale themes
  const themesToDelete = (existingThemes || [])
    .filter(t => !processedThemeIds.includes(t.id))
    .map(t => t.id);

  if (themesToDelete.length > 0) {
    await supabase
      .from('themes')
      .delete()
      .in('id', themesToDelete);
  }

  // 7. Update channel timestamp
  await supabase
    .from('channels')
    .update({ last_analyzed_at: new Date().toISOString() })
    .eq('id', params.id);

  return NextResponse.json({ themes: processedThemeIds.length });
}
