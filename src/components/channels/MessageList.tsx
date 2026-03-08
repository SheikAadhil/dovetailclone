"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint, ChannelField } from "@/types";
import { MessageCard } from "./MessageCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Brain, X, CheckSquare, Filter } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DataPoint[]>([]);
  const [fields, setFields] = useState<ChannelField[]>([]);
  const [loading, setLoading] = useState(true);
  
  // Search & Basic Filters
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<string>("all");
  
  // Dynamic Metadata Filters
  const [metadataFilters, setMetadataFilters] = useState<Record<string, string>>({});
  
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzingBatch, setAnalyzingBatch] = useState(false);

  const fetchFields = async () => {
    try {
      const res = await fetch(`/api/channels/${channelId}/fields`);
      const data = await res.json();
      setFields(data);
    } catch (e) {
      console.error(e);
    }
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

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment', sentiment);
    }

    // Apply metadata filters
    Object.entries(metadataFilters).forEach(([col, val]) => {
      if (val && val !== 'all') {
        query = query.filter(`metadata->>${col}`, 'eq', val);
      }
    });

    const { data } = await query;

    if (data) {
      if (reset) {
        setMessages(data);
        setPage(1);
      } else {
        setMessages(prev => [...prev, ...data]);
        setPage(p => p + 1);
      }
      setHasMore(data.length === 20);
    }
    
    setLoading(false);
  }, [channelId, search, sentiment, metadataFilters, page]);

  useEffect(() => {
    fetchFields();
    fetchMessages(true);
  }, [channelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sentiment, metadataFilters]);

  const handleToggleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleAnalyzeSelected = async () => {
    if (selectedIds.size < 2) {
      alert("Please select at least 2 messages.");
      return;
    }
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
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setAnalyzingBatch(false);
    }
  };

  const updateMetadataFilter = (column: string, value: string) => {
    setMetadataFilters(prev => ({ ...prev, [column]: value }));
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-4 relative pb-20">
      {/* Filter Toolbar */}
      <div className="flex flex-col gap-4 p-4 bg-gray-50 border rounded-xl shadow-sm">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
            <Input
              placeholder="Search message content..."
              className="pl-9 bg-white border-gray-200"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
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

        {/* Dynamic Metadata Filters */}
        {fields.length > 0 && (
          <div className="flex flex-wrap gap-3 pt-3 border-t border-gray-200/60">
            <div className="flex items-center gap-2 text-xs font-bold text-gray-400 uppercase tracking-wider mr-2">
              <Filter className="w-3 h-3" />
              Segment by:
            </div>
            {fields.map(field => (
              <div key={field.id} className="flex flex-col gap-1.5">
                {field.field_type === 'select' && (
                  <Select 
                    value={metadataFilters[field.source_column] || "all"} 
                    onValueChange={(val) => updateMetadataFilter(field.source_column, val)}
                  >
                    <SelectTrigger className="h-8 text-xs bg-white min-w-[120px]">
                      <span className="text-gray-400 mr-1">{field.display_name}:</span>
                      <SelectValue placeholder="All" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All</SelectItem>
                      {field.options?.map(opt => (
                        <SelectItem key={opt} value={opt}>{opt}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                )}
                {field.field_type === 'text' && (
                  <Input 
                    placeholder={`Filter ${field.display_name}...`} 
                    className="h-8 text-xs bg-white w-40"
                    value={metadataFilters[field.source_column] || ""}
                    onChange={(e) => updateMetadataFilter(field.source_column, e.target.value)}
                  />
                )}
              </div>
            ))}
            {(Object.keys(metadataFilters).length > 0 || sentiment !== 'all') && (
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-8 text-xs text-gray-500 hover:text-red-600"
                onClick={() => { setMetadataFilters({}); setSentiment('all'); }}
              >
                Clear all
              </Button>
            )}
          </div>
        )}
      </div>

      <div className="space-y-4">
        {messages.map((msg) => (
          <MessageCard 
            key={msg.id} 
            message={msg} 
            selected={selectedIds.has(msg.id)}
            onSelect={handleToggleSelect}
          />
        ))}

        {loading && (
          <div className="flex justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-20 bg-gray-50 rounded-xl border border-dashed text-gray-500">
            No messages found with these filters.
          </div>
        )}

        {!loading && hasMore && messages.length > 0 && (
          <div className="text-center py-4">
            <Button variant="outline" onClick={() => fetchMessages(false)}>
              Load More
            </Button>
          </div>
        )}
      </div>

      {/* Floating Batch Action Bar */}
      {selectedIds.size > 0 && (
        <div className="fixed bottom-8 left-1/2 -translate-x-1/2 bg-white border border-indigo-100 shadow-xl rounded-full px-6 py-3 flex items-center gap-6 z-50 animate-in fade-in slide-in-from-bottom-4 duration-300">
          <div className="flex items-center gap-2 border-r pr-6 border-gray-100">
            <CheckSquare className="w-5 h-5 text-indigo-600" />
            <span className="font-semibold text-gray-900">{selectedIds.size} selected</span>
          </div>
          
          <div className="flex items-center gap-2">
            <Button 
              size="sm" 
              className="rounded-full bg-indigo-600 hover:bg-indigo-700"
              onClick={handleAnalyzeSelected}
              disabled={analyzingBatch}
            >
              {analyzingBatch ? (
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              ) : (
                <Brain className="w-4 h-4 mr-2" />
              )}
              Analyze Selected
            </Button>
            <Button 
              size="sm" 
              variant="ghost" 
              className="rounded-full h-8 w-8 p-0 text-gray-400 hover:text-gray-600"
              onClick={clearSelection}
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      )}
    </div>
  );
}
