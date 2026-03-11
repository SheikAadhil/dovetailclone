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
    <Card className={`group flex flex-col h-full transition-all duration-200 border-gray-100 rounded-xl overflow-hidden relative shadow-sm hover:shadow-md ${
      isMergeSource ? 'ring-2 ring-indigo-500 ring-offset-2' : ''
    }`}>
      {isMergeSource && (
        <div className="absolute top-3 left-3 bg-indigo-600 text-white text-[9px] font-semibold px-2 py-0.5 rounded-full z-10 uppercase tracking-wider shadow-md">
          Source
        </div>
      )}

      <CardHeader className="pb-2 pt-4 px-4 flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-1.5 mb-1.5">
            {theme.is_pinned && (
              <div className="p-1 bg-indigo-50 rounded-md">
                <Pin className="w-3 h-3 text-indigo-600 fill-indigo-600" />
              </div>
            )}
            {theme.is_manual && (
              <Badge variant="outline" className="text-[9px] font-medium h-5 px-1.5 uppercase border-orange-100 text-orange-600 bg-orange-50 rounded-md">
                Manual
              </Badge>
            )}
          </div>
          <CardTitle className="text-base font-semibold text-gray-900 line-clamp-2 leading-snug group-hover:text-indigo-600 transition-colors">
            {theme.name}
          </CardTitle>
        </div>

        {!mergeMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 rounded-lg hover:bg-gray-100 text-gray-400">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-44 rounded-xl border-gray-100 shadow-lg p-1.5">
              <DropdownMenuItem onClick={() => onPin(theme)} className="rounded-lg font-medium text-xs">
                {theme.is_pinned ? <><PinOff className="w-3.5 h-3.5 mr-2 text-gray-400" /> Unpin</> : <><Pin className="w-3.5 h-3.5 mr-2 text-gray-400" /> Pin</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => {
                let textToCopy = `THEME: ${theme.name}\n\n`;
                textToCopy += `SUMMARY: ${theme.summary || theme.description || 'No summary'}\n\n`;
                if (theme.description) {
                  textToCopy += `DESCRIPTION: ${theme.description}\n\n`;
                }
                textToCopy += `---\n\n`;
                textToCopy += `SIGNALS (${theme.data_point_count || theme.data_points?.length || 0}):\n\n`;

                if (theme.data_points && theme.data_points.length > 0) {
                  theme.data_points.forEach((msg: any, index: number) => {
                    textToCopy += `[${index + 1}] ${msg.sender_name || 'Unknown'}\n`;
                    textToCopy += `${msg.content}\n\n`;
                  });
                } else {
                  textToCopy += `No signals in this theme.\n`;
                }

                navigator.clipboard.writeText(textToCopy);
                alert('Copied to clipboard!');
              }} className="rounded-lg font-medium text-xs">
                  <Copy className="w-3.5 h-3.5 mr-2 text-gray-400" /> Copy
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(theme)} className="rounded-lg font-medium text-xs">
                <Pencil className="w-3.5 h-3.5 mr-2 text-gray-400" /> Edit
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMergeStart(theme)} className="rounded-lg font-medium text-xs">
                <Merge className="w-3.5 h-3.5 mr-2 text-gray-400" /> Merge
              </DropdownMenuItem>
              <DropdownMenuSeparator className="my-1 bg-gray-50" />
              <DropdownMenuItem onClick={() => onDelete(theme.id)} className="rounded-lg font-medium text-xs text-red-600 focus:text-red-600 focus:bg-red-50">
                <Trash2 className="w-3.5 h-3.5 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-3 px-4 space-y-3">
        <p className="text-sm text-gray-500 font-medium leading-relaxed line-clamp-2">
          {theme.summary || theme.description || "No summary available."}
        </p>

        <div className="flex flex-wrap gap-1.5">
          <Badge variant="secondary" className="flex items-center gap-1 bg-gray-50 text-gray-600 border-none rounded-md px-2 py-0.5 font-medium text-[10px]">
            <MessageSquare className="w-3 h-3 text-gray-400" />
            {theme.data_point_count}
          </Badge>
          <Badge variant="outline" className={`flex items-center gap-1 rounded-md px-2 py-0.5 font-medium text-[10px] border ${sentimentColor}`}>
            {sentimentIcon}
            {sentimentLabel}
          </Badge>
        </div>

        <div className="space-y-1.5">
           <div className="flex items-center justify-between text-[9px] font-medium text-gray-400 uppercase tracking-wider px-0.5">
             <span>Sentiment</span>
             <span>{Math.round((positive/total)*100)}% pos</span>
           </div>
           <div className="h-1.5 w-full flex rounded-full overflow-hidden bg-gray-100">
            {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-green-400 rounded-full" />}
            {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-gray-300 rounded-full mx-0.5" />}
            {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-400 rounded-full" />}
          </div>
        </div>
      </CardContent>

      <CardFooter className="pt-2 pb-3 px-4 border-t border-gray-50 bg-gray-50/30">
        {mergeMode ? (
          <Button 
            disabled={isMergeSource}
            onClick={() => onMergeSelect(theme)}
            className={`w-full gap-1.5 rounded-lg h-9 font-medium text-xs transition-all ${
              isMergeSource 
                ? 'bg-gray-100 text-gray-400 border-dashed border-2 shadow-none cursor-not-allowed' 
                : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isMergeSource ? "Target" : <><CheckCircle2 className="w-3.5 h-3.5" /> Merge Here</>}
          </Button>
        ) : (
          <div className="w-full flex items-center justify-between">
            <span className="text-[9px] font-medium text-gray-400 flex items-center gap-1 uppercase tracking-wider">
               <Clock className="w-3 h-3" />
               {formatDistanceToNow(new Date(theme.last_updated_at), { addSuffix: false })}
            </span>
            <Button 
              variant="ghost" 
              className="text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50/50 p-0 h-auto font-medium text-xs gap-1 group/btn" 
              onClick={() => onView(theme)}
            >
              View
              <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover/btn:translate-x-0.5" />
            </Button>
          </div>
        )}
      </CardFooter>
    </Card>
  );
}