import { Theme } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { 
  ArrowRight, MessageSquare, Smile, Frown, Meh, MoreHorizontal, 
  Pin, PinOff, Pencil, Trash2, Merge, CheckCircle2, TrendingUp, TrendingDown, Minus
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { LineChart, Line, ResponsiveContainer } from "recharts";

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
  
  let sentimentIcon = <Meh className="w-4 h-4 text-gray-400" />;
  let sentimentColor = "bg-gray-100 text-gray-600";
  let sentimentLabel = "Mixed";

  if (positive > negative && positive > neutral) {
    sentimentIcon = <Smile className="w-4 h-4 text-green-500" />;
    sentimentColor = "bg-green-100 text-green-700";
    sentimentLabel = "Mostly positive";
  } else if (negative > positive && negative > neutral) {
    sentimentIcon = <Frown className="w-4 h-4 text-red-500" />;
    sentimentColor = "bg-red-100 text-red-700";
    sentimentLabel = "Mostly negative";
  } else if (neutral >= positive && neutral >= negative) {
    sentimentIcon = <Meh className="w-4 h-4 text-gray-400" />;
    sentimentColor = "bg-gray-100 text-gray-600";
    sentimentLabel = "Neutral";
  }

  const total = theme.data_point_count || 1;
  const posPct = (positive / total) * 100;
  const negPct = (negative / total) * 100;
  const neuPct = (neutral / total) * 100;

  // Trend color/icon
  const getTrendUI = () => {
    if (theme.trend_direction === 'rising') return { color: 'text-green-600', icon: <TrendingUp className="w-3 h-3" />, chart: '#10b981' };
    if (theme.trend_direction === 'falling') return { color: 'text-red-600', icon: <TrendingDown className="w-3 h-3" />, chart: '#ef4444' };
    return { color: 'text-gray-400', icon: <Minus className="w-3 h-3" />, chart: '#9ca3af' };
  };
  const trendUI = getTrendUI();

  return (
    <Card className={`flex flex-col h-full transition-all relative ${
      isMergeSource ? 'border-indigo-500 ring-2 ring-indigo-500/20' : 'hover:shadow-md'
    }`}>
      {isMergeSource && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 bg-indigo-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full z-10 uppercase tracking-wider shadow-sm">
          Merging Source
        </div>
      )}

      <CardHeader className="pb-2 flex flex-row items-start justify-between space-y-0">
        <div className="flex-1 min-w-0 pr-2">
          <div className="flex items-center gap-2 mb-1">
            {theme.is_pinned && (
              <div className="p-1 bg-indigo-50 rounded">
                <Pin className="w-3.5 h-3.5 text-indigo-600 fill-indigo-600" />
              </div>
            )}
            {theme.is_manual && <Badge variant="outline" className="text-[9px] h-4 px-1 uppercase border-orange-200 text-orange-600 bg-orange-50">Manual</Badge>}
          </div>
          <CardTitle className="text-lg font-bold line-clamp-2">{theme.name}</CardTitle>
        </div>

        {!mergeMode && (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-8 w-8 p-0 flex-shrink-0">
                <MoreHorizontal className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48">
              <DropdownMenuItem onClick={() => onPin(theme)}>
                {theme.is_pinned ? <><PinOff className="w-4 h-4 mr-2" /> Unpin</> : <><Pin className="w-4 h-4 mr-2" /> Pin to top</>}
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onEdit(theme)}>
                <Pencil className="w-4 h-4 mr-2" /> Edit theme
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => onMergeStart(theme)}>
                <Merge className="w-4 h-4 mr-2" /> Merge into...
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => onDelete(theme.id)} className="text-red-600">
                <Trash2 className="w-4 h-4 mr-2" /> Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        )}
      </CardHeader>

      <CardContent className="flex-1 pb-2 space-y-4">
        <p className="text-sm text-gray-500 line-clamp-3">
          {theme.summary || theme.description || "No summary available."}
        </p>

        <div className="flex flex-wrap gap-2">
          <Badge variant="secondary" className="flex items-center gap-1">
            <MessageSquare className="w-3 h-3" />
            {theme.data_point_count}
          </Badge>
          <Badge variant="outline" className={`flex items-center gap-1 border-0 ${sentimentColor}`}>
            {sentimentIcon}
            {sentimentLabel}
          </Badge>
        </div>

        <div className="h-2 w-full flex rounded-full overflow-hidden bg-gray-100">
          {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-green-400" />}
          {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-gray-300" />}
          {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-400" />}
        </div>

        {/* TREND VIEW */}
        {theme.trend_data && (
          <div className="pt-3 border-t border-gray-100 flex items-center justify-between">
            <div className={`flex items-center gap-1 text-[10px] font-bold uppercase tracking-tight ${trendUI.color}`}>
              {trendUI.icon}
              {theme.trend_percent_change !== undefined && theme.trend_percent_change !== 0 && theme.trend_data.length >= 2 
                ? `${theme.trend_percent_change > 0 ? '+' : ''}${Math.abs(theme.trend_percent_change)}%` 
                : 'Steady'}
              <span className="text-gray-400 font-normal lowercase ml-0.5">vs last week</span>
            </div>
            <div className="h-8 w-20 flex-shrink-0">
              {theme.trend_data.length >= 2 ? (
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={theme.trend_data}>
                    <Line
                      type="monotone"
                      dataKey="count"
                      stroke={trendUI.chart}
                      strokeWidth={2}
                      dot={false}
                    />
                  </LineChart>
                </ResponsiveContainer>
              ) : (
                <div className="h-full w-full flex items-center justify-center text-[9px] text-gray-400 bg-gray-50 rounded">
                  {theme.trend_data.length === 1 ? "Wait 24h" : "No trend"}
                </div>
              )}
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-2 border-t bg-gray-50/50">
        {mergeMode ? (
          <Button 
            disabled={isMergeSource}
            onClick={() => onMergeSelect(theme)}
            className={`w-full gap-2 rounded-md ${
              isMergeSource ? 'bg-gray-100 text-gray-400 border-dashed border-2' : 'bg-indigo-600 hover:bg-indigo-700 text-white'
            }`}
          >
            {isMergeSource ? "Source" : <><CheckCircle2 className="w-4 h-4" /> Merge Here</>}
          </Button>
        ) : (
          <Button 
            variant="ghost" 
            className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-auto font-medium" 
            onClick={() => onView(theme)}
          >
            View messages
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
        )}
      </CardFooter>
    </Card>
  );
}
