import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ChannelDetailTabs } from "@/components/channels/ChannelDetailTabs";
import { notFound } from "next/navigation";

export default async function ChannelDetailPage({
  params
}: {
  params: { id: string }
}) {
  const { userId } = await auth();
  if (!userId) return <div>Please sign in.</div>;

  const supabase = await createSupabaseServerClient();

  // Fetch channel
  const { data: channel, error } = await supabase
    .from('channels')
    .select('*')
    .eq('id', params.id)
    .single();

  if (error || !channel) {
    notFound();
  }

  return <ChannelDetailTabs channel={channel} />;
}
