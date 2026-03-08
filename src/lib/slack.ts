import { WebClient } from '@slack/web-api';
import crypto from 'crypto';

export async function getSlackChannelList(botToken: string) {
  const client = new WebClient(botToken);
  try {
    const result = await client.conversations.list({
      types: 'public_channel,private_channel',
      exclude_archived: true,
      limit: 1000,
    });
    
    if (!result.channels) return [];

    return result.channels.map((channel) => ({
      id: channel.id!,
      name: channel.name!,
    }));
  } catch (error) {
    console.error('Error fetching Slack channels:', error);
    return [];
  }
}

export async function getUserDisplayName(botToken: string, userId: string): Promise<string | null> {
  const client = new WebClient(botToken);
  try {
    const result = await client.users.info({
      user: userId,
    });
    
    if (result.user) {
      return result.user.real_name || result.user.name || null;
    }
    return null;
  } catch (error) {
    console.error('Error fetching Slack user:', error);
    return null;
  }
}

export function verifySlackSignature(
  signingSecret: string,
  rawBody: string,
  timestamp: string,
  signature: string
): boolean {
  // Check if timestamp is too old (e.g. > 5 minutes) to prevent replay attacks
  const fiveMinutesAgo = Math.floor(Date.now() / 1000) - 60 * 5;
  if (parseInt(timestamp) < fiveMinutesAgo) {
    return false;
  }

  const sigBasestring = `v0:${timestamp}:${rawBody}`;
  const hmac = crypto.createHmac('sha256', signingSecret);
  hmac.update(sigBasestring);
  const calculatedSignature = `v0=${hmac.digest('hex')}`;

  // Use timingSafeEqual to prevent timing attacks
  try {
    return crypto.timingSafeEqual(
      Buffer.from(signature),
      Buffer.from(calculatedSignature)
    );
  } catch (e) {
    return false; // Signature length mismatch or other error
  }
}
