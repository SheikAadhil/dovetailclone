"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint, ChannelField, Theme } from "@/types";
import { MessageCard } from "./MessageCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Brain, X, CheckSquare, Filter, Tag, XCircle, FileCode } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useRouter } from "next/navigation";
import { 
  Dialog, 
  DialogContent, 
  DialogDescription, 
  DialogFooter, 
  DialogHeader, 
  DialogTitle 
} from "@/components/ui/dialog";
import { ScrollArea } from "@/components/ui/scroll-area";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DataPoint[]>([]);
  const [fields, setFields] = useState<ChannelField[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  const [mounted, setMounted] = useState(false);
  
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<string>("all");
  const [metadataFilters, setMetadataFilters] = useState<Record<string, string>>({});
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [isTagDialogOpen, setIsTagDialogOpen] = useState(false);
  const [tagging, setTagging] = useState(false);
  const [expandedMessage, setExpandedMessage] = useState<DataPoint | null>(null);
  const [analysisProgressOpen, setAnalysisProgressOpen] = useState(false);
  const [analysisProgress, setAnalysisProgress] = useState("");
  const [analysisStep, setAnalysisStep] = useState(0);
  const [progressLogs, setProgressLogs] = useState<{ time: string; message: string; type: 'info' | 'success' | 'error' }[]>([]);
  const [analysisError, setAnalysisError] = useState<string | null>(null);

  useEffect(() => {
    setMounted(true);
  }, []);

  const fetchFields = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/fields`);
      if (!res.ok) return;
      const data = await res.json();
      if (Array.isArray(data)) setFields(data);
    } catch (e) { console.error(e); }
  };

  const fetchThemesList = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/themes`);
      if (!res.ok) return;
      const data = await res.json();
      if (data && Array.isArray(data.themes)) {
        setThemes(data.themes);
      }
    } catch (e) { console.error(e); }
  };

  const fetchMessages = useCallback(async (reset = false) => {
    setLoading(true);
    const supabase = await createSupabaseClient();
    
    let query = supabase
      .from('data_points')
      .select('*')
      .eq('channel_id', channelId)
      .order('message_timestamp', { ascending: false })
      .range(reset ? 0 : page * 20, reset ? 19 : (page + 1) * 20 - 1);

    if (search) query = query.ilike('content', `%${search}%`);
    if (sentiment && sentiment !== 'all') query = query.eq('sentiment', sentiment);

    Object.entries(metadataFilters).forEach(([col, val]) => {
      if (val && val !== 'all') query = query.filter(`metadata->>${col}`, 'eq', val);
    });

    const { data } = await query;
    if (data) {
      if (reset) { setMessages(data); setPage(1); } 
      else { setMessages(prev => [...prev, ...data]); setPage(p => p + 1); }
      setHasMore(data.length === 20);
    }
    setLoading(false);
  }, [channelId, search, sentiment, metadataFilters, page]);

  useEffect(() => {
    if (mounted) {
      fetchFields();
      fetchThemesList();
      fetchMessages(true);
    }
  }, [channelId, mounted]);

  useEffect(() => {
    if (mounted) {
      const timer = setTimeout(() => fetchMessages(true), 300);
      return () => clearTimeout(timer);
    }
  }, [search, sentiment, metadataFilters, mounted]);

  const handleToggleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleAnalyzeSelected = async () => {
    const selectedMessages = messages.filter(m => selectedIds.has(m.id));
    const hasOnlyObservationNodes = selectedMessages.every(m => m.source === 'node' || m.source === 'markdown');

    if (hasOnlyObservationNodes) {
      if (selectedIds.size < 1) { alert("Please select at least 1 observation node."); return; }
    } else {
      if (selectedIds.size < 2) { alert("Please select at least 2 signals."); return; }
    }

    setAnalyzingBatch(true);
    setAnalysisProgressOpen(true);
    setAnalysisProgress("Starting analysis...");
    setAnalysisStep(0);
    setProgressLogs([{ time: new Date().toLocaleTimeString(), message: "Starting analysis...", type: 'info' }]);
    setAnalysisError(null);

    try {
      const res = await fetch(`/api/channels/${channelId}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'text/event-stream'
        },
        body: JSON.stringify({ messageIds: Array.from(selectedIds) })
      });

      if (!res.ok) {
        const errorData = await res.json();
        setAnalysisError(errorData.error || 'Analysis failed');
        setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `Error: ${errorData.error || 'Analysis failed'}`, type: 'error' }]);
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
                if (parsed.error) {
                  setAnalysisError(parsed.error);
                  setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `Error: ${parsed.error}`, type: 'error' }]);
                } else if (parsed.progress) {
                  setAnalysisProgress(parsed.progress);
                  if (parsed.step) setAnalysisStep(parsed.step);
                  setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: parsed.progress, type: 'info' }]);
                }
              } catch (e) {
                setAnalysisProgress(data);
                setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: data, type: 'info' }]);
              }
            }
          }
        }
      }

      setSelectedIds(new Set());
      setAnalysisProgress("Analysis complete!");
      setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: "Analysis complete!", type: 'success' }]);
      router.refresh();

      // Close dialog after a short delay
      setTimeout(() => {
        setAnalysisProgressOpen(false);
        setAnalysisProgress("");
        setAnalysisStep(0);
        setProgressLogs([]);
      }, 3000);

    } catch (e: any) {
      setAnalysisError(e.message || "Analysis failed");
      setProgressLogs(prev => [...prev, { time: new Date().toLocaleTimeString(), message: `Error: ${e.message || "Analysis failed"}`, type: 'error' }]);
    } finally {
      setAnalyzingBatch(false);
    }
  };

  const handleAnalyzeSingle = async (id: string) => {
    try {
      const res = await fetch(`/api/channels/${channelId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: [id], forceRefresh: true })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        alert("Individual signal analysis complete.");
        router.refresh();
      }
    } catch (e) { alert("Analysis failed."); }
  };

  const handleTagWithTheme = async (themeId: string) => {
    setTagging(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/themes/${themeId}/assign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedIds) })
      });
      if (res.ok) {
        alert(`Tagged ${selectedIds.size} messages.`);
        setSelectedIds(new Set());
        setIsTagDialogOpen(false);
        router.refresh();
      }
    } catch (e) { alert("Tagging failed"); } finally { setTagging(false); }
  };

  const handleDeleteMessage = async (messageId: string) => {
    try {
      const res = await fetch(`/api/data-points/${messageId}`, {
        method: 'DELETE'
      });
      if (res.ok) {
        // Remove from local state
        setMessages(prev => prev.filter(m => m.id !== messageId));
        // Also refresh to get updated counts
        router.refresh();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to delete message");
      }
    } catch (e) {
      alert("Delete failed");
    }
  };

  const updateMetadataFilter = (column: string, value: string) => {
    setMetadataFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearSelection = () => setSelectedIds(new Set());

  if (!mounted) return null;

  return (
    <div className="space-y-4 relative pb-20">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 p-4 bg-gray-50 border rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Search messages..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger className="w-[160px] bg-white border-gray-200">
              <SelectValue placeholder="All Sentiments" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {fields && fields.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200/60">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mr-2"><Filter className="w-3 h-3" /> Segment by:</div>
            {fields.map(field => (
              <div key={field.id} className="flex flex-col gap-1.5">
                {field.field_type === 'select' && (
                  <Select value={metadataFilters[field.source_column] || "all"} onValueChange={(val) => updateMetadataFilter(field.source_column, val)}>
                    <SelectTrigger className="h-8 text-xs bg-white min-w-[120px]"><span className="text-gray-400 mr-1">{field.display_name}:</span><SelectValue placeholder="All" /></SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {field.options?.map(opt => <SelectItem key={opt} value={opt}>{opt}</SelectItem>)}
                    </SelectContent>
                  </Select>
                )}
              </div>
            ))}
            {(Object.keys(metadataFilters).length > 0 || sentiment !== 'all') && (
              <Button variant="ghost" size="sm" className="h-8 text-xs text-gray-500 hover:text-red-600" onClick={() => { setMetadataFilters({}); setSentiment('all'); }}>Clear all</Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {messages && messages.map((msg) => (
          <MessageCard
            key={msg.id}
            message={msg}
            selected={selectedIds.has(msg.id)}
            onSelect={handleToggleSelect}
            onAnalyze={handleAnalyzeSingle}
            onExpand={setExpandedMessage}
            onDelete={handleDeleteMessage}
          />
        ))}
        {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>}
        {!loading && messages.length === 0 && <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed text-gray-500">No messages found.</div>}
        {!loading && hasMore && messages.length > 0 && <div className="text-center py-4"><Button variant="outline" onClick={() => fetchMessages(false)}>Load More</Button></div>}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-indigo-100 shadow-2xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 border-r pr-4 border-gray-100">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-sm text-gray-900">{selectedIds.size} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" className="rounded-full gap-2 border-indigo-200 text-indigo-600" onClick={() => setIsTagDialogOpen(true)}>
              <Tag className="w-4 h-4" />
              Tag with Theme
            </Button>

            <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-indigo-700 text-white" onClick={handleAnalyzeSelected} disabled={analyzingBatch}>
              {analyzingBatch ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Analyze Selection
            </Button>
            
            <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0 text-gray-400 hover:text-gray-600" onClick={clearSelection}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}

      {/* Tag Selection Dialog */}
      <Dialog open={isTagDialogOpen} onOpenChange={setIsTagDialogOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Tag Messages</DialogTitle>
            <DialogDescription>Assign {selectedIds.size} selected messages to a theme.</DialogDescription>
          </DialogHeader>
          <ScrollArea className="max-h-[300px] mt-4 border rounded-md">
            <div className="p-2 space-y-1">
              {!themes || themes.length === 0 ? (
                <div className="p-4 text-center text-sm text-gray-500">No themes found. Create one in the Themes tab first.</div>
              ) : (
                themes.map(t => (
                  <button
                    key={t.id}
                    onClick={() => handleTagWithTheme(t.id)}
                    disabled={tagging}
                    className="w-full text-left px-3 py-3 rounded-md hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 border border-transparent hover:border-indigo-100"
                  >
                    <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                    <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t.data_point_count} messages</span>
                  </button>
                ))
              )}
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-start">
            <Button variant="ghost" onClick={() => setIsTagDialogOpen(false)} disabled={tagging}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Side Panel for Full Observation */}
      {expandedMessage && (
        <div className="fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setExpandedMessage(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-amber-100 rounded-xl flex items-center justify-center text-amber-700">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black text-gray-900">Full Observation</h3>
                  <p className="text-xs text-gray-500 font-medium">{expandedMessage.sender_name || 'Observation Node'}</p>
                </div>
              </div>
              <button 
                onClick={() => setExpandedMessage(null)}
                className="p-2 hover:bg-gray-100 rounded-xl transition-colors"
              >
                <XCircle className="w-6 h-6 text-gray-400" />
              </button>
            </div>
            <div className="flex-1 overflow-y-auto p-6">
              <div className="prose prose-sm max-w-none prose-headings:font-black prose-headings:tracking-tight prose-h1:text-2xl prose-h2:text-xl prose-h3:text-lg prose-p:text-gray-600 prose-p:font-medium prose-p:leading-relaxed prose-p:whitespace-pre-line prose-li:text-gray-600 prose-code:text-indigo-600 prose-code:bg-indigo-50 prose-code:px-1 prose-code:rounded prose-code:before:content-none prose-code:after:content-none prose-blockquote:border-l-4 prose-blockquote:border-indigo-200 prose-blockquote:bg-indigo-50 prose-blockquote:p-3 prose-blockquote:rounded-r-lg prose-strong:text-gray-900 prose-ul:list-disc prose-ol:list-decimal prose-table:border-collapse prose-table:w-full prose-th:border prose-th:border-gray-200 prose-th:bg-gray-50 prose-th:p-2 prose-td:border prose-td:border-gray-200 prose-td:p-2 prose-tr:border prose-tr:border-gray-200 prose-img:rounded-xl prose-a:text-indigo-600 prose-a:no-underline hover:prose-a:underline">
                <ReactMarkdown 
                  remarkPlugins={[remarkGfm]}
                >
                  {expandedMessage.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Analysis Progress Dialog */}
      <Dialog open={analysisProgressOpen} onOpenChange={setAnalysisProgressOpen}>
        <DialogContent className="sm:max-w-lg max-h-[80vh]">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Brain className="w-5 h-5 text-indigo-600" />
              Analyzing Signals
            </DialogTitle>
            <DialogDescription>
              {selectedIds.size} signals selected for analysis
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-4">
            {/* Progress Steps */}
            <div className="flex items-center gap-4 text-sm">
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${analysisStep >= 1 ? 'bg-green-500' : 'bg-gray-300'} ${analyzingBatch && analysisStep < 1 ? 'animate-pulse' : ''}`} />
                <span className={analysisStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  Analyzing
                </span>
              </div>
              <div className="flex items-center gap-2">
                <div className={`w-3 h-3 rounded-full ${!analyzingBatch && analysisStep >= 1 ? 'bg-green-500' : 'bg-gray-300'}`} />
                <span className={!analyzingBatch && analysisStep >= 1 ? 'text-gray-900 font-medium' : 'text-gray-500'}>
                  Save
                </span>
              </div>
            </div>

            {/* Progress Log - Scrollable */}
            <div className="bg-gray-900 rounded-lg p-3 max-h-64 overflow-y-auto">
              <div className="space-y-1.5">
                {progressLogs.map((log, index) => (
                  <div key={index} className="flex items-start gap-2 text-xs font-mono">
                    <span className="text-gray-500 shrink-0">[{log.time}]</span>
                    {log.type === 'error' && <span className="text-red-400">✗</span>}
                    {log.type === 'success' && <span className="text-green-400">✓</span>}
                    {log.type === 'info' && <span className="text-blue-400">›</span>}
                    <span className={
                      log.type === 'error' ? 'text-red-300' :
                      log.type === 'success' ? 'text-green-300' :
                      'text-gray-300'
                    }>
                      {log.message}
                    </span>
                  </div>
                ))}
                {analyzingBatch && (
                  <div className="flex items-center gap-2 text-xs font-mono text-gray-500">
                    <Loader2 className="w-3 h-3 animate-spin" />
                    <span>Waiting for response...</span>
                  </div>
                )}
              </div>
            </div>

            {/* Error Display */}
            {analysisError && (
              <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                <p className="text-sm text-red-700 font-medium">Error</p>
                <p className="text-sm text-red-600 mt-1">{analysisError}</p>
              </div>
            )}
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setAnalysisProgressOpen(false);
                setAnalyzingBatch(false);
                setProgressLogs([]);
                setAnalysisError(null);
              }}
              disabled={analyzingBatch}
            >
              {analyzingBatch ? "Processing..." : "Close"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
