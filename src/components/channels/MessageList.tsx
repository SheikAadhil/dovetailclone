"use client";

import { useState, useEffect, useCallback } from "react";
import { createSupabaseClient } from "@/lib/supabase";
import { DataPoint } from "@/types";
import { MessageCard } from "./MessageCard";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Search } from "lucide-react";

interface MessageListProps {
  channelId: string;
}

export function MessageList({ channelId }: MessageListProps) {
  const [messages, setMessages] = useState<DataPoint[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [sentiment, setSentiment] = useState<string>("all");
  const [page, setPage] = useState(0);
  const [hasMore, setHasMore] = useState(true);

  const fetchMessages = useCallback(async (reset = false) => {
    setLoading(true);
    const supabase = await createSupabaseClient();
    
    let query = supabase
      .from('data_points')
      .select('*')
      .eq('channel_id', channelId)
      .order('message_timestamp', { ascending: false })
      .range(reset ? 0 : page * 20, reset ? 19 : (page + 1) * 20 - 1); // 20 per page

    if (search) {
      query = query.ilike('content', `%${search}%`);
    }

    if (sentiment && sentiment !== 'all') {
      query = query.eq('sentiment', sentiment);
    }

    const { data, error } = await query;

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

  // Initial load
  useEffect(() => {
    fetchMessages(true);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [channelId]); // Only on mount/channel change

  // Filter change
  useEffect(() => {
    const timer = setTimeout(() => {
      fetchMessages(true);
    }, 300); // Debounce search
    return () => clearTimeout(timer);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [search, sentiment]);

  return (
    <div className="space-y-4">
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
          <MessageCard key={msg.id} message={msg} />
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
    </div>
  );
}
