import { DataPoint, Theme } from "@/types";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { Smile, Frown, Meh } from "lucide-react";

interface MessageCardProps {
  message: DataPoint;
  themes?: Theme[]; // Optional themes associated with this message
  onClick?: () => void;
}

export function MessageCard({ message, themes, onClick }: MessageCardProps) {
  // Sentiment Badge
  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-3 h-3 text-green-500" />;
      case 'negative': return <Frown className="w-3 h-3 text-red-500" />;
      default: return <Meh className="w-3 h-3 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return "bg-green-50 text-green-700 border-green-200";
      case 'negative': return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const initials = message.sender_name 
    ? message.sender_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : '??';

  return (
    <div 
      className={`p-4 border rounded-lg bg-white hover:bg-gray-50 transition-colors ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      <div className="flex items-start gap-3">
        <Avatar className="w-8 h-8">
          <AvatarImage src="" /> {/* Slack avatar URL not stored yet, TODO */}
          <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0">
          <div className="flex justify-between items-center mb-1">
            <span className="font-semibold text-sm text-gray-900 truncate">
              {message.sender_name || "Unknown User"}
            </span>
            <span className="text-xs text-gray-400 whitespace-nowrap ml-2">
              {formatDistanceToNow(new Date(message.message_timestamp), { addSuffix: true })}
            </span>
          </div>
          
          <p className="text-sm text-gray-700 whitespace-pre-wrap break-words mb-2">
            {message.content}
          </p>
          
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={`gap-1 font-normal ${getSentimentColor(message.sentiment)}`}>
              {getSentimentIcon(message.sentiment)}
              <span className="capitalize">{message.sentiment || 'Neutral'}</span>
            </Badge>

            {themes && themes.length > 0 && themes.map(theme => (
              <Badge key={theme.id} variant="secondary" className="text-xs bg-indigo-50 text-indigo-700 hover:bg-indigo-100 border-indigo-100">
                {theme.name}
              </Badge>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
