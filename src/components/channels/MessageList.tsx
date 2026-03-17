"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint, ChannelField, Theme } from "@/types";
import { DataPointTableRow } from "./DataPointTableRow";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Brain, X, CheckSquare, Filter, Tag, XCircle, FileCode, MoreHorizontal, Calendar } from "lucide-react";
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
import { Checkbox } from "@/components/ui/checkbox";
import { Skeleton } from "@/components/ui/skeleton";

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
  const [worklogEntries, setWorklogEntries] = useState<any[]>([]);
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

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedIds(new Set(messages.map(m => m.id)));
    } else {
      setSelectedIds(new Set());
    }
  };

  const handleAnalyzeSelected = async () => {
    setAnalyzingBatch(true);
    setAnalysisProgressOpen(true);
    setAnalysisProgress("Starting...");
    try {
      const res = await fetch(`/api/channels/${channelId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedIds) })
      });
      if (!res.ok) throw new Error("Analysis failed");
      setSelectedIds(new Set());
      router.refresh();
      setAnalysisProgressOpen(false);
    } catch (e: any) {
      setAnalysisError(e.message);
    } finally {
      setAnalyzingBatch(false);
    }
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
        setSelectedIds(new Set());
        setIsTagDialogOpen(false);
        router.refresh();
      }
    } catch (e) { console.error(e); } finally { setTagging(false); }
  };

  if (!mounted) return null;

  return (
    <div className="flex flex-col bg-white overflow-hidden text-[#15181E]">
      {/* Filters Bar */}
      <div className="px-4 py-4 flex items-center gap-2 border-b border-gray-100/50">
        <Button variant="ghost" className="h-9 px-3 flex items-center gap-2 text-[14px] font-medium bg-[#F6F7FB] text-[#15181E] rounded-md hover:bg-gray-100 shadow-none border-none">
          <Calendar className="w-5 h-5" />
          All time
        </Button>
        <Select value={sentiment} onValueChange={(v) => setSentiment(v ?? "all")}>
          <SelectTrigger className="h-9 px-3 text-[14px] font-medium text-[#15181E] bg-white border-none shadow-none hover:bg-gray-100 w-[140px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
        <Button variant="ghost" className="h-9 px-3 text-[14px] font-medium text-[#15181E] hover:bg-gray-100">
          Add filter
        </Button>
      </div>

      {/* Table Section */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="border-b border-gray-100 h-[48px] bg-gray-50/50">
            <th className="w-12 px-4 py-2">
              <div className="flex items-center justify-center">
                <Checkbox 
                  checked={selectedIds.size === messages.length && messages.length > 0} 
                  onCheckedChange={(checked) => handleSelectAll(!!checked)}
                  className="w-4 h-4 border-gray-300 rounded-[2px]"
                />
              </div>
            </th>
            <th className="px-4 py-2" colSpan={3}>
              <div className="flex items-center justify-between">
                <span className="text-[14px] font-medium text-[#15181E]">
                  {selectedIds.size > 0 ? `${selectedIds.size} data points selected` : "Data points"}
                </span>
                <div className="flex items-center gap-1">
                  <div className="relative mr-2">
                    <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input 
                      placeholder="Search..." 
                      className="h-8 w-48 pl-9 bg-white border-gray-200 text-xs rounded-md focus-visible:ring-1 focus-visible:ring-indigo-500" 
                      value={search} 
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                  {selectedIds.size > 0 && (
                    <div className="flex items-center gap-1">
                      <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-[#15181E] bg-[#F6F7FB]" onClick={() => setIsTagDialogOpen(true)}>
                        Tag
                      </Button>
                      <Button variant="ghost" className="h-8 px-3 text-[14px] font-medium text-white bg-indigo-600 hover:bg-indigo-700" onClick={handleAnalyzeSelected}>
                        Analyze
                      </Button>
                    </div>
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
          {loading && page === 0 ? (
            [1, 2, 3, 4, 5].map(i => (
              <tr key={i} className="border-b border-gray-50 h-[72px]">
                <td className="p-4"><Skeleton className="h-4 w-4 rounded" /></td>
                <td className="p-4"><Skeleton className="h-12 w-full rounded" /></td>
                <td className="p-4"><Skeleton className="h-4 w-[100px] rounded mx-auto" /></td>
                <td className="p-4 text-right"><Skeleton className="h-4 w-6 rounded ml-auto" /></td>
              </tr>
            ))
          ) : messages.map((msg) => (
            <DataPointTableRow 
              key={msg.id} 
              message={msg} 
              isSelected={selectedIds.has(msg.id)}
              onSelect={handleToggleSelect}
              onExpand={setExpandedMessage}
            />
          ))}
        </tbody>
      </table>

      {!loading && hasMore && messages.length > 0 && (
        <div className="p-4 flex justify-center border-t border-gray-100">
          <Button variant="ghost" className="text-xs font-semibold text-indigo-600" onClick={() => fetchMessages(false)}>
            Load more
          </Button>
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
              {themes.map(t => (
                <button
                  key={t.id}
                  onClick={() => handleTagWithTheme(t.id)}
                  disabled={tagging}
                  className="w-full text-left px-3 py-3 rounded-md hover:bg-indigo-50 transition-colors flex flex-col gap-0.5 border border-transparent hover:border-indigo-100"
                >
                  <span className="font-semibold text-sm text-gray-900">{t.name}</span>
                  <span className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">{t.data_point_count} messages</span>
                </button>
              ))}
            </div>
          </ScrollArea>
          <DialogFooter className="sm:justify-start">
            <Button variant="ghost" onClick={() => setIsTagDialogOpen(false)} disabled={tagging}>Cancel</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Side Panel for Full Observation */}
      {expandedMessage && (
        <div className="fixed inset-0 z-[100] flex justify-end">
          <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setExpandedMessage(null)} />
          <div className="relative w-full max-w-xl bg-white shadow-2xl h-full flex flex-col animate-in slide-in-from-right duration-300">
            <div className="flex items-center justify-between p-6 border-b border-gray-100 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 bg-indigo-50 rounded-xl flex items-center justify-center text-indigo-600">
                  <FileCode className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">Data Point</h3>
                  <p className="text-xs text-gray-500 font-medium">{expandedMessage.sender_name || 'Anonymous'}</p>
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
              <div className="prose prose-sm max-w-none prose-p:text-gray-600 prose-p:font-medium prose-p:leading-relaxed prose-p:whitespace-pre-line">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>
                  {expandedMessage.content}
                </ReactMarkdown>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
