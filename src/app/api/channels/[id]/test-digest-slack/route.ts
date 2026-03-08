import { auth } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const { userId } = await auth();
  if (!userId) return new NextResponse('Unauthorized', { status: 401 });

  const { url } = await request.json();
  if (!url) return new NextResponse('Webhook URL is required', { status: 400 });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        blocks: [
          {
            type: "header",
            text: {
              type: "plain_text",
              text: "🚀 Pulse: Test Notification",
              emoji: true
            }
          },
          {
            type: "section",
            text: {
              type: "mrkdwn",
              text: "Success! This Slack channel is now connected to Pulse for weekly digests."
            }
          }
        ]
      })
    });

    if (!response.ok) throw new Error("Invalid webhook");

    return NextResponse.json({ success: true });
  } catch (e) {
    return NextResponse.json({ error: "Invalid webhook URL" }, { status: 400 });
  }
}
