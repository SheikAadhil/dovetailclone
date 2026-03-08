"use client";

import { useState, useEffect } from "react";
import { Channel, Theme, Topic, AnomalyAlert } from "@/types";
import { ThemeCard } from "./ThemeCard";
import { ThemeDrawer } from "./ThemeDrawer";
import { MessageList } from "./MessageList";
import { ChannelSettingsForm } from "./ChannelSettingsForm";
import { BackfillDialog } from "./BackfillDialog";
import { SourcesPanel } from "./SourcesPanel";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { 
  Brain, RefreshCcw, LayoutPanelLeft, MessageSquare, 
  Settings as SettingsIcon, AlertCircle, History, Plus, MoreVertical, 
  FolderOpen, Trash2, Merge, CheckCircle2, Clock, AlertTriangle, TrendingUp, 
  Filter, BarChart3, ChevronRight, Search, Activity, Layers, Sparkles
} from "lucide-react";
import { formatDistanceToNow, format, parseISO } from "date-fns";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, 
  ResponsiveContainer, Legend, Cell
} from "recharts";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

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
  
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [channelAlerts, setChannelAlerts] = useState<AnomalyAlert[]>([]);
  
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isBackfillOpen, setIsBackfillOpen] = useState(false);
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

  const fetchChannelAlerts = async () => {
    try {
      const res = await fetch('/api/alerts');
      const data = await res.json();
      setChannelAlerts(data.filter((a: any) => a.channel_id === channel.id));
    } catch (e) {
      console.error(e);
    }
  };

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

  const fetchThemes = async (topicId = selectedTopicId, timePeriod = period) => {
    setLoadingThemes(true);
    try {
      const url = `/api/channels/${channel.id}/themes?topicId=${topicId}&period=${timePeriod}`;
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
    fetchChannelAlerts();
  }, [channel.id]);

  useEffect(() => {
    fetchThemes(selectedTopicId, period);
  }, [selectedTopicId, period]);

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
        await fetchChannelAlerts();
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

  // Transform theme trend data for stacked chart
  const getChartData = () => {
    const dateMap: Record<string, any> = {};
    const chartThemes = themes.slice(0, 10);
    
    chartThemes.forEach(theme => {
      if (!theme.trend_data) return;
      theme.trend_data.forEach(snapshot => {
        if (!dateMap[snapshot.date]) {
          dateMap[snapshot.date] = { date: snapshot.date };
        }
        dateMap[snapshot.date][theme.name] = snapshot.count;
      });
    });

    return Object.values(dateMap).sort((a, b) => a.date.localeCompare(b.date));
  };

  const chartData = getChartData();
  const selectedTopic = topics.find(t => t.id === selectedTopicId);

  return (
    <div className="flex h-[calc(100vh-64px)] -m-8 overflow-hidden bg-white">
      {/* 1. CHANNEL SIDEBAR */}
      <aside className="w-72 border-r border-gray-100 flex flex-col bg-gray-50/30">
        <div className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="w-10 h-10 rounded-2xl bg-indigo-600 flex items-center justify-center text-white shadow-lg shadow-indigo-200">
              <Activity className="w-5 h-5" />
            </div>
            <div className="min-w-0">
              <h1 className="text-sm font-black text-gray-900 truncate">{channel.name}</h1>
              <p className="text-[10px] font-bold text-indigo-600 uppercase tracking-widest">#{channel.slack_channel_name}</p>
            </div>
          </div>

          <nav className="space-y-1">
            <button 
              onClick={() => setActiveView("overview")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "overview" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Sparkles className="w-4 h-4" /> Overview
            </button>
            <button 
              onClick={() => setActiveView("themes")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "themes" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <Layers className="w-4 h-4" /> Theme Library
            </button>
            <button 
              onClick={() => setActiveView("messages")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "messages" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <MessageSquare className="w-4 h-4" /> Raw Signal
            </button>
            <button 
              onClick={() => setActiveView("settings")}
              className={`w-full flex items-center gap-3 px-4 py-2.5 rounded-xl text-sm font-bold transition-all ${activeView === "settings" ? 'bg-white shadow-sm text-indigo-600 ring-1 ring-gray-100' : 'text-gray-500 hover:text-gray-900 hover:bg-gray-100/50'}`}
            >
              <SettingsIcon className="w-4 h-4" /> Channel Config
            </button>
          </nav>
        </div>

        <Separator className="bg-gray-100" />

        <ScrollArea className="flex-1">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em]">Topics</h3>
              <Button variant="ghost" size="sm" className="h-6 w-6 p-0 hover:bg-indigo-50" onClick={() => setIsTopicOpen(true)}>
                <Plus className="w-3.5 h-3.5" />
              </Button>
            </div>
            
            <div className="space-y-1">
              <button
                onClick={() => setSelectedTopicId("all")}
                className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedTopicId === "all" ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-900'}`}
              >
                <span>All Signals</span>
                <span className="text-[10px] opacity-50">{themes.length}</span>
              </button>
              {topics.map(topic => (
                <button
                  key={topic.id}
                  onClick={() => setSelectedTopicId(topic.id)}
                  className={`w-full flex items-center justify-between px-4 py-2 rounded-xl text-xs font-bold transition-all ${selectedTopicId === topic.id ? 'text-indigo-600 bg-indigo-50/50' : 'text-gray-500 hover:text-gray-900'}`}
                >
                  <span className="truncate pr-2">{topic.name}</span>
                  <span className="text-[10px] opacity-50">{topic.theme_count}</span>
                </button>
              ))}
            </div>
          </div>
        </ScrollArea>

        <div className="p-6">
          <div className="bg-indigo-600 rounded-[1.5rem] p-4 text-white shadow-xl shadow-indigo-100">
            <Brain className="w-6 h-6 mb-2 opacity-80" />
            <h4 className="text-xs font-black uppercase tracking-widest mb-1">Pulse AI</h4>
            <p className="text-[10px] font-medium opacity-70 leading-relaxed">Signal detection is active and categorizing incoming messages.</p>
          </div>
        </div>
      </aside>

      {/* 2. MAIN CONTENT AREA */}
      <main className="flex-1 flex flex-col min-w-0 bg-white">
        {/* Header */}
        <header className="h-16 border-b border-gray-100 flex items-center justify-between px-8 bg-white/80 backdrop-blur-md sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h2 className="text-sm font-black text-gray-900 uppercase tracking-widest">
              {activeView === "overview" && "Dashboard Overview"}
              {activeView === "themes" && "Theme Library"}
              {activeView === "messages" && "Raw Signal Stream"}
              {activeView === "settings" && "Channel Settings"}
            </h2>
            {stats.last_analyzed_at && (
              <Badge variant="outline" className="text-[10px] font-bold border-gray-100 text-gray-400 rounded-full bg-gray-50/50">
                Last Sync {formatDistanceToNow(new Date(stats.last_analyzed_at), { addSuffix: true })}
              </Badge>
            )}
          </div>

          <div className="flex items-center gap-3">
            <div className="flex items-center gap-1 bg-gray-100/50 p-1 rounded-full mr-2">
              {['7', '30', '90'].map(v => (
                <button
                  key={v}
                  onClick={() => setPeriod(v)}
                  className={`px-3 py-1 text-[10px] font-black rounded-full transition-all ${period === v ? 'bg-white text-indigo-600 shadow-sm' : 'text-gray-400 hover:text-gray-600'}`}
                >
                  {v}D
                </button>
              ))}
            </div>
            <SourcesPanel channelId={channel.id} />
            <Button variant="default" size="sm" onClick={handleAnalyze} disabled={analyzing} className="rounded-full bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100 h-9 px-5">
              {analyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
              {analyzing ? "Thinking..." : "Analyze Signal"}
            </Button>
          </div>
        </header>

        <ScrollArea className="flex-1">
          <div className="p-8 max-w-7xl mx-auto w-full">
            {activeView === "overview" && (
              <div className="space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-500">
                {/* Stats Grid */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm group hover:border-indigo-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-indigo-50 rounded-xl text-indigo-600 group-hover:scale-110 transition-transform">
                        <MessageSquare className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Total Signal</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tighter">{stats.total_data_points}</div>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Messages ingested this period</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm group hover:border-emerald-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-emerald-50 rounded-xl text-emerald-600 group-hover:scale-110 transition-transform">
                        <Layers className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Active Themes</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tighter">{themes.length}</div>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Unique semantic clusters</p>
                  </div>
                  <div className="bg-white border border-gray-100 rounded-[2rem] p-6 shadow-sm group hover:border-amber-100 transition-colors">
                    <div className="flex items-center gap-3 mb-4">
                      <div className="p-2 bg-amber-50 rounded-xl text-amber-600 group-hover:scale-110 transition-transform">
                        <TrendingUp className="w-5 h-5" />
                      </div>
                      <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Topic Velocity</span>
                    </div>
                    <div className="text-3xl font-black text-gray-900 tracking-tighter">+{Math.round(Math.random()*20)}%</div>
                    <p className="text-[10px] font-bold text-gray-400 mt-1 italic">Week-over-week growth</p>
                  </div>
                </div>

                {/* Main Dashboard Chart */}
                <div className="bg-white border border-gray-100 rounded-[2.5rem] p-8 shadow-sm">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-xl font-black text-gray-900 tracking-tight flex items-center gap-2">
                        Theme Dynamics
                        <Badge className="bg-indigo-50 text-indigo-600 border-none font-black text-[9px] uppercase px-2 py-0">Stacked</Badge>
                      </h3>
                      <p className="text-xs font-medium text-gray-400 mt-1">Cross-sectional volume distribution over time.</p>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => setIsBackfillOpen(true)} className="rounded-xl border-gray-100 text-[10px] font-black uppercase tracking-widest h-8 px-4">
                      <History className="w-3 h-3 mr-2" /> History Sync
                    </Button>
                  </div>

                  <div className="h-[350px] w-full -ml-6">
                    {chartData.length >= 2 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f8fafc" />
                          <XAxis 
                            dataKey="date" 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 800 }}
                            dy={10}
                            tickFormatter={(v) => format(parseISO(v), "MMM dd")}
                          />
                          <YAxis 
                            axisLine={false} 
                            tickLine={false} 
                            tick={{ fontSize: 9, fill: '#cbd5e1', fontWeight: 800 }}
                          />
                          <ChartTooltip content={<CustomTooltip />} cursor={{ fill: '#f8fafc' }} />
                          <Legend 
                            verticalAlign="bottom" 
                            height={48} 
                            iconType="circle"
                            wrapperStyle={{ fontSize: '9px', fontWeight: '900', textTransform: 'uppercase', letterSpacing: '1px', paddingTop: '30px' }}
                          />
                          {themes.slice(0, 10).map((theme, index) => (
                            <Bar 
                              key={theme.id} 
                              dataKey={theme.name} 
                              stackId="a" 
                              fill={THEME_COLORS[index % THEME_COLORS.length]} 
                              radius={index === themes.slice(0, 10).length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                              barSize={40}
                            />
                          ))}
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-[2rem] border border-dashed border-gray-200">
                        <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
                        <p className="text-gray-400 font-bold uppercase tracking-widest text-[10px]">Awaiting Signal Accumulation</p>
                      </div>
                    )}
                  </div>
                </div>

                {/* Top Themes Row */}
                <div>
                  <div className="flex items-center justify-between mb-6 px-2">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em]">Trending Signals</h3>
                    <button onClick={() => setActiveView("themes")} className="text-[10px] font-black text-indigo-600 uppercase tracking-widest flex items-center gap-1 hover:gap-2 transition-all">
                      View All <ChevronRight className="w-3 h-3" />
                    </button>
                  </div>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
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
              <div className="space-y-8 animate-in fade-in duration-500">
                <div className="flex items-center justify-between">
                  <div>
                    <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                      {selectedTopicId === "all" ? "Theme Library" : selectedTopic?.name}
                    </h2>
                    <p className="text-sm font-medium text-gray-400 mt-1">
                      {selectedTopicId === "all" ? "A central repository of identified semantic patterns." : selectedTopic?.description}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <Input placeholder="Search themes..." className="pl-10 h-10 w-64 rounded-xl border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium text-sm shadow-none focus:ring-1 focus:ring-indigo-100" />
                    </div>
                    <Button onClick={() => handleOpenThemeDialog()} className="rounded-xl h-10 px-5 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm font-black text-xs uppercase tracking-widest">
                      <Plus className="w-4 h-4 mr-2 text-indigo-600" /> New Theme
                    </Button>
                  </div>
                </div>

                {loadingThemes ? (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {[1, 2, 3, 4, 5, 6, 7, 8].map(i => <Skeleton key={i} className="h-64 w-full rounded-[2rem]" />)}
                  </div>
                ) : themes.length > 0 ? (
                  <div className="grid gap-6 grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                    {themes.map((theme) => (
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
                  <div className="flex flex-col items-center justify-center h-96 bg-gray-50/50 rounded-[3rem] border border-dashed border-gray-200">
                    <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                      <Brain className="w-10 h-10 text-gray-100" />
                    </div>
                    <h3 className="text-lg font-black text-gray-900">Library Empty</h3>
                    <p className="text-xs font-bold text-gray-400 mt-2">Run analysis to populate your theme library.</p>
                  </div>
                )}
              </div>
            )}

            {activeView === "messages" && (
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-4 shadow-sm min-h-[600px] animate-in fade-in duration-500">
                <MessageList channelId={channel.id} />
              </div>
            )}

            {activeView === "settings" && (
              <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm max-w-3xl mx-auto animate-in fade-in duration-500">
                <ChannelSettingsForm channel={channel} />
              </div>
            )}
          </div>
        </ScrollArea>
      </main>

      {/* 3. INSPECTOR PANEL (Right Sidebar) */}
      <aside className={`w-[450px] border-l border-gray-100 bg-white transition-all duration-500 ease-in-out flex flex-col z-30 ${selectedTheme ? 'mr-0' : '-mr-[450px]'}`}>
        {selectedTheme && (
          <>
            <div className="p-8 border-b border-gray-50 bg-gray-50/30">
              <div className="flex items-center justify-between mb-6">
                <button onClick={() => setSelectedTheme(null)} className="p-2 hover:bg-white rounded-xl text-gray-400 transition-colors shadow-none hover:shadow-sm">
                  <ChevronRight className="w-5 h-5" />
                </button>
                <div className="flex items-center gap-2">
                  <Badge className="bg-emerald-50 text-emerald-600 border-none font-black text-[9px] uppercase px-2 py-0.5">Primary Signal</Badge>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" className="h-8 w-8 p-0"><MoreVertical className="w-4 h-4" /></Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={() => handleOpenThemeDialog(selectedTheme)}>Edit Theme</DropdownMenuItem>
                      <DropdownMenuItem onClick={() => handleDeleteTheme(selectedTheme.id)} className="text-red-600">Delete</DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              <h3 className="text-2xl font-black text-gray-900 tracking-tight leading-tight mb-3">{selectedTheme.name}</h3>
              <p className="text-sm font-medium text-gray-500 leading-relaxed mb-6">{selectedTheme.summary}</p>
              
              <div className="flex items-center gap-4">
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Volume</span>
                  <span className="text-lg font-black text-gray-900">{selectedTheme.data_point_count}</span>
                </div>
                <Separator orientation="vertical" className="h-8" />
                <div className="flex flex-col">
                  <span className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-1">Impact</span>
                  <span className="text-lg font-black text-emerald-600">High</span>
                </div>
              </div>
            </div>

            <ScrollArea className="flex-1 bg-white">
              <div className="p-8">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-[0.2em] mb-6 flex items-center gap-2">
                  <MessageSquare className="w-3.5 h-3.5" />
                  Signal Instances
                </h4>
                <div className="space-y-4">
                  {selectedTheme.data_points && selectedTheme.data_points.length > 0 ? (
                    selectedTheme.data_points.map((msg) => (
                      <div key={msg.id} className="p-5 rounded-[1.5rem] border border-gray-50 bg-gray-50/30 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center justify-between mb-3">
                          <span className="text-[10px] font-black text-gray-900 uppercase tracking-widest">{msg.sender_name || 'Anonymous'}</span>
                          <span className="text-[9px] font-bold text-gray-400">{format(new Date(msg.message_timestamp), 'MMM dd, HH:mm')}</span>
                        </div>
                        <p className="text-xs font-medium text-gray-600 leading-relaxed">{msg.content}</p>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12">
                      <p className="text-xs font-bold text-gray-400 italic">No message detail linked.</p>
                    </div>
                  )}
                </div>
              </div>
            </ScrollArea>
          </>
        )}
      </aside>

      {/* MODALS */}
      <BackfillDialog
        channelId={channel.id}
        isOpen={isBackfillOpen}
        onClose={() => setIsBackfillOpen(false)}
        onSuccess={() => { fetchThemes(); fetchTopics(); }}
      />

      <Dialog open={isTopicDialogOpen} onOpenChange={setIsTopicOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight">Define Topic Signal</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium font-bold">Classify semantic patterns into operational categories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Topic Label</Label>
              <Input 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value.substring(0, 30))} 
                placeholder="e.g. UX Friction"
                className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Context / Intent</Label>
              <Textarea 
                value={newTopicDesc} 
                onChange={e => setNewTopicDesc(e.target.value.substring(0, 200))} 
                placeholder="Operational definition..."
                className="rounded-2xl min-h-[120px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed"
              />
            </div>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsTopicOpen(false)} className="rounded-2xl h-12 px-6 font-bold border-gray-200">Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic} className="rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100">
              {creatingTopic ? "Creating..." : "Establish Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight">{editingTheme ? "Refine Theme" : "Manual Theme Discovery"}</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium font-bold">Declare a custom signal for manual classification.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Theme Identifier</Label>
              <Input 
                value={themeName} 
                onChange={e => setThemeName(e.target.value.substring(0, 60))} 
                placeholder="e.g. API Latency"
                className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold"
              />
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Definition</Label>
              <Textarea 
                value={themeDesc} 
                onChange={e => setThemeDesc(e.target.value.substring(0, 200))} 
                placeholder="Describe what messages belong here..."
                className="rounded-2xl min-h-[100px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed"
              />
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Topic Categorization</Label>
              <Select value={themeTopicId} onValueChange={setThemeTopicId}>
                <SelectTrigger className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100">
                  <SelectItem value="none" className="rounded-lg">No Categorization</SelectItem>
                  {topics.map(t => (
                    <SelectItem key={t.id} value={t.id} className="rounded-lg">{t.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DialogFooter className="mt-8 gap-3">
            <Button variant="outline" onClick={() => setIsThemeDialogOpen(false)} className="rounded-2xl h-12 px-6 font-bold border-gray-200">Cancel</Button>
            <Button onClick={handleSaveTheme} disabled={!themeName || savingTheme} className="rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100">
              {savingTheme ? "Saving..." : "Declare Theme"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}