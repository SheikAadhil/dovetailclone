import { Theme } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  ArrowRight, MessageSquare, Smile, Frown, Meh, MoreHorizontal,
  Pin, PinOff, Pencil, Trash2, Merge, CheckCircle2, Clock, Copy
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatDistanceToNow } from "date-fns";

interface ThemeCardProps {
  theme: Theme;
  onView: (theme: Theme) => void;
  onEdit: (theme: Theme) => void;
  onDelete: (id: string) => void;
  onPin: (theme: Theme) => void;
  onMergeStart: (theme: Theme) => void;
  onMergeSelect: (targetTheme: Theme) => void;
  isMergeSource?: boolean;
  mergeMode?: boolean;
}

export function ThemeCard({
  theme,
  onView,
  onEdit,
  onDelete,
  onPin,
  onMergeStart,
  onMergeSelect,
  isMergeSource,
  mergeMode
}: ThemeCardProps) {
  const breakdown = theme.sentiment_breakdown || {};
  const positive = breakdown.positive || 0;
  const negative = breakdown.negative || 0;
  const neutral = breakdown.neutral || 0;
  
  let sentimentIcon = <Meh className="w-3.5 h-3.5 text-gray-400" />;
  let sentimentColor = "bg-gray-100 text-gray-600 border-gray-200";
  let sentimentLabel = "Neutral Signal";

  if (positive > negative && positive > neutral) {
    sentimentIcon = <Smile className="w-3.5 h-3.5 text-green-600" />;
    sentimentColor = "bg-green-50 text-green-700 border-green-100";
    sentimentLabel = "Positive Signal";
  } else if (negative > positive && negative > neutral) {
    sentimentIcon = <Frown className="w-3.5 h-3.5 text-red-600" />;
    sentimentColor = "bg-red-50 text-red-700 border-red-100";
    sentimentLabel = "Negative Signal";
  }

  const total = theme.data_point_count || 1;
  const posPct = (positive / total) * 100;
  const negPct = (negative / total) * 100;
  const neuPct = (neutral / total) * 100;

  return (
    <Card className={`group flex flex-col h-full transition-all duration-300 border-gray-100 rounded-[2rem] overflow-hidden relative shadow-sm hover:shadow-xl hover:shadow-indigo-500/5 hover:-translate-y-1 ${
      isMergeSource ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
    }`}>
      {isMergeSource && (
        <div className="absolute top-4 left-4 bg-indigo-600 text-white text-[10px] font-black px-3 py-1 rounded-full z-10 uppercase tracking-[0.2em] shadow-lg shadow-indigo-200">
          Source
        </div>
      )}

      <CardHeader className="pb-3 pt-6 px-6 flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-2">
            {theme.is_pinned && (
              <div className="p-1.5 bg-indigo-50 rounded-xl">
                <Pin className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
              </div>
            )}
            {theme.is_manual && (
              <Badge variant="outline" className="text-[10px] font-black h-5 px-2 uppercase border-orange-100 text-orange-600 bg-orange-50 rounded-lg">
                Manual
              </Badge>
            )}
          </div>
          <CardTitle className="text-xl font-black text-gray-900 line-clamp-2 tracking-tight leading-tight group-hover:text-indigo-600 transition-colors">
            {theme.name}
          </CardTitle>
        </div>

        {!mergeMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 w-9 p-0 rounded-xl hover:bg-gray-100 text-gray-400">
                <MoreHorizontal className="w-5 h-5" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-52 rounded-2xl border-gray-100 shadow-2xl p-2">
              <DropdownMenuItem onClick={() => onPin(theme)} className="rounded-xl font-bold text-sm">
                {theme.is_pinned ? <><PinOff className="w-4 h-4 mr-3 text-gray-400" /> Unpin</> : <><Pin className="w-4 h-4 mr-3 text-gray-400" /> Pin Theme</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                const textToCopy = `Theme: ${theme.name}\n\nSummary: ${theme.summary || theme.description || 'No summary'}`;
                navigator.clipboard.writeText(textToCopy);
                alert('Copied to clipboard!');
              }} className="rounded-xl font-bold text-sm">
                  <Copy className="w-4 h-4 mr-3 text-gray-400" /> Copy to Clipboard
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(theme)} className="rounded-xl font-bold text-sm">
                <Pencil className="w-4 h-4 mr-3 text-gray-400" /> Edit Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMergeStart(theme)} className="rounded-xl font-bold text-sm">
                <Merge className="w-4 h-4 mr-3 text-gray-400" /> Merge Themes
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-2 bg-gray-50" />
              <DropdownMenuItem onClick={() => onDelete(theme.id)} className="rounded-xl font-bold text-sm text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="w-4 h-4 mr-3" /> Delete Theme
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-4 px-6 space-y-5">
        <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-3">
          {theme.summary || theme.description || "No summary available for this synthesized signal."}
        </p>

        <div className="flex flex-wrap gap-2 pt-2">
          <Badge variant="secondary" className="flex items-center gap-1.5 bg-gray-50 text-gray-600 border-none rounded-xl px-3 py-1 font-bold text-[11px]">
            <MessageSquare className="w-3.5 h-3.5 text-gray-400" />
            {theme.data_point_count}
          </Badge>
          <Badge variant="outline" className={`flex items-center gap-1.5 rounded-xl px-3 py-1 font-bold text-[11px] border ${sentimentColor}`}>
            {sentimentIcon}
            {sentimentLabel}
          </Badge>
        </div>

        <div className="space-y-2">
           <div className="flex items-center justify-between text-[10px] font-black text-gray-400 uppercase tracking-widest px-0.5">
             <span>Sentiment Spectrum</span>
             <span>{Math.round((positive/total)*100)}% Pos</span>
           </div>
           <div className="h-2 w-full flex rounded-full overflow-hidden bg-gray-100 p-0.5 border border-gray-50">
            {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-green-400 rounded-full" />}
            {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-gray-300 rounded-full mx-0.5" />}
            {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-400 rounded-full" />}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-4 pb-6 px-6 border-t border-gray-50 bg-gray-50/30">
        {mergeMode ? (
          <Button 
            disabled={isMergeSource}
            onClick={() => onMergeSelect(theme)}
            className={`w-full gap-2 rounded-2xl h-11 font-black uppercase tracking-widest text-[11px] transition-all shadow-lg ${
              isMergeSource 
                ? 'bg-gray-100 text-gray-400 border-dashed border-2 shadow-none cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-indigo-100 hover:shadow-indigo-200'
            }`}
          >
            {isMergeSource ? "Merging Target" : <><CheckCircle2 className="w-4 h-4" /> Merge Here</>}
          </Button>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span className="text-[10px] font-bold text-gray-400 flex items-center gap-1.5 uppercase tracking-wider">
               <Clock className="w-3 h-3" />
               {formatDistanceToNow(new Date(theme.last_updated_at), { addSuffix: false })}
            </span>
            <Button 
              variant="ghost" 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 p-0 h-auto font-black text-xs uppercase tracking-widest gap-2 group/btn" 
              onClick={() => onView(theme)}
            >
              Analyze Messages
              <ArrowRight className="w-4 h-4 transition-transform group-hover/btn:translate-x-1" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}