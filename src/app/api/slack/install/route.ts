import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function GET(request: Request) {
  const { userId } = await auth();
  if (!userId) {
    return new NextResponse('Unauthorized', { status: 401 });
  }

  const url = new URL(request.url);
  const workspaceId = url.searchParams.get('workspaceId');
  const channelId = url.searchParams.get('channelId');

  if (!workspaceId) {
    return new NextResponse('Missing workspaceId', { status: 400 });
  }

  const state = Buffer.from(
    JSON.stringify({ workspaceId, channelId, userId })
  ).toString('base64');

  const clientId = process.env.SLACK_CLIENT_ID;
  const redirectUri = process.env.NEXT_PUBLIC_SLACK_REDIRECT_URI;
  const scope = 'channels:read,channels:history,groups:read,groups:history,users:read,reactions:read';

  const slackUrl = `https://slack.com/oauth/v2/authorize?client_id=${clientId}&scope=${scope}&redirect_uri=${redirectUri}&state=${state}`;

  return NextResponse.redirect(slackUrl);
}
