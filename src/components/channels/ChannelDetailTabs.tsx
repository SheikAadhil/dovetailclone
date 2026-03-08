"use client";

import { useState, useEffect } from "react";
import { Channel, Theme } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ThemeCard } from "./ThemeCard";
import { ThemeDrawer } from "./ThemeDrawer";
import { MessageList } from "./MessageList";
import { ChannelSettingsForm } from "./ChannelSettingsForm";
import { BackfillDialog } from "./BackfillDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Brain, RefreshCcw, LayoutPanelLeft, MessageSquare, Settings as SettingsIcon, AlertCircle, History } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChannelDetailTabsProps {
  channel: Channel;
}

export function ChannelDetailTabs({ channel }: ChannelDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
  const [stats, setStats] = useState({ total_data_points: 0, last_analyzed_at: channel.last_analyzed_at });

  const fetchThemes = async () => {
    setLoadingThemes(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/themes`);
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
    fetchThemes();
  }, [channel.id]);

  const handleAnalyze = async () => {
    setAnalyzing(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/analyze`, { method: 'POST' });
      const data = await res.json();
      if (data.error) {
        alert(data.error);
      } else {
        await fetchThemes();
      }
    } catch (e) {
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
    }
  };

  const handleViewTheme = (theme: Theme) => {
    setSelectedTheme(theme);
    setIsDrawerOpen(true);
  };

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
          <Button 
            variant="outline" 
            size="sm" 
            onClick={() => setIsBackfillOpen(true)}
            className="gap-2"
          >
            <History className="w-4 h-4" />
            Sync History
          </Button>
          <Button 
            variant="default" 
            size="sm" 
            onClick={handleAnalyze} 
            disabled={analyzing || stats.total_data_points < 5}
            className="gap-2"
          >
            {analyzing ? (
              <RefreshCcw className="w-4 h-4 animate-spin" />
            ) : (
              <Brain className="w-4 h-4" />
            )}
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
          {analyzing ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {[1, 2, 3].map(i => (
                <div key={i} className="space-y-4 p-4 border rounded-lg">
                  <Skeleton className="h-6 w-3/4" />
                  <Skeleton className="h-20 w-full" />
                  <div className="flex gap-2">
                    <Skeleton className="h-4 w-16" />
                    <Skeleton className="h-4 w-24" />
                  </div>
                </div>
              ))}
            </div>
          ) : loadingThemes ? (
            <div className="text-center py-20 text-gray-500">Loading themes...</div>
          ) : themes.length > 0 ? (
            <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3">
              {themes.map((theme) => (
                <ThemeCard key={theme.id} theme={theme} onView={handleViewTheme} />
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-64 border-2 border-dashed rounded-lg bg-gray-50 text-center p-6">
              <AlertCircle className="w-10 h-10 text-gray-300 mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No themes discovered yet</h3>
              <p className="text-gray-500 mt-2 max-w-sm">
                {stats.total_data_points < 5 
                  ? `You have ${stats.total_data_points} messages. You need at least 5 to run analysis.` 
                  : "Click 'Analyze Now' to let AI discover recurring themes in your messages."}
              </p>
              {stats.total_data_points >= 5 && (
                <Button onClick={handleAnalyze} className="mt-6 gap-2">
                  <Brain className="w-4 h-4" /> Discover Themes
                </Button>
              )}
            </div>
          )}
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
        onSuccess={fetchThemes}
      />
    </div>
  );
}
