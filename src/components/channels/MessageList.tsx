"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint, ChannelField, Theme } from "@/types";
import { MessageCard } from "./MessageCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Brain, X, CheckSquare, Filter, Tag } from "lucide-react";
import { useRouter } from "next/navigation";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DataPoint[]>([]);
  const [fields, setFields] = useState<ChannelField[]>([]);
  const [themes, setThemes] = useState<Theme[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<string>("all");
  const [metadataFilters, setMetadataFilters] = useState<Record<string, string>>({});
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzingBatch, setAnalyzingBatch] = useState(false);
  const [tagging, setTagging] = useState(false);

  const fetchFields = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/fields`);
      const data = await res.json();
      setFields(data);
    } catch (e) { console.error(e); }
  };

  const fetchThemesList = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/themes`);
      const data = await res.json();
      setThemes(data.themes);
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
    fetchFields();
    fetchThemesList();
    fetchMessages(true);
  }, [channelId]);

  useEffect(() => {
    const timer = setTimeout(() => fetchMessages(true), 300);
    return () => clearTimeout(timer);
  }, [search, sentiment, metadataFilters]);

  const handleToggleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleAnalyzeSelected = async () => {
    if (selectedIds.size < 2) { alert("Please select at least 2 messages."); return; }
    setAnalyzingBatch(true);
    try {
      const res = await fetch(`/api/channels/${channelId}/analyze`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ messageIds: Array.from(selectedIds) })
      });
      const data = await res.json();
      if (data.error) alert(data.error);
      else {
        alert(`Successfully analyzed ${selectedIds.size} messages!`);
        setSelectedIds(new Set());
        router.refresh();
      }
    } catch (e) { alert("Analysis failed."); } finally { setAnalyzingBatch(false); }
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
        alert(`Successfully tagged ${selectedIds.size} messages.`);
        setSelectedIds(new Set());
        fetchMessages(true);
        router.refresh();
      }
    } catch (e) { alert("Tagging failed"); } finally { setTagging(false); }
  };

  const updateMetadataFilter = (column: string, value: string) => {
    setMetadataFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-4 relative pb-20">
      <div className="flex flex-col gap-4 p-4 bg-gray-50 border rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input placeholder="Search message content..." className="pl-9 bg-white" value={search} onChange={(e) => setSearch(e.target.value)} />
          </div>
          <Select value={sentiment} onValueChange={setSentiment}>
            <SelectTrigger className="w-[160px] bg-white"><SelectValue placeholder="All Sentiments" /></SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Sentiments</SelectItem>
              <SelectItem value="positive">Positive</SelectItem>
              <SelectItem value="neutral">Neutral</SelectItem>
              <SelectItem value="negative">Negative</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {fields.length > 0 && (
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
        {messages.map((msg) => (
          <MessageCard key={msg.id} message={msg} selected={selectedIds.has(msg.id)} onSelect={handleToggleSelect} />
        ))}
        {loading && <div className="flex justify-center py-10"><Loader2 className="w-6 h-6 animate-spin text-indigo-600" /></div>}
        {!loading && messages.length === 0 && <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed text-gray-500">No messages found.</div>}
        {!loading && hasMore && messages.length > 0 && <div className="text-center py-4"><Button variant="outline" onClick={() => fetchMessages(false)}>Load More</Button></div>}
      </div>

      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-indigo-100 shadow-xl rounded-full px-6 py-3 flex items-center gap-4 z-50 animate-in fade-in slide-in-from-bottom-4">
          <div className="flex items-center gap-2 border-r pr-4 border-gray-100">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-sm text-gray-900">{selectedIds.size} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="sm" variant="outline" className="rounded-full gap-2 border-indigo-200 text-indigo-600" disabled={tagging}>
                  {tagging ? <Loader2 className="w-4 h-4 animate-spin" /> : <Tag className="w-4 h-4" />}
                  Tag with Theme
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56 max-h-64 overflow-auto">
                <DropdownMenuLabel className="text-[10px] font-bold uppercase text-gray-400">Select Target Theme</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {themes.length === 0 ? (
                  <div className="p-4 text-xs text-gray-400 italic">No themes found. Create one first.</div>
                ) : (
                  themes.map(t => (
                    <DropdownMenuItem key={t.id} onClick={() => handleTagWithTheme(t.id)}>
                      <div className="flex flex-col">
                        <span className="font-medium text-sm">{t.name}</span>
                        <span className="text-[10px] text-gray-400">{t.data_point_count} messages</span>
                      </div>
                    </DropdownMenuItem>
                  ))
                )}
              </DropdownMenuContent>
            </DropdownMenu>

            <Button size="sm" className="rounded-full bg-indigo-600 hover:bg-indigo-700" onClick={handleAnalyzeSelected} disabled={analyzingBatch}>
              {analyzingBatch ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Brain className="w-4 h-4 mr-2" />}
              Analyze Selection
            </Button>
            <Button size="sm" variant="ghost" className="rounded-full h-8 w-8 p-0 text-gray-400 hover:text-gray-600" onClick={clearSelection}><X className="w-4 h-4" /></Button>
          </div>
        </div>
      )}
    </div>
  );
}
