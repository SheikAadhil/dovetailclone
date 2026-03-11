import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { createSupabaseServerClient, createSupabaseAdminClient } from '@/lib/supabase-server';
import Papa from 'papaparse';
import crypto from 'crypto';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const formData = await request.formData();
  const file = formData.get('file') as File;
  const isPreview = formData.get('preview') === 'true';
  const mappingsRaw = formData.get('mappings') as string;
  const mappings = mappingsRaw ? JSON.parse(mappingsRaw) : null;

  if (!file) return new NextResponse('No file uploaded', { status: 400 });

  const csvText = await file.text();
  const parsed = Papa.parse(csvText, { header: true, skipEmptyLines: true });

  if (isPreview) {
    return NextResponse.json({
      headers: parsed.meta.fields || [],
      row_count: parsed.data.length,
      preview_rows: parsed.data.slice(0, 3)
    });
  }

  // FULL IMPORT
  const supabase = await createSupabaseServerClient();
  const adminSupabase = createSupabaseAdminClient();

  // Get channel and workspace
  const { data: channel } = await supabase
    .from('channels')
    .select('workspace_id')
    .eq('id', params.id)
    .single();

  if (!channel) return new NextResponse('Channel not found', { status: 404 });

  const { content_column, date_column, fields_to_import } = mappings;
  const filename = file.name;
  const fileHash = crypto.createHash('md5').update(filename + csvText.length).digest('hex');

  // 1. Create Source
  const { data: source } = await adminSupabase
    .from('channel_sources')
    .insert({
      channel_id: params.id,
      workspace_id: channel.workspace_id,
      source_type: 'csv',
      source_label: filename,
      is_active: true,
      data_point_count: parsed.data.length
    })
    .select()
    .single();

  // 2. Create/Update Fields
  const fieldsCreated = [];
  for (const field of fields_to_import) {
    const colName = field.column;
    // Detect type from values
    const values = parsed.data.map((row: any) => row[colName]).filter(v => !!v);
    
    let type: 'text' | 'select' | 'date' | 'number' = 'text';
    const uniqueValues = Array.from(new Set(values));

    if (values.every(v => !isNaN(Date.parse(v)) && isNaN(Number(v)))) {
      type = 'date';
    } else if (values.every(v => !isNaN(Number(v)))) {
      type = 'number';
    } else if (uniqueValues.length < parsed.data.length * 0.2) {
      type = 'select';
    }

    const { data: fieldRow } = await adminSupabase
      .from('channel_fields')
      .upsert({
        channel_id: params.id,
        workspace_id: channel.workspace_id,
        source_column: colName,
        display_name: field.display_name || colName,
        field_type: type,
        options: type === 'select' ? uniqueValues : [],
        is_active: true
      }, { onConflict: 'channel_id,source_column' })
      .select()
      .single();
    
    if (fieldRow) fieldsCreated.push(fieldRow);
  }

  // 3. Import Data Points
  const dataPoints = parsed.data.map((row: any, index: number) => {
    const metadata: Record<string, any> = {};
    parsed.meta.fields?.forEach(f => {
      if (f !== content_column) metadata[f] = row[f];
    });

    return {
      channel_id: params.id,
      workspace_id: channel.workspace_id,
      source: 'csv',
      source_id: source?.id,
      source_label: filename,
      external_id: `${fileHash}-${index}`,
      content: row[content_column] || '',
      message_timestamp: date_column && row[date_column] ? new Date(row[date_column]).toISOString() : new Date().toISOString(),
      metadata
    };
  });

  // Batch insert in chunks of 100
  const chunkSize = 100;
  const vercelUrl = process.env.VERCEL_URL;
  const appUrl = vercelUrl
    ? `https://${vercelUrl}`
    : (process.env.NEXT_PUBLIC_APP_URL || 'https://dovetailclone.vercel.app');

  for (let i = 0; i < dataPoints.length; i += chunkSize) {
    const chunk = dataPoints.slice(i, i + chunkSize);
    const { data: inserted } = await adminSupabase
      .from('data_points')
      .insert(chunk)
      .select('id');

    // Trigger embeddings for each inserted row
    if (inserted) {
      inserted.forEach(dp => {
        fetch(`${appUrl}/api/data-points/embed`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${process.env.CRON_SECRET}`
          },
          body: JSON.stringify({ dataPointId: dp.id })
        }).catch(err => console.error('Error triggering embed:', err));
      });
    }
  }

  return NextResponse.json({ 
    success: true, 
    imported: dataPoints.length, 
    fields_created: fieldsCreated.length 
  });
}
