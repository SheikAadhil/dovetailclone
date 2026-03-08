"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint } from "@/types";
import { MessageCard } from "./MessageCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search, Brain, X, CheckSquare } from "lucide-react";
import { useRouter } from "next/navigation";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const router = useRouter();
  const [messages, setMessages] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  // Selection state
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [analyzingBatch, setAnalyzingBatch] = useState(false);

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
  }, [channelId, search, sentiment, page]);

  useEffect(() => {
    fetchMessages(true);
  }, [channelId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(true);
    }, 300);
    return () => clearTimeout(timer);
  }, [search, sentiment]);

  const handleToggleSelect = (id: string, checked: boolean) => {
    const newSet = new Set(selectedIds);
    if (checked) newSet.add(id);
    else newSet.delete(id);
    setSelectedIds(newSet);
  };

  const handleAnalyzeSelected = async () => {
    if (selectedIds.size < 2) {
      alert("Please select at least 2 messages to analyze.");
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
      if (data.error) {
        alert(data.error);
      } else {
        alert(`Successfully analyzed ${selectedIds.size} messages. ${data.themes} themes updated!`);
        setSelectedIds(new Set());
        router.refresh(); // Refresh to update themes in other tab
      }
    } catch (e) {
      alert("Analysis failed.");
    } finally {
      setAnalyzingBatch(false);
    }
  };

  const clearSelection = () => setSelectedIds(new Set());

  return (
    <div className="space-y-4 relative pb-20">
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-500" />
          <Input
            placeholder="Search messages..."
            className="pl-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Select value={sentiment} onValueChange={setSentiment}>
          <SelectTrigger className="w-[180px]">
            <SelectValue placeholder="Sentiment" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Sentiments</SelectItem>
            <SelectItem value="positive">Positive</SelectItem>
            <SelectItem value="neutral">Neutral</SelectItem>
            <SelectItem value="negative">Negative</SelectItem>
          </SelectContent>
        </Select>
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
          <div className="flex justify-center py-4">
            <Loader2 className="w-6 h-6 animate-spin text-indigo-600" />
          </div>
        )}

        {!loading && messages.length === 0 && (
          <div className="text-center py-10 text-gray-500">
            No messages found.
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
