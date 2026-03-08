"use client";

import { useState, useEffect } from "react";
import { Channel, Theme, Topic, AnomalyAlert } from "@/types";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  FolderOpen, Trash2, Merge, CheckCircle2, Clock, AlertTriangle, TrendingUp, Filter, BarChart3
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
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

interface ChannelDetailTabsProps {
  channel: Channel;
}

const THEME_COLORS = [
  "#4f46e5", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6", 
  "#ec4899", "#06b6d4", "#f97316", "#14b8a6", "#3b82f6"
];

export function ChannelDetailTabs({ channel }: ChannelDetailTabsProps) {
  const [activeTab, setActiveTab] = useState("themes");
  const [themes, setThemes] = useState<Theme[]>([]);
  const [topics, setTopics] = useState<Topic[]>([]);
  const [selectedTopicId, setSelectedTopicId] = useState<string>("all");
  const [period, setPeriod] = useState<string>("30");
  
  const [loadingThemes, setLoadingThemes] = useState(true);
  const [loadingTopics, setLoadingTopics] = useState(true);
  const [analyzing, setAnalyzing] = useState(false);
  const [channelAlerts, setChannelAlerts] = useState<AnomalyAlert[]>([]);
  
  const [selectedTheme, setSelectedTheme] = useState<Theme | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);
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
    setIsDrawerOpen(true);
  };

  // Transform theme trend data for stacked chart
  const getChartData = () => {
    const dateMap: Record<string, any> = {};
    
    // Use the top 5 themes for the chart to keep it readable
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
    <div className="space-y-8 pb-12">
      {/* Hero Section */}
      <div className="bg-white border rounded-2xl p-6 shadow-sm flex flex-col md:flex-row md:items-center justify-between gap-6 overflow-hidden relative group">
        <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-50/50 rounded-full -mr-16 -mt-16 blur-3xl" />
        <div className="absolute bottom-0 left-0 w-24 h-24 bg-amber-50/50 rounded-full -ml-12 -mb-12 blur-2xl" />
        
        <div className="relative z-10">
          <div className="flex items-center gap-3 mb-2">
            <h1 className="text-3xl font-extrabold text-gray-900 tracking-tight">{channel.name}</h1>
            <Badge className="bg-indigo-600/10 text-indigo-700 hover:bg-indigo-600/20 border-indigo-200">
              #{channel.slack_channel_name}
            </Badge>
          </div>
          <p className="text-gray-500 max-w-xl leading-relaxed">
            {channel.description || "Synthesizing signals and uncovering recurring themes in real-time."}
          </p>
          {stats.last_analyzed_at && (
            <div className="flex items-center gap-1.5 mt-3 text-[11px] font-medium text-gray-400 uppercase tracking-widest">
              <Clock className="w-3 h-3" />
              Updated {formatDistanceToNow(new Date(stats.last_analyzed_at), { addSuffix: true })}
            </div>
          )}
        </div>

        <div className="flex items-center gap-3 relative z-10">
          <SourcesPanel channelId={channel.id} />
          <Button variant="outline" size="sm" onClick={() => setIsBackfillOpen(true)} className="gap-2 rounded-xl h-10 border-gray-200">
            <History className="w-4 h-4 text-gray-500" />
            <span className="hidden sm:inline">Sync History</span>
          </Button>
          <Button variant="default" size="sm" onClick={handleAnalyze} disabled={analyzing || stats.total_data_points < 5} className="gap-2 rounded-xl h-10 px-6 bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-200 transition-all">
            {analyzing ? <RefreshCcw className="w-4 h-4 animate-spin" /> : <Brain className="w-4 h-4" />}
            {analyzing ? "Analyzing..." : "Analyze Signal"}
          </Button>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
          <TabsList className="p-1 bg-gray-100/80 rounded-2xl w-fit">
            <TabsTrigger value="themes" className="gap-2 rounded-xl px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <LayoutPanelLeft className="w-4 h-4" />
              Themes
            </TabsTrigger>
            <TabsTrigger value="messages" className="gap-2 rounded-xl px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <MessageSquare className="w-4 h-4" />
              Messages
            </TabsTrigger>
            <TabsTrigger value="settings" className="gap-2 rounded-xl px-5 data-[state=active]:bg-white data-[state=active]:shadow-sm">
              <SettingsIcon className="w-4 h-4" />
              Config
            </TabsTrigger>
          </TabsList>
          
          <div className="flex items-center gap-3 bg-white border border-gray-100 p-1.5 rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 px-3 py-1 text-[11px] font-bold text-gray-400 border-r uppercase tracking-wider">
              <Clock className="w-3.5 h-3.5" />
              Period
            </div>
            {[
              { label: '7d', value: '7' },
              { label: '30d', value: '30' },
              { label: '90d', value: '90' }
            ].map(opt => (
              <button
                key={opt.value}
                onClick={() => setPeriod(opt.value)}
                className={`px-4 py-1.5 text-xs font-bold rounded-xl transition-all ${
                  period === opt.value 
                    ? 'bg-indigo-50 text-indigo-700 shadow-sm ring-1 ring-indigo-200' 
                    : 'text-gray-500 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>

        <TabsContent value="themes" className="space-y-8 mt-0 focus-visible:outline-none">
          {/* Dashboard Chart Section */}
          <div className="bg-white border border-gray-100 rounded-3xl p-8 shadow-sm overflow-hidden relative">
            <div className="absolute top-0 right-0 p-8">
              <div className="flex flex-col items-end gap-1">
                <span className="text-[10px] font-bold text-gray-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-3 h-3 text-indigo-500" />
                  Volume Dynamics
                </span>
                <span className="text-2xl font-black text-gray-900 tracking-tighter">{stats.total_data_points} <span className="text-gray-400 font-medium text-sm">messages</span></span>
              </div>
            </div>

            <div className="flex items-center gap-3 mb-8">
              <div className="p-2.5 bg-indigo-50 rounded-2xl text-indigo-600">
                <BarChart3 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-gray-900 tracking-tight">Theme Trends</h3>
                <p className="text-sm text-gray-500">Stacked volume across identified themes over time.</p>
              </div>
            </div>

            <div className="h-[300px] w-full mt-4 -ml-6">
              {chartData.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" />
                    <XAxis 
                      dataKey="date" 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                      dy={10}
                    />
                    <YAxis 
                      axisLine={false} 
                      tickLine={false} 
                      tick={{ fontSize: 10, fill: '#94a3b8', fontWeight: 600 }}
                    />
                    <ChartTooltip 
                      cursor={{ fill: '#f8fafc' }}
                      contentStyle={{ borderRadius: '16px', border: 'none', boxShadow: '0 10px 15px -3px rgb(0 0 0 / 0.1)', fontSize: '12px', fontWeight: 'bold' }}
                    />
                    <Legend 
                      verticalAlign="bottom" 
                      height={36} 
                      iconType="circle"
                      wrapperStyle={{ fontSize: '10px', fontWeight: 'bold', textTransform: 'uppercase', letterSpacing: '0.5px', paddingTop: '20px' }}
                    />
                    {themes.slice(0, 8).map((theme, index) => (
                      <Bar 
                        key={theme.id} 
                        dataKey={theme.name} 
                        stackId="a" 
                        fill={THEME_COLORS[index % THEME_COLORS.length]} 
                        radius={index === themes.slice(0, 8).length - 1 ? [4, 4, 0, 0] : [0, 0, 0, 0]}
                      />
                    ))}
                  </BarChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex flex-col items-center justify-center bg-gray-50/50 rounded-3xl border border-dashed border-gray-200">
                  <BarChart3 className="w-12 h-12 text-gray-200 mb-4" />
                  <p className="text-gray-400 font-semibold uppercase tracking-widest text-xs">Waiting for more signal...</p>
                  <p className="text-[10px] text-gray-300 mt-1 italic">Data points from different days required for trend analysis.</p>
                </div>
              )}
            </div>
          </div>

          <div className="flex gap-10">
            {/* Navigation Sidebar */}
            <div className="w-64 flex-shrink-0">
              <div className="sticky top-6 space-y-8">
                <div>
                  <div className="flex items-center justify-between mb-4 px-1">
                    <h3 className="text-xs font-black text-gray-400 uppercase tracking-[0.2em] flex items-center gap-2">
                      <Filter className="w-3.5 h-3.5" />
                      Topics
                    </h3>
                    <Button 
                      variant="ghost" 
                      size="sm" 
                      className="h-7 w-7 p-0 rounded-lg hover:bg-indigo-50 hover:text-indigo-600" 
                      onClick={() => setIsTopicOpen(true)}
                      disabled={topics.length >= 10 || mergeMode}
                    >
                      <Plus className="w-4 h-4" />
                    </Button>
                  </div>

                  <div className="space-y-1">
                    <button
                      disabled={mergeMode}
                      onClick={() => setSelectedTopicId("all")}
                      className={`w-full group flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                        selectedTopicId === "all" 
                          ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                          : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <LayoutPanelLeft className={`w-4 h-4 ${selectedTopicId === "all" ? 'text-white/70' : 'text-gray-400'}`} />
                        All Themes
                      </span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                        selectedTopicId === "all" ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500'
                      }`}>
                        {themes.length}
                      </span>
                    </button>
                    
                    {loadingTopics ? (
                      [1, 2, 3].map(i => <Skeleton key={i} className="h-12 w-full rounded-2xl" />)
                    ) : (
                      topics.map(topic => (
                        <div key={topic.id} className="group relative">
                          <button
                            disabled={mergeMode}
                            onClick={() => setSelectedTopicId(topic.id)}
                            className={`w-full group flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition-all ${
                              selectedTopicId === topic.id 
                                ? 'bg-indigo-600 text-white shadow-lg shadow-indigo-100' 
                                : 'text-gray-500 hover:bg-gray-100/80 hover:text-gray-900'
                            }`}
                          >
                            <span className="flex items-center gap-2 truncate pr-4">
                              <FolderOpen className={`w-4 h-4 flex-shrink-0 ${selectedTopicId === topic.id ? 'text-white/70' : 'text-gray-400'}`} />
                              <span className="truncate">{topic.name}</span>
                            </span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full ${
                              selectedTopicId === topic.id ? 'bg-white/20 text-white' : 'bg-gray-100 text-gray-500 group-hover:bg-white'
                            }`}>
                              {topic.theme_count}
                            </span>
                          </button>
                          {!mergeMode && (
                            <div className="absolute right-10 top-2.5 opacity-0 group-hover:opacity-100 transition-opacity">
                              <DropdownMenu>
                                <DropdownMenuTrigger asChild>
                                  <Button variant="ghost" className="h-7 w-7 p-0 rounded-lg"><MoreVertical className="w-3.5 h-3.5" /></Button>
                                </DropdownMenuTrigger>
                                <DropdownMenuContent align="end" className="rounded-xl border-gray-100">
                                  <DropdownMenuItem onClick={() => handleDeleteTopic(topic.id)} className="text-red-600 focus:text-red-600 rounded-lg">
                                    <Trash2 className="w-4 h-4 mr-2" /> Delete Topic
                                  </DropdownMenuItem>
                                </DropdownMenuContent>
                              </DropdownMenu>
                            </div>
                          )}
                        </div>
                      ))
                    )}
                  </div>
                </div>
                
                <div className="p-5 bg-gradient-to-br from-indigo-50 to-white rounded-3xl border border-indigo-100 shadow-sm shadow-indigo-50">
                  <Brain className="w-6 h-6 text-indigo-500 mb-3" />
                  <h4 className="text-xs font-black text-indigo-900 uppercase tracking-widest mb-1">AI Inference</h4>
                  <p className="text-[10px] text-indigo-700/70 leading-relaxed font-medium">
                    Themes are dynamically grouped based on semantic density and historical recurrence.
                  </p>
                </div>
              </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 min-w-0">
              {channelAlerts.length > 0 && (
                <div className="bg-amber-50 border border-amber-100 rounded-3xl p-5 flex items-start gap-4 mb-8 relative overflow-hidden group">
                  <div className="absolute top-0 right-0 w-32 h-32 bg-amber-100/50 rounded-full -mr-16 -mt-16 blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500" />
                  <div className="p-3 bg-amber-100 rounded-2xl text-amber-600 flex-shrink-0 shadow-sm shadow-amber-200">
                    <AlertTriangle className="w-5 h-5" />
                  </div>
                  <div className="flex-1 relative z-10">
                    <h4 className="text-sm font-black text-amber-900 uppercase tracking-widest mb-2 flex items-center gap-2">
                      Volume Shift Detected
                      <div className="h-1.5 w-1.5 rounded-full bg-amber-500 animate-pulse" />
                    </h4>
                    <div className="space-y-1.5">
                      {channelAlerts.map(alert => (
                        <p key={alert.id} className="text-sm text-amber-800/80 font-medium">
                          Theme <span className="font-extrabold underline cursor-pointer hover:text-amber-900 decoration-amber-200 underline-offset-4" onClick={() => handleViewTheme(themes.find(t => t.id === alert.theme_id)!)}>{alert.theme_name}</span> is 
                          {alert.alert_type === 'spike' ? ' trending up ' : ' down '} 
                          <span className="font-black text-amber-900">{Math.round(alert.percent_change)}%</span>.
                        </p>
                      ))}
                    </div>
                  </div>
                  <Button variant="ghost" size="sm" className="rounded-xl hover:bg-amber-100 text-amber-700 font-bold px-4" onClick={async () => {
                    await fetch('/api/alerts', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ action: 'mark_all_read' }) });
                    setChannelAlerts([]);
                  }}>
                    Dismiss
                  </Button>
                </div>
              )}

              <div className="flex items-center justify-between mb-6 px-1">
                <div>
                  <h2 className="text-2xl font-black text-gray-900 tracking-tight">
                    {selectedTopicId === "all" ? "Theme Repository" : selectedTopic?.name}
                  </h2>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {selectedTopicId === "all" ? "All synthesized signals across your channel." : selectedTopic?.description}
                  </p>
                </div>
                {!mergeMode && (
                  <Button onClick={() => handleOpenThemeDialog()} className="gap-2 rounded-xl h-10 px-5 bg-white text-gray-900 border border-gray-200 hover:bg-gray-50 hover:border-gray-300 shadow-sm font-bold text-sm">
                    <Plus className="w-4 h-4 text-indigo-600" />
                    Manual Theme
                  </Button>
                )}
              </div>

              {loadingThemes ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
                  {[1, 2, 3, 4, 5, 6].map(i => <Skeleton key={i} className="h-56 w-full rounded-3xl" />)}
                </div>
              ) : themes.length > 0 ? (
                <div className="grid gap-6 grid-cols-1 md:grid-cols-2 xl:grid-cols-3">
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
                <div className="flex flex-col items-center justify-center h-80 border-2 border-dashed rounded-[3rem] bg-gray-50/50 text-center p-12">
                  <div className="w-20 h-20 bg-white rounded-3xl shadow-sm flex items-center justify-center mb-6">
                    <Brain className="w-10 h-10 text-gray-200" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-900">No themes detected</h3>
                  <p className="text-sm text-gray-400 mt-2 max-w-sm font-medium">
                    {selectedTopicId === "all" 
                      ? "The signal-to-noise ratio is too low or analysis hasn't run yet."
                      : "No themes have been assigned to this topic category."}
                  </p>
                  <Button onClick={handleAnalyze} className="mt-8 rounded-2xl h-11 px-8 bg-indigo-600 hover:bg-indigo-700 shadow-xl shadow-indigo-100">
                    Run AI Analysis
                  </Button>
                </div>
              )}
            </div>
          </div>
        </TabsContent>

        <TabsContent value="messages" className="mt-0 focus-visible:outline-none">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-4 shadow-sm min-h-[600px]">
            <MessageList channelId={channel.id} />
          </div>
        </TabsContent>

        <TabsContent value="settings" className="mt-0 focus-visible:outline-none">
          <div className="bg-white border border-gray-100 rounded-[2.5rem] p-10 shadow-sm">
            <ChannelSettingsForm channel={channel} />
          </div>
        </TabsContent>
      </Tabs>

      {/* Floating Merge Bar */}
      {mergeMode && (
        <div className="fixed bottom-10 left-1/2 -translate-x-1/2 bg-gray-900/95 backdrop-blur-md shadow-2xl rounded-3xl px-8 py-4 flex items-center gap-8 z-50 animate-in fade-in slide-in-from-bottom-8">
          <div className="flex items-center gap-3 border-r pr-8 border-white/10">
            <div className="p-2 bg-indigo-500 rounded-xl">
              <Merge className="w-5 h-5 text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">Merge Source</span>
              <span className="text-sm font-bold text-white italic">{mergeSource?.name}</span>
            </div>
          </div>
          <div className="text-xs font-bold text-white/50 max-w-[140px] leading-tight">
            Select another theme card to consolidate data.
          </div>
          <Button size="sm" variant="ghost" className="rounded-xl h-10 px-6 text-white hover:bg-white/10" onClick={cancelMerge} disabled={merging}>
            Cancel
          </Button>
        </div>
      )}

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
        <DialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight">Create Topic Signal</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">Classify themes into meaningful semantic categories.</DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Topic Name</Label>
              <Input 
                value={newTopicName} 
                onChange={e => setNewTopicName(e.target.value.substring(0, 30))} 
                placeholder="e.g. User Friction"
                className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold"
              />
              <p className="text-[10px] font-black text-gray-300 text-right uppercase tracking-widest">{newTopicName.length}/30</p>
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Intent / Definition</Label>
              <Textarea 
                value={newTopicDesc} 
                onChange={e => setNewTopicDesc(e.target.value.substring(0, 200))} 
                placeholder="Feedback about confusion or struggle..."
                className="rounded-2xl min-h-[120px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed"
              />
              <p className="text-[10px] font-black text-gray-300 text-right uppercase tracking-widest">{newTopicDesc.length}/200</p>
            </div>
          </div>
          <DialogFooter className="mt-6 gap-3">
            <Button variant="outline" onClick={() => setIsTopicOpen(false)} className="rounded-2xl h-12 px-6 font-bold border-gray-200">Cancel</Button>
            <Button onClick={handleCreateTopic} disabled={!newTopicName || creatingTopic} className="rounded-2xl h-12 px-8 bg-indigo-600 hover:bg-indigo-700 font-bold shadow-lg shadow-indigo-100">
              {creatingTopic ? "Creating..." : "Generate Topic"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Create/Edit Theme Dialog */}
      <Dialog open={isThemeDialogOpen} onOpenChange={setIsThemeDialogOpen}>
        <DialogContent className="rounded-[2rem] p-8 border-none shadow-2xl">
          <DialogHeader className="mb-4">
            <DialogTitle className="text-2xl font-black tracking-tight">{editingTheme ? "Edit Theme" : "Manual Theme Definition"}</DialogTitle>
            <DialogDescription className="text-gray-500 font-medium">
              {editingTheme ? "Refine the theme's label and categorization." : "Define a custom signal to manually group messages."}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-6 py-2">
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Theme Name</Label>
              <Input 
                value={themeName} 
                onChange={e => setThemeName(e.target.value.substring(0, 60))} 
                placeholder="e.g. Login Performance"
                className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold"
              />
              <p className="text-[10px] font-black text-gray-300 text-right uppercase tracking-widest">{themeName.length}/60</p>
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Description</Label>
              <Textarea 
                value={themeDesc} 
                onChange={e => setThemeDesc(e.target.value.substring(0, 200))} 
                placeholder="Describe what messages belong here. Guides AI classification."
                className="rounded-2xl min-h-[100px] border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-medium leading-relaxed"
              />
              <p className="text-[10px] font-black text-gray-300 text-right uppercase tracking-widest">{themeDesc.length}/200</p>
            </div>
            <div className="space-y-3">
              <Label className="font-bold text-gray-700 ml-1">Topic Classification</Label>
              <Select value={themeTopicId} onValueChange={setThemeTopicId}>
                <SelectTrigger className="rounded-2xl h-12 border-gray-100 bg-gray-50/50 focus:bg-white transition-all font-bold">
                  <SelectValue placeholder="Select a topic" />
                </SelectTrigger>
                <SelectContent className="rounded-xl border-gray-100">
                  <SelectItem value="none" className="rounded-lg">No Topic Category</SelectItem>
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
              {savingTheme ? "Saving..." : "Save Theme Signal"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
