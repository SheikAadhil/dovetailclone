import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Layers, Clock } from "lucide-react";
import { formatDistanceToNow } from "date-fns";

interface ChannelCardProps {
  channel: {
    id: string;
    name: string;
    description: string | null;
    is_active: boolean;
    slack_channel_name: string | null;
    last_analyzed_at: string | null;
    message_count: number;
    theme_count: number;
  };
}

export function ChannelCard({ channel }: ChannelCardProps) {
  return (
    <Link href={`/channels/${channel.id}`}>
      <Card className="hover:shadow-md transition-shadow cursor-pointer h-full flex flex-col">
        <CardHeader className="pb-2 space-y-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-lg font-bold truncate pr-2">{channel.name}</CardTitle>
            <div className={`w-3 h-3 rounded-full mt-1.5 flex-shrink-0 ${channel.is_active ? 'bg-green-500' : 'bg-gray-300'}`} title={channel.is_active ? 'Active' : 'Inactive'} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-2">
          <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">
            {channel.description || "No description provided."}
          </p>
          
          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <MessageSquare className="w-4 h-4 text-gray-400" />
              <span>{channel.message_count}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <Layers className="w-4 h-4 text-gray-400" />
              <span>{channel.theme_count}</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-2 border-t bg-gray-50/50 flex justify-between items-center text-xs text-gray-500">
          <Badge variant="outline" className="font-normal bg-white">
            Slack #{channel.slack_channel_name || "unknown"}
          </Badge>
          <div className="flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {channel.last_analyzed_at 
              ? formatDistanceToNow(new Date(channel.last_analyzed_at), { addSuffix: true })
              : 'Never analyzed'}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
