import { Theme } from "@/types";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ArrowRight, MessageSquare, Smile, Frown, Meh } from "lucide-react";

interface ThemeCardProps {
  theme: Theme;
  onView: (theme: Theme) => void;
}

export function ThemeCard({ theme, onView }: ThemeCardProps) {
  // Determine overall sentiment from breakdown if needed, or use a prop?
  // Theme interface has sentiment_breakdown.
  // We can infer dominant sentiment.
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

  // Calculate percentages for bar chart
  const total = theme.data_point_count || 1; // avoid divide by zero
  const posPct = (positive / total) * 100;
  const negPct = (negative / total) * 100;
  const neuPct = (neutral / total) * 100;

  return (
    <Card className="flex flex-col h-full hover:shadow-md transition-shadow">
      <CardHeader className="pb-2">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg font-bold line-clamp-2">{theme.name}</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex-1 pb-2 space-y-4">
        <p className="text-sm text-gray-500 line-clamp-3">
          {theme.summary}
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

        {/* Mini bar chart */}
        <div className="h-2 w-full flex rounded-full overflow-hidden bg-gray-100">
          {posPct > 0 && <div style={{ width: `${posPct}%` }} className="bg-green-400" />}
          {neuPct > 0 && <div style={{ width: `${neuPct}%` }} className="bg-gray-300" />}
          {negPct > 0 && <div style={{ width: `${negPct}%` }} className="bg-red-400" />}
        </div>
      </CardContent>
      <CardFooter className="pt-2 border-t bg-gray-50/50">
        <Button variant="ghost" className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 p-0 h-auto font-medium" onClick={() => onView(theme)}>
          View messages
          <ArrowRight className="w-4 h-4 ml-2" />
        </Button>
      </CardFooter>
    </Card>
  );
}
