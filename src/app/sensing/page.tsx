"use client";

import { useState, useEffect } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { Channel } from "@/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Loader2, Radar, TrendingUp, AlertTriangle, Zap, Copy, ExternalLink, ArrowRight } from "lucide-react";
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
      date?: string;
      relevance: string;
    }>;
    weak_signals?: Array<{
      description: string;
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
  const [selectedQuery, setSelectedQuery] = useState<SensingQuery | null>(null);
  const [copyDialogOpen, setCopyDialogOpen] = useState(false);
  const [channels, setChannels] = useState<Channel[]>([]);
  const [selectedChannel, setSelectedChannel] = useState("");
  const [selectedSignals, setSelectedSignals] = useState<number[]>([]);
  const [copying, setCopying] = useState(false);

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
        const execRes = await fetch(`/api/sensing/${data.id}/execute`, {
          method: 'POST'
        });
        await fetchQueries();

        // Refresh until completed
        const poll = setInterval(async () => {
          await fetchQueries();
          const updated = queries.find(q => q.id === data.id);
          if (updated?.status === 'completed' || updated?.status === 'failed') {
            clearInterval(poll);
            setSelectedQuery(updated || null);
          }
        }, 2000);

        // Clear poll after 5 minutes
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
    setSelectedQuery(query);
    setSelectedSignals(query.results.signals?.map((_, i) => i) || []);
    setCopyDialogOpen(true);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed': return 'bg-green-100 text-green-800';
      case 'processing': return 'bg-blue-100 text-blue-800';
      case 'failed': return 'bg-red-100 text-red-800';
      default: return 'bg-gray-100 text-gray-800';
    }
  };

  const getDirectionIcon = (direction: string) => {
    switch (direction) {
      case 'rising': return <TrendingUp className="w-4 h-4 text-green-500" />;
      case 'falling': return <TrendingUp className="w-4 h-4 text-red-500 rotate-180" />;
      default: return <TrendingUp className="w-4 h-4 text-gray-400" />;
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center gap-3">
        <div className="p-2 bg-indigo-100 rounded-lg">
          <Radar className="w-6 h-6 text-indigo-600" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Sensing</h1>
          <p className="text-sm text-gray-500">Strategic foresight research tool</p>
        </div>
      </div>

      {/* New Query Form */}
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">New Research</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <Textarea
              placeholder="What do you want to sense? E.g., 'AI trends in healthcare 2025', 'EV market developments', 'remote work future trends'"
              value={newQuery}
              onChange={(e) => setNewQuery(e.target.value)}
              className="min-h-[100px]"
            />
            <Button type="submit" disabled={submitting || !newQuery.trim()}>
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                  Starting Research...
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

      {/* Previous Queries */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold text-gray-900">Research History</h2>
        {queries.length === 0 ? (
          <p className="text-gray-500 text-sm">No research queries yet. Start by researching a topic above.</p>
        ) : (
          <div className="grid gap-4">
            {queries.map((query) => (
              <Card key={query.id} className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => setSelectedQuery(query)}>
                <CardContent className="p-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <h3 className="font-medium text-gray-900">{query.query}</h3>
                      <p className="text-sm text-gray-500 mt-1">
                        {new Date(query.created_at).toLocaleDateString()} at {new Date(query.created_at).toLocaleTimeString()}
                      </p>
                    </div>
                    <Badge className={getStatusColor(query.status)}>
                      {query.status}
                    </Badge>
                  </div>

                  {query.status === 'completed' && query.results && (
                    <div className="mt-3 flex gap-4 text-sm">
                      {query.results.signals?.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <Zap className="w-3 h-3" /> {query.results.signals.length} signals
                        </span>
                      )}
                      {query.results.weak_signals?.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <AlertTriangle className="w-3 h-3" /> {query.results.weak_signals.length} weak signals
                        </span>
                      )}
                      {query.results.trends?.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <TrendingUp className="w-3 h-3" /> {query.results.trends.length} trends
                        </span>
                      )}
                      {query.results.drivers?.length > 0 && (
                        <span className="flex items-center gap-1 text-gray-600">
                          <ArrowRight className="w-3 h-3" /> {query.results.drivers.length} drivers
                        </span>
                      )}
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      {/* Results Dialog */}
      <Dialog open={!!selectedQuery && selectedQuery?.status === 'completed'} onOpenChange={(open) => !open && setSelectedQuery(null)}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>{selectedQuery?.query}</DialogTitle>
            <DialogDescription>
              Strategic foresight research results
            </DialogDescription>
          </DialogHeader>

          {selectedQuery?.results && (
            <div className="space-y-6">
              {/* Signals */}
              {selectedQuery.results.signals && selectedQuery.results.signals.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <Zap className="w-5 h-5 text-indigo-600" />
                    Signals ({selectedQuery.results.signals.length})
                  </h3>
                  <div className="space-y-2 max-h-60 overflow-y-auto">
                    {selectedQuery.results.signals.map((signal, i) => (
                      <div key={i} className="p-3 bg-gray-50 rounded-lg">
                        <div className="flex items-start justify-between">
                          <div>
                            <h4 className="font-medium text-gray-900">{signal.title}</h4>
                            <p className="text-sm text-gray-600 mt-1">{signal.description}</p>
                            <div className="flex gap-2 mt-2">
                              <span className="text-xs text-gray-500">{signal.source}</span>
                              {signal.date && <span className="text-xs text-gray-400">• {signal.date}</span>}
                            </div>
                          </div>
                          {signal.source_url && (
                            <a href={signal.source_url} target="_blank" rel="noopener noreferrer" className="text-indigo-600 hover:text-indigo-800">
                              <ExternalLink className="w-4 h-4" />
                            </a>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    className="mt-3"
                    onClick={() => openCopyDialog(selectedQuery)}
                  >
                    <Copy className="w-4 h-4 mr-2" />
                    Copy Signals to Channel
                  </Button>
                </div>
              )}

              {/* Weak Signals */}
              {selectedQuery.results.weak_signals && selectedQuery.results.weak_signals.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <AlertTriangle className="w-5 h-5 text-amber-500" />
                    Weak Signals ({selectedQuery.results.weak_signals.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedQuery.results.weak_signals.map((signal, i) => (
                      <div key={i} className="p-3 bg-amber-50 rounded-lg">
                        <p className="text-sm text-gray-800">{signal.description}</p>
                        <p className="text-xs text-gray-500 mt-1">Potential impact: {signal.potential_impact}</p>
                        <Badge variant="outline" className="mt-2 text-xs">
                          Uncertainty: {signal.uncertainty_level}
                        </Badge>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Trends */}
              {selectedQuery.results.trends && selectedQuery.results.trends.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-green-600" />
                    Trends ({selectedQuery.results.trends.length})
                  </h3>
                  <div className="space-y-2">
                    {selectedQuery.results.trends.map((trend, i) => (
                      <div key={i} className="p-3 bg-green-50 rounded-lg">
                        <div className="flex items-center gap-2">
                          {getDirectionIcon(trend.direction)}
                          <h4 className="font-medium text-gray-900">{trend.name}</h4>
                          <Badge variant="outline" className="text-xs capitalize">
                            {trend.direction}
                          </Badge>
                        </div>
                        <p className="text-sm text-gray-600 mt-1">{trend.description}</p>
                        {trend.evidence && trend.evidence.length > 0 && (
                          <ul className="text-xs text-gray-500 mt-2 list-disc list-inside">
                            {trend.evidence.map((e, j) => (
                              <li key={j}>{e}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Drivers */}
              {selectedQuery.results.drivers && selectedQuery.results.drivers.length > 0 && (
                <div>
                  <h3 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                    <ArrowRight className="w-5 h-5 text-purple-600" />
                    Drivers ({selectedQuery.results.drivers.length})
                  </h3>
                  <div className="grid grid-cols-2 gap-2">
                    {selectedQuery.results.drivers.map((driver, i) => (
                      <div key={i} className="p-3 bg-purple-50 rounded-lg">
                        <Badge className="bg-purple-200 text-purple-800 text-xs mb-1">
                          {driver.category}
                        </Badge>
                        <p className="text-sm text-gray-800">{driver.description}</p>
                        <p className="text-xs text-gray-500 mt-1">{driver.impact}</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {selectedQuery?.status === 'processing' && (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600 mr-2" />
              <span className="text-gray-600">Research in progress...</span>
            </div>
          )}
        </DialogContent>
      </Dialog>

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
              <div className="mt-1 space-y-2 max-h-60 overflow-y-auto border rounded-lg p-2">
                {selectedQuery?.results.signals?.map((signal, i) => (
                  <label key={i} className="flex items-start gap-2 p-2 hover:bg-gray-50 rounded cursor-pointer">
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
                  <Loader2 className="w-4 h-4 mr-2 animate-spin" />
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
