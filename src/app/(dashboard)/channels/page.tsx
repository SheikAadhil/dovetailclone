import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ChannelCard } from "@/components/channels/ChannelCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Plus } from "lucide-react";

export default async function ChannelsPage() {
  const { userId } = await auth();
  if (!userId) return <div>Please sign in.</div>;

  const supabase = await createSupabaseServerClient();

  // Get user's workspace(s)
  const { data: workspaces } = await supabase
    .from('workspaces')
    .select('id')
    .eq('owner_id', userId);

  if (!workspaces || workspaces.length === 0) {
    return <div>No workspace found. Please refresh.</div>;
  }

  const workspaceIds = workspaces.map(w => w.id);

  const { data: channelsRaw, error } = await supabase
    .from('channels')
    .select(`
      *,
      data_points(count),
      themes(count)
    `)
    .in('workspace_id', workspaceIds)
    .order('created_at', { ascending: false });

  if (error) {
    console.error(error);
    return <div>Error loading channels.</div>;
  }

  const channels = (channelsRaw || []).map((ch: any) => ({
    ...ch,
    message_count: ch.data_points?.[0]?.count || 0,
    theme_count: ch.themes?.[0]?.count || 0
  }));

  return (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Channels</h1>
        <Link href="/channels/new">
          <Button size="sm">
            <Plus className="mr-1.5 h-3.5 w-3.5" /> New Channel
          </Button>
        </Link>
      </div>

      {channels.length === 0 ? (
        <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50 text-center p-6">
          <div className="w-12 h-12 bg-gray-200 rounded-full flex items-center justify-center mb-3">
            <Plus className="w-6 h-6 text-gray-500" />
          </div>
          <h2 className="text-lg font-semibold text-gray-900">No channels yet</h2>
          <p className="text-gray-500 text-sm mt-1 max-w-xs">
            Create your first channel to start monitoring Slack messages.
          </p>
          <Link href="/channels/new" className="mt-4">
            <Button size="sm">Create your first channel</Button>
          </Link>
        </div>
      ) : (
        <div className="grid gap-4 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
          {channels.map((channel: any) => (
            <ChannelCard key={channel.id} channel={channel} />
          ))}
        </div>
      )}
    </div>
  );
}
