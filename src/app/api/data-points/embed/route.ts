import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import { generateEmbedding } from '@/lib/embeddings';
import { analyzeSentiment } from '@/lib/ai';

export async function POST(request: Request) {
  const authHeader = request.headers.get('Authorization');
  let supabase;

  // Check for internal call (Cron or Webhook)
  if (authHeader === `Bearer ${process.env.CRON_SECRET}`) {
    supabase = createSupabaseAdminClient();
  } else {
    // Check for user session
    const { userId } = await auth();
    if (!userId) {
      return new NextResponse('Unauthorized', { status: 401 });
    }
    supabase = await createSupabaseServerClient();
  }

  const { dataPointId } = await request.json();

  if (!dataPointId) {
    return new NextResponse('Missing dataPointId', { status: 400 });
  }

  // Fetch data point
  const { data: dataPoint, error } = await supabase
    .from('data_points')
    .select('id, content, embedding')
    .eq('id', dataPointId)
    .single();

  if (error || !dataPoint) {
    return new NextResponse('Data point not found', { status: 404 });
  }

  // Idempotency check for embedding
  if (dataPoint.embedding) {
    // Maybe sentiment is missing?
    // We proceed if sentiment is missing?
    // The prompt says "If embedding already exists, return early (idempotent)".
    // But then says "Also run sentiment analysis".
    // If I return early, I might skip sentiment if it failed before.
    // I'll check both? 
    // "Steps: 2. If embedding already exists, return early".
    // I will follow instructions strictly.
    return new NextResponse('Already processed', { status: 200 });
  }

  // Generate embedding
  const embedding = await generateEmbedding(dataPoint.content);
  
  // Analyze sentiment
  const sentiment = await analyzeSentiment(dataPoint.content);

  // Update row
  // We update both.
  const updates: any = {};
  if (embedding) updates.embedding = embedding;
  if (sentiment) updates.sentiment = sentiment;

  const { error: updateError } = await supabase
    .from('data_points')
    .update(updates)
    .eq('id', dataPointId);

  if (updateError) {
    console.error('Error updating data point:', updateError);
    return new NextResponse('Database error', { status: 500 });
  }

  return NextResponse.json({ success: true });
}
