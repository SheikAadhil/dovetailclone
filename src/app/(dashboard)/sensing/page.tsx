"use client";

import { useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Radar,
  TrendingUp,
  AlertTriangle,
  Zap,
  Copy,
  ExternalLink,
  ArrowRight,
  Search,
  Globe,
  Calendar,
  BarChart3,
  Target,
  Brain,
  Sparkles,
  ChevronDown,
  ChevronRight,
  CheckCircle2,
  Clock,
  XCircle,
  X
} from "lucide-react";

interface SensingQuery {
  id: string;
  query: string;
  status: 'pending' | 'processing' | 'completed' | 'failed';
  results: {
    signals?: Array<{
      title: string;
      description: string;
      source: string;
      source_url?: string;
      source_type?: string;
      date?: string;
      relevance: string;
    }>;
    weak_signals?: Array<{
      description: string;
      source?: string;
      source_url?: string;
      source_type?: string;
      potential_impact: string;
      uncertainty_level: string;
    }>;
    trends?: Array<{
      name: string;
      direction: string;
      description: string;
      evidence: string[];
    }>;
    drivers?: Array<{
      category: string;
      description: string;
      impact: string;
    }>;
  };
  created_at: string;
  completed_at?: string;
}

export default function SensingPage() {
  const [queries, setQueries] = useState<SensingQuery[]>([]);
  const [loading, setLoading] = useState(true);
  const [newQuery, setNewQuery] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [selectedQueryId, setSelectedQueryId] = useState<string | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedSignals, setSelectedSignals] = useState<number[]>([]);
  const [copying, setCopying] = useState(false);
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>({
    signals: true,
    weakSignals: true,
    trends: true,
    drivers: true
  });

  const selectedQuery = queries.find(q => q.id === selectedQueryId) || null;

  useEffect(() => {
    fetchQueries();
    fetchChannels();
  }, []);

  const fetchQueries = async () => {
    const res = await fetch('/api/sensing');
    const data = await res.json();
    setQueries(data);
    setLoading(false);
  };

  const fetchChannels = async () => {
    const res = await fetch('/api/channels');
    const data = await res.json();
    setChannels(data);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newQuery.trim()) return;

    setSubmitting(true);
    try {
      const res = await fetch('/api/sensing', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: newQuery })
      });
      const data = await res.json();

      if (res.ok) {
        setNewQuery("");
        // Immediately trigger the research
        await fetch(`/api/sensing/${data.id}/execute`, { method: 'POST' });

        // Select the new query and poll for completion
        setSelectedQueryId(data.id);

        const poll = setInterval(async () => {
          const res = await fetch('/api/sensing');
          const updatedQueries = await res.json();
          setQueries(updatedQueries);
          const updated = updatedQueries.find((q: SensingQuery) => q.id === data.id);
          if (updated?.status === 'completed' || updated?.status === 'failed') {
            clearInterval(poll);
          }
        }, 3000);

        setTimeout(() => clearInterval(poll), 300000);
      }
    } catch (error) {
      console.error(error);
    } finally {
      setSubmitting(false);
    }
  };

  const handleCopyToChannel = async () => {
    if (!selectedChannel || selectedSignals.length === 0) return;

    setCopying(true);
    try {
      const res = await fetch('/api/sensing/copy-to-channel', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          sensing_query_id: selectedQuery?.id,
          channel_id: selectedChannel,
          signal_indices: selectedSignals
        })
      });

      if (res.ok) {
        setCopyDialogOpen(false);
        setSelectedSignals([]);
        alert(`Successfully copied ${selectedSignals.length} signals to channel!`);
      } else {
        const data = await res.json();
        alert(data.error || 'Failed to copy signals');
      }
    } catch (error) {
      alert('Failed to copy signals');
    } finally {
      setCopying(false);
    }
  };

  const openCopyDialog = (query: SensingQuery) => {
    setSelectedSignals(query.results.signals?.map((_, i) => i) || []);
    setCopyDialogOpen(true);
  };

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed': return <CheckCircle2 className="w-4 h-4 text-green-500" />;
      case 'processing': return <Clock className="w-4 h-4 text-blue-500 animate-pulse" />;
      case 'failed': return <XCircle className="w-4 h-4 text-red-500" />;
      default: return <Clock className="w-4 h-4 text-gray-400" />;
    }
  };

  const getDirectionColor = (direction: string) => {
    switch (direction) {
      case 'rising': return 'from-green-500/20 to-green-500/5 border-green-200';
      case 'falling': return 'from-red-500/20 to-red-500/5 border-red-200';
      default: return 'from-gray-500/20 to-gray-500/5 border-gray-200';
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      social: 'bg-pink-100 text-pink-700 border-pink-200',
      technological: 'bg-blue-100 text-blue-700 border-blue-200',
      economic: 'bg-green-100 text-green-700 border-green-200',
      environmental: 'bg-emerald-100 text-emerald-700 border-emerald-200',
      political: 'bg-purple-100 text-purple-700 border-purple-200',
      legal: 'bg-orange-100 text-orange-700 border-orange-200',
      ethical: 'bg-indigo-100 text-indigo-700 border-indigo-200',
    };
    return colors[category.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  const getSourceTypeColor = (sourceType: string) => {
    const colors: Record<string, string> = {
      social: 'bg-pink-100 text-pink-700 border-pink-200',
      news: 'bg-blue-100 text-blue-700 border-blue-200',
      research: 'bg-purple-100 text-purple-700 border-purple-200',
      community: 'bg-green-100 text-green-700 border-green-200',
      corporate_market: 'bg-amber-100 text-amber-700 border-amber-200',
      general_web: 'bg-gray-100 text-gray-700 border-gray-200',
    };
    return colors[sourceType.toLowerCase()] || 'bg-gray-100 text-gray-700 border-gray-200';
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-indigo-200 border-t-indigo-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-gray-500">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col md:flex-row gap-4 md:gap-6">
      {/* Left Panel - Query List */}
      <div className="w-full md:w-80 flex-shrink-0 flex flex-col">
        {/* Search Input */}
        <Card className="mb-4 border-0 shadow-sm bg-gradient-to-br from-indigo-50 to-white">
          <CardContent className="p-4">
            <form onSubmit={handleSubmit} className="space-y-3">
              <div className="relative">
                <Search className="absolute left-3 top-3 md:top-1/2 md:-translate-y-1/2 w-4 h-4 text-gray-400" />
                <Textarea
                  placeholder="What do you want to sense?"
                  value={newQuery}
                  onChange={(e) => setNewQuery(e.target.value)}
                  className="pl-10 min-h-[80px] resize-none border-indigo-100 focus:border-indigo-300 focus:ring-indigo-200"
                />
              </div>
              <Button
                type="submit"
                disabled={submitting || !newQuery.trim()}
                className="w-full bg-indigo-600 hover:bg-indigo-700 text-sm sm:text-base"
              >
                {submitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                    Researching...
                  </>
                ) : (
                  <>
                    <Radar className="w-4 h-4 mr-2" />
                    Start Sensing
                  </>
                )}
              </Button>
            </form>
          </CardContent>
        </Card>

        {/* Query History */}
        <div className="flex-1 overflow-auto">
          <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3 px-1">
            Research History
          </h3>
          <div className="space-y-2">
            {queries.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-8">
                No research yet. Start by entering a topic above.
              </p>
            ) : (
              queries.map((query) => (
                <button
                  key={query.id}
                  onClick={() => setSelectedQueryId(query.id)}
                  className={`w-full text-left p-3 rounded-xl transition-all ${
                    selectedQueryId === query.id
                      ? 'bg-indigo-50 border-indigo-200 border shadow-sm'
                      : 'hover:bg-gray-50 border border-transparent'
                  }`}
                >
                  <div className="flex items-start gap-2">
                    {getStatusIcon(query.status)}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium text-gray-900 text-sm truncate">{query.query}</p>
                      <p className="text-xs text-gray-400 mt-1">
                        {new Date(query.created_at).toLocaleDateString()}
                      </p>
                    </div>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Right Panel - Results */}
      <div className="flex-1 overflow-auto min-w-0">
        {!selectedQuery ? (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <div className="w-20 h-20 bg-gradient-to-br from-indigo-100 to-purple-100 rounded-2xl flex items-center justify-center mb-4">
              <Brain className="w-10 h-10 text-indigo-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Strategic Foresight</h3>
            <p className="text-gray-500 max-w-md">
              Select a research query from the left panel to view signals, trends, and drivers, or create a new research to discover emerging patterns.
            </p>
          </div>
        ) : selectedQuery.status === 'processing' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="relative mb-6">
              <div className="w-24 h-24 border-4 border-indigo-100 border-t-indigo-500 rounded-full animate-spin" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Sparkles className="w-8 h-8 text-indigo-500 animate-pulse" />
              </div>
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Analyzing {selectedQuery.query}</h3>
            <p className="text-gray-500">Scanning sources and identifying patterns...</p>
          </div>
        ) : selectedQuery.status === 'failed' ? (
          <div className="flex flex-col items-center justify-center h-full">
            <div className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mb-4">
              <XCircle className="w-10 h-10 text-red-500" />
            </div>
            <h3 className="text-lg font-semibold text-gray-900 mb-2">Research Failed</h3>
            <p className="text-gray-500">Please try again with a different query.</p>
          </div>
        ) : (
          <div className="space-y-6 pb-8">
            {/* Header */}
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div>
                <h2 className="text-xl font-bold text-gray-900">{selectedQuery.query}</h2>
                <p className="text-sm text-gray-500 mt-1">
                  Completed {new Date(selectedQuery.completed_at || selectedQuery.created_at).toLocaleString()}
                </p>
              </div>
              <Button onClick={() => openCopyDialog(selectedQuery)} className="bg-indigo-600 hover:bg-indigo-700 text-sm">
                <Copy className="w-4 h-4 mr-2" />
                Copy to Channel
              </Button>
            </div>

            {/* Signals Section */}
            {selectedQuery.results.signals && selectedQuery.results.signals.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('signals')}
                  className="flex items-center gap-2 text-left w-full group"
                >
                  {expandedSections.signals ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="p-2 bg-indigo-100 rounded-lg">
                    <Zap className="w-4 h-4 text-indigo-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Signals</h3>
                  <Badge variant="secondary" className="bg-indigo-50 text-indigo-700">
                    {selectedQuery.results.signals.length}
                  </Badge>
                </button>

                {expandedSections.signals && (
                  <div className="grid grid-cols-1 gap-3 pl-7">
                    {selectedQuery.results.signals.map((signal, i) => (
                      <Card key={i} className="border-indigo-100 hover:border-indigo-200 hover:shadow-md transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                <h4 className="font-medium text-gray-900">{signal.title}</h4>
                                {signal.source_type && (
                                  <Badge className={`text-xs border ${getSourceTypeColor(signal.source_type)}`}>
                                    {signal.source_type.replace('_', ' ')}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    signal.relevance === 'high' ? 'border-green-300 text-green-700' :
                                    signal.relevance === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                    'border-gray-300 text-gray-600'
                                  }`}
                                >
                                  {signal.relevance}
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-600">{signal.description}</p>
                              <div className="flex items-center gap-3 mt-2">
                                <span className="flex items-center gap-1 text-xs text-gray-500">
                                  <Globe className="w-3 h-3" />
                                  {signal.source}
                                </span>
                                {signal.date && (
                                  <span className="flex items-center gap-1 text-xs text-gray-400">
                                    <Calendar className="w-3 h-3" />
                                    {signal.date}
                                  </span>
                                )}
                              </div>
                            </div>
                            {signal.source_url && (
                              <a
                                href={signal.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-indigo-50 rounded-lg transition-all"
                              >
                                <ExternalLink className="w-4 h-4 text-indigo-600" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Weak Signals Section */}
            {selectedQuery.results.weak_signals && selectedQuery.results.weak_signals.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('weakSignals')}
                  className="flex items-center gap-2 text-left w-full group"
                >
                  {expandedSections.weakSignals ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="p-2 bg-amber-100 rounded-lg">
                    <AlertTriangle className="w-4 h-4 text-amber-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Weak Signals</h3>
                  <Badge variant="secondary" className="bg-amber-50 text-amber-700">
                    {selectedQuery.results.weak_signals.length}
                  </Badge>
                </button>

                {expandedSections.weakSignals && (
                  <div className="grid grid-cols-1 gap-3 pl-7">
                    {selectedQuery.results.weak_signals.map((signal, i) => (
                      <Card key={i} className="border-amber-100 bg-gradient-to-r from-amber-50/50 to-white hover:shadow-md transition-all group">
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between gap-4">
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-2 flex-wrap">
                                {signal.source_type && (
                                  <Badge className={`text-xs border ${getSourceTypeColor(signal.source_type)}`}>
                                    {signal.source_type.replace('_', ' ')}
                                  </Badge>
                                )}
                                <Badge
                                  variant="outline"
                                  className={`text-xs ${
                                    signal.uncertainty_level === 'high' ? 'border-red-300 text-red-700' :
                                    signal.uncertainty_level === 'medium' ? 'border-yellow-300 text-yellow-700' :
                                    'border-green-300 text-green-700'
                                  }`}
                                >
                                  {signal.uncertainty_level} uncertainty
                                </Badge>
                              </div>
                              <p className="text-sm text-gray-800 font-medium">{signal.description}</p>
                              {signal.source && (
                                <div className="mt-2 flex items-center gap-1 text-xs text-gray-500">
                                  <Globe className="w-3 h-3" />
                                  <span>{signal.source}</span>
                                </div>
                              )}
                              <div className="mt-2 flex items-center gap-4">
                                <span className="text-xs text-gray-500">
                                  <span className="font-medium">Impact:</span> {signal.potential_impact}
                                </span>
                              </div>
                            </div>
                            {signal.source_url && (
                              <a
                                href={signal.source_url}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="opacity-0 group-hover:opacity-100 p-2 hover:bg-amber-50 rounded-lg transition-all"
                              >
                                <ExternalLink className="w-4 h-4 text-amber-600" />
                              </a>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Trends Section */}
            {selectedQuery.results.trends && selectedQuery.results.trends.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('trends')}
                  className="flex items-center gap-2 text-left w-full group"
                >
                  {expandedSections.trends ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="p-2 bg-green-100 rounded-lg">
                    <BarChart3 className="w-4 h-4 text-green-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Trends</h3>
                  <Badge variant="secondary" className="bg-green-50 text-green-700">
                    {selectedQuery.results.trends.length}
                  </Badge>
                </button>

                {expandedSections.trends && (
                  <div className="grid grid-cols-1 gap-3 pl-7">
                    {selectedQuery.results.trends.map((trend, i) => (
                      <Card
                        key={i}
                        className={`border bg-gradient-to-r ${getDirectionColor(trend.direction)} hover:shadow-md transition-all`}
                      >
                        <CardContent className="p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex items-center gap-2 mb-2">
                              {trend.direction === 'rising' && <TrendingUp className="w-5 h-5 text-green-600" />}
                              {trend.direction === 'falling' && <TrendingUp className="w-5 h-5 text-red-500 rotate-180" />}
                              {trend.direction === 'stable' && <TrendingUp className="w-5 h-5 text-gray-400" />}
                              <h4 className="font-semibold text-gray-900">{trend.name}</h4>
                              <Badge
                                variant="outline"
                                className={`text-xs capitalize ${
                                  trend.direction === 'rising' ? 'border-green-400 text-green-700' :
                                  trend.direction === 'falling' ? 'border-red-400 text-red-700' :
                                  'border-gray-400 text-gray-600'
                                }`}
                              >
                                {trend.direction}
                              </Badge>
                            </div>
                          </div>
                          <p className="text-sm text-gray-700 mb-2">{trend.description}</p>
                          {trend.evidence && trend.evidence.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-gray-200/50">
                              <p className="text-xs font-medium text-gray-500 mb-1">Evidence:</p>
                              <ul className="text-xs text-gray-600 space-y-1">
                                {trend.evidence.map((e, j) => (
                                  <li key={j} className="flex items-start gap-1">
                                    <span className="text-gray-400">•</span>
                                    {e}
                                  </li>
                                ))}
                              </ul>
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Drivers Section */}
            {selectedQuery.results.drivers && selectedQuery.results.drivers.length > 0 && (
              <div className="space-y-3">
                <button
                  onClick={() => toggleSection('drivers')}
                  className="flex items-center gap-2 text-left w-full group"
                >
                  {expandedSections.drivers ? (
                    <ChevronDown className="w-5 h-5 text-gray-400" />
                  ) : (
                    <ChevronRight className="w-5 h-5 text-gray-400" />
                  )}
                  <div className="p-2 bg-purple-100 rounded-lg">
                    <Target className="w-4 h-4 text-purple-600" />
                  </div>
                  <h3 className="font-semibold text-gray-900">Drivers</h3>
                  <Badge variant="secondary" className="bg-purple-50 text-purple-700">
                    {selectedQuery.results.drivers.length}
                  </Badge>
                </button>

                {expandedSections.drivers && (
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pl-7">
                    {selectedQuery.results.drivers.map((driver, i) => (
                      <Card
                        key={i}
                        className="border-purple-100 bg-gradient-to-br from-purple-50/50 to-white hover:shadow-md transition-all"
                      >
                        <CardContent className="p-4">
                          <Badge className={`text-xs mb-2 border ${getCategoryColor(driver.category)}`}>
                            {driver.category}
                          </Badge>
                          <p className="text-sm text-gray-800 font-medium">{driver.description}</p>
                          <p className="text-xs text-gray-500 mt-2">
                            <span className="font-medium">Impact:</span> {driver.impact}
                          </p>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Copy to Channel Dialog */}
      <Dialog open={copyDialogOpen} onOpenChange={setCopyDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Copy Signals to Channel</DialogTitle>
            <DialogDescription>
              Select signals to copy and choose a target channel
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium text-gray-700">Target Channel</label>
              <Select value={selectedChannel} onValueChange={setSelectedChannel}>
                <SelectTrigger className="mt-1">
                  <SelectValue placeholder="Select a channel" />
                </SelectTrigger>
                <SelectContent>
                  {channels.map((channel) => (
                    <SelectItem key={channel.id} value={channel.id}>
                      {channel.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="text-sm font-medium text-gray-700">Select Signals</label>
              <ScrollArea className="mt-1 h-[200px] border rounded-lg p-2">
                <div className="space-y-2">
                  {selectedQuery?.results.signals?.map((signal, i) => (
                    <label
                      key={i}
                      className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded-lg cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={selectedSignals.includes(i)}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setSelectedSignals([...selectedSignals, i]);
                          } else {
                            setSelectedSignals(selectedSignals.filter(s => s !== i));
                          }
                        }}
                        className="mt-1"
                      />
                      <div>
                        <p className="text-sm font-medium">{signal.title}</p>
                        <p className="text-xs text-gray-500">{signal.source}</p>
                      </div>
                    </label>
                  ))}
                </div>
              </ScrollArea>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setCopyDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleCopyToChannel}
              disabled={!selectedChannel || selectedSignals.length === 0 || copying}
            >
              {copying ? (
                <>
                  <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin mr-2" />
                  Copying...
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4 mr-2" />
                  Copy {selectedSignals.length} Signal{selectedSignals.length !== 1 ? 's' : ''}
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
