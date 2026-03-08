"use client";

import { useState, useEffect } from "react";
import { ChannelSource } from "@/types";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { 
  Database, Plus, MoreHorizontal, Slack as SlackIcon, 
  FileText, Loader2, PauseCircle, PlayCircle, Trash2, Check
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

interface SourcesPanelProps {
  channelId: string;
}

export function SourcesPanel({ channelId }: SourcesPanelProps) {
  const [sources, setSources] = useState<ChannelSource[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Add Slack Source Dialog State
  const [isAddSlackOpen, setIsAddSlackOpen] = useState(false);
  const [slackChannels, setSlackChannels] = useState<{ id: string; name: string }[]>([]);
  const [selectedSlackChannel, setSelectedSlackChannel] = useState("");
  const [addingSource, setCreatingSource] = useState(false);
  const [slackConnection, setSlackConnection] = useState<any>(null);

  const fetchSources = async () => {
    setLoading(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/sources`);
      const data = await res.json();
      setSources(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  const fetchSlackChannels = async () => {
    try {
      const res = await fetch('/api/slack/channels');
      const data = await res.json();
      if (data.connected) {
        setSlackConnection(data);
        setSlackChannels(data.channels);
      }
    } catch (e) {
      console.error(e);
    }
  };

  useEffect(() => {
    fetchSources();
  }, [channelId]);

  const handleToggleSource = async (sourceId: string, currentActive: boolean) => {
    try {
      await fetch(`/api/channels/${channelId}/sources/${sourceId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_active: !currentActive })
      });
      fetchSources();
    } catch (e) {
      alert("Failed to update source");
    }
  };

  const handleDeleteSource = async (sourceId: string) => {
    if (!confirm("Delete this source? ALL messages from this source will be permanently removed.")) return;
    try {
      await fetch(`/api/channels/${channelId}/sources/${sourceId}`, { method: 'DELETE' });
      fetchSources();
    } catch (e) {
      alert("Delete failed");
    }
  };

  const handleAddSlackSource = async () => {
    if (!selectedSlackChannel) return;
    setCreatingSource(true);
    try {
      const channel = slackChannels.find(c => c.id === selectedSlackChannel);
      await fetch(`/api/channels/${channelId}/sources`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          source_type: 'slack',
          slack_channel_id: selectedSlackChannel,
          slack_channel_name: channel?.name,
          slack_team_id: slackConnection.teamId
        })
      });
      setIsAddSlackOpen(false);
      setSelectedSlackChannel("");
      fetchSources();
    } catch (e) {
      alert("Failed to add source");
    } finally {
      setCreatingSource(false);
    }
  };

  return (
    <>
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Database className="w-4 h-4" />
            Sources
          </Button>
        </SheetTrigger>
        <SheetContent className="w-[400px]">
          <SheetHeader className="pb-6 border-b">
            <SheetTitle>Data Sources</SheetTitle>
            <SheetDescription>
              Connect multiple Slack channels or CSV files to this Pulse channel.
            </SheetDescription>
          </SheetHeader>

          <div className="py-6 space-y-6">
            {loading ? (
              <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-gray-300" /></div>
            ) : sources.length > 0 ? (
              <div className="space-y-4">
                {sources.map(source => (
                  <div key={source.id} className="p-4 border rounded-lg bg-white shadow-sm flex items-start justify-between gap-4">
                    <div className="flex items-start gap-3 min-w-0">
                      <div className={`p-2 rounded-md ${source.source_type === 'slack' ? 'bg-[#4A154B]/10 text-[#4A154B]' : 'bg-blue-50 text-blue-600'}`}>
                        {source.source_type === 'slack' ? <SlackIcon className="w-4 h-4" /> : <FileText className="w-4 h-4" />}
                      </div>
                      <div className="min-w-0">
                        <div className="font-semibold text-sm text-gray-900 truncate">{source.source_label}</div>
                        <div className="text-xs text-gray-500 mt-0.5 flex items-center gap-2">
                          <span>{source.data_point_count} messages</span>
                          <span>•</span>
                          <span className={source.is_active ? 'text-green-600' : 'text-gray-400'}>
                            {source.is_active ? 'Active' : 'Paused'}
                          </span>
                        </div>
                        {source.last_synced_at && (
                          <div className="text-[10px] text-gray-400 mt-1">
                            Synced {formatDistanceToNow(new Date(source.last_synced_at), { addSuffix: true })}
                          </div>
                        )}
                      </div>
                    </div>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="sm" className="h-8 w-8 p-0"><MoreHorizontal className="w-4 h-4" /></Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48">
                        <DropdownMenuItem onClick={() => handleToggleSource(source.id, source.is_active)}>
                          {source.is_active ? (
                            <><PauseCircle className="w-4 h-4 mr-2" /> Pause sync</>
                          ) : (
                            <><PlayCircle className="w-4 h-4 mr-2" /> Resume sync</>
                          )}
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem onClick={() => handleDeleteSource(source.id)} className="text-red-600">
                          <Trash2 className="w-4 h-4 mr-2" /> Delete source
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-10 bg-gray-50 rounded-lg border-2 border-dashed">
                <p className="text-sm text-gray-500">No sources connected yet.</p>
              </div>
            )}

            <div className="pt-4 space-y-3">
              <Button 
                variant="outline" 
                className="w-full justify-start gap-2 border-dashed text-[#4A154B] border-[#4A154B]/20 hover:bg-[#4A154B]/5"
                onClick={() => { fetchSlackChannels(); setIsAddSlackOpen(true); }}
              >
                <Plus className="w-4 h-4" /> Add Slack Channel
              </Button>
              <Button 
                variant="outline" 
                disabled
                className="w-full justify-start gap-2 border-dashed text-gray-400 border-gray-200"
              >
                <Plus className="w-4 h-4" /> Import CSV (Coming Soon)
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      <Dialog open={isAddSlackOpen} onOpenChange={setIsAddSlackOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Slack Source</DialogTitle>
            <DialogDescription>Select an additional channel to monitor for this Pulse channel.</DialogDescription>
          </DialogHeader>
          <div className="py-4">
            {!slackConnection ? (
              <div className="flex flex-col items-center gap-4 py-6">
                <Loader2 className="w-6 h-6 animate-spin text-gray-300" />
                <p className="text-sm text-gray-500">Connecting to Slack...</p>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-green-50 border border-green-200 rounded-md p-3 flex items-center text-green-700 text-sm">
                  <Check className="w-4 h-4 mr-2" /> Connected to <strong>{slackConnection.teamName}</strong>
                </div>
                <div className="space-y-2">
                  <Label>Select Slack Channel</Label>
                  <Select value={selectedSlackChannel} onValueChange={setSelectedSlackChannel}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pick a channel" />
                    </SelectTrigger>
                    <SelectContent>
                      {slackChannels.map(c => (
                        <SelectItem key={c.id} value={c.id}>#{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddSlackOpen(false)}>Cancel</Button>
            <Button 
              onClick={handleAddSlackSource} 
              disabled={!selectedSlackChannel || addingSource}
              className="bg-[#4A154B] hover:bg-[#361038] text-white"
            >
              {addingSource ? "Adding..." : "Add Source"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
