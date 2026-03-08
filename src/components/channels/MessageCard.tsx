import { DataPoint, Theme } from "@/types";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { formatDistanceToNow } from "date-fns";
import { 
  Smile, Frown, Meh, Slack, FileText, FileCode, Database, 
  ChevronDown, ChevronUp, Brain, Loader2
} from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

interface MessageCardProps {
  message: DataPoint;
  themes?: Theme[];
  onClick?: () => void;
  selected?: boolean;
  onSelect?: (id: string, checked: boolean) => void;
  onAnalyze?: (id: string) => Promise<void>;
}

export function MessageCard({ message, themes, onClick, selected, onSelect, onAnalyze }: MessageCardProps) {
  const [expanded, setSetExpanded] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);

  const isLongContent = message.content.length > 300 || message.content.split('\n').length > 4;
  const isNode = message.source === 'node' || message.source === 'markdown';
  const isCsv = message.source === 'csv';
  const isSlack = message.source === 'slack' || !message.source;

  const getSentimentIcon = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return <Smile className="w-3.5 h-3.5 text-green-500" />;
      case 'negative': return <Frown className="w-3.5 h-3.5 text-red-500" />;
      default: return <Meh className="w-3.5 h-3.5 text-gray-400" />;
    }
  };

  const getSentimentColor = (sentiment: string | null) => {
    switch (sentiment) {
      case 'positive': return "bg-green-50 text-green-700 border-green-200";
      case 'negative': return "bg-red-50 text-red-700 border-red-200";
      default: return "bg-gray-50 text-gray-600 border-gray-200";
    }
  };

  const getSourceUI = () => {
    if (isNode) return { icon: <FileCode className="w-3 h-3" />, label: "Observation Node", color: "bg-amber-50 text-amber-700 border-amber-100" };
    if (isCsv) return { icon: <FileText className="w-3 h-3" />, label: "CSV Import", color: "bg-blue-50 text-blue-700 border-blue-100" };
    return { icon: <Slack className="w-3 h-3" />, label: "Slack Signal", color: "bg-purple-50 text-purple-700 border-purple-100" };
  };

  const sourceUI = getSourceUI();

  const handleAnalyzeClick = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!onAnalyze) return;
    setAnalyzing(true);
    try {
      await onAnalyze(message.id);
    } finally {
      setAnalyzing(false);
    }
  };

  const initials = message.sender_name 
    ? message.sender_name.split(' ').map(n => n[0]).join('').substring(0, 2).toUpperCase()
    : isNode ? 'ON' : isCsv ? 'CS' : 'SL';

  return (
    <div 
      className={`group relative p-5 border rounded-[1.5rem] transition-all duration-300 flex gap-5 ${
        selected ? 'bg-indigo-50 border-indigo-200 shadow-md ring-1 ring-indigo-100' : 'bg-white hover:bg-gray-50 shadow-sm border-gray-100'
      } ${onClick ? 'cursor-pointer' : ''}`}
      onClick={() => onClick?.()}
    >
      {/* Checkbox for selection */}
      {onSelect && (
        <div className="flex items-start pt-1" onClick={(e) => e.stopPropagation()}>
          <div className={`w-5 h-5 rounded-lg border-2 flex items-center justify-center transition-all ${selected ? 'bg-indigo-600 border-indigo-600 shadow-sm' : 'border-gray-200 bg-white group-hover:border-indigo-300'}`}>
            <input
              type="checkbox"
              checked={selected}
              onChange={(e) => onSelect(message.id, e.target.checked)}
              className="absolute inset-0 opacity-0 cursor-pointer z-10 w-full h-full"
            />
            {selected && <CheckCircle2 className="w-3.5 h-3.5 text-white" />}
          </div>
        </div>
      )}

      <div className="flex flex-1 items-start gap-4 min-w-0">
        <Avatar className="w-10 h-10 flex-shrink-0 rounded-xl border border-gray-100 shadow-sm">
          <AvatarFallback className={`${isNode ? 'bg-amber-100 text-amber-700' : isCsv ? 'bg-blue-100 text-blue-700' : 'bg-indigo-100 text-indigo-700'} text-xs font-black`}>
            {initials}
          </AvatarFallback>
        </Avatar>
        
        <div className="flex-1 min-w-0 flex flex-col">
          <div className="flex justify-between items-center mb-2">
            <div className="flex items-center gap-3 min-w-0">
              <span className="font-black text-sm text-gray-900 truncate tracking-tight">
                {message.sender_name || (isNode ? message.source_label : "System Signal")}
              </span>
              <Badge variant="outline" className={`flex items-center gap-1.5 px-2 py-0.5 rounded-lg text-[9px] font-black uppercase tracking-widest border ${sourceUI.color}`}>
                {sourceUI.icon}
                {sourceUI.label}
              </Badge>
            </div>
            <div className="flex items-center gap-3 shrink-0 ml-4">
              <span className="text-[10px] font-bold text-gray-400 whitespace-nowrap uppercase tracking-tighter">
                {formatDistanceToNow(new Date(message.message_timestamp), { addSuffix: true })}
              </span>
            </div>
          </div>
          
          <div className="relative">
            <p className={`text-sm text-gray-600 font-medium leading-relaxed whitespace-pre-wrap break-words ${!expanded && isLongContent ? 'line-clamp-4' : ''}`}>
              {message.content}
            </p>
            {isLongContent && (
              <button 
                onClick={(e) => { e.stopPropagation(); setSetExpanded(!expanded); }}
                className="flex items-center gap-1.5 mt-2 text-[10px] font-black text-indigo-600 uppercase tracking-[0.1em] hover:text-indigo-700 transition-colors"
              >
                {expanded ? <><ChevronUp className="w-3.5 h-3.5" /> Collapse Details</> : <><ChevronDown className="w-3.5 h-3.5" /> Show Full Observation</>}
              </button>
            )}
          </div>
          
          <div className="flex flex-wrap items-center gap-2 mt-4 pt-4 border-t border-gray-50">
            <Badge variant="outline" className={`gap-1.5 px-3 py-1 rounded-xl text-[10px] font-bold border ${getSentimentColor(message.sentiment)}`}>
              {getSentimentIcon(message.sentiment)}
              <span className="uppercase tracking-widest">{message.sentiment || 'Neutral'} Signal</span>
            </Badge>

            {themes && themes.length > 0 && themes.map(theme => (
              <Badge key={theme.id} variant="secondary" className="text-[10px] font-bold bg-gray-50 text-gray-500 border-none rounded-xl px-3 py-1 uppercase tracking-widest">
                {theme.name}
              </Badge>
            ))}

            {(isNode || isCsv) && onAnalyze && (
              <Button 
                size="sm" 
                variant="ghost" 
                onClick={handleAnalyzeClick}
                disabled={analyzing}
                className="ml-auto h-8 rounded-xl gap-2 text-indigo-600 hover:bg-indigo-50 hover:text-indigo-700 font-black text-[10px] uppercase tracking-widest"
              >
                {analyzing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Brain className="w-3.5 h-3.5" />}
                {analyzing ? "Thinking..." : "Analyze Individually"}
              </Button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function CheckCircle2({ className }: { className?: string }) {
  return (
    <svg 
      className={className} 
      xmlns="http://www.w3.org/2000/svg" 
      width="24" 
      height="24" 
      viewBox="0 0 24 24" 
      fill="none" 
      stroke="currentColor" 
      strokeWidth="4" 
      strokeLinecap="round" 
      strokeLinejoin="round"
    >
      <path d="M20 6 9 17l-5-5"/>
    </svg>
  );
}
