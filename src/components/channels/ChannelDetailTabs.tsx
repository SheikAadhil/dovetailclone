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
  Filter, BarChart3, ChevronRight, Search, Activity, Layers, Sparkles, X, Check, Loader2, FileCode, Zap, Lightbulb, Menu, PanelLeftClose,
  ShieldCheck, AlertTriangle, GitPullRequest, Info
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
  
  // Global Analysis Results
  const [latentTensions, setLatentTensions] = useState<any[]>([]);
  const [strengths, setStrengths] = useState<any[]>([]);
  const [isolatedIssues, setIsolatedIssues] = useState<any[]>([]);
  
  // Chart Selection State
  const [visibleThemeIds, setVisibleThemeIds] = useState<string[]>([]);
  
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState<string>("");
  const [analysisStep, setAnalysisStep] = useState<number>(0);
  const [worklogEntries, setWorklogEntries] = useState<Array<{
    stage: string;
    goal: string;
    doing: string[];
    observations: string[];
    decisions: string[];
    open_questions: string[];
    progress: string;
  }>>([]);
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
  const [sidebarOpen, setSidebarOpen] = useState(false);

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
      setLatentTensions(data.latent_tensions || []);
      setStrengths(data.strengths || []);
      setIsolatedIssues(data.isolated_issues || []);
      
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
    setWorklogEntries([]);
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

                  // Try to parse worklog entry from progress message
                  const worklogMatch = parsed.progress.match(/\[([^\]]+)\]\s*GOAL:\s*([^|]+)\s*\|\s*DOING:\s*([^|]+)\s*\|\s*OBSERVATIONS:\s*([^|]*)\s*\|\s*DECISIONS:\s*([^|]*)\s*\|\s*QUESTIONS:\s*([^|]*)\s*\|\s*PROGRESS:\s*(.*)/);
                  if (worklogMatch) {
                    const [, stage, goal, doing, observations, decisions, questions, progressStr] = worklogMatch;
                    const newEntry = {
                      stage: stage.trim(),
                      goal: goal.trim(),
                      doing: doing.trim().split(';').map((s: string) => s.trim()).filter(Boolean),
                      observations: observations.trim().split(';').map((s: string) => s.trim()).filter(Boolean),
                      decisions: decisions.trim().split(';').map((s: string) => s.trim()).filter(Boolean),
                      open_questions: questions.trim().split(';').map((s: string) => s.trim()).filter(Boolean),
                      progress: progressStr.trim()
                    };
                    setWorklogEntries(prev => [...prev, newEntry]);
                  }
                }
              } catch (e) {
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
      setWorklogEntries([]);
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
    
    // Better filtering for Product vs Deep analysis
    // Product Insights is usually the first generated topic
    const productKeywords = ["product", "insight", "feedback"];
    const deepKeywords = ["deep", "strategic", "latent", "tension"];
    
    const productTopic = topics.find(t => productKeywords.some(k => t.name.toLowerCase().includes(k)));
    const deepTopic = topics.find(t => deepKeywords.some(k => t.name.toLowerCase().includes(k)));
    
    if (analysisLayer === "product") {
      // If we found a product topic, filter by it. Otherwise show themes with NO topic or first available
      if (productTopic) return themes.filter(t => t.topic_id === productTopic.id);
      return themes.filter(t => !t.topic_id || t.topic_id === topics[0]?.id);
    } else {
      // If we found a deep topic, filter by it.
      if (deepTopic) return themes.filter(t => t.topic_id === deepTopic.id);
      return themes.filter(t => t.topic_id === topics[1]?.id);
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

    // 1. Generate all dates in the period
    const days = period === 'all' ? 365 : parseInt(period);
    
    for (let i = days - 1; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "yyyy-MM-dd");
      dateMap[dateStr] = { date: dateStr };
      
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
      {/* Mobile Overlay */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 1. CHANNEL SIDEBAR */}
      <aside className={`
        fixed md:relative z-50 h-full border-r border-gray-100 flex flex-col bg-gray-50/30 overflow-hidden shrink-0
        transition-transform duration-300 ease-in-out
        w-60 md:w-60
        ${sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0'}
      `}>
        <div className="p-4 pb-3 shrink-0">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-lg bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
                <Activity className="w-4 h-4" />
              </div>
              <div className="min-w-0">
                <h1 className="text-sm font-bold text-gray-900 truncate">{channel.name}</h1>
                <p className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider">#{channel.slack_channel_name}</p>
              </div>
            </div>
            <button
              onClick={() => setSidebarOpen(false)}
              className="md:hidden p-1.5 rounded-md hover:bg-gray-100"
            >
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>

          <nav className="space-y-0.5">
            <button
              onClick={() => { setActiveView("overview"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "overview" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Sparkles className="w-4 h-4" /> Overview
            </button>
            <button
              onClick={() => { setActiveView("themes"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "themes" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Layers className="w-4 h-4" /> Themes
            </button>
            <button
              onClick={() => { setActiveView("messages"); setSidebarOpen(false); }}
              className={`w-full flex items-center gap-2 px-3 py-2 rounded-lg text-sm font-medium transition-all ${activeView === "messages" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <MessageSquare className="w-4 h-4" /> Signal
            </button>
            <button
              onClick={() => { setActiveView("settings"); setSidebarOpen(false); }}
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
        <header className="h-12 border-b border-gray-100 flex items-center justify-between px-3 sm:px-4 bg-white/80 backdrop-blur-md sticky top-0 z-20 shrink-0">
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              onClick={() => setSidebarOpen(true)}
              className="md:hidden p-2 hover:bg-gray-100 rounded-lg -ml-1"
            >
              <Menu className="w-5 h-5 text-gray-600" />
            </button>
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
                      <span className="text-xs text-gray-600">Analyzing Signals</span>
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

        {/* Analysis Progress Panel */}
        {analyzing && (
          <div className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-indigo-100 p-4 animate-in slide-in-from-top-2 duration-300">
            <div className="max-w-7xl mx-auto">
              <div className="flex items-center gap-3 mb-3">
                <div className="p-2 bg-indigo-100 rounded-lg">
                  <Brain className="w-5 h-5 text-indigo-600 animate-pulse" />
                </div>
                <div>
                  <h3 className="text-sm font-semibold text-indigo-900">Analyzing Signals</h3>
                  <p className="text-xs text-indigo-700">{analysisProgress || "Initializing..."}</p>
                </div>
              </div>

              {worklogEntries.length > 0 && (
                <div className="mt-3 space-y-2 max-h-64 overflow-y-auto">
                  {worklogEntries.map((entry, idx) => (
                    <div key={idx} className="bg-white/80 rounded-lg p-3 border border-indigo-100 shadow-sm">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-xs font-bold text-indigo-600 uppercase tracking-wide">{entry.stage}</span>
                        {entry.progress && <span className="text-xs text-gray-500">• {entry.progress}</span>}
                      </div>
                      <div className="text-xs text-gray-700">{entry.goal}</div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        <ScrollArea className="flex-1 min-h-0">
          <div className="p-4 max-w-7xl mx-auto w-full pb-16">
            {activeView === "overview" && (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-indigo-50 rounded-lg text-indigo-600"><MessageSquare className="w-4 h-4" /></div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Total Signal</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">{stats.total_data_points}</div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-emerald-50 rounded-lg text-emerald-600"><Layers className="w-4 h-4" /></div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Themes</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">{themes.length}</div>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                    <div className="flex items-center gap-2.5 mb-3">
                      <div className="p-1.5 bg-amber-50 rounded-lg text-amber-600"><TrendingUp className="w-4 h-4" /></div>
                      <span className="text-[10px] font-medium text-gray-400 uppercase tracking-wider">Velocity</span>
                    </div>
                    <div className="text-2xl font-bold text-gray-900 tracking-tight">+{Math.round(Math.random()*20)}%</div>
                  </div>
                </div>

                {/* Main Dashboard Chart */}
                <div className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm">
                  <div className="h-[280px] w-full">
                    {chartData.length >= 2 && chartThemes.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 8, right: 20, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 600 }} tickFormatter={(v) => format(parseISO(v), "MMM dd")} />
                          <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 600 }} />
                          <ChartTooltip content={<CustomTooltip />} />
                          <Legend verticalAlign="bottom" height={36} iconType="circle" />
                          {chartThemes.map((theme, index) => (
                            <Bar key={theme.id} dataKey={theme.name} stackId="a" fill={THEME_COLORS[themes.findIndex(t => t.id === theme.id) % THEME_COLORS.length]} radius={index === chartThemes.length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]} />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                        <BarChart3 className="w-10 h-10 text-gray-200 mb-3" />
                        <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider">Awaiting Data</h4>
                      </div>
                    )}
                  </div>
                </div>

                {/* STRATEGIC INSIGHTS (NEW) */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Strengths */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <ShieldCheck className="w-4 h-4 text-emerald-600" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Core Strengths</h3>
                    </div>
                    <div className="grid gap-3">
                      {strengths && strengths.length > 0 ? strengths.map((s, i) => (
                        <div key={i} className="bg-white border border-emerald-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="text-sm font-black text-emerald-900 mb-1">{s.name}</h4>
                          <p className="text-xs text-emerald-700 leading-relaxed">{s.what_users_value || s.why_it_matters}</p>
                          <div className="mt-3 pt-3 border-t border-emerald-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-emerald-500 uppercase tracking-widest">Strategy</span>
                            <span className="text-[10px] font-black text-emerald-600 uppercase italic">Preserve & Expand</span>
                          </div>
                        </div>
                      )) : (
                        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                          <p className="text-xs text-gray-400 font-medium italic">No strengths identified yet</p>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Isolated Issues */}
                  <div className="space-y-3">
                    <div className="flex items-center gap-2 px-1">
                      <AlertTriangle className="w-4 h-4 text-rose-500" />
                      <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Isolated Issues</h3>
                    </div>
                    <div className="grid gap-3">
                      {isolatedIssues && isolatedIssues.length > 0 ? isolatedIssues.map((s, i) => (
                        <div key={i} className="bg-white border border-rose-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow">
                          <h4 className="text-sm font-black text-rose-900 mb-1">{s.name}</h4>
                          <p className="text-xs text-rose-700 leading-relaxed">{s.issue_description || s.why_not_elevated}</p>
                          <div className="mt-3 pt-3 border-t border-rose-50 flex items-center justify-between">
                            <span className="text-[10px] font-bold text-rose-400 uppercase tracking-widest">Status</span>
                            <span className="text-[10px] font-black text-rose-500 uppercase italic">Monitor Only</span>
                          </div>
                        </div>
                      )) : (
                        <div className="p-6 bg-gray-50 rounded-xl border border-dashed border-gray-200 text-center">
                          <p className="text-xs text-gray-400 font-medium italic">No isolated issues detected</p>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Latent Tensions / Strategic Pattern (NEW) */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 px-1">
                    <Zap className="w-4 h-4 text-indigo-600" />
                    <h3 className="text-sm font-bold text-gray-900 uppercase tracking-wide">Strategic Latent Tensions</h3>
                  </div>
                  <div className="grid gap-4">
                    {latentTensions && latentTensions.length > 0 ? latentTensions.map((s, i) => (
                      <div key={i} className="bg-gradient-to-br from-white to-indigo-50/30 border border-indigo-100 rounded-2xl p-6 shadow-sm relative overflow-hidden group">
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                          <GitPullRequest className="w-12 h-12 text-indigo-900" />
                        </div>
                        <div className="relative">
                          <h4 className="text-base font-black text-indigo-950 mb-2 leading-tight">{s.name}</h4>
                          <div className="flex flex-wrap gap-2 mb-4">
                            {s.connected_themes && s.connected_themes.map((t: string, ti: number) => (
                              <Badge key={ti} variant="secondary" className="bg-indigo-100/50 text-indigo-700 text-[10px] font-bold uppercase">{t}</Badge>
                            ))}
                          </div>
                          <p className="text-sm text-indigo-800 leading-relaxed font-medium mb-4">{s.deeper_pattern}</p>
                          <div className="bg-indigo-600/5 rounded-xl p-4 border border-indigo-100">
                            <h5 className="text-[10px] font-black text-indigo-600 uppercase tracking-widest mb-1 flex items-center gap-1.5">
                              <Info className="w-3 h-3" /> Strategic Meaning
                            </h5>
                            <p className="text-xs text-indigo-900 font-bold leading-relaxed italic">{s.strategic_importance}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <div className="p-12 bg-gray-50 rounded-2xl border border-dashed border-gray-200 text-center">
                        <p className="text-sm text-gray-400 font-medium italic">Deep strategic patterns will emerge as your dataset grows</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Themes Row */}
                <div>
                  <div className="flex items-center justify-between mb-3 px-1">
                    <h3 className="text-xs font-medium text-gray-400 uppercase tracking-wider">Top Themes</h3>
                    <button onClick={() => setActiveView("themes")} className="text-[10px] font-medium text-indigo-600 uppercase tracking-wider flex items-center gap-1">View All <ChevronRight className="w-3 h-3" /></button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
                    {themes.slice(0, 3).map(theme => (
                      <ThemeCard key={theme.id} theme={theme} onView={handleViewTheme} onEdit={handleOpenThemeDialog} onDelete={handleDeleteTheme} onPin={handlePinTheme} />
                    ))}
                  </div>
                </div>
              </div>
            )}

            {activeView === "themes" && (
              <div className="space-y-4 animate-in fade-in duration-500">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <h2 className="text-lg font-semibold text-gray-900">{selectedTopicId === "all" ? "Theme Library" : selectedTopic?.name}</h2>
                  <div className="flex items-center gap-2">
                    <Button onClick={() => handleOpenThemeDialog()} className="rounded-lg h-8 px-4 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 shadow-sm font-medium text-xs">
                      <Plus className="w-3.5 h-3.5 mr-1.5 text-indigo-600" /> Theme
                    </Button>
                  </div>
                </div>

                {selectedTopicId === "all" && (
                  <Tabs value={analysisLayer} onValueChange={(v: any) => setAnalysisLayer(v)} className="w-full">
                    <TabsList className="grid w-full max-w-xs grid-cols-2 p-1 bg-gray-100 rounded-lg h-9">
                      <TabsTrigger value="product" className="rounded-md font-medium text-[11px] uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:text-indigo-600 shadow-sm">
                        <Zap className="w-3 h-3" /> Product
                      </TabsTrigger>
                      <TabsTrigger value="deep" className="rounded-md font-medium text-[11px] uppercase tracking-wider gap-1.5 data-[state=active]:bg-white data-[state=active]:text-amber-600 shadow-sm">
                        <Lightbulb className="w-3 h-3" /> Deep
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
                      <ThemeCard key={theme.id} theme={theme} onView={handleViewTheme} onEdit={handleOpenThemeDialog} onDelete={handleDeleteTheme} onPin={handlePinTheme} />
                    ))}
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center h-48 bg-gray-50/50 rounded-xl border border-dashed border-gray-200">
                    <h3 className="text-sm font-medium text-gray-900">Library Empty</h3>
                    <p className="text-xs font-medium text-gray-400 mt-1">Run analysis to populate themes</p>
                  </div>
                )}
              </div>
            )}

            {activeView === "messages" && <MessageList channelId={channel.id} />}
            {activeView === "settings" && <ChannelSettingsForm channel={channel} />}
          </div>
        </ScrollArea>
      </main>

      <aside className={`w-[380px] border-l border-gray-100 bg-white transition-all duration-300 ease-in-out flex flex-col z-30 shrink-0 relative overflow-hidden ${selectedTheme ? 'mr-0 shadow-xl' : '-mr-[380px]'}`}>
        {selectedTheme && <ThemeDrawer theme={selectedTheme} isOpen={!!selectedTheme} onClose={() => setSelectedTheme(null)} />}
      </aside>

      <BackfillDialog channelId={channel.id} isOpen={isBackfillOpen} onClose={() => setIsBackfillOpen(false)} onSuccess={() => fetchThemes()} />
      <NodeImportDialog channelId={channel.id} isOpen={isNodeImportOpen} onClose={() => setIsNodeImportOpen(false)} onSuccess={() => fetchThemes()} />

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicOpen}>
        <DialogContent className="rounded-xl p-6 border-none shadow-xl max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold tracking-tight">New Topic</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Topic Name</Label>
              <Input value={newTopicName} onChange={e => setNewTopicName(e.target.value)} placeholder="e.g. Navigation" className="rounded-lg h-10 border-gray-100 shadow-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Description</Label>
              <Textarea value={newTopicDesc} onChange={e => setNewTopicDesc(e.target.value)} placeholder="Topic description..." className="rounded-lg min-h-[80px] border-gray-100 shadow-none" />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsTopicOpen(false)} className="rounded-lg h-9 px-4 font-medium text-xs">Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic} className="rounded-lg h-9 px-5 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white shadow-md">
              {creatingTopic ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null} Create
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
        <DialogContent className="rounded-xl p-6 border-none shadow-xl max-w-md">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-lg font-semibold tracking-tight">{editingTheme ? "Edit Theme" : "New Theme"}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Theme Name</Label>
              <Input value={themeName} onChange={e => setThemeName(e.target.value)} placeholder="e.g. Latency issues" className="rounded-lg h-10 border-gray-100 shadow-none" />
            </div>
            <div className="space-y-2">
              <Label className="text-xs font-medium text-gray-400 uppercase tracking-wider ml-0.5">Description</Label>
              <Textarea value={themeDesc} onChange={e => setThemeDesc(e.target.value)} placeholder="Describe this theme..." className="rounded-lg min-h-[80px] border-gray-100 shadow-none" />
            </div>
          </div>
          <DialogFooter className="mt-4 gap-2">
            <Button variant="outline" onClick={() => setIsThemeDialogOpen(false)} className="rounded-lg h-9 px-4 font-medium text-xs border-gray-200">Cancel</Button>
            <Button onClick={handleSaveTheme} disabled={!themeName || savingTheme} className="rounded-lg h-9 px-5 bg-indigo-600 hover:bg-indigo-700 font-medium text-xs text-white shadow-md">
              {savingTheme ? <Loader2 className="w-3.5 h-3.5 animate-spin mr-1.5" /> : null} {editingTheme ? "Save" : "Create"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
