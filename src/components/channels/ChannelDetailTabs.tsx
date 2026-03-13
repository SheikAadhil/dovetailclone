"use client";

import { useState, useEffect, useMemo, useCallback } from "react";
import { Channel, Theme, Topic, AnomalyAlert } from "@/types";
import { ThemeCard } from "./ThemeCard";
import { ThemeDrawer } from "./ThemeDrawer";
import { MessageList } from "./MessageList";
import { ChannelSettingsForm } from "./ChannelSettingsForm";
import { BackfillDialog } from "./BackfillDialog";
import { NodeImportDialog } from "./NodeImportDialog";
import { SourcesPanel } from "./SourcesPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, RefreshCcw, LayoutPanelLeft, MessageSquare, 
  Settings as SettingsIcon, History, Plus, MoreVertical, 
  FolderOpen, Merge, Clock, TrendingUp, 
  Filter, BarChart3, ChevronRight, Search, Activity, Layers, Sparkles, X, Check, Loader2, FileCode, Zap, Lightbulb
} from "lucide-react";
import { formatDistanceToNow, format, parseISO, subDays } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, Legend
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChannelDetailTabsProps {
  channel: Channel;
}

const THEME_COLORS = [
  "#6366f1", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6"
];

const CustomTooltip = ({ active, payload, label }: any) => {
  if (active && payload && payload.length) {
    return (
      <div className="bg-white/95 backdrop-blur-md p-4 border border-gray-100 shadow-2xl rounded-2xl min-w-[200px] z-50">
        <p className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">
          {label ? format(parseISO(label), "MMMM dd, yyyy") : ""}
        </p>
        <div className="space-y-2">
          {payload.map((entry: any, index: number) => (
            <div key={index} className="flex items-center justify-between gap-4">
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: entry.color }} />
                <span className="text-xs font-bold text-gray-700">{entry.name}</span>
              </div>
              <span className="text-xs font-black text-gray-900">{entry.value}</span>
            </div>
          ))}
          <div className="pt-2 mt-2 border-t border-gray-50 flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 uppercase">Daily Total</span>
            <span className="text-xs font-black text-indigo-600">
              {payload.reduce((sum: number, entry: any) => sum + entry.value, 0)}
            </span>
          </div>
        </div>
      </div>
    );
  }
  return null;
};

export function ChannelDetailTabs({ channel }: ChannelDetailTabsProps) {
  const [activeView, setActiveView] = useState<"overview" | "themes" | "messages" | "settings">("overview");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");
  const [analysisLayer, setAnalysisLayer] = useState<"product" | "deep">("product");
  
  // Chart Selection State
  const [visibleThemeIds, setVisibleThemeIds] = useState<string[]>([]);
  
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>("");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [channelAlerts, setChannelAlerts] = useState<AnomalyAlert[]>([]);
  
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
  const [isNodeImportOpen, setIsNodeImportOpen] = useState(false);
  const [isTopicDialogOpen, setIsTopicOpen] = useState(false);
  const [stats, setStats] = useState({ total_data_points: 0, last_analyzed_at: channel.last_analyzed_at });

  // Theme Management State
  const [isThemeDialogOpen, setIsThemeDialogOpen] = useState(false);
  const [editingTheme, setEditingTheme] = useState<Theme | null>(null);
  const [themeName, setThemeName] = useState("");
  const [themeDesc, setThemeDesc] = useState("");
  const [themeTopicId, setThemeTopicId] = useState<string>("none");
  const [savingTheme, setSavingTheme] = useState(false);

  // Merge Mode State
  const [mergeMode, setMergeMode] = useState(false);
  const [mergeSource, setMergeSource] = useState<Theme | null>(null);
  const [merging, setMerging] = useState(false);

  // Topic Form State
  const [newTopicName, setNewTopicName] = useState("");
  const [newTopicDesc, setNewTopicDesc] = useState("");
  const [creatingTopic, setCreatingTopic] = useState(false);

  const fetchChannelAlerts = useCallback(async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setChannelAlerts(data.filter((a: any) => a.channel_id === channel.id));
    } catch (e) {
      console.error(e);
    }
  }, [channel.id]);

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

  const fetchThemes = useCallback(async (topicId = selectedTopicId, timePeriod = period) => {
    setLoadingThemes(true);
    try {
      const url = `/api/channels/${channel.id}/themes?topicId=${topicId}&period=${timePeriod}`;
      const res = await fetch(url);
      const data = await res.json();
      setThemes(data.themes);
      
      // Initialize visible themes for chart if not set (top 8)
      if (visibleThemeIds.length === 0 && data.themes.length > 0) {
        setVisibleThemeIds(data.themes.slice(0, 8).map((t: Theme) => t.id));
      }

      setStats({
        total_data_points: data.total_data_points,
        last_analyzed_at: data.last_analyzed_at
      });
    } catch (e) {
      console.error(e);
    } finally {
      setLoadingThemes(false);
    }
  }, [channel.id, period, selectedTopicId, visibleThemeIds.length]);

  useEffect(() => {
    fetchTopics();
    fetchChannelAlerts();
  }, [fetchTopics, fetchChannelAlerts]);

  useEffect(() => {
    fetchThemes(selectedTopicId, period);
  }, [fetchThemes, selectedTopicId, period]);

  const handleAnalyze = async (forceRefresh = false) => {
    setAnalyzing(true);
    setAnalysisProgress("Connecting to analysis service...");
    setAnalysisStep(0);
    try {
      const res = await fetch(`/api/channels/${channel.id}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ forceRefresh })
      });

      if (!res.ok) {
        const errorData = await res.json();
        alert(errorData.error || 'Analysis failed');
        return;
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder();
      let buffer = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              const data = line.slice(6);
              if (data === '[DONE]') continue;
              try {
                const parsed = JSON.parse(data);
                if (parsed.progress) {
                  setAnalysisProgress(parsed.progress);
                  if (parsed.step) setAnalysisStep(parsed.step);
                }
              } catch (e) {
                // Try to show raw progress message
                setAnalysisProgress(data);
              }
            }
          }
        }
      }

      await fetchTopics();
      await fetchThemes();
      await fetchChannelAlerts();
    } catch (e) {
      alert('Analysis failed');
    } finally {
      setAnalyzing(false);
      setAnalysisProgress("");
      setAnalysisStep(0);
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

  const handleOpenThemeDialog = (theme?: Theme) => {
    if (theme) {
      setEditingTheme(theme);
      setThemeName(theme.name);
      setThemeDesc(theme.description || "");
      setThemeTopicId(theme.topic_id || "none");
    } else {
      setEditingTheme(null);
      setThemeName("");
      setThemeDesc("");
      setThemeTopicId(selectedTopicId !== "all" ? selectedTopicId : "none");
    }
    setIsThemeDialogOpen(true);
  };

  const handleSaveTheme = async () => {
    if (!themeName) return;
    setSavingTheme(true);
    try {
      const url = editingTheme 
        ? `/api/channels/${channel.id}/themes/${editingTheme.id}`
        : `/api/channels/${channel.id}/themes`;
      
      const res = await fetch(url, {
        method: editingTheme ? 'PATCH' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: themeName, description: themeDesc, topic_id: themeTopicId })
      });

      if (!res.ok) throw new Error("Failed to save theme");
      
      await fetchThemes();
      await fetchTopics();
      setIsThemeDialogOpen(false);
    } catch (e) {
      alert("Error saving theme");
    } finally {
      setSavingTheme(false);
    }
  };

  const handleDeleteTheme = async (themeId: string) => {
    if (!confirm("Delete this theme? Data points will be unassigned.")) return;
    try {
      await fetch(`/api/channels/${channel.id}/themes/${themeId}`, { method: 'DELETE' });
      fetchThemes();
      fetchTopics();
    } catch (e) {
      alert("Delete failed");
    }
  };

  const handlePinTheme = async (theme: Theme) => {
    try {
      await fetch(`/api/channels/${channel.id}/themes/${theme.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ is_pinned: !theme.is_pinned })
      });
      fetchThemes();
    } catch (e) {
      console.error(e);
    }
  };

  const startMerge = (source: Theme) => {
    setMergeSource(source);
    setMergeMode(true);
  };

  const handleMergeComplete = async (target: Theme) => {
    if (!mergeSource) return;
    if (!confirm(`Merge "${mergeSource.name}" into "${target.name}"? This will delete "${mergeSource.name}".`)) return;
    
    setMerging(true);
    try {
      const res = await fetch(`/api/channels/${channel.id}/themes/merge`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ source_theme_ids: [mergeSource.id], target_theme_id: target.id })
      });
      if (!res.ok) throw new Error("Merge failed");
      
      setMergeMode(false);
      setMergeSource(null);
      fetchThemes();
      fetchTopics();
    } catch (e) {
      alert("Merge failed");
    } finally {
      setMerging(false);
    }
  };

  const cancelMerge = () => {
    setMergeMode(false);
    setMergeSource(null);
  };

  const handleViewTheme = (theme: Theme) => {
    setSelectedTheme(theme);
  };

  const filteredThemes = useMemo(() => {
    if (selectedTopicId !== "all") {
      return themes.filter(t => t.topic_id === selectedTopicId);
    }
    
    // System filtering logic
    const productTopic = topics.find(t => t.name.includes("Product Insights"));
    const deepTopic = topics.find(t => t.name.includes("Deep Analysis"));
    
    if (analysisLayer === "product") {
      return themes.filter(t => t.topic_id === productTopic?.id || !t.topic_id);
    } else {
      return themes.filter(t => t.topic_id === deepTopic?.id);
    }
  }, [themes, selectedTopicId, analysisLayer, topics]);

  // Filtered chart themes based on user selection
  const chartThemes = useMemo(() => {
    return filteredThemes.filter(t => visibleThemeIds.includes(t.id));
  }, [filteredThemes, visibleThemeIds]);

  // Transform theme trend data for stacked chart - WITH PADDING
  const chartData = useMemo(() => {
    const dateMap: Record<string, any> = {};
    
    if (chartThemes.length === 0) return [];

    // 1. Generate all dates in the period to ensure X-axis scale is consistent
    const days = period === 'all' ? 365 : parseInt(period);
    
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
      dateMap[dateStr] = { date: dateStr };
      
      // Initialize each theme with 0 for this date
      chartThemes.forEach(t => {
        dateMap[dateStr][t.name] = 0;
      });
    }

    // 2. Overlay actual theme snapshots
    chartThemes.forEach(theme => {
      if (!theme.trend_data) return;
      theme.trend_data.forEach(snapshot => {
        if (dateMap[snapshot.date]) {
          dateMap[snapshot.date][theme.name] = snapshot.count;
        }
      });
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  }, [chartThemes, period]);

  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  const toggleThemeVisibility = (id: string) => {
    setVisibleThemeIds(prev => 
      prev.includes(id) ? prev.filter(i => i !== id) : [...prev, id]
    );
  };

  return (
    <div className="flex h-[calc(100vh-64px)] -m-4 overflow-hidden bg-white">
      {/* 1. CHANNEL SIDEBAR */}
      <aside className="w-60 border-r border-gray-100 flex flex-col bg-gray-50/30 overflow-hidden shrink-0">
        <div className="p-4 pb-3 shrink-0">
          <div className="flex items-center gap-3 mb-4">
            <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Activity className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-bold text-gray-900 truncate">{channel.name}</h1>
              <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">#{channel.slack_channel_name}</p>
            </div>
          </div>

          <nav className="space-y-0.5">
            <button 
              onClick={() => setActiveView("overview")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "overview" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Sparkles className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => setActiveView("themes")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "themes" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Layers className="w-4 h-4" /> Themes
            </button>
            <button 
              onClick={() => setActiveView("messages")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "messages" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <MessageSquare className="w-4 h-4" /> Signal
            </button>
            <button 
              onClick={() => setActiveView("settings")}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "settings" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <SettingsIcon className="w-4 h-4" /> Config
            </button>
          </nav>
        </div>

        <Separator className="bg-gray-100 mx-4 w-auto shrink-0" />

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 pt-3 pb-8">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-[10px] font-bold text-gray-400 uppercase tracking-wider">Topics</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-indigo-50" onClick={() => setIsTopicOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <div className="space-y-0.5">
              <button
                onClick={() => setSelectedTopicId("all")}
                className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTopicId === "all" ? 'text-indigo-600 bg-indigo-50/50 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <div className="flex items-center gap-2">
                  <LayoutPanelLeft className="w-3.5 h-3.5 opacity-50" />
                  <span>All</span>
                </div>
                <span className="text-[10px] opacity-50">{themes.length}</span>
              </button>
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full flex items-center justify-between px-3 py-1.5 rounded-lg text-xs font-medium transition-all ${selectedTopicId === topic.id ? 'text-indigo-600 bg-indigo-50/50 shadow-sm' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <div className="flex items-center gap-2 truncate">
                    <FolderOpen className="w-3.5 h-3.5 opacity-50 flex-shrink-0" />
                    <span className="truncate">{topic.name}</span>
                  </div>
                  <span className="text-[10px] opacity-50">{topic.theme_count}</span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-4 pt-0 mt-auto shrink-0">
          <div className="bg-indigo-600 rounded-xl p-3 text-white shadow-lg group overflow-hidden relative">
            <div className="absolute top-0 right-0 w-10 h-10 bg-white/10 rounded-full -mr-5 -mt-5 blur-xl group-hover:scale-150 transition-transform duration-700" />
            <Brain className="w-4 h-4 mb-1 opacity-80" />
            <h4 className="text-[10px] font-bold uppercase tracking-wider mb-0.5">Pulse AI</h4>
            <p className="text-[9px] font-medium opacity-70 leading-tight">Signal detection active</p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white relative overflow-hidden">
        {/* Header */}
        <header className="h-12 border-b border-gray-100 flex items-center justify-between px-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-3">
            <h2 className="text-sm font-semibold text-gray-900 uppercase tracking-wider">
              {activeView === "overview" && "Dashboard"}
              {activeView === "themes" && "Themes"}
              {activeView === "messages" && "Signal"}
              {activeView === "settings" && "Settings"}
            </h2>
            {stats.last_analyzed_at && (
              <Badge variant="outline" className="text-[10px] font-medium border-gray-100 text-gray-400 rounded-full bg-gray-50/50">
                {formatDistanceToNow(new Date(stats.last_analyzed_at), { addSuffix: true })}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1 bg-gray-100/50 p-0.5 rounded-full mr-1">
              {[
                { l: '7D', v: '7' },
                { l: '30D', v: '30' },
                { l: '90D', v: '90' }
              ].map(opt => (
                <button
                  key={opt.v}
                  onClick={() => setPeriod(opt.v)}
                  className={`px-2 py-1 text-[10px] font-semibold rounded-full transition-all ${period === opt.v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {opt.l}
                </button>
              ))}
            </div>
            <SourcesPanel channelId={channel.id} />
            <Button variant="outline" size="sm" onClick={() => setIsNodeImportOpen(true)} className="rounded-lg border-gray-200 text-[10px] font-medium uppercase tracking-wider h-8 px-3 gap-1.5 bg-white hover:bg-gray-50 transition-all shadow-sm">
              <FileCode className="w-3.5 h-3.5 text-indigo-600" />
              Import
            </Button>
            <Button variant="outline" size="sm" onClick={() => setIsBackfillOpen(true)} className="rounded-lg border-gray-200 text-[10px] font-medium uppercase tracking-wider h-8 px-3 gap-1.5 bg-white hover:bg-gray-50 transition-all shadow-sm">
              <History className="w-3.5 h-3.5 text-indigo-600" />
              Sync
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="default" size="sm" className="rounded-lg bg-indigo-600 hover:bg-indigo-700 shadow-md h-8 px-4 text-xs font-medium min-w-[120px]">
                  {analyzing ? <RefreshCcw className="w-3.5 h-3.5 animate-spin mr-1.5" /> : <Sparkles className="w-3.5 h-3.5 mr-1.5" />}
                  {analyzing ? "Analyzing..." : "Analyze"}
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="rounded-xl border-gray-100 shadow-xl p-1.5 w-64">
                {!analyzing ? (
                  <>
                    <DropdownMenuItem onClick={() => handleAnalyze(false)} className="rounded-lg font-medium text-xs py-2">
                      <Zap className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Analyze New Signals
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => handleAnalyze(true)} className="rounded-lg font-medium text-xs py-2">
                      <RefreshCcw className="w-3.5 h-3.5 mr-2 text-indigo-600" /> Force Re-analysis All
                    </DropdownMenuItem>
                  </>
                ) : (
                  <div className="px-3 py-2 space-y-2">
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analysisStep >= 1 ? 'bg-green-500' : (analysisStep === 0 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300')}`} />
                      <span className="text-xs text-gray-600">Layer 1: Primary Analysis</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className={`w-2 h-2 rounded-full ${analysisStep >= 2 ? 'bg-green-500' : (analysisStep === 1 ? 'bg-yellow-500 animate-pulse' : 'bg-gray-300')}`} />
                      <span className="text-xs text-gray-600">Layer 2: Deep Review</span>
                    </div>
                    {analysisProgress ? (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <p className="text-xs text-indigo-600 font-medium">{analysisProgress}</p>
                      </div>
                    ) : (
                      <div className="mt-2 pt-2 border-t border-gray-100">
                        <div className="flex items-center gap-2">
                          <RefreshCcw className="w-3 h-3 text-indigo-600 animate-spin" />
                          <p className="text-xs text-indigo-600">Initializing analysis...</p>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 max-w-7xl mx-auto w-full pb-16">
            {activeView === "overview" && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Signal</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">{stats.total_data_points}</div>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">Messages this period</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm group hover:border-emerald-100 transition-colors">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600 group-hover:scale-110 transition-transform">
                        <Layers className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Themes</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">{themes.length}</div>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">Semantic clusters</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm group hover:border-amber-100 transition-colors">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Velocity</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">+{Math.round(Math.random()*20)}%</div>
                    <p className="text-[10px] font-medium text-gray-400 mt-0.5">Week growth</p>
                  </div>
                </div>

                {/* Main Dashboard Chart */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm relative group/chart">
                  <div className="flex flex-col md:flex-row md:items-center justify-between mb-4 gap-3">
                    <div>
                      <h3 className="text-base font-semibold text-gray-900 tracking-tight flex items-center gap-2">
                        Theme Dynamics
                        <Badge className="bg-indigo-50 text-indigo-600 border-none font-medium text-[9px] uppercase px-1.5 py-0">Stacked</Badge>
                      </h3>
                      <p className="text-xs font-medium text-gray-400 mt-0.5">Volume distribution over time</p>
                    </div>
                    
                    <div className="flex items-center gap-2">
                      <Popover>
                        <PopoverTrigger asChild>
                          <Button variant="outline" size="sm" className="rounded-lg border-gray-100 text-[10px] font-medium uppercase tracking-wider h-8 px-3 gap-1.5 bg-gray-50 hover:bg-white transition-all">
                            <Filter className="w-3.5 h-3.5" />
                            Filter ({visibleThemeIds.length})
                          </Button>
                        </PopoverTrigger>
                        <PopoverContent className="w-64 p-0 rounded-xl border-gray-100 shadow-xl overflow-hidden" align="end">
                          <div className="p-3 bg-gray-50/50 border-b border-gray-100 flex items-center justify-between">
                            <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Select Themes</span>
                            <button 
                              onClick={() => setVisibleThemeIds(visibleThemeIds.length === themes.length ? [] : themes.map(t => t.id))}
                              className="text-[10px] font-medium text-indigo-600 hover:underline"
                            >
                              {visibleThemeIds.length === themes.length ? "Clear" : "All"}
                            </button>
                          </div>
                          <ScrollArea className="h-56">
                            <div className="p-1.5 space-y-0.5">
                              {themes.map((theme, idx) => (
                                <div 
                                  key={theme.id}
                                  onClick={() => toggleThemeVisibility(theme.id)}
                                  className="flex items-center gap-2.5 px-2.5 py-2 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors group/item"
                                >
                                  <div className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition-all ${visibleThemeIds.includes(theme.id) ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'border-gray-200'}`}>
                                    {visibleThemeIds.includes(theme.id) && <Check className="w-2.5 h-2.5 text-white stroke-[3]" />}
                                  </div>
                                  <div className="w-2 h-2 rounded-full shrink-0" style={{ backgroundColor: THEME_COLORS[idx % THEME_COLORS.length] }} />
                                  <span className="text-xs font-medium text-gray-700 truncate flex-1 group-hover/item:text-indigo-600">{theme.name}</span>
                                </div>
                              ))}
                            </div>
                          </ScrollArea>
                        </PopoverContent>
                      </Popover>
                    </div>
                  </div>

                  <div className="h-[280px] w-full">
                    {chartData.length >= 2 && chartThemes.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 600 }}
                            dy={8}
                            tickFormatter={(v) => format(parseISO(v), "MMM dd")}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 600 }}
                          />
                          <ChartTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={36} 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '9px', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '20px' }}
                          />
                          {chartThemes.map((theme, index) => (
                            <Bar 
                              key={theme.id} 
                              dataKey={theme.name} 
                              stackId="a" 
                              fill={THEME_COLORS[themes.findIndex(t => t.id === theme.id) % THEME_COLORS.length]} 
                              radius={index === chartThemes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                              barSize={32}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200 p-8 text-center">
                        <BarChart3 className="w-10 h-10 text-gray-200 mb-3" />
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awaiting Data</h4>
                        <p className="text-[10px] font-medium text-gray-300 mt-1 max-w-xs">
                          {chartThemes.length === 0 
                            ? "Select themes to visualize trends"
                            : "Daily message records required"}
                        </p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Themes Row */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Trending</h3>
                    <button onClick={() => setActiveView("themes")} className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider flex items-center gap-1 hover:gap-1.5 transition-all">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {themes.slice(0, 3).map(theme => (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        onView={handleViewTheme}
                        onEdit={handleOpenThemeDialog}
                        onDelete={handleDeleteTheme}
                        onPin={handlePinTheme}
                        onMergeStart={startMerge}
                        onMergeSelect={handleMergeComplete}
                      />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === "themes" && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div>
                    <h2 className="text-lg font-semibold text-gray-900">
                      {selectedTopicId === "all" ? "Theme Library" : selectedTopic?.name}
                    </h2>
                    <p className="text-xs font-medium text-gray-400 mt-0.5">
                      {selectedTopicId === "all" ? "Explore insights across research depth" : selectedTopic?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="relative">
                      <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input placeholder="Search..." className="pl-8 h-8 w-48 rounded-lg border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-xs shadow-none focus:ring-1 focus:ring-indigo-100" />
                    </div>
                    <Button onClick={() => handleOpenThemeDialog()} className="rounded-lg h-8 px-4 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm font-medium text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Theme
                    </Button>
                  </div>
                </div>

                {selectedTopicId === "all" && (
                  <Tabs value={analysisLayer} onValueChange={(v: any) => setAnalysisLayer(v)} className="w-full">
                    <TabsList className="grid w-full max-w-xs grid-cols-2 p-1 bg-gray-100 rounded-lg h-9">
                      <TabsTrigger value="product" className="rounded-md font-medium text-[11px] uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 data-[state=active]:shadow-sm">
                        <Zap className="w-3 h-3" />
                        Product
                      </TabsTrigger>
                      <TabsTrigger value="deep" className="rounded-md font-medium text-[11px] uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-600 data-[state=active]:shadow-sm">
                        <Lightbulb className="w-3 h-3" />
                        Deep
                      </TabsTrigger>
                    </TabsList>
                  </Tabs>
                )}

                {loadingThemes ? (
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-44 w-full rounded-xl" />)}
                  </div>
                ) : filteredThemes.length > 0 ? (
                  <div className="grid gap-3 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 pb-8">
                    {filteredThemes.map((theme) => (
                      <ThemeCard
                        key={theme.id}
                        theme={theme}
                        onView={handleViewTheme}
                        onEdit={handleOpenThemeDialog}
                        onDelete={handleDeleteTheme}
                        onPin={handlePinTheme}
                        onMergeStart={startMerge}
                        onMergeSelect={handleMergeComplete}
                        mergeMode={mergeMode}
                        isMergeSource={mergeSource?.id === theme.id}
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <div className="w-12 h-12 bg-white rounded-xl shadow-sm flex items-center justify-center mb-3">
                      <Brain className="w-6 h-6 text-gray-100" />
                    </div>
                    <h3 className="text-sm font-medium text-gray-900">Library Empty</h3>
                    <p className="text-xs font-medium text-gray-400 mt-1">Run analysis to populate themes</p>
                  </div>
                )}
              </div>
            )}

            {activeView === "messages" && (
              <div className="bg-white border border-gray-100 rounded-xl p-3 shadow-sm min-h-[400px] animate-in fade-in duration-500 overflow-hidden">
                <MessageList channelId={channel.id} />
              </div>
            )}

            {activeView === "settings" && (
              <div className="max-w-4xl mx-auto py-2 animate-in fade-in duration-500">
                <ChannelSettingsForm channel={channel} />
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* 3. INSPECTOR PANEL (Right Sidebar) */}
      <aside className={`w-[380px] border-l border-gray-100 bg-white transition-all duration-300 ease-in-out flex flex-col z-30 shrink-0 relative overflow-hidden ${selectedTheme ? 'mr-0 shadow-xl' : '-mr-[380px]'}`}>
        {selectedTheme && (
          <ThemeDrawer theme={selectedTheme} isOpen={!!selectedTheme} onClose={() => setSelectedTheme(null)} />
        )}
      </aside>

      {/* FLOATING MERGE OVERLAY */}
      {mergeMode && (
        <div className="fixed bottom-6 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md shadow-xl rounded-2xl px-5 py-3 flex items-center gap-5 z-50 animate-in fade-in slide-in-from-bottom-6">
          <div className="flex items-center gap-2 border-r pr-5 border-white/10">
            <div className="p-1.5 bg-indigo-500 rounded-lg shadow-lg shadow-indigo-500/20">
              <Merge className="w-4 h-4 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[9px] font-semibold text-indigo-400 uppercase tracking-wider">Merge Source</span>
              <span className="text-xs font-medium text-white italic truncate max-w-[100px]">{mergeSource?.name}</span>
            </div>
          </div>
          <div className="text-[9px] font-medium text-white/50 max-w-[140px] leading-tight uppercase tracking-wider">
            Select target theme
          </div>
          <Button size="sm" variant="ghost" className="rounded-lg h-8 px-4 text-white hover:bg-white/10 font-medium text-xs" onClick={cancelMerge} disabled={merging}>
            Abort
          </Button>
        </div>
      )}

      {/* MODALS */}
      <BackfillDialog
        channelId={channel.id}
        isOpen={isBackfillOpen}
        onClose={() => setIsBackfillOpen(false)}
        onSuccess={() => { fetchThemes(); fetchTopics(); }}
      />

      <NodeImportDialog
        channelId={channel.id}
        isOpen={isNodeImportOpen}
        onClose={() => setIsNodeImportOpen(false)}
        onSuccess={() => { fetchThemes(); fetchTopics(); }}
      />

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicOpen}>
        <DialogContent className="rounded-xl p-6 border-none shadow-xl max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold tracking-tight">New Topic</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-sm mt-1">Create a topic to organize themes</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Topic Name</Label>
              <Input 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value.substring(0, 30))} 
                placeholder="e.g. Navigation"
                className="rounded-lg h-10 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-sm px-4 shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Description</Label>
              <Textarea 
                value={newTopicDesc} 
                onChange={e => setNewTopicDesc(e.target.value.substring(0, 200))} 
                placeholder="Topic description..."
                className="rounded-lg min-h-[80px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed px-4 py-2.5 resize-none"
              />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsTopicOpen(false)} className="rounded-lg h-9 px-4 font-medium text-xs">Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic} className="rounded-lg h-9 px-5 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white shadow-md">
              {creatingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
        <DialogContent className="rounded-xl p-6 border-none shadow-xl max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold tracking-tight">{editingTheme ? "Edit Theme" : "New Theme"}</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium text-sm mt-1">
              {editingTheme ? "Update theme details" : "Create a manual theme"}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Theme Name</Label>
              <Input 
                value={themeName} 
                onChange={e => setThemeName(e.target.value.substring(0, 60))} 
                placeholder="e.g. Latency issues"
                className="rounded-lg h-10 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-sm px-4 shadow-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Description</Label>
              <Textarea 
                value={themeDesc} 
                onChange={e => setThemeDesc(e.target.value.substring(0, 200))} 
                placeholder="Describe this theme..."
                className="rounded-lg min-h-[80px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed px-4 py-2.5 resize-none"
              />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Topic</Label>
              <Select value={themeTopicId} onValueChange={setThemeTopicId}>
                <SelectTrigger className="rounded-lg h-10 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium px-4 shadow-none">
                  <SelectValue placeholder="Assign to topic" />
                </SelectTrigger>
                <SelectContent className="rounded-lg border-gray-100 shadow-xl p-1.5">
                  <SelectItem value="none" className="rounded-md p-2 font-medium text-xs">Uncategorized</SelectItem>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id} className="rounded-md p-2 font-medium text-xs">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsThemeDialogOpen(false)} className="rounded-lg h-9 px-4 font-medium text-xs border-gray-200">Cancel</Button>
            <Button onClick={handleSaveTheme} disabled={!themeName || savingTheme} className="rounded-lg h-9 px-5 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white shadow-md">
              {savingTheme ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null}
              {editingTheme ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
