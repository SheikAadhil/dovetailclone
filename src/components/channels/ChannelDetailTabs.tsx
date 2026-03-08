"use client";

import { useState, useEffect } from "react";
import { Channel, Theme, Topic } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeCard } from "./ThemeCard";
import { ThemeDrawer } from "./ThemeDrawer";
import { MessageList } from "./MessageList";
import { ChannelSettingsForm } from "./ChannelSettingsForm";
import { BackfillDialog } from "./BackfillDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, RefreshCcw, LayoutPanelLeft, MessageSquare, 
  Settings as SettingsIcon, AlertCircle, History, Plus, MoreVertical, 
  FolderOpen, Pencil, Trash2
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface ChannelDetailTabsProps {
  channel: Channel;
}

export function ChannelDetailTabs({ channel }: ChannelDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicOpen] = useState(false);
  const [stats, setStats] = useState({ total_data_points: 0, last_analyzed_at: channel.last_analyzed_at });

  // Topic Form State
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);

  const fetchTopics = async () => {
    setLoadingTopics(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/topics`);
      const data = await res.json();
      setTopics(data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingTopics(false);
    }
  };

  const fetchThemes = async (topicId = selectedTopicId) => {
    setLoadingThemes(true);
    try {
      const url = `/api/channels/${channel.id}/themes?topicId=${topicId}`;
      const res = await fetch(url);
      const data = await res.json();
      setThemes(data.themes);
      setStats({
        total_data_points: data.total_data_points,
        last_analyzed_at: data.last_analyzed_at
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThemes(false);
    }
  };

  useEffect(() => {
    fetchTopics();
    fetchThemes();
  }, [channel.id]);

  useEffect(() => {
    fetchThemes(selectedTopicId);
  }, [selectedTopicId]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        await fetchTopics();
        await fetchThemes();
      }
    } catch (e) {
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    setCreatingTopic(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName, description: newTopicDesc })
      });
      if (!res.ok) {
        const err = await res.text();
        throw new Error(err);
      }
      await fetchTopics();
      setIsTopicOpen(false);
      setNewTopicName("");
      setNewTopicDesc("");
    } catch (e: any) {
      alert(e.message);
    } finally {
      setCreatingTopic(false);
    }
  };

  const handleDeleteTopic = async (topicId: string) => {
    if (!confirm("Are you sure? Themes in this topic will be unassigned.")) return;
    try {
      await fetch(`/api/channels/${channel.id}/topics/${topicId}`, { method: 'DELETE' });
      await fetchTopics();
      if (selectedTopicId === topicId) setSelectedTopicId("all");
    } catch (e) {
      alert("Delete failed");
    }
  };

  const handleViewTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setIsDrawerOpen(true);
  };

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">{channel.name}</h1>
          <p className="text-gray-500 text-sm mt-1">
            Monitoring <span className="font-medium text-indigo-600">#{channel.slack_channel_name}</span> • {channel.description || "No description provided."}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {stats.last_analyzed_at && (
            <span className="text-xs text-gray-400">
              Last analyzed {formatDistanceToNow(new Date(stats.last_analyzed_at), { addSuffix: true })}
            </span>
          )}
          <Button variant="outline" size="sm" onClick={() => setIsBackfillOpen(true)} className="gap-2">
            <History className="w-4 h-4" />
            Sync History
          </Button>
          <Button variant="default" size="sm" onClick={handleAnalyze} disabled={analyzing || stats.total_data_points < 5} className="gap-2">
            {analyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {analyzing ? "AI is analyzing..." : "Analyze Now"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 max-w-md">
          <TabsTrigger value="themes" className="gap-2">
            <LayoutPanelLeft className="w-4 h-4" />
            Themes
          </TabsTrigger>
          <TabsTrigger value="messages" className="gap-2">
            <MessageSquare className="w-4 h-4" />
            Messages
          </TabsTrigger>
          <TabsTrigger value="settings" className="gap-2">
            <SettingsIcon className="w-4 h-4" />
            Settings
          </TabsTrigger>
        </TabsList>

        <TabsContent value="themes" className="mt-6">
          <div className="flex gap-8 min-h-[600px]">
            {/* LEFT PANEL: TOPICS */}
            <div className="w-60 flex-shrink-0 flex flex-col gap-4">
              <div className="flex items-center justify-between px-2">
                <div className="flex items-center gap-2 font-semibold text-sm text-gray-900">
                  Topics
                  <span className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{topics.length}</span>
                </div>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  className="h-7 w-7 p-0" 
                  onClick={() => setIsTopicOpen(true)}
                  disabled={topics.length >= 10}
                >
                  <Plus className="w-4 h-4" />
                </Button>
              </div>

              <div className="space-y-1">
                <button
                  onClick={() => setSelectedTopicId("all")}
                  className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                    selectedTopicId === "all" 
                      ? 'bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600 rounded-l-none' 
                      : 'text-gray-600 hover:bg-gray-50'
                  }`}
                >
                  All Topics
                </button>
                
                {loadingTopics ? (
                  [1, 2, 3].map(i => <Skeleton key={i} className="h-9 w-full rounded-md" />)
                ) : (
                  topics.map(topic => (
                    <div key={topic.id} className="group relative">
                      <button
                        onClick={() => setSelectedTopicId(topic.id)}
                        className={`w-full text-left px-3 py-2 rounded-md text-sm transition-colors flex items-center justify-between ${
                          selectedTopicId === topic.id 
                            ? 'bg-indigo-50 text-indigo-700 font-medium border-l-2 border-indigo-600 rounded-l-none' 
                            : 'text-gray-600 hover:bg-gray-50'
                        }`}
                      >
                        <span className="truncate pr-4">{topic.name}</span>
                        <span className="bg-gray-100 group-hover:bg-white text-gray-500 px-1.5 py-0.5 rounded text-[10px]">
                          {topic.theme_count}
                        </span>
                      </button>
                      <div className="absolute right-8 top-1.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" className="h-6 w-6 p-0"><MoreVertical className="w-3.5 h-3.5" /></Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleDeleteTopic(topic.id)} className="text-red-600">
                              <Trash2 className="w-4 h-4 mr-2" /> Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>
                    </div>
                  ))
                )}
              </div>
              
              <div className="mt-auto p-3 bg-gray-50 rounded-lg border border-gray-100">
                <p className="text-[10px] text-gray-400 leading-tight">
                  <Brain className="w-3 h-3 inline mr-1 mb-0.5" />
                  AI generates topics during analysis if none exist.
                </p>
              </div>
            </div>

            {/* RIGHT PANEL: THEMES */}
            <div className="flex-1 space-y-6">
              {selectedTopicId !== "all" && selectedTopic && (
                <div className="bg-gray-50 border rounded-lg p-4">
                  <div className="flex items-center gap-2 text-gray-900 font-semibold mb-1">
                    <FolderOpen className="w-4 h-4 text-indigo-600" />
                    {selectedTopic.name}
                  </div>
                  <p className="text-xs text-gray-500">{selectedTopic.description || "No description provided."}</p>
                </div>
              )}

              {loadingThemes ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2">
                  {[1, 2, 3, 4].map(i => <Skeleton key={i} className="h-40 w-full rounded-lg" />)}
                </div>
              ) : themes.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
                  {themes.map((theme) => (
                    <ThemeCard key={theme.id} theme={theme} onView={handleViewTheme} />
                  ))}
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50 text-center p-6">
                  <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900">No themes here</h3>
                  <p className="text-gray-500 mt-2 max-w-sm">
                    {selectedTopicId === "all" 
                      ? "Re-analyze to discover recurring themes in your messages."
                      : "No themes categorized under this topic yet."}
                  </p>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-6">
          <MessageList channelId={channel.id} />
        </TabsContent>

        <TabsContent value="settings" className="mt-6">
          <ChannelSettingsForm channel={channel} />
        </TabsContent>
      </Tabs>

      <ThemeDrawer 
        theme={selectedTheme} 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)} 
      />

      <BackfillDialog
        channelId={channel.id}
        isOpen={isBackfillOpen}
        onClose={() => setIsBackfillOpen(false)}
        onSuccess={() => { fetchThemes(); fetchTopics(); }}
      />

      {/* New Topic Dialog */}
      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Create New Topic</DialogTitle>
            <DialogDescription>Group themes into categories like 'Bugs' or 'Feature Requests'.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Name</Label>
              <Input 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value.substring(0, 30))} 
                placeholder="e.g. User Friction"
              />
              <p className="text-[10px] text-gray-400 text-right">{newTopicName.length}/30</p>
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea 
                value={newTopicDesc} 
                onChange={e => setNewTopicDesc(e.target.value.substring(0, 200))} 
                placeholder="Feedback about confusion or struggle..."
              />
              <p className="text-[10px] text-gray-400 text-right">{newTopicDesc.length}/200</p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopicOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic}>
              {creatingTopic ? "Creating..." : "Create Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
