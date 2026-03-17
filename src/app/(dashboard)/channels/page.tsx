import { auth } from "@clerk/nextjs/server";
import { createSupabaseServerClient } from "@/lib/supabase-server";
import { ChannelCard } from "@/components/channels/ChannelCard";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { 
  Plus, Search, Menu, Home, Slash, Activity, 
  MoreHorizontal, Grid, LayoutGrid, Filter, ArrowDownWideArrow
} from "lucide-react";

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
    <div className="flex flex-col h-screen -m-4 bg-white overflow-hidden text-[#15181E] font-sans">
      {/* 1. TOP NAVBAR (Matches Theme View) */}
      <header className="h-[56px] border-b border-gray-100 flex items-center justify-between px-4 bg-white shrink-0">
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E]">
            <Menu className="w-5 h-5" />
          </Button>
          <div className="w-[1px] h-4 bg-gray-200 mx-1" />
          
          <div className="flex items-center">
            <Link href="/channels" className="h-8 w-8 flex items-center justify-center text-[#15181E] hover:bg-gray-100 rounded-md">
              <Home className="w-5 h-5" />
            </Link>
            <Slash className="w-5 h-5 text-gray-300 rotate-[15deg] mx-0.5" />
            <Button variant="ghost" className="h-8 px-3 flex items-center gap-2 text-[#15181E] font-medium bg-[#F6F7FB] rounded-md">
              <div className="p-0.5 text-[#ff5c00]">
                <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24">
                  <g stroke="currentColor">
                    <g fill="currentColor">
                      <path d="M4.5 15.5h3v3h-3zM7.5 8.5h3v3h-3zM13.5 12.5h3v3h-3zM16.5 5.5h3v3h-3z"></path>
                    </g>
                    <path strokeLinecap="square" strokeLinejoin="round" strokeWidth="2" d="m6 17 3-7 6 4 3-7"></path>
                  </g>
                </svg>
              </div>
              <span className="text-[14px]">All channels</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href="/channels/new">
            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E] hover:bg-gray-100">
              <Plus className="w-5 h-5" />
            </Button>
          </Link>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E] hover:bg-gray-100">
            <ArrowDownWideArrow className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 2. GRID CONTENT AREA */}
      <main className="flex-1 overflow-y-auto p-6 bg-white">
        <div className="max-w-[1400px] mx-auto">
          <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {/* Create New Card (Matching Visual) */}
            <Link href="/channels/new" className="group">
              <div className="w-full aspect-[4/3] rounded-xl border border-dashed border-gray-200 bg-white flex flex-col items-center justify-center gap-3 hover:border-indigo-300 hover:bg-gray-50/50 transition-all cursor-pointer">
                <div className="w-10 h-10 rounded-full bg-gray-50 flex items-center justify-center text-gray-400 group-hover:text-indigo-600 group-hover:bg-indigo-50 transition-colors">
                  <Plus className="w-6 h-6" />
                </div>
                <h3 className="text-[16px] font-semibold text-gray-900">New</h3>
              </div>
            </Link>

            {/* Actual Channel Cards */}
            {channels.map((channel: any) => (
              <ChannelCard key={channel.id} channel={channel} />
            ))}
          </div>

          {channels.length === 0 && (
            <div className="mt-12 text-center py-20 bg-gray-50 rounded-2xl border border-dashed border-gray-200">
              <div className="w-16 h-16 bg-white shadow-sm rounded-full flex items-center justify-center mx-auto mb-4">
                <Activity className="w-8 h-8 text-gray-300" />
              </div>
              <h2 className="text-lg font-bold text-gray-900">No channels found</h2>
              <p className="text-gray-500 text-sm mt-1">Start by creating a new channel to aggregate feedback.</p>
            </div>
          )}
        </div>
      </main>
    </div>
  );
}
