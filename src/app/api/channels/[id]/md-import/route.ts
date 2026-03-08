import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const files = formData.getAll('files') as File[];

  if (!files || files.length === 0) {
    return new NextResponse('No files uploaded', { status: 400 });
  }

  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  // Get channel and workspace
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', params.id)
    .single();

  if (!channel) return new NextResponse('Channel not found', { status: 404 });

  // 1. Create a single source for this batch of nodes
  const batchId = crypto.randomUUID().slice(0, 8);
  const { data: source } = await adminSupabase
    .from('channel_sources')
    .insert({
      channel_id: params.id,
      workspace_id: channel.workspace_id,
      source_type: 'markdown',
      source_label: `Node Import #${batchId} (${files.length} files)`,
      is_active: true,
      data_point_count: files.length
    })
    .select()
    .single();

  let importedCount = 0;
  const errors = [];

  // 2. Process each file
  for (const file of files) {
    try {
      const content = await file.text();
      const filename = file.name;
      const fileHash = crypto.createHash('md5').update(filename + content.length).digest('hex');

      // Attempt to extract title from the first line if it's a heading
      let title = filename.replace(/\.md$/, '');
      const firstLine = content.split('\n')[0].trim();
      if (firstLine.startsWith('# ')) {
        title = firstLine.replace(/^#\s+/, '');
      }

      const { data: inserted, error: insertError } = await adminSupabase
        .from('data_points')
        .insert({
          channel_id: params.id,
          workspace_id: channel.workspace_id,
          source: 'node',
          source_id: source?.id,
          source_label: title,
          external_id: `node-${fileHash}`,
          content: content,
          message_timestamp: new Date().toISOString(),
          metadata: { 
            filename, 
            type: 'observation_node',
            import_batch: batchId 
          }
        })
        .select('id')
        .single();

      if (insertError) throw insertError;

      // Trigger embeddings
      if (inserted) {
        const appUrl = process.env.NEXT_PUBLIC_APP_URL || 'http://localhost:3000';
        fetch(`${appUrl}/api/data-points/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({ dataPointId: inserted.id })
        }).catch(err => console.error('Error triggering embed:', err));
      }

      importedCount++;
    } catch (e: any) {
      console.error(`Error importing ${file.name}:`, e);
      errors.push({ file: file.name, error: e.message });
    }
  }

  return NextResponse.json({ 
    success: true, 
    imported: importedCount, 
    source_id: source?.id,
    errors: errors.length > 0 ? errors : undefined
  });
}
