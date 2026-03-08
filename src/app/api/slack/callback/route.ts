import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';
import { WebClient } from '@slack/web-api';
import { createSupabaseServerClient } from '@/lib/supabase-server';

export async function GET(request: Request) {
  const { userId } = await auth();
  // We can strictly check if userId matches state.userId later, but user must be logged in.
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const code = url.searchParams.get('code');
  const state = url.searchParams.get('state');

  if (!code || !state) {
    return new NextResponse('Missing code or state', { status: 400 });
  }

  let decodedState;
  try {
    const json = Buffer.from(state, 'base64').toString('utf-8');
    decodedState = JSON.parse(json);
  } catch (e) {
    return new NextResponse('Invalid state', { status: 400 });
  }

  const { workspaceId, channelId, userId: stateUserId } = decodedState;

  if (userId !== stateUserId) {
    return new NextResponse('User mismatch', { status: 403 });
  }

  const client = new WebClient();
  let slackResult;
  try {
    slackResult = await client.oauth.v2.access({
      client_id: process.env.SLACK_CLIENT_ID!,
      client_secret: process.env.SLACK_CLIENT_SECRET!,
      code,
      redirect_uri: process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI!,
    });
  } catch (error) {
    console.error('Slack OAuth error:', error);
    return new NextResponse('Slack OAuth failed', { status: 500 });
  }

  if (!slackResult.ok) {
    return new NextResponse(`Slack OAuth error: ${slackResult.error}`, { status: 400 });
  }

  const { access_token, team, bot_user_id, scope, authed_user } = slackResult as any;
  // Note: bot_token is usually access_token in v2 if scopes are bot scopes.
  // The response structure depends on scopes.
  // We requested bot scopes (channels:read, etc.), so access_token IS the bot token.
  // 'team' object contains id and name.

  const supabase = await createSupabaseServerClient();

  // Upsert slack_connections
  const { error: upsertError } = await supabase
    .from('slack_connections')
    .upsert({
      workspace_id: workspaceId,
      slack_team_id: team.id,
      slack_team_name: team.name,
      bot_token: access_token,
      bot_user_id: bot_user_id, // or authed_user.id? V2 returns bot_user_id usually.
      scope: scope,
      installed_by: userId,
      is_active: true,
    }, { onConflict: 'slack_team_id' });

  if (upsertError) {
    console.error('Error upserting slack_connection:', upsertError);
    return new NextResponse('Database error', { status: 500 });
  }

  // Update channel row if channelId exists
  if (channelId) {
    const { error: updateError } = await supabase
      .from('channels')
      .update({
        slack_team_id: team.id,
      })
      .eq('id', channelId)
      .eq('workspace_id', workspaceId); // Security check

    if (updateError) {
      console.error('Error updating channel:', updateError);
      // We don't fail the whole request, but log it.
    }
  }

  const redirectUrl = channelId 
    ? `/channels/${channelId}?slack=connected`
    : `/channels?slack=connected`; // Fallback

  return NextResponse.redirect(new URL(redirectUrl, request.url));
}
