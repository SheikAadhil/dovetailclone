import Link from "next/link";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { MessageSquare, Layers, Clock, Hash, TrendingUp } from "lucide-react";
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
      <Card className="hover:shadow-lg hover:border-indigo-200 transition-all duration-200 cursor-pointer h-full flex flex-col group bg-white">
        <CardHeader className="pb-3 space-y-0">
          <div className="flex justify-between items-start">
            <CardTitle className="text-base font-semibold truncate pr-2 group-hover:text-indigo-600 transition-colors">
              {channel.name}
            </CardTitle>
            <div className={`w-2 h-2 rounded-full mt-1.5 flex-shrink-0 ${channel.is_active ? 'bg-emerald-500' : 'bg-gray-300'}`} title={channel.is_active ? 'Active' : 'Inactive'} />
          </div>
        </CardHeader>
        <CardContent className="flex-1 pb-3">
          <p className="text-sm text-gray-500 line-clamp-2 min-h-[2.5em]">
            {channel.description || "No description provided."}
          </p>

          <div className="flex gap-4 mt-4">
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="p-1.5 bg-blue-50 rounded-md">
                <MessageSquare className="w-3.5 h-3.5 text-blue-600" />
              </div>
              <span className="font-medium">{channel.message_count}</span>
              <span className="text-gray-400 text-xs">signals</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm text-gray-600">
              <div className="p-1.5 bg-purple-50 rounded-md">
                <Layers className="w-3.5 h-3.5 text-purple-600" />
              </div>
              <span className="font-medium">{channel.theme_count}</span>
              <span className="text-gray-400 text-xs">themes</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="pt-3 border-t bg-gray-50/50 flex justify-between items-center text-xs">
          <Badge variant="outline" className="font-normal bg-white text-xs border-gray-200">
            <Hash className="w-3 h-3 mr-1 text-gray-400" />
            {channel.slack_channel_name || "unknown"}
          </Badge>
          <div className="flex items-center gap-1.5 text-gray-500">
            {channel.last_analyzed_at ? (
              <>
                <TrendingUp className="w-3 h-3 text-emerald-500" />
                {formatDistanceToNow(new Date(channel.last_analyzed_at), { addSuffix: true })}
              </>
            ) : (
              <>
                <Clock className="w-3 h-3" />
                Never analyzed
              </>
            )}
          </div>
        </CardFooter>
      </Card>
    </Link>
  );
}
