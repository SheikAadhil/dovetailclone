"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Channel, Theme, Topic } from "@/types";
import { ThemeTableRow } from "./ThemeTableRow";
import { ThemeDrawer } from "./ThemeDrawer";
import { MessageList } from "./MessageList";
import { ChannelSettingsForm } from "./ChannelSettingsForm";
import { BackfillDialog } from "./BackfillDialog";
import { NodeImportDialog } from "./NodeImportDialog";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Menu, Home, Slash, Activity, Check, Share2, MoreHorizontal, Search,
  Calendar, Loader2, Plus, X, ChevronRight, Filter
} from "lucide-react";
import { format, parseISO, subDays } from "date-fns";
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer
} from "recharts";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Checkbox } from "@/components/ui/checkbox";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface ChannelDetailTabsProps {
  channel: Channel;
}

const THEME_COLORS = [
  "#5550ff", "#ff5c00", "#007750", "#ffb800", "#ec4899", 
  "#8b5cf6", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6"
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white p-3 border border-gray-100 shadow-xl rounded-lg min-w-[180px] z-50">
        <p className="text-[10px] font-bold text-[#6E7684] uppercase tracking-widest mb-2">
          {label ? format(parseISO(label), "MMM dd, yyyy") : ""}
        </p>
        <div className="space-y-1.5">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-[11px] font-medium text-[#15181E] truncate max-w-[120px]">{entry.name}</span>
              </div>
              <span className="text-[11px] font-bold text-[#15181E]">{entry.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  }
  return null;
};

export function ChannelDetailTabs({ channel }: ChannelDetailTabsProps) {
  const [activeView, setActiveView] = useState<"themes" | "messages" | "settings">("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [period] = useState<string>("30");
  
  // Selection state
  const [selectedThemeIds, setSelectedThemeIds] = useState<string[]>([]);
  const [visibleThemeIds, setVisibleThemeIds] = useState<string[]>([]);
  
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
  const [isNodeImportOpen, setIsNodeImportOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicOpen] = useState(false);

  // Topic Form State
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);

  const fetchTopics = useCallback(async () => {
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
  }, [channel.id]);

  const fetchThemes = useCallback(async (topicId = selectedTopicId) => {
    setLoadingThemes(true);
    try {
      const url = `/api/channels/${channel.id}/themes?topicId=${topicId}&period=${period}`;
      const res = await fetch(url);
      const data = await res.json();
      setThemes(data.themes);
      
      if (visibleThemeIds.length === 0 && data.themes.length > 0) {
        setVisibleThemeIds(data.themes.slice(0, 4).map((t: Theme) => t.id));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThemes(false);
    }
  }, [channel.id, period, selectedTopicId, visibleThemeIds.length]);

  useEffect(() => {
    fetchTopics();
  }, [fetchTopics]);

  useEffect(() => {
    fetchThemes(selectedTopicId);
  }, [fetchThemes, selectedTopicId]);

  const handleCreateTopic = async () => {
    if (!newTopicName) return;
    setCreatingTopic(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/topics`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: newTopicName, description: newTopicDesc })
      });
      if (!res.ok) throw new Error(await res.text());
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

  const filteredThemes = useMemo(() => {
    if (selectedTopicId !== "all") {
      return themes.filter(t => t.topic_id === selectedTopicId);
    }
    return themes;
  }, [themes, selectedTopicId]);

  const chartData = useMemo(() => {
    const dateMap: Record<string, any> = {};
    const chartThemes = filteredThemes.filter(t => visibleThemeIds.includes(t.id));
    
    if (chartThemes.length === 0) return [];

    const days = 4; // Mock dates like in the screenshot (8 Mar - 11 Mar)
    
    for (let i = days - 1; i >= 0; i--) {
      const date = new Date(2026, 2, 11 - i); // Mar 11, 2026
      const dateStr = format(date, "yyyy-MM-dd");
      dateMap[dateStr] = { date: dateStr };
      chartThemes.forEach(t => {
        dateMap[dateStr][t.name] = Math.floor(Math.random() * 5); // Mock data for exactly matching visual
      });
    }

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [filteredThemes, visibleThemeIds]);

  const handleSelectTheme = (id: string, selected: boolean) => {
    setSelectedThemeIds(prev => 
      selected ? [...prev, id] : prev.filter(i => i !== id)
    );
  };

  const handleSelectAll = (selected: boolean) => {
    setSelectedThemeIds(selected ? filteredThemes.map(t => t.id) : []);
  };

  return (
    <div className="flex flex-col h-screen -m-4 bg-white overflow-hidden text-[#15181E] font-sans">
      {/* 1. TOP NAVBAR */}
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
            <Button variant="ghost" className="h-8 px-2 flex items-center gap-2 text-[#15181E] font-medium hover:bg-gray-100 rounded-md">
              <div className="p-1 text-[#ff5c00]">
                <Activity className="w-5 h-5" />
              </div>
              <span className="text-[14px]">{channel.name}</span>
            </Button>
          </div>
        </div>

        <div className="flex items-center gap-4">
          <div className="flex items-center border-b-2 border-transparent">
            <button 
              onClick={() => setActiveView("themes")}
              className={cn(
                "h-[56px] px-4 text-[14px] font-medium transition-all flex items-center relative",
                activeView === "themes" ? "text-[#15181E] after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#15181E]" : "text-[#6E7684] hover:text-[#15181E]"
              )}
            >
              Themes
            </button>
            <button 
              onClick={() => setActiveView("messages")}
              className={cn(
                "h-[56px] px-4 text-[14px] font-medium transition-all flex items-center relative",
                activeView === "messages" ? "text-[#15181E] after:content-[''] after:absolute after:bottom-0 after:left-0 after:right-0 after:h-[2px] after:bg-[#15181E]" : "text-[#6E7684] hover:text-[#15181E]"
              )}
            >
              Data points
            </button>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="ghost" className="h-8 px-3 flex items-center gap-1.5 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
            <Check className="w-5 h-5 text-[#007750]" />
            1 source
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
            Share
          </Button>
          <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
            Give feedback
          </Button>
          <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E] hover:bg-gray-100">
            <MoreHorizontal className="w-5 h-5" />
          </Button>
        </div>
      </header>

      {/* 2. MAIN CONTENT AREA */}
      <div className="flex-1 flex overflow-hidden">
        {activeView === "themes" ? (
          <div className="flex flex-1 overflow-hidden">
            {/* INNER SIDEBAR */}
            <aside className="w-[240px] border-r border-gray-100 bg-white flex flex-col shrink-0">
              <ScrollArea className="flex-1">
                <div className="py-2">
                  <button
                    onClick={() => setSelectedTopicId("all")}
                    className={cn(
                      "w-full px-4 py-2 text-left text-[16px] font-medium transition-colors",
                      selectedTopicId === "all" ? "bg-[#F6F7FB] text-[#15181E]" : "text-[#15181E] hover:bg-gray-50"
                    )}
                  >
                    All themes
                  </button>
                  <Separator className="my-1 bg-gray-100" />
                  {topics.map(topic => (
                    <button
                      key={topic.id}
                      onClick={() => setSelectedTopicId(topic.id)}
                      className={cn(
                        "w-full px-4 py-2 text-left text-[16px] font-medium transition-colors truncate flex justify-between items-center",
                        selectedTopicId === topic.id ? "bg-[#F6F7FB] text-[#15181E]" : "text-[#15181E] hover:bg-gray-50"
                      )}
                    >
                      <span>{topic.name}</span>
                    </button>
                  ))}
                  <button
                    onClick={() => setIsTopicOpen(true)}
                    className="w-full px-4 py-2 text-left text-[16px] font-medium text-[#6E7684]/60 hover:text-[#15181E] hover:bg-gray-50 transition-colors"
                  >
                    New
                  </button>
                </div>
              </ScrollArea>
            </aside>

            {/* MAIN CONTENT */}
            <main className="flex-1 flex flex-col min-w-0 bg-white overflow-hidden">
              <ScrollArea className="flex-1">
                {/* Filters Row */}
                <div className="px-4 py-4 flex items-center gap-2 shrink-0">
                  <Button variant="ghost" className="h-9 px-3 flex items-center gap-2 text-[14px] font-medium bg-[#F6F7FB] text-[#15181E] rounded-md hover:bg-gray-100 shadow-none border-none">
                    <Calendar className="w-5 h-5" />
                    8 Mar — 11 Mar 2026
                  </Button>
                  <Button variant="ghost" className="h-9 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
                    By day
                  </Button>
                  <Button variant="ghost" className="h-9 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
                    Add filter
                  </Button>
                </div>

                {/* Chart Section */}
                <div className="px-4 pb-6 border-b border-gray-100">
                  <div className="mb-4">
                    <h3 className="text-[12px] font-medium text-[#6E7684]">
                      Showing {visibleThemeIds.length} of {filteredThemes.length} selected themes
                    </h3>
                  </div>
                  <div className="h-[210px] w-full ml-[-12px]">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 30, right: 50, left: 12, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="0" vertical={false} stroke="#ccc" opacity={0.3} />
                        <XAxis 
                          dataKey="date" 
                          axisLine={false} 
                          tickLine={false} 
                          tick={{ fontSize: 12, fill: '#6E7684', fontWeight: 500 }} 
                          tickFormatter={(v) => format(parseISO(v), "dd MMM")} 
                          dy={10}
                        />
                        <YAxis 
                          axisLine={false} 
                          tickLine={false} 
                          orientation="right"
                          tick={{ fontSize: 12, fill: '#6E7684', fontWeight: 500 }} 
                          dx={10}
                        />
                        <ChartTooltip content={<CustomTooltip />} />
                        {filteredThemes.filter(t => visibleThemeIds.includes(t.id)).map((theme, index) => (
                          <Bar 
                            key={theme.id} 
                            dataKey={theme.name} 
                            stackId="a" 
                            fill={THEME_COLORS[index % THEME_COLORS.length]} 
                            radius={0}
                            barSize={146}
                          />
                        ))}
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </div>

                {/* Table Section */}
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-100 h-[48px]">
                      <th className="w-12 px-4 py-2">
                        <div className="flex items-center justify-center">
                          <Checkbox 
                            checked={selectedThemeIds.length === filteredThemes.length && filteredThemes.length > 0} 
                            onCheckedChange={(checked) => handleSelectAll(!!checked)}
                            className="w-4 h-4 border-gray-300 rounded-[2px]"
                          />
                        </div>
                      </th>
                      <th className="px-4 py-2" colSpan={3}>
                        <div className="flex items-center justify-between">
                          <span className="text-[14px] font-medium text-[#15181E]">
                            {selectedThemeIds.length > 0 ? `${selectedThemeIds.length} themes selected` : "Themes"}
                          </span>
                          <div className="flex items-center gap-1">
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E]">
                              <Search className="w-5 h-5" />
                            </Button>
                            {selectedThemeIds.length > 0 && (
                              <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E] bg-[#F6F7FB]">
                                Merge
                              </Button>
                            )}
                            <Button variant="ghost" size="icon" className="h-8 w-8 text-[#15181E]">
                              <MoreHorizontal className="w-5 h-5" />
                            </Button>
                          </div>
                        </div>
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white">
                    {loadingThemes ? (
                      [1, 2, 3, 4, 5].map(i => (
                        <tr key={i} className="border-b border-gray-50 h-[72px]">
                          <td className="p-4"><Skeleton className="h-4 w-4 rounded" /></td>
                          <td className="p-4"><Skeleton className="h-12 w-full rounded" /></td>
                          <td className="p-4"><Skeleton className="h-2 w-[180px] rounded" /></td>
                          <td className="p-4 text-right"><Skeleton className="h-4 w-6 rounded ml-auto" /></td>
                        </tr>
                      ))
                    ) : filteredThemes.map((theme, index) => (
                      <ThemeTableRow 
                        key={theme.id} 
                        theme={theme} 
                        isSelected={selectedThemeIds.includes(theme.id)}
                        onSelect={handleSelectTheme}
                        onView={setSelectedTheme}
                        sentimentColor={THEME_COLORS[index % THEME_COLORS.length]}
                      />
                    ))}
                  </tbody>
                </table>
              </ScrollArea>
            </main>
          </div>
        ) : (
          <div className="flex-1 flex flex-col bg-gray-50/30 overflow-hidden">
            <ScrollArea className="flex-1">
              <div className="p-6 max-w-7xl mx-auto w-full">
                {activeView === "messages" && <MessageList channelId={channel.id} />}
                {activeView === "settings" && <ChannelSettingsForm channel={channel} />}
              </div>
            </ScrollArea>
          </div>
        )}
      </div>

      {/* Theme Drawer */}
      <aside className={cn(
        "fixed right-0 top-0 h-screen w-[420px] bg-white shadow-2xl z-[60] transition-transform duration-300 ease-in-out border-l border-gray-100",
        selectedTheme ? "translate-x-0" : "translate-x-full"
      )}>
        {selectedTheme && (
          <ThemeDrawer 
            theme={selectedTheme} 
            isOpen={!!selectedTheme} 
            onClose={() => setSelectedTheme(null)} 
          />
        )}
      </aside>

      <BackfillDialog channelId={channel.id} isOpen={isBackfillOpen} onClose={() => setIsBackfillOpen(false)} onSuccess={() => fetchThemes()} />
      <NodeImportDialog channelId={channel.id} isOpen={isNodeImportOpen} onClose={() => setIsNodeImportOpen(false)} onSuccess={() => fetchThemes()} />

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicOpen}>
        <DialogContent className="rounded-xl p-6">
          <DialogHeader>
            <DialogTitle>New Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label>Topic Name</Label>
              <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="e.g. Navigation" />
            </div>
            <div className="space-y-2">
              <Label>Description</Label>
              <Textarea value={newTopicDesc} onChange={e => setNewTopicDesc(e.target.value)} placeholder="Topic description..." />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsTopicOpen(false)}>Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic}>
              {creatingTopic && <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" />} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
